import type { RoboflowTrafficProject } from '../config/roboflowModels';
import {
  DETECT_BUS,
  DETECT_CAR,
  DETECT_MOTORCYCLE,
  DETECT_TRUCK,
  DETECT_VIOLATION,
  TRAFFIC_GOLD,
} from '../theme/brandColors';
import { strokeColorForVehicleClass } from './violationProcessingFlow';
import {
  normalizeRoboflowConfidence,
  predictionToPixelCropRect,
  type RoboflowPrediction,
} from './roboflowViolationPolicy';

export type OverlayLayout = {
  left: number;
  top: number;
  width: number;
  height: number;
  borderColor: string;
  label: string;
};

const VIOLATION_CLASS_HINTS = new Set([
  'no-seatbelt',
  'without helmet',
  'using_phone',
  'calling_phone',
  'texting_phone',
  'phone_in_hand',
]);

export function filterPredictionsForDisplay(
  predictions: RoboflowPrediction[],
  displayMinConfidence: number,
): RoboflowPrediction[] {
  const min = Math.min(1, Math.max(0, displayMinConfidence));
  return predictions.filter(p => normalizeRoboflowConfidence(p.confidence) >= min);
}

/** Short “models responded with …” line for one model (display threshold applied). */
export function formatModelDetectionsLine(
  label: string,
  predictions: RoboflowPrediction[],
  displayMinConfidence: number,
  maxItems = 5,
): string {
  const filtered = filterPredictionsForDisplay(predictions, displayMinConfidence);
  const pct = Math.round(displayMinConfidence * 100);
  if (filtered.length === 0) {
    return `${label}: no detections at or above ${pct}% display threshold.`;
  }
  const parts = filtered.slice(0, maxItems).map(p => {
    const confPct = Math.round(normalizeRoboflowConfidence(p.confidence) * 100);
    return `${p.class} (${confPct}%)`;
  });
  const more = filtered.length > maxItems ? ` …+${filtered.length - maxItems} more` : '';
  return `${label}: ${parts.join(', ')}${more}.`;
}

export function strokeColorForDetectionClass(className: string): string {
  const vehicle = strokeColorForVehicleClass(className);
  if (vehicle) {
    return vehicle;
  }
  const lower = className.trim().toLowerCase();
  if (lower.includes('plate') || lower.includes('number')) {
    return TRAFFIC_GOLD;
  }
  if (VIOLATION_CLASS_HINTS.has(lower) || lower.includes('helmet') || lower.includes('seatbelt') || lower.includes('phone')) {
    return DETECT_VIOLATION;
  }
  if (lower === 'bus') {
    return DETECT_BUS;
  }
  if (lower === 'truck') {
    return DETECT_TRUCK;
  }
  if (lower === 'car') {
    return DETECT_CAR;
  }
  if (lower === 'motorcycle') {
    return DETECT_MOTORCYCLE;
  }
  return '#94a3b8';
}

export function layoutPredictionOverlays(
  predictions: RoboflowPrediction[],
  imageWidth: number,
  imageHeight: number,
  containerWidth: number,
  containerHeight: number,
  displayMinConfidence: number,
): OverlayLayout[] {
  if (imageWidth <= 0 || imageHeight <= 0 || containerWidth <= 0 || containerHeight <= 0) {
    return [];
  }
  const scale = Math.min(containerWidth / imageWidth, containerHeight / imageHeight);
  const drawnW = imageWidth * scale;
  const drawnH = imageHeight * scale;
  const offsetX = (containerWidth - drawnW) / 2;
  const offsetY = (containerHeight - drawnH) / 2;

  return filterPredictionsForDisplay(predictions, displayMinConfidence).map(pred => {
    const crop = predictionToPixelCropRect(pred, imageWidth, imageHeight);
    const confPct = Math.round(normalizeRoboflowConfidence(pred.confidence) * 100);
    return {
      left: offsetX + crop.x * scale,
      top: offsetY + crop.y * scale,
      width: crop.width * scale,
      height: crop.height * scale,
      borderColor: strokeColorForDetectionClass(pred.class),
      label: `${pred.class} ${confPct}%`,
    };
  });
}

export function topDisplayConfidencePercent(
  predictionGroups: RoboflowPrediction[][],
  displayMinConfidence: number,
): number {
  let max = 0;
  for (const group of predictionGroups) {
    for (const p of filterPredictionsForDisplay(group, displayMinConfidence)) {
      max = Math.max(max, normalizeRoboflowConfidence(p.confidence));
    }
  }
  return Math.round(max * 100);
}

export function buildModelDetectionBullets(
  projectPredictions: Record<RoboflowTrafficProject, RoboflowPrediction[]>,
  specialistsSkipped: boolean,
  displayMinConfidence: number,
  includePlateLine: boolean,
): string[] {
  const lines = [
    formatModelDetectionsLine('Vehicle model (step 1)', projectPredictions.vehicle ?? [], displayMinConfidence),
  ];
  if (specialistsSkipped) {
    lines.push('Seatbelt model (step 2): skipped — no vehicle in step 1.');
    lines.push('Helmet model (step 2): skipped — no vehicle in step 1.');
    lines.push('Phone model (step 2): skipped — no vehicle in step 1.');
  } else {
    lines.push(
      formatModelDetectionsLine('Seatbelt model (step 2)', projectPredictions.seatbelt ?? [], displayMinConfidence),
    );
    lines.push(
      formatModelDetectionsLine('Helmet model (step 2)', projectPredictions.bike_helmet ?? [], displayMinConfidence),
    );
    lines.push(
      formatModelDetectionsLine('Phone model (step 2)', projectPredictions.mobile_phone ?? [], displayMinConfidence),
    );
  }
  if (includePlateLine) {
    lines.push(
      formatModelDetectionsLine('Number plate model', projectPredictions.number_plate ?? [], displayMinConfidence),
    );
  }
  return lines;
}

export function flattenProjectPredictions(
  projectPredictions: Record<RoboflowTrafficProject, RoboflowPrediction[]>,
): RoboflowPrediction[] {
  return [
    ...(projectPredictions.vehicle ?? []),
    ...(projectPredictions.seatbelt ?? []),
    ...(projectPredictions.bike_helmet ?? []),
    ...(projectPredictions.mobile_phone ?? []),
    ...(projectPredictions.number_plate ?? []),
  ];
}
