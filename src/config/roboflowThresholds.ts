/**
 * Confidence thresholds used by client-side violation policy evaluation.
 * Tune these after collecting validation samples.
 */
export const ROBOFLOW_MODEL_THRESHOLDS = {
  seatbelt: 0.5,
  bike_helmet: 0.5,
  mobile_phone: 0.5,
  number_plate: 0.5,
  /**
   * Vehicle-type detector: car/bike scene gate only (see violationProcessingFlow).
   * Slightly below specialist defaults so marginal vehicle boxes still establish context when parsing succeeds.
   */
  vehicle: 0.42,
} as const;

/**
 * Optional class-level overrides (exact Roboflow class labels).
 * Falls back to model threshold when a class is not listed.
 */
export const ROBOFLOW_CLASS_THRESHOLD_OVERRIDES: Record<string, number> = {
  'no-seatbelt': 0.5,
  'Without Helmet': 0.5,
  using_phone: 0.5,
  calling_phone: 0.5,
  texting_phone: 0.5,
  phone_in_hand: 0.8,
};

export function thresholdForRoboflowClass(className: string, modelDefault: number): number {
  return ROBOFLOW_CLASS_THRESHOLD_OVERRIDES[className] ?? modelDefault;
}
