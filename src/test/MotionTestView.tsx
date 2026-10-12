import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { FilesetResolver, PoseLandmarker } from '@mediapipe/tasks-vision';
import {
  KinematicTracker,
  KinematicStateUpdate,
  NormalizedLandmark,
  POSE_INDEX,
} from '../phone/utils/KinematicTracker';
import { ExerciseType, EXERCISE_SKILLS, RepTelemetry } from '../types/game';
import { audioManager } from '../shared/AudioManager';
import {
  Camera,
  Play,
  Square,
  RefreshCw,
  Flame,
  Zap,
  Activity,
  CheckCircle2,
  AlertCircle,
  Volume2,
  VolumeX,
  RotateCcw,
  Sparkles,
  Shield,
  HelpCircle,
  ArrowLeft,
  Smartphone,
  Eye,
  EyeOff,
} from 'lucide-react';

interface RepHistoryItem {
  id: string;
  repNumber: number;
  exercise: ExerciseType;
  power: number;
  form: number;
  timestamp: string;
  durationMs?: number;
}

const ALL_EXERCISES: ExerciseType[] = [
  'SWING',
  'SQUAT',
  'CLEAN_AND_PRESS',
  'SNATCH',
  'WINDMILL',
  'DEADLIFT',
  'OVERHEAD_PRESS',
  'THRUSTER',
  'GORILLA_ROW',
  'HALO',
  'SINGLE_LEG_RDL',
];

const EXERCISE_ICONS: Record<ExerciseType, string> = {
  SWING: '⚔️',
  SQUAT: '🔨',
  CLEAN_AND_PRESS: '⚡',
  SNATCH: '🔥',
  WINDMILL: '🌌',
  DEADLIFT: '⛰️',
  OVERHEAD_PRESS: '☀️',
  THRUSTER: '☄️',
  GORILLA_ROW: '🦍',
  HALO: '💫',
  SINGLE_LEG_RDL: '🕊️',
  CLEAN: '💥',
  LUNGE: '🗡️',
};

const EXERCISE_TIPS: Record<ExerciseType, { instruction: string; criteria: string; powerTip: string }> = {
  SWING: {
    instruction: 'Explosive hip hinge with soft knees. Drive kettlebell forward to chest/shoulder height.',
    criteria: 'Wrists pass below hips in hike, then rise above chest with knees locked.',
    powerTip: 'Maximize hip snap velocity during the upward drive.',
  },
  SQUAT: {
    instruction: 'Goblet rack at chest. Sink hips vertically until hip crease is level with or below knees.',
    criteria: 'Hips descend within 5% of knee height while wrists remain anchored at collarbone.',
    powerTip: 'Explode out of the bottom hole to standing lockout.',
  },
  CLEAN_AND_PRESS: {
    instruction: 'Pull from hang into tight shoulder rack. Pause briefly, then drive overhead to full lockout.',
    criteria: 'Stage 1: wrist hits rack near shoulder. Stage 2: wrist drives 22% above shoulder.',
    powerTip: 'Clean smoothly with elbow tucked before accelerating overhead.',
  },
  SNATCH: {
    instruction: 'Continuous uninterrupted pull from hike straight to overhead lockout without pausing at rack.',
    criteria: 'Wrist accelerates continuously from below hips to overhead in a single velocity spike.',
    powerTip: 'Drive hard through heels and punch hand through at the top.',
  },
  WINDMILL: {
    instruction: 'Lock top arm straight overhead. Hinge torso laterally until bottom hand touches opposite ankle.',
    criteria: 'Top wrist stays locked overhead while bottom hand passes knee toward floor.',
    powerTip: 'Maintain gaze on top kettlebell for rotational stability.',
  },
  DEADLIFT: {
    instruction: 'Strict vertical pull from mid-shin to standing hip lockout. Keep arms straight close to shins.',
    criteria: 'Wrists pull from below knees to hip crease. Wrists NEVER rise to chest/shoulders.',
    powerTip: 'Drive through floor and squeeze glutes at lockout.',
  },
  OVERHEAD_PRESS: {
    instruction: 'From shoulder rack position, push vertically overhead until elbow is completely locked.',
    criteria: 'Wrists start at shoulder height and travel straight upward without knee dip.',
    powerTip: 'Brace core and lock out directly over your ear.',
  },
  THRUSTER: {
    instruction: 'Sink into deep goblet squat, then explode upward transferring leg drive directly into overhead press.',
    criteria: 'Deep squat hole combined with immediate overhead press in one fluid movement.',
    powerTip: 'Use leg acceleration out of the hole to launch the kettlebell skyward.',
  },
  GORILLA_ROW: {
    instruction: 'Hinge forward at 45° with flat back. Pull elbow backward high past ribs with predatory power.',
    criteria: 'Torso hinged forward; working elbow drives past the back plane above hips.',
    powerTip: 'Hold peak contraction at rib cage for 150ms before lowering.',
  },
  HALO: {
    instruction: 'Hold kettlebell by horns at chest. Circle smoothly 360° around the crown of your head.',
    criteria: 'Wrists orbit from chest center past ear, behind neck, past opposite ear, back to chest.',
    powerTip: 'Keep circle tight and shoulders down without swaying hips.',
  },
  SINGLE_LEG_RDL: {
    instruction: 'Stand on one leg with soft knee. Hinge forward while kicking trail leg straight back horizontally.',
    criteria: 'Trail ankle elevates near horizontal alignment while wrist lowers to planted knee.',
    powerTip: 'Keep hips square and reach long through your rear heel.',
  },
  CLEAN: {
    instruction: 'Explosive floor to shoulder rack snap.',
    criteria: 'Hike to rack.',
    powerTip: 'Tuck elbow.',
  },
  LUNGE: {
    instruction: 'Split stance knee drop.',
    criteria: 'Rear knee sinks near floor.',
    powerTip: 'Push through front heel.',
  },
};

export const MotionTestView: React.FC = () => {
  // Selected Exercise
  const [selectedExercise, setSelectedExercise] = useState<ExerciseType>('SWING');
  const [autoRouteMode, setAutoRouteMode] = useState<boolean>(false);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);

  // Camera & Model State
  const [cameraActive, setCameraActive] = useState<boolean>(false);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  const [modelLoading, setModelLoading] = useState<boolean>(false);
  const [modelReady, setModelReady] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<string>('Press Start Camera to begin testing');
  const [fps, setFps] = useState<number>(0);

  // Vision Options
  const [showSkeleton, setShowSkeleton] = useState<boolean>(true);
  const showSkeletonRef = useRef<boolean>(true);
  showSkeletonRef.current = showSkeleton;

  // Real-Time Telemetry State
  const [repCount, setRepCount] = useState<number>(0);
  const [lastPower, setLastPower] = useState<number>(0);
  const [lastForm, setLastForm] = useState<number>(1.0);
  const [currentStateName, setCurrentStateName] = useState<string>('IDLE');
  const [liveVelocity, setLiveVelocity] = useState<number>(0);
  const [repFlash, setRepFlash] = useState<{ show: boolean; power: number; rep: number } | null>(null);
  const [history, setHistory] = useState<RepHistoryItem[]>([]);

  // DOM & Engine References
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const poseLandmarkerRef = useRef<PoseLandmarker | null>(null);
  const trackerRef = useRef<KinematicTracker>(new KinematicTracker());
  const animFrameRef = useRef<number | null>(null);
  const lastVideoTimeRef = useRef<number>(-1);
  const frameCountRef = useRef<number>(0);
  const lastFpsUpdateRef = useRef<number>(performance.now());
  const wakeLockRef = useRef<any>(null);

  // Initialize Kinematic Tracker callbacks
  useEffect(() => {
    const tracker = trackerRef.current;
    tracker.setExercise(selectedExercise);
    tracker.setAutoRoute(autoRouteMode);
    tracker.setAllowedExercises(autoRouteMode ? ALL_EXERCISES : [selectedExercise]);

    tracker.onExerciseAutoSwitched = (newEx: ExerciseType) => {
      setSelectedExercise(newEx);
      if (soundEnabled) audioManager.play('ui_select');
      setStatusMessage(`AI Auto-Routed to: ${newEx}`);
    };

    tracker.onRepCompleted = (telemetry: RepTelemetry) => {
      const exercise = telemetry.exercise || selectedExercise;
      setRepCount((prev) => prev + 1);
      setLastPower(telemetry.power);
      setLastForm(telemetry.form);

      if (soundEnabled) {
        audioManager.play(telemetry.power > 90 ? 'crit' : 'hit');
      }

      setRepFlash({
        show: true,
        power: telemetry.power,
        rep: (telemetry.repCount || 0) + 1,
      });
      setTimeout(() => setRepFlash(null), 900);

      // Append to history table
      const newItem: RepHistoryItem = {
        id: `rep_${Date.now()}_${Math.random()}`,
        repNumber: (telemetry.repCount || 0) + 1,
        exercise,
        power: telemetry.power,
        form: telemetry.form,
        timestamp: new Date().toLocaleTimeString(),
      };
      setHistory((prev) => [newItem, ...prev.slice(0, 19)]);
    };

    tracker.onStateChange = (update: KinematicStateUpdate) => {
      setCurrentStateName(update.stateName);
      setLiveVelocity(Number(update.velocity.toFixed(2)));
    };
  }, [selectedExercise, autoRouteMode, soundEnabled]);

  // Handle Exercise Selection Change
  const handleSelectExercise = (ex: ExerciseType) => {
    setSelectedExercise(ex);
    trackerRef.current.setExercise(ex);
    if (!autoRouteMode) {
      trackerRef.current.setAllowedExercises([ex]);
    }
    if (soundEnabled) audioManager.play('ui_select');
    setStatusMessage(`Testing Exercise: ${ex}`);
  };

  // Toggle Auto-Routing
  const handleToggleAutoRoute = (enabled: boolean) => {
    setAutoRouteMode(enabled);
    trackerRef.current.setAutoRoute(enabled);
    trackerRef.current.setAllowedExercises(enabled ? ALL_EXERCISES : [selectedExercise]);
    if (soundEnabled) audioManager.play('ui_move');
  };

  // Reset Reps
  const handleResetReps = () => {
    trackerRef.current.reset();
    setRepCount(0);
    setLastPower(0);
    setLastForm(1.0);
    setCurrentStateName('IDLE');
    setHistory([]);
    if (soundEnabled) audioManager.play('equip');
  };

  // Initialize PoseLandmarker
  const initPoseLandmarker = async () => {
    if (poseLandmarkerRef.current) return;
    setModelLoading(true);
    setStatusMessage('Loading Pose Vision Model (WebAssembly + GPU)...');

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
      setStatusMessage('Vision AI Model Ready!');
    } catch (err: any) {
      console.error('Failed to initialize PoseLandmarker:', err);
      setModelLoading(false);
      setStatusMessage('Vision AI error: ' + (err?.message || 'Check connection'));
    }
  };

  // Start Camera
  const startCamera = async () => {
    try {
      await initPoseLandmarker();

      // Acquire wake lock if supported
      if ('wakeLock' in navigator) {
        try {
          wakeLockRef.current = await (navigator as any).wakeLock.request('screen');
        } catch (e) {}
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: facingMode,
          width: { ideal: 640 },
          height: { ideal: 480 },
        },
        audio: false,
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        setCameraActive(true);
        setStatusMessage('Camera Live! Stand 6-8 feet away in frame.');
      }
    } catch (err: any) {
      console.error('Camera error:', err);
      setStatusMessage('Camera error: ' + (err?.message || 'Access denied'));
    }
  };

  // Stop Camera
  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach((track) => track.stop());
      videoRef.current.srcObject = null;
    }
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
    }
    if (wakeLockRef.current) {
      wakeLockRef.current.release().catch(() => {});
    }
    setCameraActive(false);
    setStatusMessage('Camera stopped.');
  };

  // Toggle Camera Facing
  const handleToggleFacing = async () => {
    const nextFacing = facingMode === 'user' ? 'environment' : 'user';
    setFacingMode(nextFacing);
    if (cameraActive) {
      stopCamera();
      setTimeout(() => startCamera(), 200);
    }
  };

  // Frame Processing Loop
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
        if (facingMode === 'user') {
          ctx.translate(canvas.width, 0);
          ctx.scale(-1, 1);
        }
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

                // If user facing mode, mirror X coordinates to match visual canvas
                const processedLandmarks =
                  facingMode === 'user'
                    ? landmarks.map((lm) => ({ ...lm, x: 1 - lm.x }))
                    : landmarks;

                // Process through Kinematic Tracker
                trackerRef.current.processLandmarks(processedLandmarks, Date.now());

                // Draw Kinematic HUD Guides
                drawKinematicHUD(ctx, canvas.width, canvas.height, processedLandmarks);

                // Draw Retro Workout Skeleton (if enabled)
                if (showSkeletonRef.current) {
                  drawWorkoutSkeleton(ctx, canvas.width, canvas.height, processedLandmarks);
                }
              }
            } catch (e) {
              // Frame dropped
            }
          }
        }

        // Calculate live FPS
        frameCountRef.current++;
        const now = performance.now();
        if (now - lastFpsUpdateRef.current >= 1000) {
          setFps(Math.round((frameCountRef.current * 1000) / (now - lastFpsUpdateRef.current)));
          frameCountRef.current = 0;
          lastFpsUpdateRef.current = now;
        }
      }
    }

    if (cameraActive) {
      animFrameRef.current = requestAnimationFrame(processFrame);
    }
  }, [cameraActive, facingMode]);

  useEffect(() => {
    if (cameraActive) {
      animFrameRef.current = requestAnimationFrame(processFrame);
    }
    return () => {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, [cameraActive, processFrame]);

  // Draw Dynamic Retro Kinematic HUD
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
    const lAnkle = landmarks[POSE_INDEX.LEFT_ANKLE];
    const rAnkle = landmarks[POSE_INDEX.RIGHT_ANKLE];
    const nose = landmarks[POSE_INDEX.NOSE];

    const wristY = ((lWrist.y + rWrist.y) / 2) * h;
    const wristX = ((lWrist.x + rWrist.x) / 2) * w;
    const hipY = ((lHip.y + rHip.y) / 2) * h;
    const hipX = ((lHip.x + rHip.x) / 2) * w;
    const shoulderY = ((lShoulder.y + rShoulder.y) / 2) * h;
    const kneeY = lKnee && rKnee ? ((lKnee.y + rKnee.y) / 2) * h : hipY + 80;
    const ankleY = lAnkle && rAnkle ? ((lAnkle.y + rAnkle.y) / 2) * h : hipY + 160;
    const noseX = nose ? nose.x * w : w / 2;
    const noseY = nose ? nose.y * h : shoulderY - 40;

    ctx.save();
    ctx.lineWidth = 3;
    ctx.font = '10px "Press Start 2P", monospace';

    if (selectedExercise === 'SQUAT') {
      ctx.strokeStyle = '#FF3366';
      ctx.setLineDash([8, 6]);
      ctx.beginPath();
      ctx.moveTo(w * 0.1, kneeY - 15);
      ctx.lineTo(w * 0.9, kneeY - 15);
      ctx.stroke();
      ctx.fillStyle = '#FF3366';
      ctx.fillText('PARALLEL SQUAT DEPTH', 20, kneeY - 22);

      ctx.fillStyle = '#F4B41A';
      ctx.setLineDash([]);
      ctx.beginPath();
      ctx.arc(hipX, hipY, 12, 0, Math.PI * 2);
      ctx.fill();
    } else if (selectedExercise === 'OVERHEAD_PRESS') {
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
    } else if (selectedExercise === 'CLEAN_AND_PRESS') {
      const overheadY = Math.max(20, shoulderY - (hipY - shoulderY) * 0.6);
      ctx.strokeStyle = '#38B6FF';
      ctx.setLineDash([8, 6]);
      ctx.beginPath();
      ctx.moveTo(w * 0.1, overheadY);
      ctx.lineTo(w * 0.9, overheadY);
      ctx.stroke();
      ctx.fillStyle = '#38B6FF';
      ctx.fillText('OVERHEAD LOCKOUT', 20, overheadY - 8);

      ctx.strokeStyle = '#F97316';
      ctx.beginPath();
      ctx.moveTo(w * 0.1, shoulderY);
      ctx.lineTo(w * 0.9, shoulderY);
      ctx.stroke();
      ctx.fillStyle = '#F97316';
      ctx.fillText('RACK CLEAN STAGE', 20, shoulderY + 18);

      ctx.strokeStyle = '#FF3366';
      ctx.beginPath();
      ctx.moveTo(w * 0.1, hipY);
      ctx.lineTo(w * 0.9, hipY);
      ctx.stroke();
      ctx.fillStyle = '#FF3366';
      ctx.fillText('HANG CLEAN START', 20, hipY + 18);
    } else if (selectedExercise === 'SNATCH') {
      const overheadY = Math.max(20, shoulderY - (hipY - shoulderY) * 0.65);
      ctx.strokeStyle = '#EF4444';
      ctx.setLineDash([8, 6]);
      ctx.beginPath();
      ctx.moveTo(w * 0.1, overheadY);
      ctx.lineTo(w * 0.9, overheadY);
      ctx.stroke();
      ctx.fillStyle = '#EF4444';
      ctx.fillText('SNATCH OVERHEAD PUNCH', 20, overheadY - 8);

      ctx.strokeStyle = '#F4B41A';
      ctx.beginPath();
      ctx.moveTo(w * 0.1, hipY);
      ctx.lineTo(w * 0.9, hipY);
      ctx.stroke();
      ctx.fillStyle = '#F4B41A';
      ctx.fillText('BACKSWING HIKE', 20, hipY + 18);
    } else if (selectedExercise === 'WINDMILL') {
      ctx.strokeStyle = '#00EB88';
      ctx.setLineDash([8, 6]);
      ctx.beginPath();
      ctx.moveTo(w * 0.1, ankleY - 20);
      ctx.lineTo(w * 0.9, ankleY - 20);
      ctx.stroke();
      ctx.fillStyle = '#00EB88';
      ctx.fillText('ANKLE REACH TARGET', 20, ankleY - 28);
    } else if (selectedExercise === 'DEADLIFT') {
      ctx.strokeStyle = '#D97706';
      ctx.setLineDash([8, 6]);
      ctx.beginPath();
      ctx.moveTo(w * 0.1, hipY);
      ctx.lineTo(w * 0.9, hipY);
      ctx.stroke();
      ctx.fillStyle = '#D97706';
      ctx.fillText('HIP LOCKOUT (NO SWING)', 20, hipY - 10);

      ctx.strokeStyle = '#84CC16';
      ctx.beginPath();
      ctx.moveTo(w * 0.1, kneeY + 25);
      ctx.lineTo(w * 0.9, kneeY + 25);
      ctx.stroke();
      ctx.fillStyle = '#84CC16';
      ctx.fillText('SHIN PICKUP', 20, kneeY + 40);
    } else if (selectedExercise === 'THRUSTER') {
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
      ctx.fillText('DEEP SQUAT HOLE', 20, kneeY - 22);
    } else if (selectedExercise === 'GORILLA_ROW') {
      ctx.strokeStyle = '#84CC16';
      ctx.setLineDash([8, 6]);
      ctx.beginPath();
      ctx.moveTo(w * 0.1, hipY - 15);
      ctx.lineTo(w * 0.9, hipY - 15);
      ctx.stroke();
      ctx.fillStyle = '#84CC16';
      ctx.fillText('RIB CONTRACTION LINE', 20, hipY - 22);
    } else if (selectedExercise === 'HALO') {
      ctx.strokeStyle = '#818CF8';
      ctx.setLineDash([6, 4]);
      ctx.beginPath();
      ctx.ellipse(noseX, noseY, 65, 45, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = '#818CF8';
      ctx.fillText('CROWN ORBIT', noseX - 45, noseY - 55);
    } else if (selectedExercise === 'SINGLE_LEG_RDL') {
      ctx.strokeStyle = '#EC4899';
      ctx.setLineDash([8, 6]);
      ctx.beginPath();
      ctx.moveTo(w * 0.1, kneeY);
      ctx.lineTo(w * 0.9, kneeY);
      ctx.stroke();
      ctx.fillStyle = '#EC4899';
      ctx.fillText('PLANTED KNEE LEVEL', 20, kneeY - 10);
    } else {
      // Swing HUD
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

      ctx.fillStyle = '#F4B41A';
      ctx.setLineDash([]);
      ctx.beginPath();
      ctx.arc(wristX, wristY, 12, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  };

  // Draw 32-Bit Retro Workout Skeleton
  const drawWorkoutSkeleton = (
    ctx: CanvasRenderingContext2D,
    w: number,
    h: number,
    landmarks: NormalizedLandmark[]
  ) => {
    if (!landmarks || landmarks.length < 29) return;

    const connections = [
      { from: POSE_INDEX.LEFT_SHOULDER, to: POSE_INDEX.RIGHT_SHOULDER, color: '#F4B41A', width: 4 },
      { from: POSE_INDEX.LEFT_SHOULDER, to: POSE_INDEX.LEFT_HIP, color: '#38B6FF', width: 3 },
      { from: POSE_INDEX.RIGHT_SHOULDER, to: POSE_INDEX.RIGHT_HIP, color: '#38B6FF', width: 3 },
      { from: POSE_INDEX.LEFT_HIP, to: POSE_INDEX.RIGHT_HIP, color: '#FF3366', width: 4 },
      { from: POSE_INDEX.LEFT_SHOULDER, to: POSE_INDEX.LEFT_ELBOW, color: '#38B6FF', width: 3.5 },
      { from: POSE_INDEX.LEFT_ELBOW, to: POSE_INDEX.LEFT_WRIST, color: '#F4B41A', width: 3.5 },
      { from: POSE_INDEX.RIGHT_SHOULDER, to: POSE_INDEX.RIGHT_ELBOW, color: '#38B6FF', width: 3.5 },
      { from: POSE_INDEX.RIGHT_ELBOW, to: POSE_INDEX.RIGHT_WRIST, color: '#F4B41A', width: 3.5 },
      { from: POSE_INDEX.LEFT_HIP, to: POSE_INDEX.LEFT_KNEE, color: '#FF3366', width: 4 },
      { from: POSE_INDEX.LEFT_KNEE, to: POSE_INDEX.LEFT_ANKLE, color: '#38B6FF', width: 3.5 },
      { from: POSE_INDEX.RIGHT_HIP, to: POSE_INDEX.RIGHT_KNEE, color: '#FF3366', width: 4 },
      { from: POSE_INDEX.RIGHT_KNEE, to: POSE_INDEX.RIGHT_ANKLE, color: '#38B6FF', width: 3.5 },
    ];

    ctx.save();
    ctx.lineCap = 'round';

    connections.forEach(({ from, to, color, width }) => {
      const p1 = landmarks[from];
      const p2 = landmarks[to];
      if (p1 && p2 && (p1.visibility ?? 1) > 0.4 && (p2.visibility ?? 1) > 0.4) {
        ctx.strokeStyle = color;
        ctx.lineWidth = width;
        ctx.beginPath();
        ctx.moveTo(p1.x * w, p1.y * h);
        ctx.lineTo(p2.x * w, p2.y * h);
        ctx.stroke();
      }
    });

    const keyJoints = [
      POSE_INDEX.NOSE,
      POSE_INDEX.LEFT_SHOULDER,
      POSE_INDEX.RIGHT_SHOULDER,
      POSE_INDEX.LEFT_ELBOW,
      POSE_INDEX.RIGHT_ELBOW,
      POSE_INDEX.LEFT_WRIST,
      POSE_INDEX.RIGHT_WRIST,
      POSE_INDEX.LEFT_HIP,
      POSE_INDEX.RIGHT_HIP,
      POSE_INDEX.LEFT_KNEE,
      POSE_INDEX.RIGHT_KNEE,
      POSE_INDEX.LEFT_ANKLE,
      POSE_INDEX.RIGHT_ANKLE,
    ];

    keyJoints.forEach((idx) => {
      const p = landmarks[idx];
      if (p && (p.visibility ?? 1) > 0.4) {
        ctx.fillStyle = '#0F0E17';
        ctx.strokeStyle = idx === POSE_INDEX.LEFT_WRIST || idx === POSE_INDEX.RIGHT_WRIST ? '#F4B41A' : '#38B6FF';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.arc(p.x * w, p.y * h, 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      }
    });

    ctx.restore();
  };

  const currentSkill = EXERCISE_SKILLS[selectedExercise] || EXERCISE_SKILLS.SWING;
  const currentTips = EXERCISE_TIPS[selectedExercise] || EXERCISE_TIPS.SWING;

  return (
    <div className="min-h-screen bg-[#0F0E17] text-white flex flex-col font-sans select-none pb-12">
      {/* Top Retro Navigation Header */}
      <header className="bg-[#1A1926] border-b-4 border-[#2E2B44] px-4 py-3 flex flex-wrap items-center justify-between gap-3 sticky top-0 z-40">
        <div className="flex items-center space-x-3">
          <Link
            to="/"
            className="flex items-center gap-1.5 bg-[#0F0E17] hover:bg-[#242138] border-2 border-[#2E2B44] px-2.5 py-1 text-[9px] font-pixel text-[#A7A9BE] hover:text-[#F4B41A] transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            HOME
          </Link>
          <div className="flex items-center space-x-2">
            <span className="text-xl">🏋️</span>
            <div>
              <h1 className="font-pixel text-xs text-[#F4B41A] tracking-wider">
                MOTION DETECTION LAB
              </h1>
              <p className="text-[9px] font-mono text-[#38B6FF]">
                Multi-Exercise Vision Calibration • 11 Kettlebell Movements
              </p>
            </div>
          </div>
        </div>

        {/* Global Status Pills */}
        <div className="flex items-center gap-2">
          <div className="bg-[#0F0E17] border border-[#2E2B44] px-2 py-1 text-[9px] font-mono flex items-center gap-1.5">
            <span
              className={`w-2 h-2 rounded-full ${
                modelReady ? 'bg-[#00EB88]' : modelLoading ? 'bg-[#F4B41A] animate-ping' : 'bg-red-500'
              }`}
            />
            <span>AI: {modelReady ? 'READY' : modelLoading ? 'LOADING' : 'STANDBY'}</span>
          </div>

          <div className="bg-[#0F0E17] border border-[#2E2B44] px-2 py-1 text-[9px] font-mono text-[#F4B41A]">
            FPS: {fps}
          </div>

          <button
            onClick={() => setSoundEnabled((prev) => !prev)}
            className="bg-[#0F0E17] hover:bg-[#242138] border border-[#2E2B44] p-1.5 text-[#F4B41A]"
            title={soundEnabled ? 'Mute Sound' : 'Enable Sound'}
          >
            {soundEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5 text-red-400" />}
          </button>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-7xl w-full mx-auto p-4 md:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 flex-1">
        {/* LEFT COLUMN: Camera Viewfinder & Real-Time Canvas HUD (7 Cols) */}
        <section className="lg:col-span-7 space-y-4">
          {/* Viewfinder Frame */}
          <div className="relative bg-black border-4 border-[#38B6FF] aspect-[4/3] rounded overflow-hidden shadow-pixel-box">
            {/* Raw Video element */}
            <video ref={videoRef} playsInline muted className="hidden" />

            {/* Canvas Rendering Feed */}
            <canvas ref={canvasRef} className="w-full h-full object-cover pixelated" />

            {/* Offline Viewfinder Prompt */}
            {!cameraActive && (
              <div className="absolute inset-0 bg-[#0F0E17]/95 flex flex-col items-center justify-center p-6 text-center space-y-4 z-10">
                <div className="w-16 h-16 rounded-full bg-[#1A1926] border-2 border-[#38B6FF] flex items-center justify-center animate-pulse">
                  <Camera className="w-8 h-8 text-[#38B6FF]" />
                </div>
                <div>
                  <h3 className="font-pixel text-sm text-[#F4B41A]">CAMERA IS OFF</h3>
                  <p className="text-xs font-mono text-[#A7A9BE] max-w-sm mt-1">
                    Click 'Start Camera' below to launch MediaPipe Pose Vision and test biometric kinematics.
                  </p>
                </div>
                <button
                  onClick={startCamera}
                  disabled={modelLoading}
                  className="bg-[#F4B41A] hover:bg-[#ffe175] text-[#0F0E17] font-pixel text-xs px-6 py-3 border-2 border-black shadow-pixel-box flex items-center gap-2 transform active:translate-x-0.5 active:translate-y-0.5"
                >
                  <Play className="w-4 h-4 fill-current" />
                  START CAMERA & TEST
                </button>
              </div>
            )}

            {/* Kinematic State Pill */}
            {cameraActive && (
              <div className="absolute top-3 left-3 bg-[#0F0E17]/90 border-2 border-[#F4B41A] px-2.5 py-1 flex items-center space-x-2 z-20 shadow-pixel-box">
                <span className="w-2.5 h-2.5 rounded-full bg-[#F4B41A] animate-ping" />
                <span className="font-pixel text-[10px] text-[#F4B41A]">
                  PHASE: {currentStateName}
                </span>
              </div>
            )}

            {/* Viewfinder Controls Overlay */}
            {cameraActive && (
              <div className="absolute top-3 right-3 flex items-center space-x-1.5 z-20">
                <button
                  onClick={() => setShowSkeleton((prev) => !prev)}
                  className={`px-2 py-1 font-pixel text-[8px] border border-black shadow-pixel-box flex items-center gap-1 ${
                    showSkeleton ? 'bg-[#38B6FF] text-[#0F0E17] font-bold' : 'bg-[#1A1926]/90 text-[#A7A9BE]'
                  }`}
                  title="Toggle skeleton joint lines"
                >
                  {showSkeleton ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                  SKELETON: {showSkeleton ? 'ON' : 'OFF'}
                </button>

                <button
                  onClick={handleToggleFacing}
                  className="bg-[#1A1926]/90 text-[#A7A9BE] hover:text-white px-2 py-1 font-pixel text-[8px] border border-[#2E2B44] flex items-center gap-1"
                  title="Flip camera facing (Front / Back)"
                >
                  <RefreshCw className="w-3 h-3" />
                  {facingMode === 'user' ? 'FRONT' : 'BACK'}
                </button>
              </div>
            )}

            {/* Rep Completion Flash Toast */}
            {repFlash && (
              <div className="absolute inset-0 bg-yellow-400/20 pointer-events-none flex items-center justify-center animate-ping z-30">
                <div className="bg-[#0F0E17] border-4 border-[#F4B41A] px-6 py-3 text-center shadow-pixel-box-gold">
                  <span className="font-pixel text-sm text-[#F4B41A] block">REP COMPLETED!</span>
                  <span className="font-pixel text-[10px] text-[#38B6FF] mt-1 block">
                    POWER: {repFlash.power} • REP #{repFlash.rep}
                  </span>
                </div>
              </div>
            )}

            {/* Bottom Floating Telemetry Bar */}
            {cameraActive && (
              <div className="absolute bottom-2 left-2 right-2 bg-[#0F0E17]/90 border border-[#2E2B44] px-3 py-1.5 flex items-center justify-between text-[9px] font-mono text-[#A7A9BE] z-20">
                <div>
                  <span className="text-[#38B6FF] font-bold">TARGET:</span> {currentSkill.targetMetric}
                </div>
                <div>
                  <span className="text-[#F4B41A] font-bold">VELOCITY:</span> {liveVelocity}
                </div>
                <div>
                  <span className="text-[#00EB88] font-bold">MODE:</span> {autoRouteMode ? 'AUTO-ROUTER' : 'STRICT LOCK'}
                </div>
              </div>
            )}
          </div>

          {/* Camera Action Buttons */}
          <div className="flex flex-wrap items-center justify-between gap-2 bg-[#1A1926] border-2 border-[#2E2B44] p-3 rounded">
            <div className="flex items-center gap-2">
              {cameraActive ? (
                <button
                  onClick={stopCamera}
                  className="bg-[#FF3366] hover:bg-[#ff5580] text-white font-pixel text-[10px] px-4 py-2 border-2 border-black shadow-pixel-box flex items-center gap-1.5"
                >
                  <Square className="w-3 h-3 fill-current" />
                  STOP CAMERA
                </button>
              ) : (
                <button
                  onClick={startCamera}
                  disabled={modelLoading}
                  className="bg-[#38B6FF] hover:bg-[#60c6ff] text-[#0F0E17] font-pixel text-[10px] px-4 py-2 border-2 border-black shadow-pixel-box flex items-center gap-1.5"
                >
                  <Play className="w-3 h-3 fill-current" />
                  START CAMERA
                </button>
              )}

              <button
                onClick={handleResetReps}
                className="bg-[#0F0E17] hover:bg-[#242138] border-2 border-[#2E2B44] text-[#F4B41A] font-pixel text-[10px] px-3 py-2 flex items-center gap-1.5"
                title="Reset rep counters"
              >
                <RotateCcw className="w-3 h-3" />
                RESET COUNTER
              </button>
            </div>

            {/* Smart Auto-Routing Switch */}
            <label className="flex items-center gap-2 cursor-pointer bg-[#0F0E17] border border-[#2E2B44] px-3 py-1.5 rounded">
              <input
                type="checkbox"
                checked={autoRouteMode}
                onChange={(e) => handleToggleAutoRoute(e.target.checked)}
                className="w-4 h-4 accent-[#F4B41A] cursor-pointer"
              />
              <span className="font-pixel text-[8px] text-[#A7A9BE]">
                SMART AUTO-ROUTER: <strong className={autoRouteMode ? 'text-[#00EB88]' : 'text-gray-400'}>{autoRouteMode ? 'ENABLED' : 'OFF'}</strong>
              </span>
            </label>
          </div>

          {/* Status Message Footer */}
          <div className="text-[10px] font-mono text-[#A7A9BE] flex items-center gap-2 bg-[#1A1926]/40 p-2 border border-[#2E2B44]">
            <Activity className="w-3.5 h-3.5 text-[#F4B41A]" />
            <span>{statusMessage}</span>
          </div>
        </section>

        {/* RIGHT COLUMN: 11-Exercise Switcher, Live Telemetry & Guide (5 Cols) */}
        <section className="lg:col-span-5 space-y-4">
          {/* 1. EXERCISE SELECTOR GRID */}
          <div className="bg-[#1A1926] border-4 border-[#F4B41A] p-4 rounded shadow-pixel-box-gold space-y-3">
            <div className="flex items-center justify-between border-b-2 border-[#2E2B44] pb-2">
              <div className="flex items-center gap-2">
                <span className="text-sm font-pixel text-[#F4B41A]">SELECT EXERCISE TO TEST</span>
              </div>
              <span className="text-[9px] font-mono text-[#38B6FF]">
                {selectedExercise} ({ALL_EXERCISES.indexOf(selectedExercise) + 1}/11)
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 max-h-56 overflow-y-auto pr-1">
              {ALL_EXERCISES.map((ex) => {
                const isSelected = selectedExercise === ex;
                const skill = EXERCISE_SKILLS[ex];
                const icon = EXERCISE_ICONS[ex] || '🏋️';

                return (
                  <button
                    key={ex}
                    onClick={() => handleSelectExercise(ex)}
                    className={`p-2 rounded border-2 transition-all flex flex-col justify-between text-left h-20 ${
                      isSelected
                        ? 'bg-[#242138] border-[#F4B41A] shadow-pixel-box scale-102 z-10'
                        : 'bg-[#0F0E17] border-[#2E2B44] hover:border-[#38B6FF] opacity-80 hover:opacity-100'
                    }`}
                    style={{
                      borderColor: isSelected ? '#F4B41A' : undefined,
                    }}
                  >
                    <div className="flex justify-between items-start">
                      <span className="text-base">{icon}</span>
                      <span
                        className="text-[6px] font-pixel px-1 py-0.5 rounded border"
                        style={{
                          color: skill.colorHex,
                          borderColor: skill.colorHex,
                        }}
                      >
                        {skill.rpgElement}
                      </span>
                    </div>

                    <div>
                      <div className="font-pixel text-[8px] text-white truncate leading-tight">
                        {skill.skillName}
                      </div>
                      <div className="text-[7px] font-mono text-[#A7A9BE] uppercase truncate mt-0.5">
                        {ex.replace(/_/g, ' ')}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 2. REAL-TIME TELEMETRY SCORECARD */}
          <div className="bg-[#1A1926] border-2 border-[#2E2B44] p-4 rounded space-y-4">
            <div className="flex items-center justify-between border-b border-[#2E2B44] pb-2">
              <span className="font-pixel text-[10px] text-[#F4B41A]">LIVE TELEMETRY DASHBOARD</span>
              <span className="text-[9px] font-mono text-[#00EB88]">● 60 FPS SAMPLING</span>
            </div>

            <div className="grid grid-cols-3 gap-3 text-center">
              {/* Rep Count */}
              <div className="bg-[#0F0E17] border-2 border-[#F4B41A] p-3 rounded">
                <div className="text-[8px] font-pixel text-[#A7A9BE]">REPS</div>
                <div className="text-3xl font-pixel text-[#F4B41A] mt-1">{repCount}</div>
              </div>

              {/* Power Score */}
              <div className="bg-[#0F0E17] border-2 border-[#38B6FF] p-3 rounded">
                <div className="text-[8px] font-pixel text-[#A7A9BE]">POWER</div>
                <div className="text-3xl font-pixel text-[#38B6FF] mt-1">{lastPower || '--'}</div>
                <div className="text-[7px] font-mono text-[#A7A9BE] mt-0.5">SCALE: 0-150</div>
              </div>

              {/* Form Score */}
              <div className="bg-[#0F0E17] border-2 border-[#00EB88] p-3 rounded">
                <div className="text-[8px] font-pixel text-[#A7A9BE]">FORM</div>
                <div className="text-3xl font-pixel text-[#00EB88] mt-1">
                  {lastForm ? `${Math.round(lastForm * 100)}%` : '--'}
                </div>
                <div className="text-[7px] font-mono text-[#A7A9BE] mt-0.5">
                  {lastForm >= 0.95 ? '⭐ S-TIER' : lastForm >= 0.85 ? '👍 A-TIER' : '⚠️ B-TIER'}
                </div>
              </div>
            </div>

            {/* Power Meter Progress */}
            <div>
              <div className="flex justify-between text-[8px] font-mono text-[#A7A9BE] mb-1">
                <span>POWER BAR</span>
                <span className="text-[#38B6FF]">{lastPower} / 150</span>
              </div>
              <div className="w-full h-3 bg-[#0F0E17] border border-[#2E2B44] rounded-sm overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-[#38B6FF] via-[#F4B41A] to-[#FF3366] transition-all duration-300"
                  style={{ width: `${Math.min(100, (lastPower / 150) * 100)}%` }}
                />
              </div>
            </div>
          </div>

          {/* 3. EXERCISE INSTRUCTIONS & CRITERIA */}
          <div className="bg-[#1A1926] border-2 border-[#2E2B44] p-4 rounded space-y-2">
            <div className="flex items-center gap-2 text-xs font-pixel text-[#F4B41A]">
              <HelpCircle className="w-4 h-4 text-[#F4B41A]" />
              <span>HOW TO SCORE: {currentSkill.skillName}</span>
            </div>

            <div className="text-xs font-mono space-y-1.5 text-[#A7A9BE] leading-relaxed pt-1">
              <div>
                <strong className="text-white">Motion:</strong> {currentTips.instruction}
              </div>
              <div>
                <strong className="text-[#38B6FF]">Trigger Rule:</strong> {currentTips.criteria}
              </div>
              <div>
                <strong className="text-[#F4B41A]">Power Tip:</strong> {currentTips.powerTip}
              </div>
            </div>
          </div>

          {/* 4. RECENT REPS LOG TABLE */}
          <div className="bg-[#1A1926] border-2 border-[#2E2B44] p-4 rounded space-y-2">
            <div className="flex items-center justify-between border-b border-[#2E2B44] pb-2">
              <span className="font-pixel text-[9px] text-[#A7A9BE]">RECENT REPS LOG ({history.length})</span>
              {history.length > 0 && (
                <button
                  onClick={() => setHistory([])}
                  className="text-[8px] font-mono text-red-400 hover:underline"
                >
                  CLEAR
                </button>
              )}
            </div>

            {history.length === 0 ? (
              <div className="text-center py-4 text-[10px] font-mono text-gray-500">
                No reps recorded yet. Start camera and execute reps!
              </div>
            ) : (
              <div className="max-h-36 overflow-y-auto space-y-1 text-[9px] font-mono">
                {history.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between bg-[#0F0E17] border border-[#2E2B44] px-2 py-1"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-[#F4B41A] font-bold">#{item.repNumber}</span>
                      <span className="text-white uppercase">{item.exercise}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-[#38B6FF]">⚡ {item.power} PWR</span>
                      <span className="text-[#00EB88]">🛡️ {Math.round(item.form * 100)}%</span>
                      <span className="text-gray-500">{item.timestamp}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      </main>
    </div>
  );
};
