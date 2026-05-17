import type { RoboflowPrediction } from '../src/services/roboflowViolationPolicy';
import {
  applyViolationProcessingFlow,
  applyViolationProcessingFlowWithDiagnostics,
  evaluateVehicleSceneGate,
  inferBikeLikeContext,
  inferCarLikeContext,
  inferPersonPresentFromSpecialists,
  inferVehicleBikeLikeContext,
  inferVehicleCarLikeContext,
  inferVehiclePresentFromVehicleModel,
} from '../src/services/violationProcessingFlow';

const T = { seatbelt: 0.5, bike_helmet: 0.5, mobile_phone: 0.5, vehicle: 0.5 };

function p(cls: string, conf = 0.9): RoboflowPrediction {
  return { class: cls, confidence: conf, x: 50, y: 50, width: 40, height: 40 };
}

describe('violationProcessingFlow', () => {
  test('Scenario A: pedestrian using_phone, no vehicle → no violation', () => {
    const ids = applyViolationProcessingFlow({
      seatbeltPredictions: [],
      helmetPredictions: [],
      mobilePredictions: [p('using_phone')],
      vehiclePredictions: [],
      thresholds: T,
    });
    expect(ids).toEqual([]);
  });

  test('no vehicle in frame: seatbelt specialist alone does not create violations', () => {
    const ids = applyViolationProcessingFlow({
      seatbeltPredictions: [p('no-seatbelt')],
      helmetPredictions: [],
      mobilePredictions: [],
      vehiclePredictions: [],
      thresholds: T,
    });
    expect(ids).toEqual([]);
  });

  test('car + person + no seatbelt → no_seatbelt', () => {
    const ids = applyViolationProcessingFlow({
      seatbeltPredictions: [p('no-seatbelt')],
      helmetPredictions: [],
      mobilePredictions: [],
      vehiclePredictions: [p('car')],
      thresholds: T,
    });
    expect(ids).toEqual(['no_seatbelt']);
  });

  test('car + compliant seatbelt only → no seatbelt violation', () => {
    const ids = applyViolationProcessingFlow({
      seatbeltPredictions: [p('seatbelt')],
      helmetPredictions: [],
      mobilePredictions: [],
      vehiclePredictions: [p('truck')],
      thresholds: T,
    });
    expect(ids).toEqual([]);
  });

  test('car + phone_in_hand only (no using_phone) → no mobile violation on car', () => {
    const ids = applyViolationProcessingFlow({
      seatbeltPredictions: [],
      helmetPredictions: [],
      mobilePredictions: [p('phone_in_hand')],
      vehiclePredictions: [p('car')],
      thresholds: T,
    });
    expect(ids).toEqual([]);
  });

  test('bike + phone_in_hand only → mobile_phone_use', () => {
    const ids = applyViolationProcessingFlow({
      seatbeltPredictions: [],
      helmetPredictions: [],
      mobilePredictions: [p('phone_in_hand')],
      vehiclePredictions: [p('Motorcycle')],
      thresholds: T,
    });
    expect(ids).toEqual(['mobile_phone_use']);
  });

  test('car + phone violation (strict classes; no person gate on car mobile)', () => {
    const ids = applyViolationProcessingFlow({
      seatbeltPredictions: [],
      helmetPredictions: [],
      mobilePredictions: [p('calling_phone')],
      vehiclePredictions: [p('Bus')],
      thresholds: T,
    });
    expect(ids).toEqual(['mobile_phone_use']);
  });

  test('car + person + no seatbelt + phone → both (Scenario I)', () => {
    const ids = applyViolationProcessingFlow({
      seatbeltPredictions: [p('no-seatbelt')],
      helmetPredictions: [],
      mobilePredictions: [p('texting_phone')],
      vehiclePredictions: [p('car')],
      thresholds: T,
    });
    expect(ids).toEqual(['no_seatbelt', 'mobile_phone_use']);
  });

  test('bike + person + Without Helmet → no_helmet', () => {
    const ids = applyViolationProcessingFlow({
      seatbeltPredictions: [],
      helmetPredictions: [p('Without Helmet')],
      mobilePredictions: [],
      vehiclePredictions: [p('Motorcycle')],
      thresholds: T,
    });
    expect(ids).toEqual(['no_helmet']);
  });

  test('bike + person + phone + Without Helmet → both (Scenario H)', () => {
    const ids = applyViolationProcessingFlow({
      seatbeltPredictions: [],
      helmetPredictions: [p('Without Helmet')],
      mobilePredictions: [p('using_phone')],
      vehiclePredictions: [p('Motorcycle')],
      thresholds: T,
    });
    expect(ids).toEqual(['no_helmet', 'mobile_phone_use']);
  });

  test('Scenario B: person on ground phone_in_hand, no vehicle → no violation', () => {
    const ids = applyViolationProcessingFlow({
      seatbeltPredictions: [],
      helmetPredictions: [],
      mobilePredictions: [p('phone_in_hand')],
      vehiclePredictions: [],
      thresholds: T,
    });
    expect(ids).toEqual([]);
  });

  test('bike + person + With Helmet + phone → mobile only', () => {
    const ids = applyViolationProcessingFlow({
      seatbeltPredictions: [],
      helmetPredictions: [p('With Helmet')],
      mobilePredictions: [p('using_phone')],
      vehiclePredictions: [p('Motorcycle')],
      thresholds: T,
    });
    expect(ids).toEqual(['mobile_phone_use']);
  });

  test('helmet violation without bike in vehicle model → no violation', () => {
    const ids = applyViolationProcessingFlow({
      seatbeltPredictions: [],
      helmetPredictions: [p('Without Helmet')],
      mobilePredictions: [],
      vehiclePredictions: [p('car')],
      thresholds: T,
    });
    expect(ids).toEqual([]);
  });

  test('car + using_phone + With Helmet in helmet model → car mobile only', () => {
    const ids = applyViolationProcessingFlow({
      seatbeltPredictions: [],
      helmetPredictions: [p('With Helmet')],
      mobilePredictions: [p('using_phone')],
      vehiclePredictions: [p('car')],
      thresholds: T,
    });
    expect(ids).toEqual(['mobile_phone_use']);
  });

  test('inferCarLikeContext / inferBikeLikeContext (specialist-only helpers)', () => {
    expect(inferCarLikeContext([p('no-seatbelt')], 0.5)).toBe(true);
    expect(inferCarLikeContext([], 0.5)).toBe(false);
    expect(inferBikeLikeContext([p('With Helmet')], 0.5)).toBe(true);
    expect(inferBikeLikeContext([], 0.5)).toBe(false);
  });

  test('inferPersonPresentFromSpecialists', () => {
    expect(
      inferPersonPresentFromSpecialists({
        seatbeltPredictions: [p('seatbelt')],
        helmetPredictions: [],
        mobilePredictions: [],
        thresholds: { seatbelt: 0.5, bike_helmet: 0.5, mobile_phone: 0.5 },
      }),
    ).toBe(true);
    expect(
      inferPersonPresentFromSpecialists({
        seatbeltPredictions: [],
        helmetPredictions: [],
        mobilePredictions: [p('phone_in_hand', 0.9)],
        thresholds: { seatbelt: 0.5, bike_helmet: 0.5, mobile_phone: 0.5 },
      }),
    ).toBe(true);
    expect(
      inferPersonPresentFromSpecialists({
        seatbeltPredictions: [],
        helmetPredictions: [],
        mobilePredictions: [],
        thresholds: { seatbelt: 0.5, bike_helmet: 0.5, mobile_phone: 0.5 },
      }),
    ).toBe(false);
  });

  test('inferVehicleCarLikeContext / inferVehicleBikeLikeContext (case-insensitive)', () => {
    expect(inferVehicleCarLikeContext([p('Car')], 0.5)).toBe(true);
    expect(inferVehicleBikeLikeContext([p('MOTORCYCLE')], 0.5)).toBe(true);
    expect(inferVehicleCarLikeContext([], 0.5)).toBe(false);
  });

  test('evaluateVehicleSceneGate: phone-only specialists do not set vehiclePresent', () => {
    const gate = evaluateVehicleSceneGate([], 0.5);
    expect(gate.vehiclePresent).toBe(false);
    expect(gate.vehicleBoxCount).toBe(0);

    const withCar = evaluateVehicleSceneGate([p('car')], 0.5);
    expect(withCar.vehiclePresent).toBe(true);
    expect(withCar.carPresent).toBe(true);
    expect(withCar.bikePresent).toBe(false);
  });

  describe('vehicle model classes (car, Motorcycle, Bus, truck)', () => {
    test.each([
      ['car', true, false],
      ['Bus', true, false],
      ['truck', true, false],
      ['Motorcycle', false, true],
    ] as const)('%s → car=%s bike=%s', (cls, expectCar, expectBike) => {
      const gate = evaluateVehicleSceneGate([p(cls)], 0.5);
      expect(gate.vehiclePresent).toBe(true);
      expect(gate.carPresent).toBe(expectCar);
      expect(gate.bikePresent).toBe(expectBike);
    });

    test('labels not in the model (e.g. van) do not pass step 1 gate', () => {
      const gate = evaluateVehicleSceneGate([p('van', 0.99)], 0.5);
      expect(gate.vehiclePresent).toBe(false);
      expect(
        applyViolationProcessingFlow({
          seatbeltPredictions: [p('no-seatbelt')],
          helmetPredictions: [],
          mobilePredictions: [p('using_phone')],
          vehiclePredictions: [p('van', 0.99)],
          thresholds: T,
        }),
      ).toEqual([]);
    });

    test('vehiclePresent uses vehicle model only — specialists cannot set it', () => {
      expect(
        inferVehiclePresentFromVehicleModel([], 0.5),
      ).toBe(false);
      expect(
        inferVehiclePresentFromVehicleModel([p('car')], 0.5),
      ).toBe(true);
      expect(inferCarLikeContext([p('no-seatbelt')], 0.5)).toBe(true);
      expect(
        inferVehiclePresentFromVehicleModel([], 0.5),
      ).toBe(false);
      const flow = applyViolationProcessingFlowWithDiagnostics({
        seatbeltPredictions: [p('no-seatbelt')],
        helmetPredictions: [p('Without Helmet')],
        mobilePredictions: [p('using_phone')],
        vehiclePredictions: [],
        thresholds: T,
      });
      expect(flow.diagnostics.vehiclePresent).toBe(false);
      expect(flow.specViolationIds).toEqual([]);
    });
  });

  test('applyViolationProcessingFlowWithDiagnostics exposes vehiclePresent', () => {
    const noVehicle = applyViolationProcessingFlowWithDiagnostics({
      seatbeltPredictions: [p('no-seatbelt')],
      helmetPredictions: [],
      mobilePredictions: [p('using_phone')],
      vehiclePredictions: [],
      thresholds: T,
    });
    expect(noVehicle.diagnostics.vehiclePresent).toBe(false);
    expect(noVehicle.specViolationIds).toEqual([]);

    const withVehicle = applyViolationProcessingFlowWithDiagnostics({
      seatbeltPredictions: [p('no-seatbelt')],
      helmetPredictions: [],
      mobilePredictions: [],
      vehiclePredictions: [p('car')],
      thresholds: T,
    });
    expect(withVehicle.diagnostics.vehiclePresent).toBe(true);
    expect(withVehicle.specViolationIds).toEqual(['no_seatbelt']);
  });
});
