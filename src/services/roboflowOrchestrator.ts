import { buildRoboflowDetectUrl, getRoboflowDeployConfig } from '../config/roboflowModels';
import { ROBOFLOW_MODEL_THRESHOLDS } from '../config/roboflowThresholds';
import { type SpecViolationId } from '../rules/specViolationMapping';
import { type RoboflowTrafficProject, runRoboflowHostDetection } from './roboflowHostDetection';
import {
  countRoboflowRawPredictionItems,
  parseRoboflowDetectPredictions,
  selectPrimaryPlatePrediction,
  type RoboflowPrediction,
} from './roboflowViolationPolicy';
import {
  applyViolationProcessingFlowWithDiagnostics,
  evaluateVehicleSceneGate,
} from './violationProcessingFlow';
import { getDetectionDisplayMinConfidence } from '../store/detectionDisplayConfidence';
import { formatModelDetectionsLine, topDisplayConfidencePercent } from './detectionDisplay';
import { buildInferencePlainLanguage, type InferencePlainLanguage } from './inferencePlainLanguage';

export type { InferencePlainLanguage };

export type RoboflowOrchestrationResult = {
  specViolationIds: SpecViolationId[];
  violationLabels: string[];
  confidencePercent: number;
  platePrediction: RoboflowPrediction | null;
  projectPredictions: Record<RoboflowTrafficProject, RoboflowPrediction[]>;
  specialistsSkipped: boolean;
  /** Officer-readable: what each model saw + how rules combined into the outcome. */
  plainLanguage: InferencePlainLanguage;
};

/** URI plus optional multipart hints from camera / gallery picks. */
export type LocalImageInput =
  | string
  | {
      uri: string;
      mimeType?: string;
      fileName?: string;
    };

function topConfidence(predictions: RoboflowPrediction[]): number {
  if (predictions.length === 0) {
    return 0;
  }
  return predictions.reduce((max, p) => Math.max(max, p.confidence), 0);
}

function toPercent01(value: number): number {
  return Math.round(Math.max(0, Math.min(1, value)) * 100);
}

function summarizePredictions(preds: RoboflowPrediction[], max = 6): { class: string; conf: number }[] {
  return preds.slice(0, max).map(p => ({ class: p.class, conf: Math.round(p.confidence * 1000) / 1000 }));
}

function buildOrchestrationResult(params: {
  specViolationIds: SpecViolationId[];
  diagnostics: ReturnType<typeof applyViolationProcessingFlowWithDiagnostics>['diagnostics'];
  vehiclePred: RoboflowPrediction[];
  seatbeltPred: RoboflowPrediction[];
  helmetPred: RoboflowPrediction[];
  mobilePred: RoboflowPrediction[];
  platePredictions: RoboflowPrediction[];
  platePrediction: RoboflowPrediction | null;
  specialistsSkipped: boolean;
}): RoboflowOrchestrationResult {
  const {
    specViolationIds,
    diagnostics,
    vehiclePred,
    seatbeltPred,
    helmetPred,
    mobilePred,
    platePredictions,
    platePrediction,
    specialistsSkipped,
  } = params;

  const perModelConfidence = [
    topConfidence(vehiclePred),
    specialistsSkipped ? 0 : topConfidence(seatbeltPred),
    specialistsSkipped ? 0 : topConfidence(helmetPred),
    specialistsSkipped ? 0 : topConfidence(mobilePred),
  ];
  const displayMin = getDetectionDisplayMinConfidence();
  const confidencePercent =
    topDisplayConfidencePercent(
      specialistsSkipped
        ? [vehiclePred]
        : [vehiclePred, seatbeltPred, helmetPred, mobilePred, platePredictions],
      displayMin,
    ) || toPercent01(Math.max(...perModelConfidence));

  const plainLanguage = buildInferencePlainLanguage({
    diagnostics,
    specViolationIds,
    specialistsSkipped,
    displayMinConfidence: displayMin,
    linesPerModel: {
      vehicle: formatModelDetectionsLine('Vehicle model (step 1)', vehiclePred, displayMin),
      seatbelt: specialistsSkipped
        ? 'Seatbelt model (step 2): skipped — no vehicle in step 1.'
        : formatModelDetectionsLine('Seatbelt model (step 2)', seatbeltPred, displayMin),
      helmet: specialistsSkipped
        ? 'Helmet model (step 2): skipped — no vehicle in step 1.'
        : formatModelDetectionsLine('Helmet model (step 2)', helmetPred, displayMin),
      mobile: specialistsSkipped
        ? 'Phone model (step 2): skipped — no vehicle in step 1.'
        : formatModelDetectionsLine('Phone model (step 2)', mobilePred, displayMin),
    },
    plateLine:
      specViolationIds.length > 0
        ? formatModelDetectionsLine('Number plate model', platePredictions, displayMin)
        : undefined,
  });

  return {
    specViolationIds,
    violationLabels: plainLanguage.displayViolationLabels,
    confidencePercent,
    platePrediction,
    projectPredictions: {
      seatbelt: seatbeltPred,
      bike_helmet: helmetPred,
      mobile_phone: mobilePred,
      vehicle: vehiclePred,
      number_plate: platePredictions,
    },
    specialistsSkipped,
    plainLanguage,
  };
}

/**
 * 1) **Vehicle detection** — vehicle model only; {@link evaluateVehicleSceneGate}.
 * 2) **Specialist models** — seatbelt, helmet, phone **only when** step 1 `vehiclePresent`.
 * 3) **Output** — {@link applyViolationProcessingFlowWithDiagnostics}; violations only if vehicle yes.
 * 4) Number plate model only when step 3 returns at least one spec violation.
 */
export async function analyzeLocalImageForViolations(input: LocalImageInput): Promise<RoboflowOrchestrationResult> {
  const imageUri = typeof input === 'string' ? input : input.uri;
  const mimeType = typeof input === 'string' ? undefined : input.mimeType;
  const fileName = typeof input === 'string' ? undefined : input.fileName;
  const detect = (project: RoboflowTrafficProject, confidenceThreshold?: number) =>
    runRoboflowHostDetection({ project, imageUri, mimeType, fileName, confidenceThreshold });

  const thresholds = {
    seatbelt: ROBOFLOW_MODEL_THRESHOLDS.seatbelt,
    bike_helmet: ROBOFLOW_MODEL_THRESHOLDS.bike_helmet,
    mobile_phone: ROBOFLOW_MODEL_THRESHOLDS.mobile_phone,
    vehicle: ROBOFLOW_MODEL_THRESHOLDS.vehicle,
  };

  // —— Step 1: Vehicle detection ——
  const vehicleDeploy = getRoboflowDeployConfig('vehicle');
  const vehicleRaw = await detect('vehicle', thresholds.vehicle);
  const rawVehicleItems = countRoboflowRawPredictionItems(vehicleRaw);
  const vehiclePred = parseRoboflowDetectPredictions(vehicleRaw);
  const vehicleGate = evaluateVehicleSceneGate(vehiclePred, thresholds.vehicle);

  if (__DEV__) {
    console.log('[TrafficEye inference] step 1 vehicle', {
      endpoint: buildRoboflowDetectUrl(vehicleDeploy.projectId, vehicleDeploy.version),
      projectId: vehicleDeploy.projectId,
      version: vehicleDeploy.version,
      confidenceThreshold: thresholds.vehicle,
      vehiclePresent: vehicleGate.vehiclePresent,
      carPresent: vehicleGate.carPresent,
      bikePresent: vehicleGate.bikePresent,
      rawItemsFromApi: rawVehicleItems,
      parsedBoxes: vehicleGate.vehicleBoxCount,
      sample: summarizePredictions(vehiclePred),
    });
    if (rawVehicleItems > 0 && vehiclePred.length === 0) {
      console.warn(
        '[TrafficEye inference] vehicle model returned boxes but none parsed — check class names (car, Bus, truck, Motorcycle) and box fields in JSON.',
      );
    }
    if (rawVehicleItems === 0) {
      console.warn(
        '[TrafficEye inference] vehicle model returned 0 boxes — verify .env ROBOFLOW_PROJECT_VEHICLE and ROBOFLOW_VERSION_VEHICLE match Roboflow Deploy (Inference URL).',
        { hint: `Expected deploy like ${vehicleDeploy.projectId}/${vehicleDeploy.version}` },
      );
    }
  }

  if (!vehicleGate.vehiclePresent) {
    const { specViolationIds, diagnostics } = applyViolationProcessingFlowWithDiagnostics({
      seatbeltPredictions: [],
      helmetPredictions: [],
      mobilePredictions: [],
      vehiclePredictions: vehiclePred,
      thresholds,
    });

    if (__DEV__) {
      console.log('[TrafficEye inference] step 2 skipped (no vehicle); step 3 violations', {
        specViolationIds,
        diagnostics,
      });
    }

    return buildOrchestrationResult({
      specViolationIds,
      diagnostics,
      vehiclePred,
      seatbeltPred: [],
      helmetPred: [],
      mobilePred: [],
      platePredictions: [],
      platePrediction: null,
      specialistsSkipped: true,
    });
  }

  // —— Step 2: Specialist models (vehicle yes) ——
  const [seatbeltRaw, helmetRaw, mobileRaw] = await Promise.all([
    detect('seatbelt'),
    detect('bike_helmet'),
    detect('mobile_phone'),
  ]);

  const seatbeltPred = parseRoboflowDetectPredictions(seatbeltRaw);
  const helmetPred = parseRoboflowDetectPredictions(helmetRaw);
  const mobilePred = parseRoboflowDetectPredictions(mobileRaw);

  if (__DEV__) {
    console.log('[TrafficEye inference] step 2 specialists', {
      seatbelt: { n: seatbeltPred.length, sample: summarizePredictions(seatbeltPred) },
      helmet: { n: helmetPred.length, sample: summarizePredictions(helmetPred) },
      mobile: { n: mobilePred.length, sample: summarizePredictions(mobilePred) },
    });
  }

  // —— Step 3: Violation policy (vehicle + specialists) ——
  const { specViolationIds, diagnostics } = applyViolationProcessingFlowWithDiagnostics({
    seatbeltPredictions: seatbeltPred,
    helmetPredictions: helmetPred,
    mobilePredictions: mobilePred,
    vehiclePredictions: vehiclePred,
    thresholds,
  });

  if (__DEV__) {
    console.log('[TrafficEye inference] step 3 violations', { specViolationIds, diagnostics });
  }

  let platePredictions: RoboflowPrediction[] = [];
  let platePrediction: RoboflowPrediction | null = null;
  if (specViolationIds.length > 0) {
    const plateRaw = await detect('number_plate');
    platePredictions = parseRoboflowDetectPredictions(plateRaw);
    platePrediction = selectPrimaryPlatePrediction(
      platePredictions,
      ROBOFLOW_MODEL_THRESHOLDS.number_plate,
    );
    if (__DEV__) {
      console.log('[TrafficEye inference] plate model', {
        n: platePredictions.length,
        sample: summarizePredictions(platePredictions),
      });
    }
  }

  const result = buildOrchestrationResult({
    specViolationIds,
    diagnostics,
    vehiclePred,
    seatbeltPred,
    helmetPred,
    mobilePred,
    platePredictions,
    platePrediction,
    specialistsSkipped: false,
  });

  if (__DEV__) {
    console.log('[TrafficEye inference] summary', result.plainLanguage.headline, result.plainLanguage.bullets);
  }

  return result;
}
