import type { SpecViolationId } from '../rules/specViolationMapping';
import type { ViolationPipelineDiagnostics } from './violationProcessingFlow';
import type { RoboflowPrediction } from './roboflowViolationPolicy';

export type InferencePlainLanguage = {
  headline: string;
  bullets: string[];
  /** Short scenario labels for History / result badges (not Roboflow class names). */
  displayViolationLabels: string[];
};

/** Short “models responded with …” line for one model (direct readout). */
export function formatModelDetectionsLine(
  label: string,
  predictions: RoboflowPrediction[],
  maxItems = 5,
): string {
  if (predictions.length === 0) {
    return `${label}: no detections above parse threshold.`;
  }
  const parts = predictions.slice(0, maxItems).map(p => {
    const pct = Math.round(Math.max(0, Math.min(1, p.confidence)) * 100);
    return `${p.class} (${pct}%)`;
  });
  const more = predictions.length > maxItems ? ` …+${predictions.length - maxItems} more` : '';
  return `${label}: ${parts.join(', ')}${more}.`;
}

/**
 * Officer-facing outcome line + badge strings from scene context and spec ids.
 */
export function buildScenarioDisplay(
  d: ViolationPipelineDiagnostics,
  specIds: SpecViolationId[],
): { headline: string; displayViolationLabels: string[] } {
  const hasSeat = specIds.includes('no_seatbelt');
  const hasMob = specIds.includes('mobile_phone_use');
  const hasHelm = specIds.includes('no_helmet');

  if (!d.vehiclePresent) {
    return { headline: 'No vehicle detected.', displayViolationLabels: [] };
  }
  if (specIds.length === 0) {
    return { headline: 'No violations detected for this scene.', displayViolationLabels: [] };
  }

  if (d.carPresent && !d.bikePresent) {
    if (hasMob && hasSeat) {
      return { headline: 'Mobile+Seatbelt Violation', displayViolationLabels: ['Mobile+Seatbelt Violation'] };
    }
    if (hasMob) {
      return { headline: 'Mobile Violation Detected', displayViolationLabels: ['Mobile Violation Detected'] };
    }
    if (hasSeat) {
      return { headline: 'Seatbelt Violation', displayViolationLabels: ['Seatbelt Violation'] };
    }
  }
  if (d.bikePresent && !d.carPresent) {
    if (hasMob && hasHelm) {
      return { headline: 'Phone+Helmet Violation', displayViolationLabels: ['Phone+Helmet Violation'] };
    }
    if (hasMob) {
      return { headline: 'Phone violation', displayViolationLabels: ['Phone violation'] };
    }
    if (hasHelm) {
      return { headline: 'Helmet Violation', displayViolationLabels: ['Helmet Violation'] };
    }
  }
  if (d.carPresent && d.bikePresent) {
    const labels: string[] = [];
    if (hasSeat) {
      labels.push('Seatbelt Violation');
    }
    if (hasHelm) {
      labels.push('Helmet Violation');
    }
    if (hasMob) {
      labels.push('Phone/Mobile violation');
    }
    return {
      headline: labels.length ? labels.join(' · ') : 'No violations detected for this scene.',
      displayViolationLabels: labels,
    };
  }
  return { headline: 'No violations detected for this scene.', displayViolationLabels: [] };
}

/**
 * Plain-language headline + bullets for officers (processing + outcome in one place).
 */
export function buildInferencePlainLanguage(params: {
  diagnostics: ViolationPipelineDiagnostics;
  specViolationIds: SpecViolationId[];
  /** True when step 2 specialist Roboflow calls were not run (step 1 vehicle gate failed). */
  specialistsSkipped?: boolean;
  linesPerModel: {
    vehicle: string;
    seatbelt: string;
    helmet: string;
    mobile: string;
  };
  /** When violations triggered a plate-model run, pass its detection line here. */
  plateLine?: string;
}): InferencePlainLanguage {
  const { diagnostics: d, specViolationIds, linesPerModel, plateLine, specialistsSkipped } = params;
  const scene = buildScenarioDisplay(d, specViolationIds);

  const bullets: string[] = [
    `Pipeline: (1) Vehicle present (vehicle model only) = ${d.vehiclePresent ? 'yes' : 'no'} → (2) Specialists = ${specialistsSkipped ? 'skipped' : 'run'} → (3) Violations = ${specViolationIds.length > 0 ? 'yes' : 'no'}.`,
    linesPerModel.vehicle,
    linesPerModel.seatbelt,
    linesPerModel.helmet,
    linesPerModel.mobile,
  ];
  if (plateLine) {
    bullets.push(plateLine);
  }

  if (d.vehicleBoxCount > 0 && !d.carFromVehicle && !d.bikeFromVehicle) {
    bullets.push(
      'Context: vehicle model returned boxes, but none matched car, Bus, truck, or Motorcycle at the vehicle confidence threshold — treated as no car and no bike.',
    );
  }

  bullets.push(
    `Scene rules: car context = ${d.carPresent ? 'yes' : 'no'}, bike context = ${d.bikePresent ? 'yes' : 'no'}, person cue = ${d.personPresent ? 'yes' : 'no'}.`,
  );
  bullets.push(
    `Raw specialist flags (before combining rules): seatbelt violation class = ${d.rawSeatbeltViolation ? 'yes' : 'no'}, helmet violation class = ${d.rawHelmetViolation ? 'yes' : 'no'}, phone strict (using/calling/texting) = ${d.rawMobileViolationStrict ? 'yes' : 'no'}, phone_in_hand only = ${d.rawPhoneInHandOnly ? 'yes' : 'no'}.`,
  );

  return {
    headline: scene.headline,
    bullets,
    displayViolationLabels: scene.displayViolationLabels,
  };
}
