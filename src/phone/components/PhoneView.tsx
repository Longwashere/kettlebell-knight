import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { FilesetResolver, PoseLandmarker } from '@mediapipe/tasks-vision';
import { KinematicTracker, KinematicStateUpdate, NormalizedLandmark, POSE_INDEX } from '../utils/KinematicTracker';
import { networkManager, NetworkConnectionState } from '../../shared/NetworkManager';
import { RepTelemetry, ExerciseType, EXERCISE_SKILLS } from '../../types/game';
import { CombatCard } from '../../types/battle';
import { CardDeckManager } from '../../shared/CardDeckManager';
import { audioManager } from '../../shared/AudioManager';
import { 
  Camera, 
  Smartphone, 
  Tv, 
  Flame, 
  CheckCircle2, 
  AlertCircle, 
  Zap, 
  ShieldAlert, 
  Activity, 
  RefreshCw,
  Swords,
  Shield,
  ZapOff
} from 'lucide-react';

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
  const [activeExercise, setActiveExercise] = useState<ExerciseType>('SWING');

  // Slay the Spire 5-Card Hand State
  const deckManagerRef = useRef<CardDeckManager>(new CardDeckManager());
  const [handCards, setHandCards] = useState<CombatCard[]>(() => deckManagerRef.current.getHand());

  // Live telemetry display
  const [repCount, setRepCount] = useState<number>(0);
  const [lastPower, setLastPower] = useState<number>(0);
  const [lastForm, setLastForm] = useState<number>(1.0);
  const [currentStateName, setCurrentStateName] = useState<string>('IDLE');

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const poseLandmarkerRef = useRef<PoseLandmarker | null>(null);
  const trackerRef = useRef<KinematicTracker>(new KinematicTracker());
  const wakeLockRef = useRef<any>(null);
  const animFrameRef = useRef<number | null>(null);
  const lastVideoTimeRef = useRef<number>(-1);

  // Subscribe to NetworkManager state
  useEffect(() => {
    const unsub = networkManager.onStateChange((state, info) => {
      setNetState(state);
      if (info) setStatusMessage(info);
    });

    // Auto-connect if room is present in URL
    if (roomFromQuery) {
      handleConnect(roomFromQuery);
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
      setStatusMessage(`Pairing with ${cleanRoom}...`);
      await networkManager.connectToHost(cleanRoom);
    } catch (err: any) {
      setStatusMessage(`Pairing failed: ${err?.message || 'Check Room ID'}`);
    }
  };

  // Visual rep flash banner state
  const [repFlash, setRepFlash] = useState<{ show: boolean; power: number; rep: number } | null>(null);

  // Setup tracker callback to broadcast telemetry to TV
  useEffect(() => {
    trackerRef.current.onRepCompleted = (telemetry: RepTelemetry) => {
      const exercise = telemetry.exercise || activeExercise;
      const cardResult = deckManagerRef.current.recordRep(exercise, telemetry.power, telemetry.form);
      setHandCards(cardResult.hand);

      audioManager.play(cardResult.activated ? 'crit' : 'hit');

      setRepCount((prev) => prev + 1);
      setLastPower(telemetry.power);
      setLastForm(telemetry.form);

      setRepFlash({ show: true, power: telemetry.power, rep: (telemetry.repCount || 0) + 1 });
      setTimeout(() => setRepFlash(null), 900);

      // Transmit to TV via reliable WebRTC DataChannel
      networkManager.sendTelemetry({
        ...telemetry,
        exercise,
        skillName: cardResult.activated && cardResult.card ? cardResult.card.name : undefined,
      });
    };

    trackerRef.current.onStateChange = (update: KinematicStateUpdate) => {
      setCurrentStateName(update.stateName);
    };
  }, [activeExercise]);

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
  const handleSelectExercise = (ex: ExerciseType) => {
    trackerRef.current.setExercise(ex);
    setActiveExercise(ex);
    audioManager.play('ui_select');
  };

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

    ctx.save();
    ctx.lineWidth = 3;
    ctx.font = '11px "Press Start 2P", monospace';

    if (activeExercise === 'SQUAT') {
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

    } else if (activeExercise === 'OVERHEAD_PRESS') {
      // Press HUD: Track Wrists from Shoulder Rack to Overhead Reach
      const overheadY = Math.max(15, shoulderY - (hipY - shoulderY) * 0.6);

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

      // Wrist Center Indicator
      ctx.fillStyle = '#38B6FF';
      ctx.setLineDash([]);
      ctx.beginPath();
      ctx.arc(wristX, wristY, 12, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

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

  // Manual Demo Swing Simulation Trigger (For quick testing without webcam)
  const handleSimulateSwing = () => {
    const simulatedPower = Math.floor(75 + Math.random() * 35);
    const simulatedForm = Number((0.92 + Math.random() * 0.08).toFixed(2));
    const nextCount = repCount + 1;

    const cardResult = deckManagerRef.current.recordRep(activeExercise, simulatedPower, simulatedForm);
    setHandCards(cardResult.hand);

    setRepCount(nextCount);
    setLastPower(simulatedPower);
    setLastForm(simulatedForm);
    audioManager.play(cardResult.activated ? 'crit' : 'hit');

    setRepFlash({ show: true, power: simulatedPower, rep: nextCount });
    setTimeout(() => setRepFlash(null), 900);

    const telemetry: RepTelemetry = {
      event: 'REP_TRIGGER',
      exercise: activeExercise,
      skillName: cardResult.activated && cardResult.card ? cardResult.card.name : EXERCISE_SKILLS[activeExercise]?.skillName,
      power: simulatedPower,
      form: simulatedForm,
      repCount: nextCount,
      state: 2,
      timestamp: Date.now(),
    };

    networkManager.sendTelemetry(telemetry);
  };

  return (
    <div className="min-h-screen bg-[#0F0E17] text-white flex flex-col font-sans select-none crt-overlay">
      {/* Top Retro Header */}
      <header className="border-b-4 border-[#2E2B44] bg-[#1A1926] px-4 py-3 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 rounded bg-[#F4B41A] text-[#0F0E17] flex items-center justify-center font-bold text-lg font-pixel shadow-pixel-box">
            ⚔
          </div>
          <div>
            <h1 className="text-xs font-pixel text-[#F4B41A] tracking-wider">KETTLEBELL KNIGHT</h1>
            <p className="text-[10px] text-[#A7A9BE] font-mono">Mobile Vision Companion</p>
          </div>
        </div>

        {/* Pairing Status Pill */}
        <div className="flex items-center space-x-2 text-xs font-mono">
          <span
            className={`w-3 h-3 rounded-full border-2 border-black ${
              netState === 'CONNECTED'
                ? 'bg-[#00EB88] animate-pulse'
                : netState === 'WAITING_FOR_PEER' || netState === 'INITIALIZING'
                ? 'bg-[#F4B41A] animate-ping'
                : 'bg-[#FF3366]'
            }`}
          />
          <span className="font-pixel text-[10px] text-[#A7A9BE]">
            {netState === 'CONNECTED' ? 'PAIRED' : 'UNPAIRED'}
          </span>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col p-4 max-w-md mx-auto w-full space-y-4">
        {/* Pairing Setup Card */}
        <section className="bg-[#1A1926] border-4 border-[#2E2B44] p-4 rounded shadow-pixel-box">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-pixel text-[#38B6FF] flex items-center gap-2">
              <Tv className="w-4 h-4" /> TV ROOM PAIRING
            </span>
            {netState === 'CONNECTED' && (
              <span className="text-[10px] bg-[#00EB88]/20 text-[#00EB88] px-2 py-0.5 font-pixel border border-[#00EB88]">
                LINK ACTIVE
              </span>
            )}
          </div>

          <div className="flex gap-2">
            <input
              type="text"
              value={roomId}
              onChange={(e) => setRoomId(e.target.value.toUpperCase())}
              placeholder="E.G. KNIGHT-42"
              className="flex-1 bg-[#0F0E17] border-2 border-[#2E2B44] px-3 py-2 text-sm font-mono text-[#F4B41A] uppercase tracking-wider focus:outline-none focus:border-[#38B6FF]"
            />
            <button
              onClick={() => handleConnect(roomId)}
              disabled={netState === 'CONNECTED' || !roomId}
              className="bg-[#38B6FF] hover:bg-[#38B6FF]/80 disabled:opacity-50 text-[#0F0E17] font-pixel text-[10px] px-4 py-2 border-2 border-black shadow-pixel-box active:translate-x-0.5 active:translate-y-0.5"
            >
              PAIR
            </button>
          </div>

          <p className="text-[10px] text-[#A7A9BE] mt-2 font-mono flex items-center gap-1.5">
            <Activity className="w-3.5 h-3.5 text-[#F4B41A]" />
            {statusMessage}
          </p>
        </section>

        {/* Workout Controller & WakeLock Action */}
        {!workoutStarted ? (
          <div className="bg-[#1A1926] border-4 border-[#F4B41A] p-6 text-center space-y-4 shadow-pixel-box-gold">
            <div className="w-16 h-16 mx-auto bg-[#F4B41A]/10 border-2 border-[#F4B41A] flex items-center justify-center rounded-full">
              <Flame className="w-8 h-8 text-[#F4B41A] animate-bounce" />
            </div>
            <div>
              <h2 className="font-pixel text-sm text-[#F4B41A]">PREPARE WORKOUT</h2>
              <p className="text-xs text-[#A7A9BE] mt-1 font-mono">
                Place phone upright on the floor facing you. Ensure full body is visible from head to hips.
              </p>
            </div>

            {/* CRITICAL: Begin Workout Button with WakeLock */}
            <button
              onClick={handleBeginWorkout}
              className="w-full bg-[#F4B41A] hover:bg-[#ffe175] text-[#0F0E17] font-pixel text-xs py-4 px-6 border-4 border-black shadow-pixel-box transition-all transform active:translate-x-1 active:translate-y-1"
            >
              ⚡ BEGIN WORKOUT
            </button>
            <p className="text-[9px] text-[#A7A9BE] font-mono">
              Requests Screen WakeLock & Camera Vision
            </p>
          </div>
        ) : (
          /* Live Camera Viewfinder & Pose HUD */
          <div className="space-y-4">
            {/* Slay the Spire 5-Card Combat Hand */}
            <div className="space-y-1">
              <div className="flex items-center justify-between text-[8px] font-pixel text-[#F4B41A]">
                <span>🎴 CARDS IN HAND (5 UNIQUE EXERCISES)</span>
                <span className="text-[#38B6FF]">TAP CARD TO FOCUS</span>
              </div>

              <div className="grid grid-cols-5 gap-1">
                {handCards.map((card) => {
                  const isSelected = activeExercise === card.exercise;
                  const progress = Math.min(100, (card.currentReps / card.requiredReps) * 100);

                  return (
                    <button
                      key={card.id}
                      onClick={() => handleSelectExercise(card.exercise)}
                      className={`p-1 rounded border-2 transition-all flex flex-col justify-between text-left h-24 ${
                        isSelected
                          ? 'bg-[#242138] border-[#F4B41A] shadow-pixel-box scale-102 z-10'
                          : 'bg-[#0F0E17] border-[#2E2B44] hover:border-[#38B6FF]'
                      }`}
                      style={{
                        borderColor: isSelected ? '#F4B41A' : card.colorHex,
                      }}
                    >
                      <div>
                        <div className="flex justify-between items-center text-[10px]">
                          <span>{card.icon}</span>
                          <span className="text-[7px] font-pixel text-[#A7A9BE]">
                            {card.damage > 0 ? `⚔️${card.damage}` : `🛡️${card.block}`}
                          </span>
                        </div>
                        <div className="font-pixel text-[7px] text-white truncate mt-1">
                          {card.name}
                        </div>
                        <div className="text-[6px] font-mono uppercase text-[#A7A9BE] truncate">
                          {card.exercise}
                        </div>
                      </div>

                      <div>
                        <div className="text-[8px] font-mono text-[#F4B41A] font-bold">
                          {card.currentReps}/{card.requiredReps}
                        </div>
                        <div className="w-full h-1.5 bg-[#0F0E17] border border-[#2E2B44] rounded-sm overflow-hidden mt-0.5">
                          <div
                            className="h-full transition-all duration-200"
                            style={{
                              width: `${progress}%`,
                              backgroundColor: card.colorHex,
                            }}
                          />
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="relative bg-black border-4 border-[#38B6FF] aspect-[4/3] overflow-hidden shadow-pixel-box">
              {/* Hidden raw video element */}
              <video
                ref={videoRef}
                playsInline
                muted
                className="hidden"
              />

              {/* Viewfinder Canvas Overlay */}
              <canvas
                ref={canvasRef}
                className="w-full h-full object-cover pixelated"
              />

              {/* Kinematic State Pill */}
              <div className="absolute top-2 left-2 bg-[#0F0E17]/90 border-2 border-[#F4B41A] px-2 py-1 flex items-center space-x-1.5">
                <span className="w-2 h-2 rounded-full bg-[#F4B41A] animate-ping" />
                <span className="font-pixel text-[9px] text-[#F4B41A]">
                  PHASE: {currentStateName}
                </span>
              </div>

              {/* Wake Lock Active Indicator */}
              {wakeLockActive && (
                <div className="absolute top-2 right-2 bg-[#00EB88]/90 text-black border border-black px-1.5 py-0.5 font-pixel text-[8px]">
                  WAKE LOCK ON
                </div>
              )}

              {/* Rep Completed Flash Banner Overlay */}
              {repFlash && (
                <div className="absolute inset-0 z-30 pointer-events-none flex items-center justify-center bg-[#00EB88]/20 border-4 border-[#00EB88]">
                  <div className="bg-[#0F0E17]/95 border-4 border-[#F4B41A] px-5 py-3 text-center rounded shadow-pixel-box-gold">
                    <div className="font-pixel text-[9px] text-[#00EB88] tracking-widest">REP DETECTED!</div>
                    <div className="font-pixel text-xl text-[#F4B41A] my-1">REP #{repFlash.rep}</div>
                    <div className="font-pixel text-[11px] text-[#38B6FF]">+{repFlash.power} POWER</div>
                  </div>
                </div>
              )}

              {/* Bottom Video Telemetry Bar */}
              <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black via-black/80 to-transparent p-3 flex justify-around">
                <div className="text-center">
                  <div className="text-[9px] font-pixel text-[#A7A9BE]">REPS</div>
                  <div className="text-xl font-pixel text-[#F4B41A]">{repCount}</div>
                </div>
                <div className="text-center">
                  <div className="text-[9px] font-pixel text-[#A7A9BE]">POWER</div>
                  <div className="text-xl font-pixel text-[#38B6FF]">{lastPower}</div>
                </div>
                <div className="text-center">
                  <div className="text-[9px] font-pixel text-[#A7A9BE]">FORM</div>
                  <div className="text-xl font-pixel text-[#00EB88]">
                    {Math.round(lastForm * 100)}%
                  </div>
                </div>
              </div>
            </div>

            {/* Swing State Progress Indicator */}
            <div className="bg-[#1A1926] border-2 border-[#2E2B44] p-3 flex items-center justify-between text-center">
              <div className={`flex-1 p-1 ${currentStateName === 'HIKE' ? 'bg-[#FF3366] text-black font-bold' : 'text-[#A7A9BE]'}`}>
                <div className="text-[8px] font-pixel">STATE 0</div>
                <div className="text-[10px] font-mono">HIKE (Hips)</div>
              </div>
              <div className="text-[#A7A9BE] px-1">➔</div>
              <div className={`flex-1 p-1 ${currentStateName === 'DRIVE' ? 'bg-[#F4B41A] text-black font-bold' : 'text-[#A7A9BE]'}`}>
                <div className="text-[8px] font-pixel">STATE 1</div>
                <div className="text-[10px] font-mono">DRIVE (Snap)</div>
              </div>
              <div className="text-[#A7A9BE] px-1">➔</div>
              <div className={`flex-1 p-1 ${currentStateName === 'PEAK_LOCKOUT' ? 'bg-[#38B6FF] text-black font-bold' : 'text-[#A7A9BE]'}`}>
                <div className="text-[8px] font-pixel">STATE 2</div>
                <div className="text-[10px] font-mono">LOCKOUT</div>
              </div>
            </div>

            {/* Quick Swing Simulation Button for Desktop/Testing */}
            <div className="flex gap-2">
              <button
                onClick={handleSimulateSwing}
                className="flex-1 bg-[#2E2B44] hover:bg-[#3E3B5E] text-[#F4B41A] font-pixel text-[10px] py-3 border-2 border-black shadow-pixel-box flex items-center justify-center gap-2 active:translate-x-0.5 active:translate-y-0.5"
              >
                <Zap className="w-3.5 h-3.5" />
                TRIGGER {EXERCISE_SKILLS[activeExercise].skillName}
              </button>
            </div>
          </div>
        )}
      </main>

      {/* Retro Bottom Navigation / Instructions */}
      <footer className="border-t-2 border-[#2E2B44] bg-[#1A1926] p-2 text-center text-[10px] font-mono text-[#A7A9BE]">
        MediaPipe Pose Landmarker + PeerJS WebRTC Stream
      </footer>
    </div>
  );
};
