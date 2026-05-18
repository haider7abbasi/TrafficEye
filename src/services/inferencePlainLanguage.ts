import type { SpecViolationId } from '../rules/specViolationMapping';
import type { ViolationPipelineDiagnostics } from './violationProcessingFlow';
export { formatModelDetectionsLine } from './detectionDisplay';

export type InferencePlainLanguage = {
  headline: string;
  bullets: string[];
  /** Short scenario labels for History / result badges (not Roboflow class names). */
  displayViolationLabels: string[];
  pipelineBullet: string;
  footerBullets: string[];
};

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
  specialistsSkipped?: boolean;
  displayMinConfidence: number;
  linesPerModel: {
    vehicle: string;
    seatbelt: string;
    helmet: string;
    mobile: string;
  };
  plateLine?: string;
}): InferencePlainLanguage {
  const { diagnostics: d, specViolationIds, linesPerModel, plateLine, specialistsSkipped } = params;
  const scene = buildScenarioDisplay(d, specViolationIds);
  const displayPct = Math.round(params.displayMinConfidence * 100);

  const pipelineBullet = `Pipeline: (1) Vehicle present (vehicle model only) = ${d.vehiclePresent ? 'yes' : 'no'} → (2) Specialists = ${specialistsSkipped ? 'skipped' : 'run'} → (3) Violations = ${specViolationIds.length > 0 ? 'yes' : 'no'}.`;

  const footerBullets: string[] = [
    `Display: boxes and model readouts at or above ${displayPct}% (enforcement rules use separate fixed thresholds).`,
  ];

  if (d.vehicleBoxCount > 0 && !d.carFromVehicle && !d.bikeFromVehicle) {
    footerBullets.push(
      'Context: vehicle model returned boxes, but none matched car, Bus, truck, or Motorcycle at the vehicle confidence threshold — treated as no car and no bike.',
    );
  }

  footerBullets.push(
    `Scene rules: car context = ${d.carPresent ? 'yes' : 'no'}, bike context = ${d.bikePresent ? 'yes' : 'no'}, person cue = ${d.personPresent ? 'yes' : 'no'}.`,
  );
  footerBullets.push(
    `Raw specialist flags (before combining rules): seatbelt violation class = ${d.rawSeatbeltViolation ? 'yes' : 'no'}, helmet violation class = ${d.rawHelmetViolation ? 'yes' : 'no'}, phone strict (using/calling/texting) = ${d.rawMobileViolationStrict ? 'yes' : 'no'}, phone_in_hand only = ${d.rawPhoneInHandOnly ? 'yes' : 'no'}.`,
  );

  const bullets: string[] = [
    pipelineBullet,
    linesPerModel.vehicle,
    linesPerModel.seatbelt,
    linesPerModel.helmet,
    linesPerModel.mobile,
  ];
  if (plateLine) {
    bullets.push(plateLine);
  }
  bullets.push(...footerBullets);

  return {
    headline: scene.headline,
    bullets,
    displayViolationLabels: scene.displayViolationLabels,
    pipelineBullet,
    footerBullets,
  };
}
