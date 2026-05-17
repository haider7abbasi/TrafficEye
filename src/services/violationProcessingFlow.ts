/**
 * Multi-model violation policy (TrafficEye).
 *
 * **Pipeline order (enforced in `roboflowOrchestrator.analyzeLocalImageForViolations`):**
 * 1. **Vehicle detection** — Roboflow vehicle model only; gate with {@link evaluateVehicleSceneGate}.
 * 2. **Specialist models** — seatbelt, helmet, phone run **only when** step 1 reports `vehiclePresent`.
 * 3. **Output** — violations from this module apply **only when** `vehiclePresent` is true; otherwise `specViolationIds` is empty.
 *
 * **Car / bike:** Only the **vehicle** model classes `car`, `Bus`, `truck`, `Motorcycle` establish scene context.
 * Specialist models never infer “car” or “bike” without a matching vehicle box, so pedestrians or
 * people lying on the ground do not pick up seatbelt/helmet false positives as vehicle context.
 *
 * **Person:** There is no dedicated person detector; we infer “person in frame” when any specialist
 * model shows a person-related class above threshold (belt / helmet / phone cues).
 *
 * Rules (spec ids `no_seatbelt`, `mobile_phone_use`, `no_helmet`):
 * - If **no car and no bike** from the vehicle model → **no violations** (blocks phone/seatbelt/helmet-only scenes).
 * - **Car:** seatbelt only if car + person + no-seatbelt; mobile if car + strict phone classes
 *   (`using_phone` / `calling_phone` / `texting_phone`).
 * - **Bike:** mobile if bike + person + (strict phone classes **or** `phone_in_hand`); helmet if
 *   bike + person + no helmet; both when both hold.
 *
 * Class lists for the vehicle model are in `VEHICLE_MODEL_*` (Roboflow `vehicles-k83q3-iighp`).
 */

import { ROBOFLOW_MODEL_THRESHOLDS } from '../config/roboflowThresholds';
import type { SpecViolationId } from '../rules/specViolationMapping';
import {
  HELMET_COMPLIANT_CLASS,
  HELMET_VIOLATION_CLASS,
  PHONE_HAND_ONLY_CLASS,
  PHONE_VIOLATION_CLASSES,
  SEATBELT_COMPLIANT_CLASS,
  SEATBELT_VIOLATION_CLASS,
  normalizeRoboflowConfidence,
  triggersHelmetChallan,
  triggersMobilePhoneChallan,
  triggersPhoneInHandOnly,
  triggersSeatbeltChallan,
  type RoboflowPrediction,
} from './roboflowViolationPolicy';

const SEATBELT_MODEL_CAR_CONTEXT_CLASSES: readonly string[] = [
  SEATBELT_VIOLATION_CLASS,
  SEATBELT_COMPLIANT_CLASS,
];

const HELMET_MODEL_BIKE_CONTEXT_CLASSES: readonly string[] = [
  HELMET_VIOLATION_CLASS,
  HELMET_COMPLIANT_CLASS,
];

const MOBILE_PERSON_RELATED_CLASSES: readonly string[] = [
  ...PHONE_VIOLATION_CLASSES,
  PHONE_HAND_ONLY_CLASS,
];

/** Stable order for returned `specViolationIds` (restraint violations before phone). */
const PIPELINE_SPEC_VIOLATION_ORDER: readonly SpecViolationId[] = [
  'no_seatbelt',
  'no_helmet',
  'mobile_phone_use',
];

/**
 * Roboflow vehicle model class names (`vehicles-k83q3-iighp` v1) — exact labels from the trained model.
 * Matching at runtime is case-insensitive (`car` ≡ `Car`).
 */
export const VEHICLE_ROBOFLOW_CLASS_NAMES = ['car', 'Motorcycle', 'Bus', 'truck'] as const;

/** `car`, `Bus`, `truck` → car-like scene (seatbelt / phone-in-car rules). */
export const VEHICLE_MODEL_CARISH_CLASSES: readonly string[] = ['car', 'Bus', 'truck'];

/** `Motorcycle` → bike-like scene (helmet / phone-on-bike rules). */
export const VEHICLE_MODEL_BIKEISH_CLASSES: readonly string[] = ['Motorcycle'];

/** Stroke colors for overlays keyed by lowercase class (Roboflow palette). */
export const VEHICLE_CLASS_STROKE_HEX: Readonly<Record<string, string>> = {
  car: '#0891B2',
  motorcycle: '#F97316',
  bus: '#F4B400',
  truck: '#EA580C',
};

/** Hex stroke for a vehicle class label, or undefined if unknown. */
export function strokeColorForVehicleClass(className: string): string | undefined {
  return VEHICLE_CLASS_STROKE_HEX[className.trim().toLowerCase()];
}

function hasLabelFromListCi(
  predictions: RoboflowPrediction[],
  allowedClasses: readonly string[],
  minConfidence: number,
): boolean {
  const lowered = new Set(allowedClasses.map(c => c.trim().toLowerCase()));
  for (const p of predictions) {
    const conf = normalizeRoboflowConfidence(p.confidence);
    if (conf >= minConfidence && lowered.has(p.class.trim().toLowerCase())) {
      return true;
    }
  }
  return false;
}

/**
 * Seatbelt-model cue only — **not** used for `vehiclePresent` (see {@link inferVehiclePresentFromVehicleModel}).
 */
export function inferCarLikeContext(
  seatbeltPredictions: RoboflowPrediction[],
  seatbeltThreshold: number,
): boolean {
  return hasLabelFromListCi(seatbeltPredictions, SEATBELT_MODEL_CAR_CONTEXT_CLASSES, seatbeltThreshold);
}

/**
 * Helmet-model cue only — **not** used for `vehiclePresent` (see {@link inferVehiclePresentFromVehicleModel}).
 */
export function inferBikeLikeContext(
  helmetPredictions: RoboflowPrediction[],
  helmetThreshold: number,
): boolean {
  return hasLabelFromListCi(helmetPredictions, HELMET_MODEL_BIKE_CONTEXT_CLASSES, helmetThreshold);
}

function hasVehicleLabelAboveThreshold(
  predictions: RoboflowPrediction[],
  allowedClasses: readonly string[],
  minConfidence: number,
): boolean {
  const lowered = new Set(allowedClasses.map(c => c.trim().toLowerCase()));
  for (const p of predictions) {
    const cls = p.class.trim().toLowerCase();
    const conf = normalizeRoboflowConfidence(p.confidence);
    if (conf >= minConfidence && lowered.has(cls)) {
      return true;
    }
  }
  return false;
}

export function inferVehicleCarLikeContext(
  vehiclePredictions: RoboflowPrediction[],
  vehicleThreshold: number,
): boolean {
  return hasVehicleLabelAboveThreshold(
    vehiclePredictions,
    VEHICLE_MODEL_CARISH_CLASSES,
    vehicleThreshold,
  );
}

export function inferVehicleBikeLikeContext(
  vehiclePredictions: RoboflowPrediction[],
  vehicleThreshold: number,
): boolean {
  return hasVehicleLabelAboveThreshold(
    vehiclePredictions,
    VEHICLE_MODEL_BIKEISH_CLASSES,
    vehicleThreshold,
  );
}

/**
 * Step 1 only: `vehiclePresent` from the **vehicle detection model** (`car` / `Bus` / `truck` / `Motorcycle`).
 * Never reads seatbelt, helmet, or phone model outputs.
 */
export function inferVehiclePresentFromVehicleModel(
  vehiclePredictions: RoboflowPrediction[],
  vehicleThreshold: number,
): boolean {
  return hasVehicleLabelAboveThreshold(
    vehiclePredictions,
    VEHICLE_ROBOFLOW_CLASS_NAMES,
    vehicleThreshold,
  );
}

/** Step 1 result — all flags derived **only** from vehicle-model predictions. */
export type VehicleSceneGate = {
  /** True when vehicle model detected `car`, `Bus`, `truck`, or `Motorcycle` above threshold. */
  vehiclePresent: boolean;
  carPresent: boolean;
  bikePresent: boolean;
  vehicleBoxCount: number;
};

/**
 * Step 1 gate — pass **only** `vehiclePredictions` from the vehicle Roboflow model.
 * Specialist models are not consulted here.
 */
export function evaluateVehicleSceneGate(
  vehiclePredictions: RoboflowPrediction[],
  vehicleThreshold: number,
): VehicleSceneGate {
  const vehicleBoxCount = vehiclePredictions.length;
  const vehiclePresent = inferVehiclePresentFromVehicleModel(vehiclePredictions, vehicleThreshold);
  const carPresent = inferVehicleCarLikeContext(vehiclePredictions, vehicleThreshold);
  const bikePresent = inferVehicleBikeLikeContext(vehiclePredictions, vehicleThreshold);
  return {
    vehiclePresent,
    carPresent,
    bikePresent,
    vehicleBoxCount,
  };
}

/**
 * Infer “person in scene” from specialist models (no standalone person detector).
 * True when seatbelt, helmet, or phone/hand cues appear above their thresholds.
 */
export function inferPersonPresentFromSpecialists(params: {
  seatbeltPredictions: RoboflowPrediction[];
  helmetPredictions: RoboflowPrediction[];
  mobilePredictions: RoboflowPrediction[];
  thresholds: { seatbelt: number; bike_helmet: number; mobile_phone: number };
}): boolean {
  if (
    hasLabelFromListCi(
      params.seatbeltPredictions,
      SEATBELT_MODEL_CAR_CONTEXT_CLASSES,
      params.thresholds.seatbelt,
    )
  ) {
    return true;
  }
  if (
    hasLabelFromListCi(
      params.helmetPredictions,
      HELMET_MODEL_BIKE_CONTEXT_CLASSES,
      params.thresholds.bike_helmet,
    )
  ) {
    return true;
  }
  if (
    hasLabelFromListCi(
      params.mobilePredictions,
      MOBILE_PERSON_RELATED_CLASSES,
      params.thresholds.mobile_phone,
    )
  ) {
    return true;
  }
  return false;
}

export type ViolationPipelineDiagnostics = {
  /** Step 1: true when vehicle model established car and/or bike context. */
  vehiclePresent: boolean;
  vehicleBoxCount: number;
  carFromVehicle: boolean;
  bikeFromVehicle: boolean;
  /** Kept for UI/logs; always false now that car/bike require the vehicle model. */
  usedSpecialistContextFallback: boolean;
  carPresent: boolean;
  bikePresent: boolean;
  personPresent: boolean;
  rawSeatbeltViolation: boolean;
  rawHelmetViolation: boolean;
  /** `using_phone` / `calling_phone` / `texting_phone` above threshold. */
  rawMobileViolationStrict: boolean;
  /** `phone_in_hand` above threshold (bike path can challan on this alone). */
  rawPhoneInHandOnly: boolean;
};

/**
 * Same rules as {@link applyViolationProcessingFlow}, plus structured flags for logging / UI copy.
 */
export function applyViolationProcessingFlowWithDiagnostics(params: {
  seatbeltPredictions: RoboflowPrediction[];
  helmetPredictions: RoboflowPrediction[];
  mobilePredictions: RoboflowPrediction[];
  vehiclePredictions: RoboflowPrediction[];
  thresholds: {
    seatbelt: number;
    bike_helmet: number;
    mobile_phone: number;
    vehicle?: number;
  };
}): { specViolationIds: SpecViolationId[]; diagnostics: ViolationPipelineDiagnostics } {
  const { seatbeltPredictions, helmetPredictions, mobilePredictions, vehiclePredictions, thresholds } = params;
  const vehicleThreshold = thresholds.vehicle ?? ROBOFLOW_MODEL_THRESHOLDS.vehicle;

  const vehicleGate = evaluateVehicleSceneGate(vehiclePredictions, vehicleThreshold);
  const { vehiclePresent, vehicleBoxCount, carPresent, bikePresent } = vehicleGate;
  const carFromVehicle = vehicleGate.carPresent;
  const bikeFromVehicle = vehicleGate.bikePresent;
  const usedSpecialistContextFallback = false;

  const rawSeatbeltViolation = triggersSeatbeltChallan(seatbeltPredictions, thresholds.seatbelt);
  const rawHelmetViolation = triggersHelmetChallan(helmetPredictions, thresholds.bike_helmet);
  const rawMobileViolationStrict = triggersMobilePhoneChallan(
    mobilePredictions,
    thresholds.mobile_phone,
  );
  const rawPhoneInHandOnly = triggersPhoneInHandOnly(mobilePredictions, thresholds.mobile_phone);

  if (!vehiclePresent) {
    const personPresent = inferPersonPresentFromSpecialists({
      seatbeltPredictions,
      helmetPredictions,
      mobilePredictions,
      thresholds: {
        seatbelt: thresholds.seatbelt,
        bike_helmet: thresholds.bike_helmet,
        mobile_phone: thresholds.mobile_phone,
      },
    });
    return {
      specViolationIds: [],
      diagnostics: {
        vehiclePresent: false,
        vehicleBoxCount,
        carFromVehicle,
        bikeFromVehicle,
        usedSpecialistContextFallback,
        carPresent: false,
        bikePresent: false,
        personPresent,
        rawSeatbeltViolation,
        rawHelmetViolation,
        rawMobileViolationStrict,
        rawPhoneInHandOnly,
      },
    };
  }

  const personPresent = inferPersonPresentFromSpecialists({
    seatbeltPredictions,
    helmetPredictions,
    mobilePredictions,
    thresholds: {
      seatbelt: thresholds.seatbelt,
      bike_helmet: thresholds.bike_helmet,
      mobile_phone: thresholds.mobile_phone,
    },
  });

  const rawMobileForCar = rawMobileViolationStrict;
  const rawMobileForBike = rawMobileViolationStrict || rawPhoneInHandOnly;

  const out = new Set<SpecViolationId>();

  if (carPresent && personPresent && rawSeatbeltViolation) {
    out.add('no_seatbelt');
  }
  if (carPresent && rawMobileForCar) {
    out.add('mobile_phone_use');
  }

  if (bikePresent && personPresent && rawMobileForBike) {
    out.add('mobile_phone_use');
  }
  if (bikePresent && personPresent && rawHelmetViolation) {
    out.add('no_helmet');
  }

  const specViolationIds = PIPELINE_SPEC_VIOLATION_ORDER.filter(id => out.has(id));

  return {
    specViolationIds,
    diagnostics: {
      vehiclePresent: true,
      vehicleBoxCount,
      carFromVehicle,
      bikeFromVehicle,
      usedSpecialistContextFallback,
      carPresent,
      bikePresent,
      personPresent,
      rawSeatbeltViolation,
      rawHelmetViolation,
      rawMobileViolationStrict,
      rawPhoneInHandOnly,
    },
  };
}

/**
 * Apply IF/THEN flows. Car and bike context come **only** from the vehicle model (`car` / `Bus` / `truck` /
 * `Motorcycle`) above threshold; specialists apply only after that context exists.
 */
export function applyViolationProcessingFlow(params: {
  seatbeltPredictions: RoboflowPrediction[];
  helmetPredictions: RoboflowPrediction[];
  mobilePredictions: RoboflowPrediction[];
  vehiclePredictions: RoboflowPrediction[];
  thresholds: {
    seatbelt: number;
    bike_helmet: number;
    mobile_phone: number;
    vehicle?: number;
  };
}): SpecViolationId[] {
  return applyViolationProcessingFlowWithDiagnostics(params).specViolationIds;
}
