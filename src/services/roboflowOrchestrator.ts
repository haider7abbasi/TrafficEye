import { ROBOFLOW_MODEL_THRESHOLDS } from '../config/roboflowThresholds';
import { specViolationLabel, type SpecViolationId } from '../rules/specViolationMapping';
import { type RoboflowTrafficProject, runRoboflowHostDetection } from './roboflowHostDetection';
import {
  parseRoboflowDetectPredictions,
  selectPrimaryPlatePrediction,
  triggersHelmetChallan,
  triggersMobilePhoneChallan,
  triggersSeatbeltChallan,
  type RoboflowPrediction,
} from './roboflowViolationPolicy';

export type RoboflowOrchestrationResult = {
  specViolationIds: SpecViolationId[];
  violationLabels: string[];
  confidencePercent: number;
  platePrediction: RoboflowPrediction | null;
  projectPredictions: Record<RoboflowTrafficProject, RoboflowPrediction[]>;
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

export async function analyzeLocalImageForViolations(input: LocalImageInput): Promise<RoboflowOrchestrationResult> {
  const imageUri = typeof input === 'string' ? input : input.uri;
  const mimeType = typeof input === 'string' ? undefined : input.mimeType;
  const fileName = typeof input === 'string' ? undefined : input.fileName;
  const detect = (project: RoboflowTrafficProject) =>
    runRoboflowHostDetection({ project, imageUri, mimeType, fileName });

  const [seatbeltRaw, helmetRaw, mobileRaw] = await Promise.all([
    detect('seatbelt'),
    detect('bike_helmet'),
    detect('mobile_phone'),
  ]);

  const seatbeltPred = parseRoboflowDetectPredictions(seatbeltRaw);
  const helmetPred = parseRoboflowDetectPredictions(helmetRaw);
  const mobilePred = parseRoboflowDetectPredictions(mobileRaw);

  const specViolationIds: SpecViolationId[] = [];
  if (triggersSeatbeltChallan(seatbeltPred, ROBOFLOW_MODEL_THRESHOLDS.seatbelt)) {
    specViolationIds.push('no_seatbelt');
  }
  if (triggersHelmetChallan(helmetPred, ROBOFLOW_MODEL_THRESHOLDS.bike_helmet)) {
    specViolationIds.push('no_helmet');
  }
  if (triggersMobilePhoneChallan(mobilePred, ROBOFLOW_MODEL_THRESHOLDS.mobile_phone)) {
    specViolationIds.push('mobile_phone_use');
  }

  let platePrediction: RoboflowPrediction | null = null;
  let platePredictions: RoboflowPrediction[] = [];
  if (specViolationIds.length > 0) {
    const plateRaw = await detect('number_plate');
    platePredictions = parseRoboflowDetectPredictions(plateRaw);
    platePrediction = selectPrimaryPlatePrediction(
      platePredictions,
      ROBOFLOW_MODEL_THRESHOLDS.number_plate,
    );
  }

  const perModelConfidence = [
    topConfidence(seatbeltPred),
    topConfidence(helmetPred),
    topConfidence(mobilePred),
  ];
  const confidencePercent = toPercent01(Math.max(...perModelConfidence));

  return {
    specViolationIds,
    violationLabels: specViolationIds.map(specViolationLabel),
    confidencePercent,
    platePrediction,
    projectPredictions: {
      seatbelt: seatbeltPred,
      bike_helmet: helmetPred,
      mobile_phone: mobilePred,
      number_plate: platePredictions,
    },
  };
}
