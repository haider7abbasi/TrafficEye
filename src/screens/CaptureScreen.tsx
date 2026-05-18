import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ScrollView,
  Modal,
  Image,
  TextInput,
} from 'react-native';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Camera,
  runAtTargetFps,
  useCameraDevice,
  useCameraPermission,
  useFrameProcessor,
} from 'react-native-vision-camera';
import { useRunOnJS } from 'react-native-worklets-core';
import { useApp, ViolationRecord } from '../context/AppContext';
import { normalizePlateCanonical, normalizePlateForDisplay } from '../rules/plateNormalization';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { analyzeLocalImageForViolations, type InferencePlainLanguage } from '../services/roboflowOrchestrator';
import {
  BRAND_ACCENT,
  SURFACE_PANEL,
  SURFACE_PANEL_BORDER,
  TEXT_MUTED,
  TEXT_PRIMARY,
  TEXT_SECONDARY,
} from '../theme/brandColors';
import {
  capturePhotoWithDeviceCamera,
  captureVideoWithDeviceCamera,
  pickPhotoFromDeviceLibrary,
  pickVideoFromDeviceLibrary,
  type PickedVideo,
} from '../services/nativeImageCapture';
import { extractApprox1FpsJpegUrisFromVideo } from '../services/extractVideoFrames';
import type { SpecViolationId } from '../rules/specViolationMapping';
import { predictionToPixelCropRect, type RoboflowPrediction } from '../services/roboflowViolationPolicy';
import { CaptureHomeDashboard } from '../components/capture/CaptureHomeDashboard';
import { LiveScanResultsModal } from '../components/capture/LiveScanResultsModal';
import {
  buildLiveScanReport,
  type LiveScanFrameEntry,
  type LiveScanMode,
  type LiveScanReport,
} from '../types/liveScanReport';
import { TrafficEyeLoader } from '../components/TrafficEyeLoader';
import { startFrameSampler } from '../services/frameSampler';
import { createArrayFrameProvider, createSequentialFrameProvider } from '../services/videoFrameIterator';
import {
  evaluateDedupGate,
  buildViolationSignature,
  registerCandidateObservation,
} from '../services/dedupGate';
import type { BottomTabParamList } from '../navigation/BottomTabNavigator';
import { appAlert } from '../services/appAlert';
import {
  AlertTriangle,
  BadgeCheck,
  Calendar,
  Car,
  ChevronDown,
  ChevronUp,
  Clock,
  Info,
  MapPin,
} from 'lucide-react-native';

function isLocalImageUri(uri: string): boolean {
  return uri.startsWith('file://') || uri.startsWith('content://') || /^[a-zA-Z]:\\/.test(uri) || uri.startsWith('/');
}

type CaptureRouteProp = RouteProp<BottomTabParamList, 'Capture'>;

type Props = {
  navigation: NativeStackNavigationProp<any>;
};

type PendingInference = {
  specViolationIds: SpecViolationId[];
  platePrediction: RoboflowPrediction | null;
  plainLanguage: InferencePlainLanguage;
};

function visionPhotoPathToUri(path: string): string {
  const p = path.trim();
  return p.startsWith('file://') ? p : `file://${p}`;
}

export function CaptureScreen({ navigation }: Props) {
  const route = useRoute<CaptureRouteProp>();
  const { records, addRecord, createIntakeSession, uploadCandidateEvidence, createCandidate, user } =
    useApp();
  const { hasPermission: hasCameraPermission, requestPermission: requestCameraPermission } = useCameraPermission();
  /** Live monitoring: rear camera only (road-facing). Still capture via image picker can use the system camera UI. */
  const cameraDevice = useCameraDevice('back');
  const cameraRef = useRef<Camera>(null);
  const liveSessionIdRef = useRef<string | null>(null);
  const liveSamplerStartedRef = useRef(false);

  const [detecting, setDetecting] = useState(false);
  const [pendingImage, setPendingImage] = useState<string | null>(null);
  const [pendingEvidenceContentType, setPendingEvidenceContentType] = useState<string | undefined>(undefined);
  const [pendingResult, setPendingResult] = useState<Omit<ViolationRecord, 'id' | 'timestamp'> | null>(null);
  const [pendingInference, setPendingInference] = useState<PendingInference | null>(null);
  const [pendingPlate, setPendingPlate] = useState('');
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [liveRunning, setLiveRunning] = useState(false);
  const [liveFrames, setLiveFrames] = useState(0);
  const [liveViolations, setLiveViolations] = useState(0);
  const [liveLastInfo, setLiveLastInfo] = useState('Idle');
  const [videoExtracting, setVideoExtracting] = useState(false);
  const [liveCameraVisible, setLiveCameraVisible] = useState(false);
  /** Updated from VisionCamera frame processor (~1 Hz) — preview buffer size, not photo file size. */
  const [liveStreamDims, setLiveStreamDims] = useState('');
  const [liveScanReport, setLiveScanReport] = useState<LiveScanReport | null>(null);
  const [liveScanResultsVisible, setLiveScanResultsVisible] = useState(false);
  const stopLiveRef = useRef<(() => void) | null>(null);
  const liveScanAccumRef = useRef<{
    sessionId: string;
    mode: LiveScanMode;
    startedAt: string;
    entries: LiveScanFrameEntry[];
  } | null>(null);
  const processLiveFrameRef = useRef<
    | ((
        imageUri: string,
        sessionId: string,
        frameId: string,
        opts?: { frameSource?: 'live' | 'video' },
      ) => Promise<void>)
    | null
  >(null);

  const reportLiveStreamDims = useRunOnJS((width: number, height: number) => {
    setLiveStreamDims(`${width}×${height}`);
  }, []);

  const livePreviewFrameProcessor = useFrameProcessor(
    frame => {
      'worklet';
      runAtTargetFps(1, () => {
        'worklet';
        if (!frame.isValid) {
          return;
        }
        reportLiveStreamDims(frame.width, frame.height);
      });
    },
    [reportLiveStreamDims],
  );

  const totalRecords = records.length;
  const violationsFound = records.filter(r => r.violations.length > 0).length;
  const interactionLocked = detecting || liveRunning || videoExtracting;

  const busyBannerText = detecting
    ? 'Analyzing image…'
    : videoExtracting
    ? 'Preparing video…'
    : liveRunning
    ? liveCameraVisible
      ? 'Live camera open — use Stop when done.'
      : 'Live scan running — stop before other actions.'
    : '';

  useEffect(() => {
    return () => {
      stopLiveRef.current?.();
      stopLiveRef.current = null;
    };
  }, []);

  type MediaHint = { mimeType?: string; fileName?: string };

  const runDetection = async (imageUri: string, mode: 'still' | 'upload', mediaHint?: MediaHint) => {
    if (liveRunning) {
      appAlert('Live monitoring active', 'Stop live monitoring before running single-image detection.');
      return;
    }
    if (!isLocalImageUri(imageUri)) {
      appAlert(
        'Local image required',
        'Analysis uses your hosted Roboflow models on device photos only. Use Take photo or Choose from gallery.',
      );
      return;
    }

    setDetecting(true);
    setPendingImage(imageUri);
    setPendingEvidenceContentType(mediaHint?.mimeType);
    try {
      const sessionId = await createIntakeSession(mode);
      setActiveSessionId(sessionId);
    } catch (e) {
      console.warn('[Intake session]', e);
      setActiveSessionId(null);
    }

    try {
      const inferenceInput =
        mediaHint != null
          ? { uri: imageUri, mimeType: mediaHint.mimeType, fileName: mediaHint.fileName }
          : imageUri;
      const result = await analyzeLocalImageForViolations(inferenceInput);
      const mapped: Omit<ViolationRecord, 'id' | 'timestamp'> = {
        imageUri,
        violations: result.violationLabels,
        confidence: result.confidencePercent,
        location: 'Main Street & 5th Avenue',
        vehicleNumber: undefined,
      };
      setPendingPlate('');
      setPendingResult(mapped);
      setPendingInference({
        specViolationIds: result.specViolationIds,
        platePrediction: result.platePrediction,
        plainLanguage: result.plainLanguage,
      });
    } catch (e) {
      const message = (e as { message?: string })?.message ?? 'Roboflow inference failed.';
      console.warn('[Capture inference]', message);
      appAlert('Detection failed', message);
      setPendingImage(null);
      setPendingEvidenceContentType(undefined);
      setPendingResult(null);
      setPendingInference(null);
      setActiveSessionId(null);
    } finally {
      setDetecting(false);
    }
  };

  const alertIfCaptureBlocked = (): boolean => {
    if (!interactionLocked) {
      return false;
    }
    if (detecting || videoExtracting) {
      appAlert('Please wait', 'Finish the current analysis before capturing again.');
    } else if (liveRunning) {
      appAlert('Live monitoring active', 'Stop live monitoring before taking a photo or video.');
    }
    return true;
  };

  const processVideoForScan = async (picked: PickedVideo) => {
    setVideoExtracting(true);
    try {
      const { frameUris, durationMs } = await extractApprox1FpsJpegUrisFromVideo(
        picked.uri,
        picked.mimeType,
      );
      setVideoExtracting(false);
      if (frameUris.length === 0) {
        appAlert('Video', 'No frames could be extracted from this file.');
        return;
      }
      const sec = Math.max(1, Math.round(durationMs / 1000));
      appAlert(
        'Ready to scan',
        `We prepared ${frameUris.length} frame${frameUris.length === 1 ? '' : 's'} from about ${sec}s of video (very long clips may be shortened). Start the automatic scan?`,
        [
          { text: 'Not now', style: 'cancel' },
          {
            text: 'Start scan',
            onPress: () => {
              void beginLiveSampler(frameUris, 'video', true);
            },
          },
        ],
      );
    } catch (e) {
      setVideoExtracting(false);
      const message = (e as { message?: string })?.message ?? 'Could not read this video.';
      appAlert('Video', message);
    }
  };

  const handleDeviceCamera = async () => {
    if (alertIfCaptureBlocked()) {
      return;
    }
    try {
      const picked = await capturePhotoWithDeviceCamera();
      if (picked) {
        await runDetection(picked.uri, 'still', {
          mimeType: picked.mimeType,
          fileName: picked.fileName,
        });
      }
    } catch (e) {
      const message = (e as { message?: string })?.message ?? 'Could not open camera.';
      appAlert('Camera', message);
    }
  };

  const handleDeviceVideoCamera = async () => {
    if (alertIfCaptureBlocked()) {
      return;
    }
    try {
      const picked = await captureVideoWithDeviceCamera();
      if (picked) {
        await processVideoForScan(picked);
      }
    } catch (e) {
      const message = (e as { message?: string })?.message ?? 'Could not record video.';
      appAlert('Video', message);
    }
  };

  const presentCaptureMediaChooser = () => {
    if (alertIfCaptureBlocked()) {
      return;
    }
    appAlert('Capture', 'Choose photo or video', [
      { text: 'Take photo', onPress: () => void handleDeviceCamera() },
      { text: 'Record video', onPress: () => void handleDeviceVideoCamera() },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const presentCaptureMediaChooserRef = useRef(presentCaptureMediaChooser);
  presentCaptureMediaChooserRef.current = presentCaptureMediaChooser;

  /** Center tab Capture FAB — photo or video from camera. */
  useEffect(() => {
    const requestId = route.params?.cameraRequestId;
    if (requestId == null) {
      return;
    }
    navigation.setParams({ cameraRequestId: undefined });
    presentCaptureMediaChooserRef.current();
  }, [route.params?.cameraRequestId, navigation]);

  const handleDeviceGallery = async () => {
    if (interactionLocked) {
      return;
    }
    try {
      const picked = await pickPhotoFromDeviceLibrary();
      if (picked) {
        await runDetection(picked.uri, 'upload', {
          mimeType: picked.mimeType,
          fileName: picked.fileName,
        });
      }
    } catch (e) {
      const message = (e as { message?: string })?.message ?? 'Could not open photo library.';
      appAlert('Photo library', message);
    }
  };

  const handleSave = async () => {
    if (pendingResult && pendingImage) {
      // Phase 4 policy: non-violations are discarded; no cloud writes for this frame.
      if (pendingResult.violations.length === 0) {
        appAlert(
          'No violation detected',
          pendingInference?.plainLanguage?.headline
            ? `${pendingInference.plainLanguage.headline}\n\n${pendingInference.plainLanguage.bullets.slice(0, 4).join('\n')}`
            : 'Frame discarded (no cloud write) as per phase policy.',
        );
        setPendingResult(null);
        setPendingImage(null);
        setPendingPlate('');
        setPendingEvidenceContentType(undefined);
        setPendingInference(null);
        setActiveSessionId(null);
        return;
      }

      const vehicleNumber = pendingPlate.trim()
        ? normalizePlateForDisplay(pendingPlate.trim())
        : pendingResult.vehicleNumber
        ? normalizePlateForDisplay(pendingResult.vehicleNumber)
        : undefined;
      const plateTrim = pendingPlate.trim();
      const candidatePlateDisplay = plateTrim ? normalizePlateForDisplay(plateTrim) : undefined;
      const candidatePlateCanonical = plateTrim ? normalizePlateCanonical(plateTrim) : undefined;

      let savedCandidateId: string | undefined;
      let savedEvidenceRef: string | undefined;
      const savedSpecIds = pendingInference?.specViolationIds;

      // Candidate creation for live/local inference path with dedup create/merge decision.
      if (pendingInference && pendingInference.specViolationIds.length > 0) {
        const dedup = evaluateDedupGate({
          sessionId: activeSessionId ?? undefined,
          violationTypes: pendingInference.specViolationIds,
        });
        if (dedup.decision !== 'suppress') {
          const candidateId =
            dedup.decision === 'merge' && dedup.existingCandidateId
              ? dedup.existingCandidateId
              : `cand-${Date.now()}`;
          const signature = buildViolationSignature(pendingInference.specViolationIds);
          try {
            const uploaded = await uploadCandidateEvidence(candidateId, pendingImage, {
              contentType: pendingEvidenceContentType,
            });
            savedCandidateId = candidateId;
            savedEvidenceRef = uploaded.objectPath;
            await createCandidate({
              candidateId,
              sessionId: activeSessionId ?? undefined,
              violationTypes: pendingInference.specViolationIds,
              dedupDecision: dedup.decision,
              dedupSignature: signature,
              evidenceImageRef: uploaded.objectPath,
              locationText: pendingResult.location,
              vehiclePlateDisplay: candidatePlateDisplay,
              vehiclePlateCanonical: candidatePlateCanonical,
              plateBox: pendingInference.platePrediction
                ? {
                    x: pendingInference.platePrediction.x,
                    y: pendingInference.platePrediction.y,
                    width: pendingInference.platePrediction.width,
                    height: pendingInference.platePrediction.height,
                    confidence: pendingInference.platePrediction.confidence,
                  }
                : undefined,
            });
            registerCandidateObservation({
              sessionId: activeSessionId ?? undefined,
              violationTypes: pendingInference.specViolationIds,
              candidateId,
            });
          } catch (e) {
            const message = (e as { message?: string })?.message ?? 'Candidate write failed.';
            console.warn('[Candidate create]', message);
            appAlert('Candidate write warning', message);
          }
        }
      }

      const record: ViolationRecord = {
        ...pendingResult,
        vehicleNumber: vehicleNumber || undefined,
        id: `violation-${Date.now()}`,
        timestamp: new Date().toISOString(),
        candidateId: savedCandidateId,
        evidenceImageRef: savedEvidenceRef,
        specViolationIds: savedSpecIds?.length ? savedSpecIds : undefined,
        sessionId: activeSessionId ?? undefined,
      };
      await addRecord(record);
      setPendingResult(null);
      setPendingImage(null);
      setPendingPlate('');
      setPendingEvidenceContentType(undefined);
      setPendingInference(null);
      setActiveSessionId(null);
      navigation.navigate('MainTabs', { screen: 'History' });
    }
  };

  const handleRetake = () => {
    setPendingResult(null);
    setPendingImage(null);
    setPendingPlate('');
    setPendingEvidenceContentType(undefined);
    setPendingInference(null);
    setActiveSessionId(null);
  };

  const openCandidateQueue = useCallback(() => {
    navigation.navigate('MainTabs', { screen: 'Queue' });
  }, [navigation]);

  const finalizeLiveScanReport = useCallback(() => {
    const accum = liveScanAccumRef.current;
    liveScanAccumRef.current = null;
    if (accum && accum.entries.length > 0) {
      const report = buildLiveScanReport(accum);
      setLiveScanReport(report);
      setLiveScanResultsVisible(true);
    }
  }, []);

  const stopLiveMonitoring = useCallback(() => {
    stopLiveRef.current?.();
    stopLiveRef.current = null;
    liveSamplerStartedRef.current = false;
    liveSessionIdRef.current = null;
    setLiveCameraVisible(false);
    finalizeLiveScanReport();
    setLiveRunning(false);
    setLiveStreamDims('');
    setLiveLastInfo('Stopped');
  }, [finalizeLiveScanReport]);

  const pushLiveScanEntry = (
    entry: Omit<LiveScanFrameEntry, 'timestamp'> & { timestamp?: string },
  ) => {
    if (!liveScanAccumRef.current) {
      return;
    }
    liveScanAccumRef.current.entries.push({
      ...entry,
      violations: entry.violations ?? [],
      timestamp: entry.timestamp ?? new Date().toISOString(),
    });
  };

  const startLiveScanSession = (sessionId: string, mode: LiveScanMode) => {
    liveScanAccumRef.current = {
      sessionId,
      mode,
      startedAt: new Date().toISOString(),
      entries: [],
    };
  };

  const processLiveFrame = async (
    imageUri: string,
    sessionId: string,
    frameId: string,
    opts?: { frameSource?: 'live' | 'video' },
  ) => {
    const locationLabel = opts?.frameSource === 'video' ? 'Video clip' : 'Live monitor';
    const local = isLocalImageUri(imageUri);
    if (!local) {
      console.warn('[Live frame] Skipping non-local URI (unexpected)', imageUri);
      setLiveLastInfo(`Frame ${frameId}: local image required for Roboflow`);
      pushLiveScanEntry({
        frameId,
        outcome: 'error',
        summary: 'Local image required for detection',
        violations: [],
      });
      return;
    }

    let specIds: SpecViolationId[] = [];
    let violationLabels: string[] = [];
    let platePrediction: RoboflowPrediction | null = null;
    let savedHeadline = '';
    try {
      const result = await analyzeLocalImageForViolations({
        uri: imageUri,
        mimeType: 'image/jpeg',
        fileName: `${frameId.replace(/[^a-zA-Z0-9_-]/g, '_')}.jpg`,
      });
      savedHeadline = result.plainLanguage.headline;
      specIds = result.specViolationIds;
      violationLabels = result.violationLabels;
      platePrediction = result.platePrediction;
    } catch (e) {
      const message = (e as { message?: string })?.message ?? 'Roboflow inference failed.';
      console.warn('[Live frame inference]', message);
      setLiveLastInfo(`Frame ${frameId}: detection error`);
      pushLiveScanEntry({
        frameId,
        outcome: 'error',
        summary: message,
        violations: [],
      });
      return;
    }

    if (violationLabels.length === 0) {
      const summary = savedHeadline || 'No violation';
      setLiveLastInfo(`${frameId}: ${summary}`);
      pushLiveScanEntry({
        frameId,
        outcome: 'clear',
        summary,
        violations: [],
      });
      return;
    }

    const gate = evaluateDedupGate({
      sessionId,
      violationTypes: specIds,
    });
    if (gate.decision === 'suppress') {
      setLiveLastInfo(`Frame ${frameId}: ${gate.decision}`);
      pushLiveScanEntry({
        frameId,
        outcome: 'suppressed',
        summary: `Duplicate suppressed (${gate.decision})`,
        violations: violationLabels,
      });
      return;
    }

    let liveCandidateId: string | undefined;
    let liveEvidenceRef: string | undefined;
    if (specIds.length > 0) {
      const candidateId =
        gate.decision === 'merge' && gate.existingCandidateId
          ? gate.existingCandidateId
          : `cand-live-${Date.now()}-${frameId}`;
      const uploaded = await uploadCandidateEvidence(candidateId, imageUri, {
        contentType: 'image/jpeg',
      });
      liveCandidateId = candidateId;
      liveEvidenceRef = uploaded.objectPath;
      await createCandidate({
        candidateId,
        sessionId,
        violationTypes: specIds,
        dedupDecision: gate.decision,
        dedupSignature: gate.violationSignature,
        evidenceImageRef: uploaded.objectPath,
        locationText: locationLabel,
        plateBox: platePrediction
          ? {
              x: platePrediction.x,
              y: platePrediction.y,
              width: platePrediction.width,
              height: platePrediction.height,
              confidence: platePrediction.confidence,
            }
          : undefined,
      });
      registerCandidateObservation({
        sessionId,
        violationTypes: specIds,
        candidateId,
      });
    }

    const record: ViolationRecord = {
      id: `live-${Date.now()}-${frameId}`,
      imageUri,
      violations: violationLabels,
      confidence: 80,
      location: locationLabel,
      timestamp: new Date().toISOString(),
      candidateId: liveCandidateId,
      evidenceImageRef: liveEvidenceRef,
      specViolationIds: specIds.length > 0 ? specIds : undefined,
      sessionId,
    };
    await addRecord(record);
    setLiveViolations(v => v + 1);
    const summary = savedHeadline ? `${savedHeadline} — saved` : 'Violation saved';
    setLiveLastInfo(`${frameId}: ${summary}`);
    pushLiveScanEntry({
      frameId,
      outcome: 'violation',
      summary: savedHeadline || 'Violation flagged',
      violations: violationLabels,
    });
  };

  processLiveFrameRef.current = processLiveFrame;

  const beginLiveSampler = async (
    frameUris: string[],
    sessionMode: 'live' | 'video',
    sequential: boolean,
  ) => {
    if (liveRunning) {
      return;
    }
    if (detecting) {
      appAlert('Detection in progress', 'Wait for current detection to complete before starting live mode.');
      return;
    }
    let sessionId: string;
    try {
      sessionId = await createIntakeSession(sessionMode);
      setActiveSessionId(sessionId);
    } catch (e) {
      appAlert('Live start failed', 'Could not create intake session.');
      return;
    }

    const frameProvider = sequential
      ? createSequentialFrameProvider(frameUris)
      : createArrayFrameProvider(frameUris);
    const frameSource: 'live' | 'video' = sessionMode === 'video' ? 'video' : 'live';

    setLiveFrames(0);
    setLiveViolations(0);
    setLiveLastInfo(sequential ? 'Scanning video at ~1 FPS…' : 'Running at ~1 FPS');
    setLiveRunning(true);
    startLiveScanSession(sessionId, sessionMode);

    stopLiveRef.current = startFrameSampler({
      fps: 1,
      exhaustWhenNull: sequential,
      getNextFrameUri: frameProvider,
      onFrame: async frame => {
        setLiveFrames(v => v + 1);
        await processLiveFrameRef.current?.(frame.imageUri, sessionId, frame.frameId, { frameSource });
      },
      onError: e => {
        console.warn('[Live monitor]', e);
        setLiveLastInfo('Error in frame sampler');
      },
      onExhausted: () => {
        stopLiveMonitoring();
        if (sequential) {
          setLiveLastInfo('Video clip fully processed.');
        }
      },
    });
  };

  const handleLiveCameraInitialized = useCallback(() => {
    const sessionId = liveSessionIdRef.current;
    if (!sessionId || liveSamplerStartedRef.current) {
      return;
    }
    liveSamplerStartedRef.current = true;
    setLiveLastInfo('Live camera ~1 FPS');

    stopLiveRef.current = startFrameSampler({
      fps: 1,
      exhaustWhenNull: false,
      getNextFrameUri: async () => {
        const cam = cameraRef.current;
        if (!cam) {
          return null;
        }
        try {
          const photo = await cam.takePhoto({
            flash: 'off',
            enableShutterSound: false,
          });
          return visionPhotoPathToUri(photo.path);
        } catch (e) {
          console.warn('[Live takePhoto]', e);
          return null;
        }
      },
      onFrame: async frame => {
        setLiveFrames(v => v + 1);
        await processLiveFrameRef.current?.(frame.imageUri, sessionId, frame.frameId, { frameSource: 'live' });
      },
      onError: e => {
        console.warn('[Live camera]', e);
        setLiveLastInfo('Error in live sampler');
      },
    });
  }, []);

  const startLiveMonitoring = async () => {
    if (liveRunning) {
      return;
    }
    if (detecting) {
      appAlert('Detection in progress', 'Wait for current detection to complete before starting live mode.');
      return;
    }
    let granted = hasCameraPermission;
    if (!granted) {
      granted = await requestCameraPermission();
    }
    if (!granted) {
      appAlert('Camera required', 'Allow camera access to run live monitoring at ~1 FPS.');
      return;
    }
    if (cameraDevice == null) {
      appAlert('No camera', 'Could not open a back camera on this device.');
      return;
    }

    let sessionId: string;
    try {
      sessionId = await createIntakeSession('live');
      setActiveSessionId(sessionId);
      liveSessionIdRef.current = sessionId;
    } catch {
      appAlert('Live start failed', 'Could not create intake session.');
      return;
    }

    liveSamplerStartedRef.current = false;
    setLiveFrames(0);
    setLiveViolations(0);
    setLiveStreamDims('');
    setLiveLastInfo('Starting camera…');
    setLiveRunning(true);
    setLiveCameraVisible(true);
    startLiveScanSession(sessionId, 'live');
  };

  const handleChooseVideoForLiveScan = async () => {
    if (alertIfCaptureBlocked()) {
      return;
    }
    try {
      const picked = await pickVideoFromDeviceLibrary();
      if (picked) {
        await processVideoForScan(picked);
      }
    } catch (e) {
      const message = (e as { message?: string })?.message ?? 'Could not open video library.';
      appAlert('Video', message);
    }
  };

  if (pendingResult && pendingImage) {
    return (
      <SafeAreaView style={styles.safeRoot} edges={['top', 'left', 'right']}>
        <DetectionResult
          imageUri={pendingImage}
          result={pendingResult}
          platePrediction={pendingInference?.platePrediction ?? null}
          plainLanguage={pendingInference?.plainLanguage ?? null}
          plateDraft={pendingPlate}
          onPlateDraftChange={setPendingPlate}
          onSave={handleSave}
          onRetake={handleRetake}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeRoot} edges={['top', 'left', 'right']}>
      <ScrollView
        style={styles.homeScroll}
        contentContainerStyle={styles.homeContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}>
        <CaptureHomeDashboard
          officerName={user?.name?.split(/\s+/)[0]}
          busyBannerText={busyBannerText}
          totalRecords={totalRecords}
          violationsFound={violationsFound}
          liveRunning={liveRunning}
          liveFrames={liveFrames}
          liveViolations={liveViolations}
          liveLastInfo={liveLastInfo}
          interactionLocked={interactionLocked}
          onCapturePhoto={handleDeviceCamera}
          onPickGallery={handleDeviceGallery}
          onScanVideo={handleChooseVideoForLiveScan}
          onStartLive={startLiveMonitoring}
          onStopLive={stopLiveMonitoring}
          lastLiveScanReport={!liveRunning ? liveScanReport : null}
          onViewLiveScanReport={() => setLiveScanResultsVisible(true)}
          onOpenQueueFromReport={openCandidateQueue}
        />
      </ScrollView>

      <LiveScanResultsModal
        visible={liveScanResultsVisible}
        report={liveScanReport}
        onClose={() => setLiveScanResultsVisible(false)}
        onViewQueue={() => {
          setLiveScanResultsVisible(false);
          openCandidateQueue();
        }}
      />

      {/* Detecting Modal */}
      <Modal visible={detecting} animationType="fade" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <TrafficEyeLoader size="large" color={BRAND_ACCENT} style={{ marginBottom: 14 }} />
            <Text style={styles.modalTitle}>Analyzing…</Text>
            <Text style={styles.modalDesc}>
              Sending your image for detection. On slow networks this can take up to a minute — the app is still
              working.
            </Text>
          </View>
        </View>
      </Modal>

      <Modal visible={videoExtracting} animationType="fade" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <TrafficEyeLoader size="large" color={BRAND_ACCENT} style={{ marginBottom: 14 }} />
            <Text style={styles.modalTitle}>Preparing video…</Text>
            <Text style={styles.modalDesc}>
              Turning your clip into still frames for scanning. Long videos take longer — keep the app open.
            </Text>
          </View>
        </View>
      </Modal>

      <Modal
        visible={liveCameraVisible}
        animationType="slide"
        presentationStyle="fullScreen"
        onRequestClose={stopLiveMonitoring}>
        <SafeAreaView style={styles.liveCameraRoot} edges={['top', 'left', 'right']}>
          <View style={styles.liveCameraHeader}>
            <Pressable
              style={styles.liveCameraStopBtn}
              onPress={stopLiveMonitoring}
              accessibilityRole="button"
              accessibilityLabel="Stop camera"
              hitSlop={8}>
              <Text style={styles.liveCameraStopTxt}>Stop</Text>
            </Pressable>
            <View style={styles.liveCameraHeaderCenter}>
              <View style={styles.liveCameraChipRow}>
                <Text style={styles.liveCameraChip}>Back camera</Text>
                <Text style={styles.liveCameraChipMuted}>~1 photo/s</Text>
                {liveStreamDims ? (
                  <Text style={styles.liveCameraChipMuted}>FP stream {liveStreamDims}</Text>
                ) : null}
              </View>
              <Text style={styles.liveCameraSessionTxt} numberOfLines={2}>
                Point at traffic · Captures about once per second
              </Text>
            </View>
            <View style={styles.liveCameraHeaderSpacer} />
          </View>
          <Text style={styles.liveCameraHint}>Hold the phone so the rear camera faces the road · One capture per second</Text>
          {cameraDevice == null ? (
            <TrafficEyeLoader size="large" color="#ffffff" ringColor="#A8D4FF" style={{ marginTop: 24 }} />
          ) : (
            <Camera
              ref={cameraRef}
              style={styles.liveCameraPreview}
              device={cameraDevice}
              isActive={liveCameraVisible}
              photo
              frameProcessor={livePreviewFrameProcessor}
              onInitialized={handleLiveCameraInitialized}
            />
          )}
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

type DetectionResultProps = {
  imageUri: string;
  result: Omit<ViolationRecord, 'id' | 'timestamp'>;
  platePrediction: RoboflowPrediction | null;
  plainLanguage: InferencePlainLanguage | null;
  plateDraft: string;
  onPlateDraftChange: (text: string) => void;
  onSave: () => void;
  onRetake: () => void;
};

const PREVIEW_H = 220;

function computeContainLayout(
  containerW: number,
  containerH: number,
  iw: number,
  ih: number,
): { offsetX: number; offsetY: number; scale: number } | null {
  if (iw <= 0 || ih <= 0 || containerW <= 0 || containerH <= 0) {
    return null;
  }
  const scale = Math.min(containerW / iw, containerH / ih);
  const w = iw * scale;
  const h = ih * scale;
  const offsetX = (containerW - w) / 2;
  const offsetY = (containerH - h) / 2;
  return { offsetX, offsetY, scale };
}

function verdictVariant(
  headline: string,
  hasViolations: boolean,
): 'danger' | 'ok' | 'info' {
  if (hasViolations) {
    return 'danger';
  }
  if (headline.includes('No vehicle')) {
    return 'info';
  }
  return 'ok';
}

function DetectionResult({
  imageUri,
  result,
  platePrediction,
  plainLanguage,
  plateDraft,
  onPlateDraftChange,
  onSave,
  onRetake,
}: DetectionResultProps) {
  const navigation = useNavigation();
  const hasViolations = result.violations.length > 0;
  const [naturalSize, setNaturalSize] = useState<{ w: number; h: number } | null>(null);
  const [previewW, setPreviewW] = useState(0);
  const [technicalOpen, setTechnicalOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    Image.getSize(
      imageUri,
      (w, h) => {
        if (!cancelled && w > 0 && h > 0) {
          setNaturalSize({ w, h });
        }
      },
      () => {},
    );
    return () => {
      cancelled = true;
    };
  }, [imageUri]);

  const headline =
    plainLanguage?.headline?.trim() ||
    (hasViolations ? result.violations.join(' · ') : 'Nothing flagged on this image');
  const badgeLabels =
    plainLanguage?.displayViolationLabels && plainLanguage.displayViolationLabels.length > 0
      ? plainLanguage.displayViolationLabels
      : result.violations;
  const verdict = verdictVariant(headline, hasViolations);
  const noViolationHint = headline.includes('No vehicle')
    ? 'No car or motorcycle was detected in this frame, so seatbelt and helmet rules did not apply. Capture again with the vehicle clearly in view if needed.'
    : 'No traffic violations matched the rules for this scene. Nothing is sent to the queue—you can scan another image if needed.';

  const plateOverlayLayout = (() => {
    if (!platePrediction || !naturalSize || previewW <= 0) {
      return null;
    }
    const lay = computeContainLayout(previewW, PREVIEW_H, naturalSize.w, naturalSize.h);
    if (!lay) {
      return null;
    }
    const crop = predictionToPixelCropRect(platePrediction, naturalSize.w, naturalSize.h);
    return {
      left: lay.offsetX + crop.x * lay.scale,
      top: lay.offsetY + crop.y * lay.scale,
      width: crop.width * lay.scale,
      height: crop.height * lay.scale,
    };
  })();

  const openCandidateQueue = () => {
    navigation.navigate('MainTabs', { screen: 'Queue' });
  };

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content}>
      <View style={[styles.card, { padding: 0, overflow: 'hidden' }]}>
        <View
          style={styles.imagePreviewWrap}
          onLayout={e => setPreviewW(e.nativeEvent.layout.width)}>
          <Image source={{ uri: imageUri }} style={styles.detectionImage} resizeMode="contain" />
          {plateOverlayLayout ? (
            <View
              pointerEvents="none"
              style={[
                styles.plateOverlay,
                {
                  left: plateOverlayLayout.left,
                  top: plateOverlayLayout.top,
                  width: plateOverlayLayout.width,
                  height: plateOverlayLayout.height,
                },
              ]}
            />
          ) : null}
        </View>
      </View>

      <View
        style={[
          styles.verdictCard,
          verdict === 'danger' && styles.verdictCardDanger,
          verdict === 'ok' && styles.verdictCardOk,
          verdict === 'info' && styles.verdictCardInfo,
        ]}>
        <View style={styles.verdictRow}>
          <View style={styles.verdictEmoji} importantForAccessibility="no">
            {verdict === 'danger' ? (
              <AlertTriangle size={28} color="#991b1b" strokeWidth={2.2} />
            ) : verdict === 'info' ? (
              <Info size={28} color="#92400e" strokeWidth={2.2} />
            ) : (
              <BadgeCheck size={28} color="#166534" strokeWidth={2.2} />
            )}
          </View>
          <View style={{ flex: 1, gap: 6 }}>
            <Text style={styles.verdictKicker}>Outcome</Text>
            <Text
              style={[
                styles.verdictHeadline,
                verdict === 'danger' && { color: '#991b1b' },
                verdict === 'ok' && { color: '#166534' },
                verdict === 'info' && { color: '#92400e' },
              ]}>
              {headline}
            </Text>
            <Text style={styles.verdictConfidence}>Model confidence (highest box): {result.confidence}%</Text>
            {badgeLabels.length > 0 ? (
              <View style={styles.badgesWrap}>
                {badgeLabels.map((v, i) => (
                  <View
                    key={`${v}-${i}`}
                    style={[styles.badge, verdict === 'danger' ? styles.badgeDanger : styles.badgeNeutral]}>
                    <Text style={[styles.badgeText, verdict === 'danger' && styles.badgeTextDanger]}>{v}</Text>
                  </View>
                ))}
              </View>
            ) : null}
          </View>
        </View>
      </View>

      {plainLanguage && plainLanguage.bullets.length > 0 ? (
        <View style={styles.card}>
          <Pressable
            onPress={() => setTechnicalOpen(o => !o)}
            style={styles.technicalToggle}
            accessibilityRole="button"
            accessibilityLabel={technicalOpen ? 'Hide technical detection details' : 'Show technical detection details'}
            accessibilityState={{ expanded: technicalOpen }}>
            <View style={styles.technicalToggleHead}>
              {technicalOpen ? (
                <ChevronUp size={18} color={BRAND_ACCENT} strokeWidth={2.5} />
              ) : (
                <ChevronDown size={18} color={BRAND_ACCENT} strokeWidth={2.5} />
              )}
              <Text style={styles.technicalToggleText}>
                {technicalOpen ? 'Hide' : 'Show'} model & rule details
              </Text>
            </View>
            <Text style={styles.technicalToggleHint}>Per-model boxes, thresholds, and rule flags</Text>
          </Pressable>
          {technicalOpen ? (
            <View style={styles.technicalBullets}>
              {plainLanguage.bullets.map((line, i) => (
                <Text key={i} style={styles.technicalBullet}>
                  – {line}
                </Text>
              ))}
            </View>
          ) : null}
        </View>
      ) : null}

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Details</Text>
        <View style={styles.detailRow}>
          <View style={styles.detailIconSlot}>
            <MapPin size={14} color="#6b7280" strokeWidth={2} />
          </View>
          <Text style={styles.detailLabel}>Location: </Text>
          <Text style={styles.detailValue}>{result.location}</Text>
        </View>
        <View style={styles.detailRow}>
          <View style={styles.detailIconSlot}>
            <Calendar size={14} color="#6b7280" strokeWidth={2} />
          </View>
          <Text style={styles.detailLabel}>Date: </Text>
          <Text style={styles.detailValue}>{new Date().toLocaleDateString()}</Text>
        </View>
        <View style={styles.detailRow}>
          <View style={styles.detailIconSlot}>
            <Clock size={14} color="#6b7280" strokeWidth={2} />
          </View>
          <Text style={styles.detailLabel}>Time: </Text>
          <Text style={styles.detailValue}>{new Date().toLocaleTimeString()}</Text>
        </View>
        {result.vehicleNumber && (
          <View style={styles.detailRow}>
            <View style={styles.detailIconSlot}>
              <Car size={14} color="#6b7280" strokeWidth={2} />
            </View>
            <Text style={styles.detailLabel}>Vehicle: </Text>
            <Text style={styles.detailValue}>{result.vehicleNumber}</Text>
          </View>
        )}
      </View>

      {hasViolations ? (
        <>
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Number plate</Text>
            <Text style={styles.cardDesc}>
              The frame shows where the plate model found a plate (green outline). Enter the registration as read on
              the vehicle or from your notes.
            </Text>
            <Text style={styles.plateLabel}>Plate (officer)</Text>
            <TextInput
              style={styles.plateInput}
              value={plateDraft}
              onChangeText={onPlateDraftChange}
              placeholder="e.g. ABC-1234"
              placeholderTextColor="#9ca3af"
              autoCapitalize="characters"
              accessibilityLabel="Vehicle number plate"
            />
            <Pressable
              style={styles.queueBtn}
              onPress={openCandidateQueue}
              accessibilityRole="button"
              accessibilityLabel="Open candidate queue for challan">
              <Text style={styles.queueBtnText}>Candidate queue — generate challan</Text>
            </Pressable>
            <Text style={styles.queueHint}>
              After you save below, open the queue to confirm the candidate, enter the plate again if needed, and
              generate the PDF (report includes time, image, plate; challan record keeps a ~7-day expiry in Firestore).
            </Text>
          </View>
          <Text style={styles.saveHint}>
            Save sends this to History and may attach evidence for your candidate queue (per your org rules).
          </Text>
          <Pressable
            style={styles.primaryBtn}
            onPress={onSave}
            accessibilityRole="button"
            accessibilityLabel="Save to history">
            <Text style={styles.primaryBtnText}>Save to history</Text>
          </Pressable>
          <Pressable
            style={[styles.outlineBtn, { marginBottom: 24 }]}
            onPress={onRetake}
            accessibilityRole="button"
            accessibilityLabel="Discard and scan again">
            <Text style={styles.outlineBtnText}>Discard and scan again</Text>
          </Pressable>
        </>
      ) : (
        <>
          <Text style={styles.saveHint}>{noViolationHint}</Text>
          <Pressable
            style={styles.primaryBtn}
            onPress={onRetake}
            accessibilityRole="button"
            accessibilityLabel="Scan another image">
            <Text style={styles.primaryBtnText}>Scan another image</Text>
          </Pressable>
          <View style={{ marginBottom: 24 }} />
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  safeRoot: { flex: 1, backgroundColor: 'transparent' },
  homeScroll: { flex: 1, backgroundColor: 'transparent' },
  homeContent: {
    paddingHorizontal: 18,
    paddingTop: 10,
    paddingBottom: 32,
    flexGrow: 1,
  },
  root: { flex: 1, backgroundColor: 'transparent' },
  content: { padding: 14, gap: 14, paddingBottom: 30 },
  busyBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: '#fef3c7',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#fcd34d',
  },
  busyBannerIcon: { marginTop: 1, alignItems: 'center', justifyContent: 'center' },
  busyBannerText: { flex: 1, fontSize: 13, color: '#92400e', lineHeight: 19, fontWeight: '600' },
  heroCard: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    gap: 8,
  },
  heroTitle: { fontSize: 18, fontWeight: '800', color: '#111827' },
  heroSub: { fontSize: 14, color: TEXT_SECONDARY, lineHeight: 21 },
  menuHint: { fontSize: 12, color: BRAND_ACCENT, fontWeight: '600', marginTop: 4 },
  statsCard: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  statItem: { flex: 1, alignItems: 'center' },
  statDivider: { width: 1, height: 40, backgroundColor: '#e5e7eb' },
  statValue: { fontSize: 28, fontWeight: '800' },
  statLabel: { fontSize: 11, color: TEXT_MUTED, marginTop: 2 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    gap: 12,
  },
  sectionKicker: {
    fontSize: 11,
    fontWeight: '700',
    color: BRAND_ACCENT,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 4,
  },
  cardTitle: { fontSize: 16, fontWeight: '700', color: '#111827' },
  cardDesc: { fontSize: 13, color: TEXT_MUTED, lineHeight: 20 },
  primaryBtn: {
    backgroundColor: BRAND_ACCENT,
    borderRadius: 10,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    minHeight: 48,
  },
  primaryBtnIcon: { fontSize: 18 },
  primaryBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  outlineBtn: {
    borderWidth: 1,
    borderColor: BRAND_ACCENT,
    borderRadius: 10,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    minHeight: 48,
  },
  outlineBtnIcon: { fontSize: 18, color: BRAND_ACCENT },
  outlineBtnText: { color: BRAND_ACCENT, fontSize: 15, fontWeight: '600' },
  stopBtn: {
    backgroundColor: '#dc2626',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    minHeight: 48,
    justifyContent: 'center',
  },
  stopBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  livePolicyBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    backgroundColor: '#eff6ff',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#bfdbfe',
  },
  livePolicyBannerIcon: { fontSize: 22, marginTop: 2 },
  livePolicyBannerTextCol: { flex: 1, gap: 4 },
  livePolicyBannerTitle: { fontSize: 14, fontWeight: '700', color: '#1e3a8a' },
  livePolicyBannerSub: { fontSize: 12, color: '#1e40af', lineHeight: 17 },
  liveStatsCard: {
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    gap: 8,
  },
  liveStatsTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: TEXT_MUTED,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  liveStatsRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  liveStatLabel: { fontSize: 13, color: TEXT_MUTED },
  liveStatValue: { fontSize: 16, fontWeight: '800', color: '#111827' },
  liveStatStatus: { fontSize: 12, color: TEXT_SECONDARY, lineHeight: 17, marginTop: 2 },
  disabledBtn: { opacity: 0.7 },
  howCard: {
    backgroundColor: '#eff6ff',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#bfdbfe',
    gap: 6,
  },
  howTitle: { fontSize: 14, fontWeight: '700', color: '#1e3a8a' },
  howItem: { fontSize: 12, color: '#1e40af' },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'center',
    padding: 20,
  },
  modalCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    gap: 10,
    alignItems: 'stretch',
  },
  modalTitle: { fontSize: 18, fontWeight: '700', color: '#111827', textAlign: 'center' },
  modalDesc: { fontSize: 13, color: TEXT_MUTED, textAlign: 'center' },
  imagePreviewWrap: {
    height: PREVIEW_H,
    width: '100%',
    backgroundColor: '#111827',
    position: 'relative',
  },
  detectionImage: { width: '100%', height: PREVIEW_H },
  plateOverlay: {
    position: 'absolute',
    borderWidth: 2,
    borderColor: '#22c55e',
    borderRadius: 4,
    backgroundColor: 'rgba(34, 197, 94, 0.12)',
  },
  verdictCard: {
    borderRadius: 14,
    padding: 16,
    borderWidth: 2,
  },
  verdictCardDanger: { backgroundColor: '#fef2f2', borderColor: '#f87171' },
  verdictCardOk: { backgroundColor: '#E8F5E9', borderColor: '#81C784' },
  verdictCardInfo: { backgroundColor: '#fffbeb', borderColor: '#fbbf24' },
  verdictRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  verdictEmoji: { marginTop: 2, width: 32, alignItems: 'center', justifyContent: 'center' },
  verdictKicker: {
    fontSize: 11,
    fontWeight: '700',
    color: TEXT_MUTED,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  verdictHeadline: { fontSize: 18, fontWeight: '800', lineHeight: 25, color: '#111827' },
  verdictConfidence: { fontSize: 13, color: TEXT_MUTED },
  technicalToggle: { paddingVertical: 4, gap: 6 },
  technicalToggleHead: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  technicalToggleText: { fontSize: 15, fontWeight: '700', color: BRAND_ACCENT, flex: 1 },
  technicalToggleHint: { fontSize: 12, color: TEXT_MUTED },
  technicalBullets: {
    gap: 8,
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
  },
  technicalBullet: { fontSize: 12, color: TEXT_SECONDARY, lineHeight: 18 },
  plateLabel: { fontSize: 12, fontWeight: '700', color: '#374151', marginBottom: 6 },
  plateInput: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    backgroundColor: '#f9fafb',
  },
  queueBtn: {
    marginTop: 12,
    backgroundColor: '#0057B8',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  queueBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  queueHint: { fontSize: 11, color: TEXT_MUTED, lineHeight: 16, marginTop: 10 },
  badgesWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 },
  badge: {
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderWidth: 1,
  },
  badgeDanger: { backgroundColor: '#fff1f2', borderColor: '#fecdd3' },
  badgeNeutral: { backgroundColor: '#f9fafb', borderColor: '#e5e7eb' },
  badgeText: { fontSize: 12, fontWeight: '600', color: '#374151' },
  badgeTextDanger: { color: '#b91c1c' },
  detailRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  detailIconSlot: { width: 22, alignItems: 'center', justifyContent: 'center' },
  detailLabel: { fontSize: 13, color: TEXT_MUTED },
  detailValue: { fontSize: 13, fontWeight: '600', color: '#111827' },
  saveHint: {
    fontSize: 12,
    color: TEXT_MUTED,
    lineHeight: 18,
    marginTop: 4,
    marginBottom: 8,
  },
  liveCameraRoot: { flex: 1, backgroundColor: '#000' },
  liveCameraHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingHorizontal: 10,
    paddingBottom: 8,
    gap: 8,
  },
  liveCameraHeaderCenter: { flex: 1, alignItems: 'center', minWidth: 0 },
  liveCameraHeaderSpacer: { width: 72 },
  liveCameraChipRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap', justifyContent: 'center' },
  liveCameraChip: {
    backgroundColor: 'rgba(0, 87, 184, 0.55)',
    color: '#C8E4FF',
    fontSize: 12,
    fontWeight: '700',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    overflow: 'hidden',
  },
  liveCameraChipMuted: {
    backgroundColor: 'rgba(255,255,255,0.12)',
    color: '#d1d5db',
    fontSize: 11,
    fontWeight: '600',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    overflow: 'hidden',
  },
  liveCameraStopBtn: {
    backgroundColor: '#D32F2F',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    minWidth: 72,
    alignItems: 'center',
  },
  liveCameraStopTxt: { color: '#fff', fontWeight: '700', fontSize: 15 },
  liveCameraSessionTxt: { color: '#d1d5db', fontSize: 12, marginTop: 6, textAlign: 'center', lineHeight: 17 },
  liveCameraHint: { color: '#e5e7eb', textAlign: 'center', fontSize: 13, paddingHorizontal: 16, marginBottom: 8, lineHeight: 18 },
  liveCameraPreview: { flex: 1, width: '100%' },
});
