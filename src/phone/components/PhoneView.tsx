import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { FilesetResolver, PoseLandmarker } from '@mediapipe/tasks-vision';
import { NormalizedLandmark, POSE_INDEX } from '../utils/KinematicTracker';
import { HandTracker, ExercisePhase } from '../utils/HandTracker';
import { StageLog, StageAttempt } from '../utils/stageLog';
import { TrackingTestPanel, TestRepEntry, ALL_EXERCISES, REP_GROUP_MS, exerciseLabel } from './TrackingTestPanel';
import { networkManager, NetworkConnectionState } from '../../shared/NetworkManager';
import { RepTelemetry, ExerciseType, EXERCISE_SKILLS, HandSyncMode } from '../../types/game';
import { CombatCard } from '../../types/battle';
import { audioManager } from '../../shared/AudioManager';
import { KnightArmorRenderer } from '../utils/KnightArmorRenderer';
import { discoveryManager, DiscoveredTV, LAN_DISCOVERY } from '../../shared/DiscoveryManager';

export type PhoneOverlayMode = 'ARMOR' | 'SKELETON' | 'OFF';
import { Tv, Zap, Swords, Wifi } from 'lucide-react';

export const PhoneView: React.FC = () => {
  const [searchParams] = useSearchParams();
  const roomFromQuery = searchParams.get('room') || '';

  const [roomId, setRoomId] = useState<string>(roomFromQuery);
  const [netState, setNetState] = useState<NetworkConnectionState>('DISCONNECTED');
  const [statusMessage, setStatusMessage] = useState<string>('Ready to pair with Fire TV');
  const [workoutStarted, setWorkoutStarted] = useState<boolean>(false);
  const [wakeLockActive, setWakeLockActive] = useState<boolean>(false);
  const [cameraActive, setCameraActive] = useState<boolean>(false);
  const [modelLoading, setModelLoading] = useState<boolean>(false);
  const [modelReady, setModelReady] = useState<boolean>(false);
  // The exercise of the latest rep (HUD guides, armor colour, simulate button); every hand exercise is tracked
  const [activeExercise, setActiveExercise] = useState<ExerciseType>('SWING');
  const [phases, setPhases] = useState<Map<ExerciseType, ExercisePhase>>(new Map());

  // The TV battle's hand (HAND_SYNC); null outside battle, when every exercise is tracked
  const [handCards, setHandCards] = useState<CombatCard[] | null>(null);
  const [handMode, setHandMode] = useState<HandSyncMode | undefined>(undefined);
  useEffect(() => networkManager.onHand((cards, mode) => {
    setHandCards(cards);
    setHandMode(mode);
  }), []);

  // Camera Overlay Mode: AR Knight Armor (default) | Neon Skeleton | Off (battery saver)
  const [overlayMode, setOverlayMode] = useState<PhoneOverlayMode>('ARMOR');
  const overlayModeRef = useRef<PhoneOverlayMode>('ARMOR');
  overlayModeRef.current = overlayMode;

  const cycleOverlayMode = () => {
    setOverlayMode((prev) => {
      let next: PhoneOverlayMode;
      if (prev === 'ARMOR') next = 'SKELETON';
      else if (prev === 'SKELETON') next = 'OFF';
      else next = 'ARMOR';
      overlayModeRef.current = next;
      audioManager.play('ui_move');
      return next;
    });
  };

  const lastPowerRef = useRef<number>(0);
  const currentStateRef = useRef<string>('IDLE');
  const activeExerciseRef = useRef<ExerciseType>('SWING');
  activeExerciseRef.current = activeExercise;
  const isFullBodyVisibleRef = useRef<boolean>(true);

  // Live telemetry display
  const [repCount, setRepCount] = useState<number>(0);
  const repTotalRef = useRef<number>(0);
  const [lastPower, setLastPower] = useState<number>(0);
  const [lastForm, setLastForm] = useState<number>(1.0);
  const [currentStateName, setCurrentStateName] = useState<string>('IDLE');
  const [isFullBodyVisible, setIsFullBodyVisible] = useState<boolean>(true);
  const [missingBodyParts, setMissingBodyParts] = useState<string[]>([]);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const poseLandmarkerRef = useRef<PoseLandmarker | null>(null);
  const trackerRef = useRef<HandTracker>(new HandTracker());
  const wakeLockRef = useRef<any>(null);
  const animFrameRef = useRef<number | null>(null);
  const lastVideoTimeRef = useRef<number>(-1);

  // Local WiFi Discovery State
  const [discoveredTVs, setDiscoveredTVs] = useState<DiscoveredTV[]>([]);
  const [isScanningWifi, setIsScanningWifi] = useState<boolean>(false);

  // Scan Local WiFi for running Fire TV hosts
  const scanWifi = useCallback(async () => {
    setIsScanningWifi(true);
    setStatusMessage('Scanning local WiFi for Fire TV...');
    try {
      const found = await discoveryManager.scanForTVs();
      setDiscoveredTVs(found);
      if (found.length > 0) {
        setStatusMessage(`Found ${found.length} TV on WiFi: ${found[0].roomId}`);
        audioManager.play('ui_select');
        if (!roomId) {
          setRoomId(found[0].roomId);
        }
      } else {
        setStatusMessage('No TV found on local WiFi. Ensure TV is open or enter code.');
      }
    } catch (e) {
      setStatusMessage('WiFi scan completed. Use code entry as backup.');
    } finally {
      setIsScanningWifi(false);
    }
  }, [roomId]);

  // Subscribe to NetworkManager state
  useEffect(() => {
    const unsub = networkManager.onStateChange((state, info) => {
      setNetState(state);
      if (info) setStatusMessage(info);
    });

    // Auto-connect if room is present in URL, otherwise scan local WiFi (dev server only)
    if (roomFromQuery) {
      handleConnect(roomFromQuery);
    } else if (LAN_DISCOVERY) {
      scanWifi();
    }

    return () => {
      unsub();
      networkManager.cleanup();
      if (wakeLockRef.current) {
        wakeLockRef.current.release().catch(() => {});
      }
    };
  }, [roomFromQuery]);

  // Connect to TV Host via PeerJS
  const handleConnect = async (targetRoom: string) => {
    const cleanRoom = targetRoom.trim().toUpperCase();
    if (!cleanRoom) return;
    try {
      setRoomId(cleanRoom);
      setStatusMessage(`Pairing with ${cleanRoom}...`);
      await networkManager.connectToHost(cleanRoom);
    } catch (err: any) {
      setStatusMessage(`Pairing failed: ${err?.message || 'Check Room ID'}`);
    }
  };

  // Visual rep flash banner state
  const [repFlash, setRepFlash] = useState<{ show: boolean; power: number; rep: number; label?: string } | null>(null);
  const repFlashTimerRef = useRef<number | null>(null);
  const showRepFlash = (flash: { power: number; rep: number; label?: string }) => {
    setRepFlash({ show: true, ...flash });
    if (repFlashTimerRef.current) clearTimeout(repFlashTimerRef.current);
    repFlashTimerRef.current = window.setTimeout(() => setRepFlash(null), 900);
  };

  // Tracking test mode: run any set of exercises in parallel and log which ones count each rep
  const [testMode, setTestMode] = useState<boolean>(false);
  const [testExercises, setTestExercises] = useState<ExerciseType[]>(ALL_EXERCISES);
  const [testCounts, setTestCounts] = useState<Partial<Record<ExerciseType, number>>>({});
  const [testLog, setTestLog] = useState<TestRepEntry[]>([]);
  const [testFlashing, setTestFlashing] = useState<ExerciseType[]>([]);
  const [testSendToTv, setTestSendToTv] = useState<boolean>(false);
  const [testSpeak, setTestSpeak] = useState<boolean>(true);
  const testModeRef = useRef(testMode);
  testModeRef.current = testMode;
  const testSendToTvRef = useRef(testSendToTv);
  testSendToTvRef.current = testSendToTv;
  const testSpeakRef = useRef(testSpeak);
  testSpeakRef.current = testSpeak;
  const testGroupRef = useRef<TestRepEntry | null>(null);
  // Stage log: every attempt's stages, for review (test mode only); the screen catches up a few times a second
  const stageLogRef = useRef(new StageLog());
  const [stageAttempts, setStageAttempts] = useState<StageAttempt[]>([]);
  const stageRenderTimerRef = useRef<number | null>(null);
  const scheduleStageRender = () => {
    if (stageRenderTimerRef.current) return;
    stageRenderTimerRef.current = window.setTimeout(() => {
      stageRenderTimerRef.current = null;
      setStageAttempts([...stageLogRef.current.attempts]);
    }, 250);
  };
  const testGroupTimerRef = useRef<number | null>(null);

  /** Logs a test-mode rep, folding reps that land together into one compound movement. */
  const recordTestRep = (exercise: ExerciseType, power: number, form: number) => {
    const now = Date.now();
    setTestCounts((prev) => ({ ...prev, [exercise]: (prev[exercise] ?? 0) + 1 }));
    setTestFlashing((prev) => (prev.includes(exercise) ? prev : [...prev, exercise]));
    window.setTimeout(() => setTestFlashing((prev) => prev.filter((e) => e !== exercise)), 700);

    const group = testGroupRef.current;
    let entry: TestRepEntry;
    if (group && now - group.at < REP_GROUP_MS) {
      entry = {
        ...group,
        exercises: group.exercises.includes(exercise) ? group.exercises : [...group.exercises, exercise],
        power: Math.max(group.power, power),
        form: Math.max(group.form, form),
      };
      setTestLog((prev) => prev.map((e) => (e.id === entry.id ? entry : e)));
    } else {
      entry = { id: now + Math.random(), at: now, exercises: [exercise], power, form };
      setTestLog((prev) => [entry, ...prev].slice(0, 50));
      // Call the movement out once its group closes, so a compound rep is one phrase
      if (testGroupTimerRef.current) clearTimeout(testGroupTimerRef.current);
      testGroupTimerRef.current = window.setTimeout(() => {
        const done = testGroupRef.current;
        if (!done || !testSpeakRef.current || !('speechSynthesis' in window)) return;
        window.speechSynthesis.cancel();
        window.speechSynthesis.speak(new SpeechSynthesisUtterance(done.exercises.map(exerciseLabel).join(' and ')));
      }, REP_GROUP_MS);
    }
    testGroupRef.current = entry;
    return entry;
  };

  const resetTest = () => {
    setTestCounts({});
    setTestLog([]);
    setTestFlashing([]);
    testGroupRef.current = null;
    stageLogRef.current.clear();
    setStageAttempts([]);
    repTotalRef.current = 0;
    setRepCount(0);
    audioManager.play('ui_move');
  };

  const toggleTestExercise = (ex: ExerciseType) => {
    setTestExercises((prev) => (prev.includes(ex) ? prev.filter((e) => e !== ex) : [...prev, ex]));
    audioManager.play('ui_move');
  };

  const startTestMode = async () => {
    setTestMode(true);
    if (!workoutStarted) await handleBeginWorkout();
  };

  // Dev: feed pose frames straight into the tracker (headless checks of tracking and the test panel)
  useEffect(() => {
    if (!import.meta.env.DEV) return;
    (window as any).__kkPhone = {
      feed: (landmarks: NormalizedLandmark[], timestampMs: number) => trackerRef.current.processLandmarks(landmarks, timestampMs),
    };
    return () => {
      delete (window as any).__kkPhone;
    };
  }, []);

  // Track every exercise in the TV's hand at once (or dedicated SQUAT on victory/cinematic, or all outside battle) and stream each rep to the TV
  useEffect(() => {
    if (testMode) {
      trackerRef.current.setExercises(testExercises);
    } else if (handMode === 'VICTORY' || handMode === 'CINEMATIC') {
      trackerRef.current.setExercises(['SQUAT']);
      setActiveExercise('SQUAT');
    } else {
      trackerRef.current.setExercises(handCards ? handCards.map((c) => c.exercise) : null);
    }
  }, [handCards, handMode, testMode, testExercises]);

  useEffect(() => {
    const tracker = trackerRef.current;
    tracker.onRepCompleted = (telemetry: RepTelemetry) => {
      const exercise = telemetry.exercise || activeExerciseRef.current;
      audioManager.play('hit');

      setActiveExercise(exercise);
      activeExerciseRef.current = exercise;
      repTotalRef.current += 1;
      setRepCount(repTotalRef.current);
      const testEntry = testModeRef.current ? recordTestRep(exercise, telemetry.power, telemetry.form) : null;
      if (testModeRef.current) {
        stageLogRef.current.onRep(exercise, telemetry.power, telemetry.form, telemetry.timestamp ?? Date.now());
        scheduleStageRender();
      }
      showRepFlash({
        power: telemetry.power,
        rep: repTotalRef.current,
        label: testEntry ? testEntry.exercises.map(exerciseLabel).join(' + ') : undefined,
      });
      setLastPower(telemetry.power);
      lastPowerRef.current = telemetry.power;
      setLastForm(telemetry.form);

      // Transmit to TV via reliable WebRTC DataChannel (test mode only when asked)
      if (!testModeRef.current || testSendToTvRef.current) networkManager.sendTelemetry({ ...telemetry, exercise });
    };

    tracker.onStageChange = (event) => {
      if (!testModeRef.current) return;
      stageLogRef.current.onStage(event);
      scheduleStageRender();
    };
    tracker.onPhasesChange = (next) => {
      setPhases(next);
      const latest = [...next.values()].find((p) => p.state > 0) ?? [...next.values()][0];
      setCurrentStateName(latest?.stateName ?? 'IDLE');
    };
    tracker.onMidRepChange = (midRep) => {
      currentStateRef.current = midRep ? 'DRIVE' : 'IDLE';
    };
    tracker.onVisibilityChange = (visible, missing) => {
      setIsFullBodyVisible(visible);
      isFullBodyVisibleRef.current = visible;
      setMissingBodyParts(missing);
    };
  }, []);

  // Initialize MediaPipe PoseLandmarker
  const initPoseLandmarker = async () => {
    if (poseLandmarkerRef.current) return;
    setModelLoading(true);
    setStatusMessage('Loading Pose Vision Model...');

    try {
      const vision = await FilesetResolver.forVisionTasks(
        'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.18/wasm'
      );

      const poseLandmarker = await PoseLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath:
            'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task',
          delegate: 'GPU',
        },
        runningMode: 'VIDEO',
        numPoses: 1,
        minPoseDetectionConfidence: 0.5,
        minPosePresenceConfidence: 0.5,
        minTrackingConfidence: 0.5,
      });

      poseLandmarkerRef.current = poseLandmarker;
      setModelReady(true);
      setModelLoading(false);
      setStatusMessage('Vision AI Ready!');
    } catch (err: any) {
      console.error('Failed to initialize PoseLandmarker:', err);
      setModelLoading(false);
      setStatusMessage('Camera Vision model fallback active.');
    }
  };

  // Start Camera Stream
  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'user',
          width: { ideal: 640 },
          height: { ideal: 480 },
        },
        audio: false,
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        setCameraActive(true);
      }
    } catch (err: any) {
      console.warn('Camera access denied or unavailable:', err);
      setStatusMessage('Camera unavailable. You can use Manual Swing Simulation below.');
    }
  };

  /**
   * CRITICAL REQUIREMENT:
   * "The /phone UI must request navigator.wakeLock.request('screen')
   * strictly inside the onClick handler of the 'Begin Workout' button."
   */
  const handleBeginWorkout = async () => {
    // 1. Strictly request screen WakeLock inside the user click gesture
    if ('wakeLock' in navigator) {
      try {
        const lock = await (navigator as any).wakeLock.request('screen');
        wakeLockRef.current = lock;
        setWakeLockActive(true);
        lock.addEventListener('release', () => {
          setWakeLockActive(false);
        });
        console.log('[PhoneView] Screen WakeLock acquired successfully.');
      } catch (err) {
        console.warn('[PhoneView] WakeLock request rejected:', err);
      }
    } else {
      console.info('[PhoneView] Screen WakeLock API not supported on this browser.');
    }

    // 2. Set workout state
    setWorkoutStarted(true);
    audioManager.play('level_up');

    // 3. Initialize Vision AI and Camera
    await initPoseLandmarker();
    await startCamera();
  };

  // Video processing render loop
  const processFrame = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const landmarker = poseLandmarkerRef.current;

    if (video && canvas && video.readyState >= 2) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        canvas.width = video.videoWidth || 640;
        canvas.height = video.videoHeight || 480;

        // Draw mirror video frame
        ctx.save();
        ctx.translate(canvas.width, 0);
        ctx.scale(-1, 1);
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        ctx.restore();

        // Detect landmarks
        if (landmarker) {
          const nowMs = performance.now();
          if (video.currentTime !== lastVideoTimeRef.current) {
            lastVideoTimeRef.current = video.currentTime;
            try {
              const results = landmarker.detectForVideo(video, nowMs);
              if (results.landmarks && results.landmarks[0]) {
                const landmarks = results.landmarks[0] as NormalizedLandmark[];
                
                // Mirror landmark X coords so they match the mirrored canvas
                const mirrored = landmarks.map(lm => ({ ...lm, x: 1 - lm.x }));
                
                // Process through Frontal Y-Axis Kinematic Tracker
                trackerRef.current.processLandmarks(mirrored, Date.now());

                // Draw retro kinematic guides on canvas
                drawKinematicHUD(ctx, canvas.width, canvas.height, mirrored);

                // Test mode: ring the hand being tracked as the one holding the bell
                if (testModeRef.current) {
                  const arm = trackerRef.current.getArm();
                  const lw = mirrored[POSE_INDEX.LEFT_WRIST];
                  const rw = mirrored[POSE_INDEX.RIGHT_WRIST];
                  const at = arm === 'LEFT' ? lw : arm === 'RIGHT' ? rw : { x: (lw.x + rw.x) / 2, y: (lw.y + rw.y) / 2 };
                  ctx.save();
                  ctx.strokeStyle = '#38B6FF';
                  ctx.lineWidth = 4;
                  ctx.beginPath();
                  ctx.arc(at.x * canvas.width, at.y * canvas.height, 26, 0, Math.PI * 2);
                  ctx.stroke();
                  ctx.fillStyle = '#38B6FF';
                  ctx.font = '10px "Press Start 2P", monospace';
                  ctx.fillText(arm === 'BOTH' ? 'BELL (2H)' : 'BELL', at.x * canvas.width - 22, at.y * canvas.height - 32);
                  ctx.restore();
                }

                // Render AR Knight Armor or Workout Skeleton based on overlay mode
                if (overlayModeRef.current === 'ARMOR') {
                  // Only render armor when camera can see most of body (down to knees)
                  if (isFullBodyVisibleRef.current) {
                    KnightArmorRenderer.drawKnightArmor(ctx, canvas.width, canvas.height, mirrored, {
                      glowPower: lastPowerRef.current,
                      activePhase: currentStateRef.current === 'DRIVE' ? 1 : 0,
                      heraldryColor: EXERCISE_SKILLS[activeExerciseRef.current]?.colorHex || '#F4B41A',
                      requireFullBody: true,
                    });
                  }
                } else if (overlayModeRef.current === 'SKELETON') {
                  drawWorkoutSkeleton(ctx, canvas.width, canvas.height, mirrored);
                }
              }
            } catch (e) {
              // Frame dropped, proceed to next
            }
          }
        }
      }
    }

    if (workoutStarted) {
      animFrameRef.current = requestAnimationFrame(processFrame);
    }
  }, [workoutStarted]);

  useEffect(() => {
    if (workoutStarted) {
      animFrameRef.current = requestAnimationFrame(processFrame);
    }
    return () => {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, [workoutStarted, processFrame]);

  // Draw 32-bit retro kinematic HUD overlay

  // Draw 32-bit retro kinematic HUD overlay adapted to current exercise
  const drawKinematicHUD = (
    ctx: CanvasRenderingContext2D,
    w: number,
    h: number,
    landmarks: NormalizedLandmark[]
  ) => {
    const lWrist = landmarks[POSE_INDEX.LEFT_WRIST];
    const rWrist = landmarks[POSE_INDEX.RIGHT_WRIST];
    const lHip = landmarks[POSE_INDEX.LEFT_HIP];
    const rHip = landmarks[POSE_INDEX.RIGHT_HIP];
    const lShoulder = landmarks[POSE_INDEX.LEFT_SHOULDER];
    const rShoulder = landmarks[POSE_INDEX.RIGHT_SHOULDER];
    const lKnee = landmarks[POSE_INDEX.LEFT_KNEE];
    const rKnee = landmarks[POSE_INDEX.RIGHT_KNEE];

    const wristY = ((lWrist.y + rWrist.y) / 2) * h;
    const wristX = ((lWrist.x + rWrist.x) / 2) * w;
    const hipY = ((lHip.y + rHip.y) / 2) * h;
    const hipX = ((lHip.x + rHip.x) / 2) * w;
    const shoulderY = ((lShoulder.y + rShoulder.y) / 2) * h;
    const kneeY = lKnee && rKnee ? ((lKnee.y + rKnee.y) / 2) * h : hipY + 80;

    const lAnkle = landmarks[POSE_INDEX.LEFT_ANKLE];
    const rAnkle = landmarks[POSE_INDEX.RIGHT_ANKLE];
    const nose = landmarks[POSE_INDEX.NOSE];

    const ankleY = lAnkle && rAnkle ? ((lAnkle.y + rAnkle.y) / 2) * h : hipY + 160;
    const noseX = nose ? nose.x * w : w / 2;
    const noseY = nose ? nose.y * h : shoulderY - 40;

    ctx.save();
    ctx.lineWidth = 3;
    ctx.font = '10px "Press Start 2P", monospace';

    if (activeExerciseRef.current === 'SQUAT') {
      // Squat HUD: Track Hip relative to Knee
      ctx.strokeStyle = '#FF3366';
      ctx.setLineDash([8, 6]);
      ctx.beginPath();
      ctx.moveTo(w * 0.1, kneeY - 15);
      ctx.lineTo(w * 0.9, kneeY - 15);
      ctx.stroke();

      ctx.fillStyle = '#FF3366';
      ctx.fillText('PARALLEL DEPTH', 20, kneeY - 22);

      // Hip Center Indicator (Gold)
      ctx.fillStyle = '#F4B41A';
      ctx.setLineDash([]);
      ctx.beginPath();
      ctx.arc(hipX, hipY, 12, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

    } else if (activeExerciseRef.current === 'OVERHEAD_PRESS') {
      // Press HUD: Track Wrists from Shoulder Rack to Overhead Reach
      const overheadY = Math.max(20, shoulderY - (hipY - shoulderY) * 0.6);

      ctx.strokeStyle = '#38B6FF';
      ctx.setLineDash([8, 6]);
      ctx.beginPath();
      ctx.moveTo(w * 0.1, overheadY);
      ctx.lineTo(w * 0.9, overheadY);
      ctx.stroke();

      ctx.fillStyle = '#38B6FF';
      ctx.fillText('OVERHEAD LOCKOUT', 20, overheadY - 8);

      ctx.strokeStyle = '#F4B41A';
      ctx.beginPath();
      ctx.moveTo(w * 0.1, shoulderY);
      ctx.lineTo(w * 0.9, shoulderY);
      ctx.stroke();

      ctx.fillStyle = '#F4B41A';
      ctx.fillText('SHOULDER RACK', 20, shoulderY + 18);

      ctx.fillStyle = '#38B6FF';
      ctx.setLineDash([]);
      ctx.beginPath();
      ctx.arc(wristX, wristY, 12, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

    } else if (activeExerciseRef.current === 'CLEAN_AND_PRESS') {
      // Clean and Press: Hang, Rack, and Overhead
      const overheadY = Math.max(20, shoulderY - (hipY - shoulderY) * 0.6);

      ctx.strokeStyle = '#38B6FF';
      ctx.setLineDash([8, 6]);
      ctx.beginPath();
      ctx.moveTo(w * 0.1, overheadY);
      ctx.lineTo(w * 0.9, overheadY);
      ctx.stroke();
      ctx.fillStyle = '#38B6FF';
      ctx.fillText('OVERHEAD PRESS', 20, overheadY - 8);

      ctx.strokeStyle = '#F97316';
      ctx.beginPath();
      ctx.moveTo(w * 0.1, shoulderY);
      ctx.lineTo(w * 0.9, shoulderY);
      ctx.stroke();
      ctx.fillStyle = '#F97316';
      ctx.fillText('RACK STAGE', 20, shoulderY + 18);

      ctx.strokeStyle = '#FF3366';
      ctx.beginPath();
      ctx.moveTo(w * 0.1, hipY);
      ctx.lineTo(w * 0.9, hipY);
      ctx.stroke();
      ctx.fillStyle = '#FF3366';
      ctx.fillText('HANG CLEAN', 20, hipY + 18);

    } else if (activeExerciseRef.current === 'SNATCH') {
      // Snatch HUD: Hike and continuous overhead punch-through
      const overheadY = Math.max(20, shoulderY - (hipY - shoulderY) * 0.65);

      ctx.strokeStyle = '#EF4444';
      ctx.setLineDash([8, 6]);
      ctx.beginPath();
      ctx.moveTo(w * 0.1, overheadY);
      ctx.lineTo(w * 0.9, overheadY);
      ctx.stroke();
      ctx.fillStyle = '#EF4444';
      ctx.fillText('SNATCH LOCKOUT', 20, overheadY - 8);

      ctx.strokeStyle = '#F4B41A';
      ctx.beginPath();
      ctx.moveTo(w * 0.1, hipY);
      ctx.lineTo(w * 0.9, hipY);
      ctx.stroke();
      ctx.fillStyle = '#F4B41A';
      ctx.fillText('BACKSWING HIKE', 20, hipY + 18);

    } else if (activeExerciseRef.current === 'WINDMILL') {
      // Windmill HUD: Overhead locked arm and floor ankle touch target
      ctx.strokeStyle = '#00EB88';
      ctx.setLineDash([8, 6]);
      ctx.beginPath();
      ctx.moveTo(w * 0.1, ankleY - 20);
      ctx.lineTo(w * 0.9, ankleY - 20);
      ctx.stroke();
      ctx.fillStyle = '#00EB88';
      ctx.fillText('ANKLE TOUCH TARGET', 20, ankleY - 28);

      ctx.fillStyle = '#00EB88';
      ctx.setLineDash([]);
      ctx.beginPath();
      ctx.arc(wristX, wristY, 10, 0, Math.PI * 2);
      ctx.fill();

    } else if (activeExerciseRef.current === 'DEADLIFT') {
      // Deadlift HUD: Shin floor pickup and Hip Lockout (Keep below shoulders!)
      ctx.strokeStyle = '#D97706';
      ctx.setLineDash([8, 6]);
      ctx.beginPath();
      ctx.moveTo(w * 0.1, hipY);
      ctx.lineTo(w * 0.9, hipY);
      ctx.stroke();
      ctx.fillStyle = '#D97706';
      ctx.fillText('HIP LOCKOUT', 20, hipY - 10);

      ctx.strokeStyle = '#84CC16';
      ctx.beginPath();
      ctx.moveTo(w * 0.1, kneeY + 25);
      ctx.lineTo(w * 0.9, kneeY + 25);
      ctx.stroke();
      ctx.fillStyle = '#84CC16';
      ctx.fillText('SHIN SETUP', 20, kneeY + 40);

    } else if (activeExerciseRef.current === 'THRUSTER') {
      // Thruster HUD: Deep Squat + Overhead Lockout
      const overheadY = Math.max(20, shoulderY - (hipY - shoulderY) * 0.6);

      ctx.strokeStyle = '#F59E0B';
      ctx.setLineDash([8, 6]);
      ctx.beginPath();
      ctx.moveTo(w * 0.1, overheadY);
      ctx.lineTo(w * 0.9, overheadY);
      ctx.stroke();
      ctx.fillStyle = '#F59E0B';
      ctx.fillText('OVERHEAD THRUST', 20, overheadY - 8);

      ctx.strokeStyle = '#FF3366';
      ctx.beginPath();
      ctx.moveTo(w * 0.1, kneeY - 15);
      ctx.lineTo(w * 0.9, kneeY - 15);
      ctx.stroke();
      ctx.fillStyle = '#FF3366';
      ctx.fillText('SQUAT HOLE', 20, kneeY - 22);

    } else if (activeExerciseRef.current === 'GORILLA_ROW') {
      // Gorilla Row HUD: Hinged pull to rib line
      ctx.strokeStyle = '#84CC16';
      ctx.setLineDash([8, 6]);
      ctx.beginPath();
      ctx.moveTo(w * 0.1, hipY - 15);
      ctx.lineTo(w * 0.9, hipY - 15);
      ctx.stroke();
      ctx.fillStyle = '#84CC16';
      ctx.fillText('RIB CONTRACTION', 20, hipY - 22);

    } else if (activeExerciseRef.current === 'AROUND_THE_BODY') {
      // Around-the-Body Pass HUD: Waist / Hip Orbit Ellipse
      ctx.strokeStyle = '#818CF8';
      ctx.setLineDash([6, 4]);
      ctx.beginPath();
      ctx.ellipse(w * 0.5, hipY, 80, 28, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = '#818CF8';
      ctx.fillText('WAIST ORBIT', w * 0.5 - 45, hipY - 35);

    } else if (activeExerciseRef.current === 'SINGLE_LEG_RDL') {
      // Single-Leg RDL HUD: Planted knee depth and horizontal trail leg line
      ctx.strokeStyle = '#EC4899';
      ctx.setLineDash([8, 6]);
      ctx.beginPath();
      ctx.moveTo(w * 0.1, kneeY);
      ctx.lineTo(w * 0.9, kneeY);
      ctx.stroke();
      ctx.fillStyle = '#EC4899';
      ctx.fillText('PLANTED KNEE LEVEL', 20, kneeY - 10);

    } else {
      // Swing HUD: Shoulder Lockout & Hip Hike Lines
      ctx.strokeStyle = '#38B6FF';
      ctx.setLineDash([8, 6]);
      ctx.beginPath();
      ctx.moveTo(w * 0.1, shoulderY);
      ctx.lineTo(w * 0.9, shoulderY);
      ctx.stroke();

      ctx.strokeStyle = '#FF3366';
      ctx.beginPath();
      ctx.moveTo(w * 0.1, hipY);
      ctx.lineTo(w * 0.9, hipY);
      ctx.stroke();

      ctx.fillStyle = '#38B6FF';
      ctx.fillText('LOCKOUT LINE', 20, shoulderY - 8);

      ctx.fillStyle = '#FF3366';
      ctx.fillText('HIKE LINE', 20, hipY + 20);

      // Wrist Center Indicator (Gold)
      ctx.fillStyle = '#F4B41A';
      ctx.setLineDash([]);
      ctx.beginPath();
      ctx.arc(wristX, wristY, 12, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }

    ctx.restore();
  };

  /**
   * Draws a complete 32-bit retro workout skeleton over the camera viewfinder.
   * Visualizes all MediaPipe detected joints and bone connections so the user can verify pose tracking.
   */
  const drawWorkoutSkeleton = (
    ctx: CanvasRenderingContext2D,
    w: number,
    h: number,
    landmarks: NormalizedLandmark[]
  ) => {
    if (!landmarks || landmarks.length < 29) return;

    // Bone connections (from joint idx -> to joint idx)
    const connections = [
      // Shoulders & Spine / Torso Box
      { from: POSE_INDEX.LEFT_SHOULDER, to: POSE_INDEX.RIGHT_SHOULDER, color: '#F4B41A', width: 4 },
      { from: POSE_INDEX.LEFT_SHOULDER, to: POSE_INDEX.LEFT_HIP, color: '#38B6FF', width: 3 },
      { from: POSE_INDEX.RIGHT_SHOULDER, to: POSE_INDEX.RIGHT_HIP, color: '#38B6FF', width: 3 },
      { from: POSE_INDEX.LEFT_HIP, to: POSE_INDEX.RIGHT_HIP, color: '#FF3366', width: 4 },

      // Left Arm (Shoulder -> Elbow -> Wrist)
      { from: POSE_INDEX.LEFT_SHOULDER, to: POSE_INDEX.LEFT_ELBOW, color: '#38B6FF', width: 3.5 },
      { from: POSE_INDEX.LEFT_ELBOW, to: POSE_INDEX.LEFT_WRIST, color: '#F4B41A', width: 3.5 },

      // Right Arm (Shoulder -> Elbow -> Wrist)
      { from: POSE_INDEX.RIGHT_SHOULDER, to: POSE_INDEX.RIGHT_ELBOW, color: '#38B6FF', width: 3.5 },
      { from: POSE_INDEX.RIGHT_ELBOW, to: POSE_INDEX.RIGHT_WRIST, color: '#F4B41A', width: 3.5 },

      // Left Leg (Hip -> Knee -> Ankle)
      { from: POSE_INDEX.LEFT_HIP, to: POSE_INDEX.LEFT_KNEE, color: '#FF3366', width: 4 },
      { from: POSE_INDEX.LEFT_KNEE, to: POSE_INDEX.LEFT_ANKLE, color: '#38B6FF', width: 3.5 },

      // Right Leg (Hip -> Knee -> Ankle)
      { from: POSE_INDEX.RIGHT_HIP, to: POSE_INDEX.RIGHT_KNEE, color: '#FF3366', width: 4 },
      { from: POSE_INDEX.RIGHT_KNEE, to: POSE_INDEX.RIGHT_ANKLE, color: '#38B6FF', width: 3.5 },
    ];

    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // 1. Draw Bones / Connectors
    for (const conn of connections) {
      const p1 = landmarks[conn.from];
      const p2 = landmarks[conn.to];
      if (!p1 || !p2) continue;

      const x1 = p1.x * w;
      const y1 = p1.y * h;
      const x2 = p2.x * w;
      const y2 = p2.y * h;

      // Outer colored neon bone
      ctx.strokeStyle = conn.color;
      ctx.lineWidth = conn.width;
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();

      // Inner white neon core
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = Math.max(1, conn.width - 2);
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
    }

    // 2. Draw Joint Spheres / Nodes
    const jointIndices = [
      POSE_INDEX.LEFT_SHOULDER, POSE_INDEX.RIGHT_SHOULDER,
      POSE_INDEX.LEFT_ELBOW, POSE_INDEX.RIGHT_ELBOW,
      POSE_INDEX.LEFT_WRIST, POSE_INDEX.RIGHT_WRIST,
      POSE_INDEX.LEFT_HIP, POSE_INDEX.RIGHT_HIP,
      POSE_INDEX.LEFT_KNEE, POSE_INDEX.RIGHT_KNEE,
      POSE_INDEX.LEFT_ANKLE, POSE_INDEX.RIGHT_ANKLE,
    ];

    for (const idx of jointIndices) {
      const lm = landmarks[idx];
      if (!lm) continue;

      const jx = lm.x * w;
      const jy = lm.y * h;
      const isWrist = idx === POSE_INDEX.LEFT_WRIST || idx === POSE_INDEX.RIGHT_WRIST;
      const isHip = idx === POSE_INDEX.LEFT_HIP || idx === POSE_INDEX.RIGHT_HIP;
      const isKnee = idx === POSE_INDEX.LEFT_KNEE || idx === POSE_INDEX.RIGHT_KNEE;

      const nodeRadius = isWrist ? 7 : (isHip || isKnee) ? 6 : 5;
      const nodeColor = isWrist ? '#F4B41A' : isHip ? '#FF3366' : '#38B6FF';

      // Outer joint border
      ctx.fillStyle = nodeColor;
      ctx.beginPath();
      ctx.arc(jx, jy, nodeRadius, 0, Math.PI * 2);
      ctx.fill();

      // Inner white core
      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath();
      ctx.arc(jx, jy, nodeRadius * 0.45, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  };

  // Manual Demo Swing Simulation Trigger (For quick testing without webcam)
  const handleSimulateSwing = () => {
    const simulatedPower = Math.floor(75 + Math.random() * 35);
    const simulatedForm = Number((0.92 + Math.random() * 0.08).toFixed(2));
    const exercise = handCards ? handCards[Math.floor(Math.random() * handCards.length)].exercise : activeExercise;
    repTotalRef.current += 1;
    const nextCount = repTotalRef.current;

    setActiveExercise(exercise);
    activeExerciseRef.current = exercise;
    setRepCount(nextCount);
    setLastPower(simulatedPower);
    setLastForm(simulatedForm);
    audioManager.play('hit');

    showRepFlash({ power: simulatedPower, rep: nextCount });

    const telemetry: RepTelemetry = {
      event: 'REP_TRIGGER',
      exercise,
      skillName: EXERCISE_SKILLS[exercise]?.skillName,
      power: simulatedPower,
      form: simulatedForm,
      repCount: nextCount,
      state: 2,
      timestamp: Date.now(),
    };

    networkManager.sendTelemetry(telemetry);
  };

  const linked = netState === 'CONNECTED';
  const seeking = netState === 'WAITING_FOR_PEER' || netState === 'INITIALIZING';

  // ---------------------------------------------------------------------------
  // Before the workout: pair with the TV, then take up the bell
  // ---------------------------------------------------------------------------
  if (!workoutStarted) {
    return (
      <div className="kk-phone crt-overlay relative flex flex-col items-center gap-6 px-4 pt-8 pb-10 select-none">
        <div className="kk-phone-plate">
          <span className="kk-phone-gem" />
          KETTLEBELL KNIGHT
          <span className="kk-phone-gem" />
        </div>
        <p className="kk-phone-tome text-center max-w-xs -mt-2">
          Thy phone is the knight&apos;s eye. Bind it to the TV, then stand before it with thy bell.
        </p>

        {/* Pairing: TVs found on the local WiFi, or a room code */}
        <section className="kk-phone-slab w-full max-w-md p-5 space-y-4">
          <div className="flex items-center justify-between gap-2">
            <h2 className="kk-phone-heading text-[13px] text-[#F4D35E] flex items-center gap-2">
              <Tv className="w-4 h-4" /> THE TV ROOM
            </h2>
            <span className={`kk-phone-chip ${linked ? 'kk-phone-chip--ok' : seeking ? 'kk-phone-chip--gold' : 'kk-phone-chip--bad'}`}>
              {linked ? 'BOUND' : seeking ? 'SEEKING' : 'UNBOUND'}
            </span>
          </div>

          {!linked && (
            <div className="space-y-2">
              {discoveredTVs.map((tv) => (
                <button
                  key={tv.roomId}
                  onClick={() => handleConnect(tv.roomId)}
                  className="w-full flex items-center justify-between gap-3 p-3 bg-[#0B0A10]/80 border-2 border-[#00EB88]/70 text-left active:translate-x-0.5 active:translate-y-0.5"
                >
                  <span>
                    <span className="block font-pixel text-[9px] text-[#ECE2CA]">{tv.name}</span>
                    <span className="block kk-phone-tome text-[#F4D35E]">{tv.roomId}</span>
                  </span>
                  <span className="kk-phone-btn kk-phone-btn--sm">BIND</span>
                </button>
              ))}
              {LAN_DISCOVERY && (
                <button onClick={scanWifi} disabled={isScanningWifi} className="kk-phone-btn kk-phone-btn--iron w-full">
                  <Wifi className={`w-4 h-4 ${isScanningWifi ? 'animate-pulse' : ''}`} />
                  {isScanningWifi ? 'SEARCHING THE WIFI…' : discoveredTVs.length ? 'SEARCH AGAIN' : 'SEARCH THE WIFI'}
                </button>
              )}
            </div>
          )}

          <div className="space-y-1.5">
            <div className="font-pixel text-[8px] text-[#A7A9BE]">OR SPEAK THE ROOM CODE</div>
            <div className="flex gap-2">
              <input
                type="text"
                value={roomId}
                onChange={(e) => setRoomId(e.target.value.toUpperCase())}
                placeholder="KNIGHT-42"
                className="kk-phone-input"
              />
              <button
                onClick={() => handleConnect(roomId)}
                disabled={linked || !roomId}
                className="kk-phone-btn kk-phone-btn--iron shrink-0"
              >
                BIND
              </button>
            </div>
          </div>

          <p className="kk-phone-tome text-[16px]">{statusMessage}</p>
        </section>

        {/* Begin: the wake lock must be requested inside this click */}
        <section className="kk-phone-slab kk-phone-slab--gold w-full max-w-md p-5 text-center space-y-4">
          <h2 className="kk-phone-heading text-[15px] text-[#F4D35E]">PREPARE FOR BATTLE</h2>
          <p className="kk-phone-tome">
            Stand the phone upright a few paces away, so it sees thee from head to knee — facing it or side-on.
          </p>
          <button onClick={handleBeginWorkout} className="kk-phone-btn w-full py-4 text-[12px]">
            <Swords className="w-4 h-4" /> BEGIN WORKOUT
          </button>
          <button onClick={startTestMode} className="kk-phone-btn kk-phone-btn--iron w-full">
            TEST TRACKING
          </button>
          <p className="kk-phone-tome text-[15px] text-[#8A8295]">Asks for the camera and keeps the screen awake.</p>
        </section>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // The workout: the camera fills the screen; the cards live on the TV
  // ---------------------------------------------------------------------------
  const tracking = testMode
    ? `TEST • ${testExercises.length} WATCHED`
    : handMode === 'VICTORY'
    ? 'VICTORY • SQUAT TO PROCEED'
    : handMode === 'CINEMATIC'
    ? 'CHRONICLE • SQUAT TO ADVANCE'
    : handCards
    ? `IN BATTLE • ${handCards.length} EXERCISES WATCHED`
    : 'NO BATTLE • ALL EXERCISES WATCHED';

  return (
    <div className="kk-phone fixed inset-0 overflow-hidden bg-black select-none">
      <video ref={videoRef} playsInline muted className="hidden" />
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full object-contain pixelated" />
      <div className="absolute inset-0 kk-phone-vignette" />

      {/* Top HUD: link, phase, body check, overlay */}
      <div
        className="absolute inset-x-0 top-0 z-20 flex items-start justify-between gap-2 px-3"
        style={{ paddingTop: 'max(12px, env(safe-area-inset-top))' }}
      >
        <div className="flex flex-col items-start gap-1.5 min-w-0">
          <span className={`kk-phone-chip ${linked ? 'kk-phone-chip--ok' : 'kk-phone-chip--bad'}`}>
            <span className="kk-phone-gem" style={{ background: linked ? '#00EB88' : '#FF3366' }} />
            {linked ? `BOUND ${roomId}` : 'NOT BOUND TO TV'}
          </span>
          <span className="kk-phone-chip kk-phone-chip--gold max-w-[60vw] truncate">{currentStateName}</span>
        </div>
        <div className="flex flex-col items-end gap-1.5">
          <span className={`kk-phone-chip ${isFullBodyVisible ? 'kk-phone-chip--ok' : 'kk-phone-chip--bad animate-pulse'}`}>
            {isFullBodyVisible ? 'IN SIGHT' : 'STEP BACK'}
          </span>
          <button onClick={cycleOverlayMode} className="kk-phone-chip">
            {overlayMode === 'ARMOR' ? 'ARMOR' : overlayMode === 'SKELETON' ? 'BONES' : 'NO OVERLAY'}
          </button>
          {!testMode && !handCards && (
            <button onClick={() => setTestMode(true)} className="kk-phone-chip kk-phone-chip--gold">
              TEST TRACKING
            </button>
          )}
          {import.meta.env.DEV && !testMode && (
            <button onClick={handleSimulateSwing} className="kk-phone-chip" title="Dev: send a simulated rep">
              <Zap className="w-3 h-3" /> SIM REP
            </button>
          )}
        </div>
      </div>

      {/* Out of sight: say what the camera is missing */}
      {!isFullBodyVisible && (
        <div className="absolute inset-x-6 top-[22%] z-20 kk-phone-slab kk-phone-slab--glass p-4 text-center">
          <div className="kk-phone-heading text-[13px] text-[#FF8FA8]">STEP BACK, KNIGHT</div>
          <p className="kk-phone-tome mt-1">
            The eye cannot see thy <span className="text-[#F4D35E]">{missingBodyParts.join(' & ').toLowerCase()}</span>.
          </p>
        </div>
      )}

      {/* Rep struck */}
      {repFlash && (
        <div key={repFlash.rep} className="absolute inset-0 z-30 pointer-events-none flex items-center justify-center">
          <div className="kk-phone-rep flex flex-col items-center gap-2">
            <div className="kk-phone-plate">
              <span className="kk-phone-gem" />
              REP {repFlash.rep}
              <span className="kk-phone-gem" />
            </div>
            {repFlash.label && <div className="kk-phone-heading text-[18px] text-white text-center px-6">{repFlash.label}</div>}
            <div className="font-pixel text-[11px] text-[#38B6FF]" style={{ textShadow: '2px 2px 0 #000' }}>
              +{repFlash.power} POWER
            </div>
          </div>
        </div>
      )}

      {/* Bottom: the test drawer, or the knight's tally */}
      <div
        className="absolute inset-x-0 bottom-0 z-20 px-3"
        style={{ paddingBottom: 'max(12px, env(safe-area-inset-bottom))' }}
      >
        {testMode ? (
          <TrackingTestPanel
            tracked={testExercises}
            onToggleExercise={toggleTestExercise}
            onSetTracked={setTestExercises}
            counts={testCounts}
            phases={phases}
            flashing={testFlashing}
            log={testLog}
            stageAttempts={stageAttempts}
            sendToTv={testSendToTv}
            onToggleSendToTv={() => setTestSendToTv((v) => !v)}
            speak={testSpeak}
            onToggleSpeak={() => setTestSpeak((v) => !v)}
            onReset={resetTest}
            onExit={() => setTestMode(false)}
          />
        ) : (
          <div className="kk-phone-slab kk-phone-slab--glass px-4 pt-3 pb-4">
            <div className="flex justify-center -mt-7 mb-2">
              <span className="kk-phone-plate kk-phone-plate--sm">{tracking}</span>
            </div>
            <div className="grid grid-cols-3 text-center">
              <div>
                <div className="font-pixel text-[8px] text-[#A7A9BE]">REPS</div>
                <div className="kk-phone-heading text-[26px] text-[#F4D35E]">{repCount}</div>
              </div>
              <div>
                <div className="font-pixel text-[8px] text-[#A7A9BE]">POWER</div>
                <div className="kk-phone-heading text-[26px] text-[#38B6FF]">{lastPower}</div>
              </div>
              <div>
                <div className="font-pixel text-[8px] text-[#A7A9BE]">FORM</div>
                <div className="kk-phone-heading text-[26px] text-[#00EB88]">{Math.round(lastForm * 100)}%</div>
              </div>
            </div>
            {wakeLockActive && <div className="kk-phone-tome text-[14px] text-center text-[#8A8295] mt-1">The screen stays awake.</div>}
          </div>
        )}
      </div>
    </div>
  );
};
