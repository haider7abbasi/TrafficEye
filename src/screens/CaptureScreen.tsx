import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ScrollView,
  Modal,
  ActivityIndicator,
  Image,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Camera, useCameraDevice, useCameraPermission } from 'react-native-vision-camera';
import { useApp, ViolationRecord } from '../context/AppContext';
import { normalizePlateForDisplay } from '../rules/plateNormalization';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { analyzeLocalImageForViolations } from '../services/roboflowOrchestrator';
import {
  capturePhotoWithDeviceCamera,
  pickPhotoFromDeviceLibrary,
  pickVideoFromDeviceLibrary,
} from '../services/nativeImageCapture';
import { extractApprox1FpsJpegUrisFromVideo } from '../services/extractVideoFrames';
import type { SpecViolationId } from '../rules/specViolationMapping';
import type { RoboflowPrediction } from '../services/roboflowViolationPolicy';
import { startFrameSampler } from '../services/frameSampler';
import { createArrayFrameProvider, createSequentialFrameProvider } from '../services/videoFrameIterator';
import {
  buildViolationSignature,
  evaluateDedupGate,
  registerCandidateObservation,
} from '../services/dedupGate';

const POSSIBLE_VIOLATIONS = [
  'Red Light Violation',
  'Speed Limit Exceeded',
  'Wrong Lane Usage',
  'No Helmet',
  'Illegal Parking',
  'Stop Sign Violation',
  'Using Phone While Driving',
  'Not Wearing Seatbelt',
];

const MOCK_IMAGES = [
  'https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?w=900',
  'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?w=900',
  'https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=900',
];

function isLocalImageUri(uri: string): boolean {
  return uri.startsWith('file://') || uri.startsWith('content://') || /^[a-zA-Z]:\\/.test(uri) || uri.startsWith('/');
}

function buildMockResult(imageUri: string): Omit<ViolationRecord, 'id' | 'timestamp'> {
  const count = Math.random() > 0.3 ? Math.floor(Math.random() * 3) + 1 : 0;
  const chosen = Array.from({ length: count }, () => {
    return POSSIBLE_VIOLATIONS[Math.floor(Math.random() * POSSIBLE_VIOLATIONS.length)];
  });
  return {
    imageUri,
    violations: [...new Set(chosen)],
    confidence: Math.floor(Math.random() * 30) + 70,
    location: 'Main Street & 5th Avenue',
    vehicleNumber: count ? `ABC ${Math.floor(1000 + Math.random() * 9000)}` : undefined,
  };
}

type Props = {
  navigation: NativeStackNavigationProp<any>;
};

type PendingInference = {
  specViolationIds: SpecViolationId[];
  platePrediction: RoboflowPrediction | null;
  usedLiveInference: boolean;
};

function visionPhotoPathToUri(path: string): string {
  const p = path.trim();
  return p.startsWith('file://') ? p : `file://${p}`;
}

export function CaptureScreen({ navigation }: Props) {
  const { records, addRecord, createIntakeSession, uploadCandidateEvidence, createCandidate } = useApp();
  const { hasPermission: hasCameraPermission, requestPermission: requestCameraPermission } = useCameraPermission();
  const cameraDevice = useCameraDevice('back');
  const cameraRef = useRef<Camera>(null);
  const liveSessionIdRef = useRef<string | null>(null);
  const liveSamplerStartedRef = useRef(false);

  const [demoScenesOpen, setDemoScenesOpen] = useState(false);
  const [detecting, setDetecting] = useState(false);
  const [pendingImage, setPendingImage] = useState<string | null>(null);
  const [pendingEvidenceContentType, setPendingEvidenceContentType] = useState<string | undefined>(undefined);
  const [pendingResult, setPendingResult] = useState<Omit<ViolationRecord, 'id' | 'timestamp'> | null>(null);
  const [pendingInference, setPendingInference] = useState<PendingInference | null>(null);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [liveRunning, setLiveRunning] = useState(false);
  const [liveFrames, setLiveFrames] = useState(0);
  const [liveViolations, setLiveViolations] = useState(0);
  const [liveLastInfo, setLiveLastInfo] = useState('Idle');
  const [videoExtracting, setVideoExtracting] = useState(false);
  const [liveCameraVisible, setLiveCameraVisible] = useState(false);
  const stopLiveRef = useRef<(() => void) | null>(null);
  const processLiveFrameRef = useRef<
    | ((
        imageUri: string,
        sessionId: string,
        frameId: string,
        opts?: { frameSource?: 'live' | 'video' },
      ) => Promise<void>)
    | null
  >(null);

  const totalRecords = records.length;
  const violationsFound = records.filter(r => r.violations.length > 0).length;
  const interactionLocked = detecting || liveRunning || videoExtracting;

  useEffect(() => {
    return () => {
      stopLiveRef.current?.();
      stopLiveRef.current = null;
    };
  }, []);

  type MediaHint = { mimeType?: string; fileName?: string };

  const runDetection = async (imageUri: string, mode: 'still' | 'upload', mediaHint?: MediaHint) => {
    if (liveRunning) {
      Alert.alert('Live monitoring active', 'Stop live monitoring before running single-image detection.');
      return;
    }
    setDemoScenesOpen(false);
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
    if (!isLocalImageUri(imageUri)) {
      setTimeout(() => {
        setPendingResult(buildMockResult(imageUri));
        setPendingInference({
          specViolationIds: [],
          platePrediction: null,
          usedLiveInference: false,
        });
        setDetecting(false);
      }, 1200);
      return;
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
      setPendingResult(mapped);
      setPendingInference({
        specViolationIds: result.specViolationIds,
        platePrediction: result.platePrediction,
        usedLiveInference: true,
      });
    } catch (e) {
      const message = (e as { message?: string })?.message ?? 'Roboflow inference failed.';
      console.warn('[Capture inference]', message);
      Alert.alert('Inference fallback', 'Using demo-mode simulation for this capture.');
      setPendingResult(buildMockResult(imageUri));
      setPendingInference({
        specViolationIds: [],
        platePrediction: null,
        usedLiveInference: false,
      });
    } finally {
      setDetecting(false);
    }
  };

  const handleDeviceCamera = async () => {
    if (interactionLocked) {
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
      Alert.alert('Camera', message);
    }
  };

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
      Alert.alert('Photo library', message);
    }
  };

  const handleSave = async () => {
    if (pendingResult && pendingImage) {
      // Phase 4 policy: non-violations are discarded; no cloud writes for this frame.
      if (pendingResult.violations.length === 0) {
        Alert.alert('No violation detected', 'Frame discarded (no cloud write) as per phase policy.');
        setPendingResult(null);
        setPendingImage(null);
        setPendingEvidenceContentType(undefined);
        setPendingInference(null);
        setActiveSessionId(null);
        return;
      }

      const vehicleNumber = pendingResult.vehicleNumber
        ? normalizePlateForDisplay(pendingResult.vehicleNumber)
        : undefined;

      // Candidate creation for live/local inference path with dedup create/merge decision.
      if (pendingInference?.usedLiveInference && pendingInference.specViolationIds.length > 0) {
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
            await createCandidate({
              candidateId,
              sessionId: activeSessionId ?? undefined,
              violationTypes: pendingInference.specViolationIds,
              dedupDecision: dedup.decision,
              dedupSignature: signature,
              evidenceImageRef: uploaded.objectPath,
              locationText: pendingResult.location,
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
            Alert.alert('Candidate write warning', message);
          }
        }
      }

      const record: ViolationRecord = {
        ...pendingResult,
        vehicleNumber: vehicleNumber || undefined,
        id: `violation-${Date.now()}`,
        timestamp: new Date().toISOString(),
      };
      await addRecord(record);
      setPendingResult(null);
      setPendingImage(null);
      setPendingEvidenceContentType(undefined);
      setPendingInference(null);
      setActiveSessionId(null);
      navigation.navigate('MainTabs', { screen: 'History' });
    }
  };

  const handleRetake = () => {
    setPendingResult(null);
    setPendingImage(null);
    setPendingEvidenceContentType(undefined);
    setPendingInference(null);
    setActiveSessionId(null);
  };

  const stopLiveMonitoring = useCallback(() => {
    stopLiveRef.current?.();
    stopLiveRef.current = null;
    liveSamplerStartedRef.current = false;
    liveSessionIdRef.current = null;
    setLiveCameraVisible(false);
    setLiveRunning(false);
    setLiveLastInfo('Stopped');
  }, []);

  const processLiveFrame = async (
    imageUri: string,
    sessionId: string,
    frameId: string,
    opts?: { frameSource?: 'live' | 'video' },
  ) => {
    const locationLabel = opts?.frameSource === 'video' ? 'Video clip' : 'Live monitor';
    const local = isLocalImageUri(imageUri);
    let specIds: SpecViolationId[] = [];
    let violationLabels: string[] = [];
    let platePrediction: RoboflowPrediction | null = null;

    if (local) {
      const result = await analyzeLocalImageForViolations(imageUri);
      specIds = result.specViolationIds;
      violationLabels = result.violationLabels;
      platePrediction = result.platePrediction;
    } else {
      const mock = buildMockResult(imageUri);
      violationLabels = mock.violations;
      specIds = [];
    }

    if (violationLabels.length === 0) {
      setLiveLastInfo(`Frame ${frameId}: no violation`);
      return;
    }

    const gate = evaluateDedupGate({
      sessionId,
      violationTypes: specIds,
    });
    if (gate.decision === 'suppress') {
      setLiveLastInfo(`Frame ${frameId}: ${gate.decision}`);
      return;
    }

    if (local && specIds.length > 0) {
      const candidateId =
        gate.decision === 'merge' && gate.existingCandidateId
          ? gate.existingCandidateId
          : `cand-live-${Date.now()}-${frameId}`;
      const uploaded = await uploadCandidateEvidence(candidateId, imageUri, {
        contentType: local ? 'image/jpeg' : undefined,
      });
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
    };
    await addRecord(record);
    setLiveViolations(v => v + 1);
    setLiveLastInfo(`Frame ${frameId}: violation saved`);
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
      Alert.alert('Detection in progress', 'Wait for current detection to complete before starting live mode.');
      return;
    }
    let sessionId: string;
    try {
      sessionId = await createIntakeSession(sessionMode);
      setActiveSessionId(sessionId);
    } catch (e) {
      Alert.alert('Live start failed', 'Could not create intake session.');
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
      Alert.alert('Detection in progress', 'Wait for current detection to complete before starting live mode.');
      return;
    }
    let granted = hasCameraPermission;
    if (!granted) {
      granted = await requestCameraPermission();
    }
    if (!granted) {
      Alert.alert('Camera required', 'Allow camera access to run live monitoring at ~1 FPS.');
      return;
    }
    if (cameraDevice == null) {
      Alert.alert('No camera', 'Could not open a back camera on this device.');
      return;
    }

    let sessionId: string;
    try {
      sessionId = await createIntakeSession('live');
      setActiveSessionId(sessionId);
      liveSessionIdRef.current = sessionId;
    } catch {
      Alert.alert('Live start failed', 'Could not create intake session.');
      return;
    }

    liveSamplerStartedRef.current = false;
    setLiveFrames(0);
    setLiveViolations(0);
    setLiveLastInfo('Starting camera…');
    setLiveRunning(true);
    setLiveCameraVisible(true);
  };

  const handleChooseVideoForLiveScan = async () => {
    if (interactionLocked) {
      return;
    }
    try {
      const picked = await pickVideoFromDeviceLibrary();
      if (!picked) {
        return;
      }
      setVideoExtracting(true);
      const { frameUris, durationMs } = await extractApprox1FpsJpegUrisFromVideo(picked.uri);
      setVideoExtracting(false);
      if (frameUris.length === 0) {
        Alert.alert('Video', 'No frames could be extracted from this file.');
        return;
      }
      const sec = Math.max(1, Math.round(durationMs / 1000));
      Alert.alert(
        'Video ready',
        `${frameUris.length} JPEG frame(s) prepared (~${sec}s source, length capped for analysis). Run ~1 FPS Roboflow scan?`,
        [
          { text: 'Cancel', style: 'cancel' },
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
      Alert.alert('Video', message);
    }
  };

  if (pendingResult && pendingImage) {
    return <DetectionResult
      imageUri={pendingImage}
      result={pendingResult}
      onSave={handleSave}
      onRetake={handleRetake}
    />;
  }

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content}>
      {/* Stats */}
      <View style={styles.statsCard}>
        <View style={styles.statItem}>
          <Text style={[styles.statValue, { color: '#2563eb' }]}>{totalRecords}</Text>
          <Text style={styles.statLabel}>Total Records</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={[styles.statValue, { color: '#dc2626' }]}>{violationsFound}</Text>
          <Text style={styles.statLabel}>Violations Found</Text>
        </View>
      </View>

      {/* Capture Card */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Capture Traffic Scene</Text>
        <Text style={styles.cardDesc}>
          Use your device camera or gallery for real Roboflow inference. Remote demo images are for offline
          testing only.
        </Text>

        <Pressable
          style={[styles.primaryBtn, interactionLocked && styles.disabledBtn]}
          disabled={interactionLocked}
          onPress={handleDeviceCamera}>
          <Text style={styles.primaryBtnIcon}>📷</Text>
          <Text style={styles.primaryBtnText}>Take photo</Text>
        </Pressable>

        <Pressable
          style={[styles.outlineBtn, interactionLocked && styles.disabledBtn]}
          disabled={interactionLocked}
          onPress={handleDeviceGallery}>
          <Text style={styles.outlineBtnIcon}>🖼</Text>
          <Text style={styles.outlineBtnText}>Choose from gallery</Text>
        </Pressable>

        <Pressable
          style={[styles.outlineBtn, interactionLocked && styles.disabledBtn]}
          disabled={interactionLocked}
          onPress={handleChooseVideoForLiveScan}>
          <Text style={styles.outlineBtnIcon}>🎬</Text>
          <Text style={styles.outlineBtnText}>Choose video (MP4) for 1 FPS scan</Text>
        </Pressable>

        <Pressable
          style={[styles.outlineBtn, interactionLocked && styles.disabledBtn]}
          disabled={interactionLocked}
          onPress={() => runDetection(MOCK_IMAGES[Math.floor(Math.random() * MOCK_IMAGES.length)], 'upload')}>
          <Text style={styles.outlineBtnIcon}>⬆</Text>
          <Text style={styles.outlineBtnText}>Try demo (remote sample)</Text>
        </Pressable>

        <Pressable
          style={[styles.textLinkBtn, interactionLocked && styles.disabledBtn]}
          disabled={interactionLocked}
          onPress={() => setDemoScenesOpen(true)}>
          <Text style={styles.textLinkBtnText}>Pick a demo scene…</Text>
        </Pressable>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Live Monitoring (1 FPS)</Text>
        <Text style={styles.cardDesc}>
          Opens the device back camera and captures ~1 photo per second for Roboflow. MP4 scanning (gallery video)
          uses extracted JPEGs with the same pipeline.
        </Text>
        {!liveRunning ? (
          <Pressable
            style={[styles.primaryBtn, interactionLocked && styles.disabledBtn]}
            disabled={interactionLocked}
            onPress={startLiveMonitoring}>
            <Text style={styles.primaryBtnText}>Start Live Monitoring</Text>
          </Pressable>
        ) : (
          <Pressable style={styles.stopBtn} onPress={stopLiveMonitoring}>
            <Text style={styles.stopBtnText}>Stop Live Monitoring</Text>
          </Pressable>
        )}
        <Text style={styles.liveMeta}>Frames processed: {liveFrames}</Text>
        <Text style={styles.liveMeta}>Violations saved: {liveViolations}</Text>
        <Text style={styles.liveMeta}>Status: {liveLastInfo}</Text>
      </View>

      {/* How it Works */}
      <View style={styles.howCard}>
        <Text style={styles.howTitle}>How it works</Text>
        <Text style={styles.howItem}>• Capture, photo gallery, or MP4 clip (~1 FPS frame scan)</Text>
        <Text style={styles.howItem}>• AI analyzes for violations automatically</Text>
        <Text style={styles.howItem}>• Review detected violations and details</Text>
        <Text style={styles.howItem}>• Save records for future reference</Text>
      </View>

      {/* Demo remote scenes (mock inference) */}
      <Modal visible={demoScenesOpen} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Demo scenes</Text>
            <Text style={styles.modalDesc}>
              Uses remote stock photos with simulated detection — no Roboflow call.
            </Text>
            {MOCK_IMAGES.map((uri, i) => (
              <Pressable key={uri} style={styles.sampleBtn} onPress={() => runDetection(uri, 'still')}>
                <Text style={styles.sampleBtnText}>Scene {i + 1}</Text>
              </Pressable>
            ))}
            <Pressable style={styles.cancelBtn} onPress={() => setDemoScenesOpen(false)}>
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* Detecting Modal */}
      <Modal visible={detecting} animationType="fade" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <ActivityIndicator size="large" color="#2563eb" style={{ marginBottom: 14 }} />
            <Text style={styles.modalTitle}>Analyzing image...</Text>
            <Text style={styles.modalDesc}>Detecting traffic violations. Please wait.</Text>
            {activeSessionId ? <Text style={styles.sessionHint}>Session: {activeSessionId}</Text> : null}
          </View>
        </View>
      </Modal>

      <Modal visible={videoExtracting} animationType="fade" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <ActivityIndicator size="large" color="#2563eb" style={{ marginBottom: 14 }} />
            <Text style={styles.modalTitle}>Preparing video…</Text>
            <Text style={styles.modalDesc}>Extracting JPEG frames from your clip (may take a minute).</Text>
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
            <Pressable style={styles.liveCameraStopBtn} onPress={stopLiveMonitoring}>
              <Text style={styles.liveCameraStopTxt}>Stop</Text>
            </Pressable>
            {activeSessionId ? (
              <Text style={styles.liveCameraSessionTxt} numberOfLines={1}>
                Session: {activeSessionId}
              </Text>
            ) : null}
          </View>
          <Text style={styles.liveCameraHint}>~1 FPS · Point at traffic scene</Text>
          {cameraDevice == null ? (
            <ActivityIndicator size="large" color="#fff" style={{ marginTop: 24 }} />
          ) : (
            <Camera
              ref={cameraRef}
              style={styles.liveCameraPreview}
              device={cameraDevice}
              isActive={liveCameraVisible}
              photo
              onInitialized={handleLiveCameraInitialized}
            />
          )}
        </SafeAreaView>
      </Modal>
    </ScrollView>
  );
}

type DetectionResultProps = {
  imageUri: string;
  result: Omit<ViolationRecord, 'id' | 'timestamp'>;
  onSave: () => void;
  onRetake: () => void;
};

function DetectionResult({ imageUri, result, onSave, onRetake }: DetectionResultProps) {
  const hasViolations = result.violations.length > 0;
  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content}>
      <View style={[styles.card, { padding: 0, overflow: 'hidden' }]}>
        <Image source={{ uri: imageUri }} style={styles.detectionImage} resizeMode="cover" />
      </View>

      <View style={styles.card}>
        <View style={styles.resultHeader}>
          <Text style={styles.resultIcon}>{hasViolations ? '⚠️' : '✅'}</Text>
          <View style={{ flex: 1 }}>
            <Text style={[styles.resultTitle, { color: hasViolations ? '#dc2626' : '#16a34a' }]}>
              {hasViolations
                ? `${result.violations.length} Violation${result.violations.length > 1 ? 's' : ''} Detected`
                : 'No Violations Detected'}
            </Text>
            <Text style={styles.confidenceText}>Confidence: {result.confidence}%</Text>
          </View>
        </View>

        {hasViolations && (
          <View style={styles.badgesWrap}>
            {result.violations.map((v, i) => (
              <View key={i} style={styles.badge}>
                <Text style={styles.badgeText}>{v}</Text>
              </View>
            ))}
          </View>
        )}
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Details</Text>
        <View style={styles.detailRow}>
          <Text style={styles.detailIcon}>📍</Text>
          <Text style={styles.detailLabel}>Location: </Text>
          <Text style={styles.detailValue}>{result.location}</Text>
        </View>
        <View style={styles.detailRow}>
          <Text style={styles.detailIcon}>📅</Text>
          <Text style={styles.detailLabel}>Date: </Text>
          <Text style={styles.detailValue}>{new Date().toLocaleDateString()}</Text>
        </View>
        <View style={styles.detailRow}>
          <Text style={styles.detailIcon}>🕐</Text>
          <Text style={styles.detailLabel}>Time: </Text>
          <Text style={styles.detailValue}>{new Date().toLocaleTimeString()}</Text>
        </View>
        {result.vehicleNumber && (
          <View style={styles.detailRow}>
            <Text style={styles.detailIcon}>🚗</Text>
            <Text style={styles.detailLabel}>Vehicle: </Text>
            <Text style={styles.detailValue}>{result.vehicleNumber}</Text>
          </View>
        )}
      </View>

      <Pressable style={styles.primaryBtn} onPress={onSave}>
        <Text style={styles.primaryBtnText}>Save Record</Text>
      </Pressable>
      <Pressable style={[styles.outlineBtn, { marginBottom: 24 }]} onPress={onRetake}>
        <Text style={styles.outlineBtnText}>Retake Photo</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f3f4f6' },
  content: { padding: 14, gap: 14, paddingBottom: 30 },
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
  statLabel: { fontSize: 11, color: '#6b7280', marginTop: 2 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    gap: 12,
  },
  cardTitle: { fontSize: 16, fontWeight: '700', color: '#111827' },
  cardDesc: { fontSize: 13, color: '#6b7280', lineHeight: 20 },
  primaryBtn: {
    backgroundColor: '#2563eb',
    borderRadius: 10,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  primaryBtnIcon: { fontSize: 18 },
  primaryBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  outlineBtn: {
    borderWidth: 1,
    borderColor: '#2563eb',
    borderRadius: 10,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  outlineBtnIcon: { fontSize: 18, color: '#2563eb' },
  outlineBtnText: { color: '#2563eb', fontSize: 15, fontWeight: '600' },
  textLinkBtn: {
    paddingVertical: 8,
    alignItems: 'center',
  },
  textLinkBtnText: { color: '#4b5563', fontSize: 13, fontWeight: '600', textDecorationLine: 'underline' },
  stopBtn: {
    backgroundColor: '#dc2626',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
  },
  stopBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  liveMeta: { fontSize: 12, color: '#4b5563' },
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
  modalDesc: { fontSize: 13, color: '#6b7280', textAlign: 'center' },
  sessionHint: { fontSize: 11, color: '#9ca3af', textAlign: 'center', marginTop: 2 },
  sampleBtn: {
    backgroundColor: '#f3f4f6',
    borderRadius: 10,
    padding: 12,
    alignItems: 'center',
  },
  sampleBtnText: { color: '#374151', fontWeight: '500' },
  cancelBtn: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 10,
    padding: 12,
    alignItems: 'center',
    marginTop: 4,
  },
  cancelBtnText: { color: '#6b7280', fontWeight: '500' },
  detectionImage: { width: '100%', height: 220 },
  resultHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  resultIcon: { fontSize: 26 },
  resultTitle: { fontSize: 16, fontWeight: '700' },
  confidenceText: { fontSize: 13, color: '#6b7280', marginTop: 2 },
  badgesWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  badge: {
    backgroundColor: '#fef2f2',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: '#fecaca',
  },
  badgeText: { color: '#dc2626', fontSize: 12, fontWeight: '500' },
  detailRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  detailIcon: { fontSize: 14 },
  detailLabel: { fontSize: 13, color: '#6b7280' },
  detailValue: { fontSize: 13, fontWeight: '600', color: '#111827' },
  liveCameraRoot: { flex: 1, backgroundColor: '#000' },
  liveCameraHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingBottom: 8,
    gap: 12,
  },
  liveCameraStopBtn: {
    backgroundColor: '#dc2626',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },
  liveCameraStopTxt: { color: '#fff', fontWeight: '700', fontSize: 15 },
  liveCameraSessionTxt: { flex: 1, color: '#9ca3af', fontSize: 11 },
  liveCameraHint: { color: '#e5e7eb', textAlign: 'center', fontSize: 13, paddingHorizontal: 16, marginBottom: 8 },
  liveCameraPreview: { flex: 1, width: '100%' },
});
