# TrafficEye — violation processing flows (policy)

Enforced in code by [`src/services/violationProcessingFlow.ts`](../src/services/violationProcessingFlow.ts), orchestrated from [`src/services/roboflowOrchestrator.ts`](../src/services/roboflowOrchestrator.ts).

## 1. Vehicle model first (then all specialists)

1. **Vehicle** (`vehicles-k83q3-iighp` / env) runs **first** (single request before the parallel batch).
2. **Seatbelt**, **helmet**, and **phone** models always run next (parallel) so inference still runs if the vehicle response is empty or unparsed.
3. **Car present** = vehicle model sees **Bus**, **car**, or **truck** above threshold **or**, if the vehicle model returned **zero boxes**, seatbelt-model car cues (`seatbelt` / `no-seatbelt`) count as car context (fallback).
4. **Bike present** = vehicle sees **Motorcycle** above threshold **or**, if vehicle returned **zero boxes**, helmet-model bike cues (`With Helmet` / `Without Helmet`) count as bike context (fallback).
5. If **no car and no bike** after that combination → **no violations** (plate model is not called).

## 2. Person (no standalone detector)

**Person** is inferred when **any** specialist model shows a person-related class above threshold:

- Seatbelt model: `seatbelt` or `no-seatbelt`
- Helmet model: `With Helmet` or `Without Helmet`
- Phone model: `using_phone`, `calling_phone`, `texting_phone`, or `phone_in_hand`

## 3. IF / THEN rules (after vehicle gate)

### Car context

| Condition | Spec violation |
| --------- | -------------- |
| Car **and** person **and** no-seatbelt (seatbelt model) | `no_seatbelt` |
| Car **and** phone violation (phone model) — **no** person requirement | `mobile_phone_use` |

Combined cases add **both** ids when both conditions hold (stored as a deduped set).

### Bike (Motorcycle from vehicle model)

| Condition | Spec violation |
| --------- | -------------- |
| Bike **and** person **and** phone violation | `mobile_phone_use` |
| Bike **and** person **and** no helmet (helmet model) | `no_helmet` |

Both can apply together.

### No car / bike in scope

If **not car and not bike** after vehicle + fallback rules → **no violations** (empty list).

## 4. Number plate (after at least one violation)

When `specViolationIds.length > 0`, the orchestrator runs the **number plate** model, selects the best plate box, and returns `platePrediction` for UI (highlight + officer plate entry).

## 5. Post-detection product flow (UI / data)

When violations remain:

1. **Plate model** — best plate box for crop / highlight (see Capture review screen).
2. **Review** — violation frame + plate region overlay + **number plate text field**.
3. Officer **enters / confirms** plate text before save.
4. **Save** — history + candidate queue path (existing `CaptureScreen` / `AppContext`).
5. **Generate challan** — confirm from **Candidate queue** (`buildChallanPdfBase64`, Storage, Firestore `challans`); PDF includes time, evidence, plate.
6. **Retention** — `ChallanRecord.expiresAt` (~7 days from confirmation); see `src/types/challanBlueprint.ts` and cleanup scripts if configured.

Steps 4–6 are implemented across **Capture**, **Candidate queue**, and **challan** services; the **policy gate** above feeds them.
