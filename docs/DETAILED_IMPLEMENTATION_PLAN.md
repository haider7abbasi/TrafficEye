# TrafficEye — Detailed Implementation Plan (Greenfield, TODO)

## Document control

| Field | Value |
| ----- | ----- |
| **Source specification** | [`docs/PROJECT_DOCUMENTATION.md`](./PROJECT_DOCUMENTATION.md) |
| **Scope** | Full system per that document (mobile + Firebase + Roboflow hosted API + deduplication + officer/admin). |
| **Assumption** | **Ignore** current app under `src/` as the source of design; implement from spec + this plan. |

---

## Prerequisites — repository status (audited)

This reflects **what is already present in the TrafficEye repo** versus what still depends on **your machine, Firebase Console, or Roboflow account**. Console-only items are marked **verify manually**.

### Already configured (in repo)

- [x] **React Native app baseline** — `react-native` **0.85.3**, `react` **19.2.3**, TypeScript **5.8.x**, `package.json` `engines.node` **>= 22.11.0**.
- [x] **Redux Toolkit + Redux Persist + AsyncStorage** — [`src/store/configureStore.ts`](../src/store/configureStore.ts), [`docs/STATE_MANAGEMENT.md`](./STATE_MANAGEMENT.md); `settings` slice persisted; Firebase/auth stay in [`AppContext`](../src/context/AppContext.tsx).
- [x] **MP4 / video metadata stack** — `react-native-compressor`, `react-native-create-thumbnail` (rebuild native app after install); see Phase 5 and [`extractVideoFrames.ts`](../src/services/extractVideoFrames.ts).
- [x] **Live native camera** — `react-native-vision-camera` (~1 FPS `takePhoto` in [`CaptureScreen`](../src/screens/CaptureScreen.tsx)); rebuild after install.
- [x] **Firebase (client) packages** — `@react-native-firebase/app`, `auth`, `firestore`, **`storage`** in `package.json`.
- [x] **Firebase Admin (tooling)** — `firebase-admin` in `devDependencies` (e.g. `scripts/seed-static-user.cjs`).
- [x] **Android native wiring** — `android/app/google-services.json` present; `com.google.gms.google-services` plugin and `firebase-bom` in `android/app/build.gradle` (see [`android/FIREBASE_SETUP.txt`](../android/FIREBASE_SETUP.txt) for project id **traffic-eye-1c5e9** and SHA checklist).
- [x] **Firestore rules file** — [`firestore.rules`](../firestore.rules) with `users/{userId}`, `role == 'admin'`, and `violations` subcollection rules; [`firebase.json`](../firebase.json) points rules file for deployment.
- [x] **Environment template** — [`.env.example`](../.env.example) includes `FIRESTORE_*`, optional emulator vars, optional Cloud Functions base URL, and **Roboflow** `ROBOFLOW_API_KEY` + `ROBOFLOW_PROJECT_*` project ids.
- [x] **Babel env loading** — `react-native-dotenv` in [`babel.config.js`](../babel.config.js) reading `.env`.
- [x] **TypeScript env typings** — [`src/env.d.ts`](../src/env.d.ts) includes Firestore and Roboflow `@env` exports.
- [x] **Secrets hygiene** — `.env` is listed in [`.gitignore`](../.gitignore).
- [x] **Roboflow HTTP stack (baseline)** — `axios` in `package.json`; [`src/services/roboflowHostDetection.ts`](../src/services/roboflowHostDetection.ts) for hosted `detect.roboflow.com` calls.

### Not yet configured / gaps vs `PROJECT_DOCUMENTATION.md`

- [x] **`@react-native-firebase/storage`** — in `package.json`; **rebuild** native app after install. **Still do in app:** implement uploads for violation/plate/PDF paths (Console + Storage rules: **done** per §2.2).
- **Android-only (current phase):** iOS is **not** in scope for now — no `GoogleService-Info.plist` or iOS-specific Firebase setup is required until you explicitly add an iOS target later.
- [x] **`ROBOFLOW_API_KEY` in local `.env`** — configured; must stay **gitignored**; never commit; prefer a server proxy for production/store builds.
- [x] **Roboflow HTTP inference baseline** — `axios` added to `package.json`; hosted detect helper in [`src/services/roboflowHostDetection.ts`](../src/services/roboflowHostDetection.ts) using `detect.roboflow.com/{project_id}/{version}` + per-project `ROBOFLOW_VERSION_*` (see [`.env.example`](../.env.example)). **Verified:** Roboflow deploy / version and env project ids match the dashboard; still wire from capture/upload/live UI in app.
- **Not in scope:** **Cloud Function proxy** — not required for current phase; `ROBOFLOW_API_KEY` stays in local `.env` only (see also §2.2).
- [x] **Firebase Console** — Email/Password, Firestore, **Cloud Storage** + **Storage rules**, billing as needed (**done** per operator; see §2.2). **Still do in app:** implement uploads for violation/plate/PDF paths when those features land.
- [x] **SHA fingerprints (debug)** — added in Firebase Console per [`android/FIREBASE_SETUP.txt`](../android/FIREBASE_SETUP.txt); re-download `google-services.json` if Console recommends after fingerprint changes.

---

## Security: Roboflow API key

- **Do not** commit a real `ROBOFLOW_API_KEY` to Git. Keep it only in a **local** `.env` (gitignored) or in **Firebase Functions secrets** / server config for a proxy.
- If a key was shared in plain text (chat, screenshots, issue tickets), **rotate it** in Roboflow and update local `.env` only.
- Canonical env template: [`.env.example`](../.env.example) (key left empty; project IDs listed there).

---

## Prerequisites — Roboflow configuration (reference)

Use these **Roboflow project identifiers** when wiring the inference client or proxy (confirm exact **workspace / project / version** segments in the Roboflow dashboard for your REST or SDK calls).

| TrafficEye capability | Roboflow project ID (slug) | Deploy version (env) |
| ----------------------- | -------------------------- | ---------------------- |
| Seatbelt violation | `seatbelt-detection-lb1ec-jborv` | `ROBOFLOW_VERSION_SEATBELT=2` |
| Number plate detection | `np-recognization` | `ROBOFLOW_VERSION_NUMBER_PLATE=1` |
| Mobile phone (use / calling / texting per model classes) | `mobile_phone_detection-hhrf7` | `ROBOFLOW_VERSION_MOBILE_PHONE=2` |
| Bike helmet violation | `bike-helmet-sbg4b-kwudk` | `ROBOFLOW_VERSION_BIKE_HELMET=2` |

### Local setup checklist

- [x] Create Roboflow account; open each project above; note **model version** and **inference endpoint** format — **done:** versions in table / `.env.example`; client uses **hosted HTTP** `https://detect.roboflow.com/{project}/{version}` in [`src/services/roboflowHostDetection.ts`](../src/services/roboflowHostDetection.ts) (not Roboflow JS SDK).
- [x] Copy **private API key** into local `.env` as `ROBOFLOW_API_KEY=` (never commit).
- [x] Align env names with [`.env.example`](../.env.example): `ROBOFLOW_PROJECT_*` and `ROBOFLOW_VERSION_*` match this table (template in repo).
- [x] Map **Roboflow class labels** → challan triggers — implemented in [`src/services/roboflowViolationPolicy.ts`](../src/services/roboflowViolationPolicy.ts) (seatbelt, helmet, phone rules; plate crop rect + `selectPrimaryPlatePrediction` for Option 1).
- **Out of scope for now:** server-side proxy (Firebase Callable or small backend) that holds `ROBOFLOW_API_KEY` in secrets. The app continues to use the key from local `.env` / bundled config; add a proxy before production if policy requires it.

---

## Master todo (roll-up)

- [x] Prerequisites satisfied (Firebase Console + Storage + Roboflow runtime + legal/demo policy) — see [Prerequisites — repository status](#prerequisites--repository-status-audited).
- [x] Roboflow integration **in UI for local images** — `CaptureScreen` + [`analyzeLocalImageForViolations`](../src/services/roboflowOrchestrator.ts); **device camera + gallery** via [`nativeImageCapture.ts`](../src/services/nativeImageCapture.ts) (`react-native-image-picker`) + Android [`androidCapturePermissions.ts`](../src/services/androidCapturePermissions.ts) runtime prompts; **remote** sample URLs remain **demo mock** only. Baseline client: [`roboflowHostDetection.ts`](../src/services/roboflowHostDetection.ts).
- [x] Firebase Auth + Firestore + **Storage** + rules — **in repo:** rules/indexes/storage paths + app uploads for candidates/challans; **operator still:** `firebase deploy` to target project + device smoke test ([`android/FIREBASE_SETUP.txt`](../android/FIREBASE_SETUP.txt)).
- [ ] All intake modes per spec — **partial:** **native live** ~1 FPS via **back camera** + `takePhoto` ([`react-native-vision-camera`](https://react-native-vision-camera.com/), [`CaptureScreen`](../src/screens/CaptureScreen.tsx)); **MP4** → JPEG thumbnails + sequential scan ([`extractVideoFrames.ts`](../src/services/extractVideoFrames.ts)). **open:** dedicated non-gallery file picker; device **camera + gallery** stills; remote URLs remain **demo mock** only for still/upload shortcuts.
- [x] Mandatory deduplication (§10.2a / §11.4) — [`dedupGate.ts`](../src/services/dedupGate.ts) + [`__tests__/dedupGate.test.ts`](../__tests__/dedupGate.test.ts) + capture/candidate integration.
- [x] Officer confirm + challan PDF + `confirmedAt` + `expiresAt` — [`CandidateQueueScreen`](../src/screens/CandidateQueueScreen.tsx) + [`challanPdf.ts`](../src/services/challanPdf.ts); cleanup: `npm run cleanup:expired` ([script](../scripts/cleanup-expired-challans.cjs)); **schedule in prod still pending**.
- [x] Admin: traffic rules CRUD; all challans view — [`ManageRulesScreen`](../src/screens/ManageRulesScreen.tsx), [`AllChallansScreen`](../src/screens/AllChallansScreen.tsx), [`ApproveOfficersScreen`](../src/screens/ApproveOfficersScreen.tsx).
- [x] Demo readiness — [`DEMO_SCRIPT_AND_OFFLINE_FALLBACK.md`](./DEMO_SCRIPT_AND_OFFLINE_FALLBACK.md) + `npm run preflight` + [`RELEASE_GO_NO_GO.md`](./RELEASE_GO_NO_GO.md).
- [x] **Client preferences persistence** — Redux + redux-persist + AsyncStorage ([`STATE_MANAGEMENT.md`](./STATE_MANAGEMENT.md)); [`SettingsScreen`](../src/screens/SettingsScreen.tsx) reads/writes `settings` slice.
- [ ] Acceptance matrix **supervisor sign-off** — table in [`ACCEPTANCE_MATRIX.md`](./ACCEPTANCE_MATRIX.md); signatures pending.

---

## 1. Implementation goals (traceable to specification)

1. **Detection intake modes:** camera (photo + video), file upload (image + MP4), live monitoring (1 FPS), plus **information mode** (rules).
2. **Models:** image-only pipeline; video/live → static frames @ **1 FPS** before inference.
3. **Inference:** Roboflow **hosted** API; key via env or proxy (§9.2).
4. **Officer flow:** manual plate + confirm; **one challan per frame** with combined `violationTypes[]` when multi-class.
5. **Dedup:** `T_merge` 60 s, `T_cooldown` 90 s, `violationSignature`, `sessionId`.
6. **Firebase:** Auth email/password, Firestore, Storage; candidates vs confirmed ACL.
7. **Retention:** 7 days from `confirmedAt`; delete non-violation media immediately.

---

## 2. Prerequisites (full list — todo)

### 2.1 People and governance

- [ ] Supervisor sign-off on rules text jurisdiction and demo filming policy.
- [x] **Role model in Firestore rules** — [`firestore.rules`](../firestore.rules) already expects `users/{uid}.role` (e.g. `admin`) for `isAdmin()`; extend or mirror for **officer** vs **candidate/challan** ACLs per `PROJECT_DOCUMENTATION.md` §18 (still to implement in rules when new collections exist).

### 2.2 Accounts and cloud

- [x] **Android `google-services.json`** — present under `android/app/` (see `FIREBASE_SETUP.txt` for project **traffic-eye-1c5e9**).
- [x] **Client Storage SDK** — `@react-native-firebase/storage` in `package.json` (native rebuild required).
- [x] **Firebase Console (verify)** — Auth **Email/Password**, Firestore database, **Storage** bucket + **Storage rules**, billing if required (**done** per operator).
- **iOS / `GoogleService-Info.plist`** — deferred; not required for the current Android-only scope.
- [x] **Roboflow project ids in template** — [`.env.example`](../.env.example) lists all four `ROBOFLOW_PROJECT_*` values.
- [x] **`ROBOFLOW_API_KEY` in local `.env`** — added (operator); must remain out of Git.
- **Not in scope:** Firebase Functions + secret for `ROBOFLOW_API_KEY` proxy.

### 2.3 Development environment

- [x] **Node** — repo declares `engines.node` **>= 22.11.0**; install matching Node locally.
- [x] JDK + Android Studio + SDK; device USB debugging works (machine-specific) — **done** on dev machine.
- [x] **Xcode / iOS toolchain** — N/A for current Android-only phase (no local iOS setup required).
- [x] **Git + `.env` ignored** — see [`.gitignore`](../.gitignore).

### 2.4 Hardware

- [x] Physical Android device + charger + optional mount.

### 2.5 Legal / test data

- [x] Demo consent / venue rules documented — working draft: [`docs/DEMO_CONSENT_AND_VENUE_RULES.md`](./DEMO_CONSENT_AND_VENUE_RULES.md) (align with supervisor / ethics form when required).
- [x] Curated test images/videos for each violation type — **done** (operator / team set).

### 2.6 Freeze before heavy coding

- [x] Class label ↔ spec violation mapping sheet — [`src/rules/specViolationMapping.ts`](../src/rules/specViolationMapping.ts) + in-app **Detection rules** drawer screen.
- [x] Plate normalization rules (spacing, case) — [`src/rules/plateNormalization.ts`](../src/rules/plateNormalization.ts) + same screen.
- [x] PDF field list for challan template — [`src/rules/challanPdfFields.ts`](../src/rules/challanPdfFields.ts) + same screen.
- [x] **Freeze metadata** — bump [`TRAFFICEYE_RULES_FREEZE_VERSION`](../src/rules/rulesFreeze.ts) when mapping / plate / PDF keys change; persist `rulesFreezeVersion` on candidate & challan docs (see [`src/types/challanBlueprint.ts`](../src/types/challanBlueprint.ts)). **Firestore collection ids** for §4 blueprint: [`src/config/collections.ts`](../src/config/collections.ts) (`traffic_rules`, `intake_sessions`, `candidates`, `challans`).

---

## 3. Target architecture (implementation view)

Logical runtime shape (aligned with **current repo** — direct Roboflow calls; no Cloud Function proxy in this phase):

```text
┌──────────────────────────────────────────────────────────────────┐
│                React Native client (TrafficEye)                │
│ Firebase Auth │ Capture/History │ Rules screen │ Drawer / Admin │
│ (`src/navigation`, `src/context`, `src/screens`)                │
└─────────┬───────────────────────────────────────┬────────────────┘
          │ HTTPS                                 │ HTTPS
          ▼                                       ▼
┌──────────────────────────────┐        ┌──────────────────────────────┐
│ Roboflow hosted API          │        │ Firebase                     │
│ detect.roboflow.com          │        │ Auth · Firestore · Storage   │
│ roboflowHostDetection.ts     │        │ Firestore + Storage rules    │
│ roboflowViolationPolicy.ts   │        │ firestore.indexes.json       │
└──────────────────────────────┘        └──────────────────────────────┘
```

**Deferred / not in current diagram:** HTTPS → **Cloud Function (or other) proxy** holding `ROBOFLOW_API_KEY` off-device — excluded for now (see Prerequisites — Roboflow local setup). When added, insert proxy between client and Roboflow box; Firebase unchanged.

**Gaps vs full spec (for roadmap):** **Full** video decode (frame-accurate pipeline beyond thumbnails + `takePhoto` stills); **Roboflow API key** still client-side until a proxy/Function exists. **Done in app:** **Live** ~1 FPS **native** back camera (`react-native-vision-camera`), **MP4** clip → ~1s JPEG thumbnails + sequential scan (`react-native-compressor` + `react-native-create-thumbnail`), device **camera + gallery** (`react-native-image-picker`), officer queue, Storage + Roboflow on local URIs, remote demo mock for stills, dedup, challan PDF + retention + cleanup script.

---

## 4. Firestore and Storage — blueprint

- [x] **Collections + ACLs** — Top-level `traffic_rules`, `intake_sessions`, `candidates`, `challans` (plus existing `users` / `violations`) in [`firestore.rules`](../firestore.rules) per `PROJECT_DOCUMENTATION.md` access model; TS shapes in [`src/types/challanBlueprint.ts`](../src/types/challanBlueprint.ts); collection ids in [`src/config/collections.ts`](../src/config/collections.ts). **Deploy:** `firebase deploy --only firestore:rules` from repo root (Firebase CLI logged in).
- [x] **Composite indexes** — [`firestore.indexes.json`](../firestore.indexes.json): officer candidate queue (`officerId` + `status` + `createdAt`), admin-style candidate listing (`status` + `createdAt`), challan history (`officerId` + `confirmedAt`), intake sessions (`officerId` + `startedAt`). Single-field `expiresAt` on `challans` is auto-indexed for TTL-style cleanup queries. **Deploy:** `firebase deploy --only firestore:indexes`.
- [x] **Storage paths + rules** — [`storage.rules`](../storage.rules): `candidates/{officerId}/**`, `challans/{officerId}/**`, `sessions/{officerId}/{sessionId}/frames/{fileName}`; builders in [`src/config/storagePaths.ts`](../src/config/storagePaths.ts). [`firebase.json`](../firebase.json) references `storage.rules`. Evidence uploads set **Storage `contentType`** from the image picker when present (PNG/WebP vs JPEG) so rules’ `image/*` match stays accurate. **Deploy:** `firebase deploy --only storage`; enable Storage in Console if not already.

---

## 5. Security rules

- [x] **Deny-by-default Firestore** — Documented in [`firestore.rules`](../firestore.rules); only listed collections are exposed; add new `match` blocks as features ship.
- [x] **Candidates** — Related **approved** officer (`officerId == auth.uid`) **or** **admin**; see `canAccessOfficerRecord` in [`firestore.rules`](../firestore.rules).
- [x] **Challans** — Confirming officer (same `officerId` model) **or** **admin**; delete challan: **admin** only.
- [x] **`users` role / approval** — Client **create**: self only, `role == 'officer'` and `approved == false`. **Self-update**: cannot change `role` or `approved`; **admin** may update any user (promotion / approval). See [`firestore.rules`](../firestore.rules).
- [x] **Storage** — [`storage.rules`](../storage.rules): same officer/admin model via `canAccessOfficerPrefix` + Firestore user doc; image/PDF type checks; MB limits per path class.
- **Not in scope for now:** App Check on Cloud Functions (enable when callable/proxy exists).

---

## 6. Phased implementation — TODO by phase

### Phase 0 — Skeleton

- [x] React Native app baseline; lint/format present in repo.
- [x] TypeScript baseline (`tsconfig.json`, typings).
- [x] `.env` pattern via `react-native-dotenv` + [`.env.example`](../.env.example); `.gitignore` excludes `.env`.
- [x] **Redux + persist** — `@reduxjs/toolkit`, `react-redux`, `redux-persist`, `@react-native-async-storage/async-storage`; [`src/store`](../src/store/) with `PersistGate` in [`App.tsx`](../src/App.tsx); see [`STATE_MANAGEMENT.md`](./STATE_MANAGEMENT.md).

**Exit:** app runs on emulator/device.

### Phase 1 — Firebase foundation

- [x] Integrate `@react-native-firebase/app`, `auth`, `firestore`, **`storage`** (see `package.json`).
- [x] Implement Storage **uploads/downloads** and **Security Rules** for `candidates/` and `challans/` paths per implementation plan §4 — rules in [`storage.rules`](../storage.rules), object path builders in [`src/config/storagePaths.ts`](../src/config/storagePaths.ts), upload/download helpers in [`src/services/storageEvidence.ts`](../src/services/storageEvidence.ts), and authenticated wrappers in [`src/context/AppContext.tsx`](../src/context/AppContext.tsx).
- [x] Email/password auth + first-login `users/{uid}` document (verified against app flow / seed script) — [`ensureUserProfile`](../src/context/AppContext.tsx) backfills missing profile on login and registration writes default officer profile; dev seed script writes Firestore profile in [`scripts/seed-static-user.cjs`](../scripts/seed-static-user.cjs).
- [x] Firestore rules file in repo ([`firestore.rules`](../firestore.rules)); **deploy** to your Firebase project and tighten when new collections land.

**Exit:** sign-in + one guarded read/write smoke test.

### Phase 2 — Roles and navigation

- [x] Auth gate; role-based stacks (officer vs admin) — `RootNavigator` enforces login/approval gate; `DrawerNavigator` now registers role-specific screens per user role to prevent direct navigation into missing-role routes.
- [x] Officer: intake entry points + candidate queue + rules reader — capture/history tabs + new [`CandidateQueueScreen`](../src/screens/CandidateQueueScreen.tsx) and existing [`DetectionRulesScreen`](../src/screens/DetectionRulesScreen.tsx).
- [x] Admin: + rule editor + all challans + user role maintenance if needed — new [`ManageRulesScreen`](../src/screens/ManageRulesScreen.tsx), [`AllChallansScreen`](../src/screens/AllChallansScreen.tsx), and existing [`ApproveOfficersScreen`](../src/screens/ApproveOfficersScreen.tsx).
- [x] Create `sessionId` when starting upload/live/video session — `createIntakeSession` in [`AppContext`](../src/context/AppContext.tsx) writes `intake_sessions/{sessionId}`; `CaptureScreen` now creates a session when starting capture/upload detection.

**Exit:** menus differ by role; deep links cannot bypass role.

### Phase 3 — Roboflow integration layer

- [x] **HTTP dependency** — `axios` installed; hosted detect helper [`src/services/roboflowHostDetection.ts`](../src/services/roboflowHostDetection.ts) (`runRoboflowHostDetection`, per-project `ROBOFLOW_VERSION_*` in [`.env.example`](../.env.example)).
- [ ] Implement proxy `runInference` (image + `modelKind` or `projectId`) — optional; recommended before store release.
- [ ] Read `ROBOFLOW_API_KEY` from server secret only (recommended) — current helper reads `@env` (dev/FYP only if key is in app bundle).
- [x] **Env → project routing** — seatbelt / plate / phone / helmet map to `ROBOFLOW_PROJECT_*` in the helper.
- [x] Parse detections → typed predictions — [`parseRoboflowDetectPredictions`](../src/services/roboflowViolationPolicy.ts) + trigger helpers (extend with UI wiring / thresholds as needed).
- [x] Per-class confidence thresholds file — [`src/config/roboflowThresholds.ts`](../src/config/roboflowThresholds.ts) with model defaults + class overrides.
- [x] **Request timeout** — 60s default on axios call; add retries / UX polish as needed.

**Exit:** one JPEG returns boxes in a debug screen. **Current implementation:** local image URIs in [`CaptureScreen`](../src/screens/CaptureScreen.tsx) use orchestration via [`analyzeLocalImageForViolations`](../src/services/roboflowOrchestrator.ts); remote sample URLs stay in demo fallback until real camera/upload source is wired.

### Phase 4 — Still image pipeline

- [x] Capture → violation project(s) orchestration wired for local image URIs via [`analyzeLocalImageForViolations`](../src/services/roboflowOrchestrator.ts) in [`CaptureScreen`](../src/screens/CaptureScreen.tsx). Device **camera + gallery** via [`nativeImageCapture.ts`](../src/services/nativeImageCapture.ts) (JPEG quality `0.9` in picker options). Remote demo URLs remain mock inference.
- [x] No violation → discard frame; no cloud writes (implemented in `CaptureScreen` save handler).
- [x] Violation → run plate project and create `candidates` doc — plate model triggered in orchestration; candidate write in [`AppContext.createCandidate`](../src/context/AppContext.tsx) with evidence upload and plate box metadata. (Plate bitmap crop file generation remains pending; currently stores plate box coordinates.)

**Exit:** matches `PROJECT_DOCUMENTATION.md` §11.1.

### Phase 5 — Video + live @ 1 FPS

- [x] MP4 → JPEG frames @ ~1s spacing + sequential sampler — [`extractApprox1FpsJpegUrisFromVideo`](../src/services/extractVideoFrames.ts) uses `react-native-compressor` (`getRealPath`, `getVideoMetaData`) + `react-native-create-thumbnail`; [`createSequentialFrameProvider`](../src/services/videoFrameIterator.ts); [`frameSampler`](../src/services/frameSampler.ts) stops when the iterator returns `null`. **Limits:** thumbnail-based frames (not full decoder); max clip length capped in code.
- [x] Live camera sampler ~1 FPS; start/stop UX. (`CaptureScreen` full-screen live modal: **VisionCamera** back sensor, `takePhoto` @ ~1 FPS, `exhaustWhenNull: false` on sampler; MP4 path uses extracted JPEGs.)
- [x] Each frame: violations → plate if positive → dedup gate. (`CaptureScreen` live loop runs frame inference/orchestration and candidate-save path; dedup gate integration point is [`evaluateDedupGate`](../src/services/dedupGate.ts), currently Phase-5 placeholder returning `create` until Phase 6 logic lands.)

**Exit:** §11.2, §11.1a, §11.3 satisfied.

### Phase 6 — Deduplication engine

- [x] `buildViolationSignature(sorted labels)` — implemented in [`src/services/dedupGate.ts`](../src/services/dedupGate.ts).
- [x] Merge path (60 s window) updating evidence on existing candidate — `evaluateDedupGate` returns `merge` with `existingCandidateId`; `CaptureScreen` reuses candidate id and `createCandidate` performs merge-aware updates (`mergeCount`, `mergedAt`, `updatedAt`).
- [x] Suppress path (90 s post-confirm + signature + normalized plate) — cooldown map + `markChallanConfirmed` implemented in [`src/services/dedupGate.ts`](../src/services/dedupGate.ts) for officer-confirm flow integration.
- [x] Create path; `dedupDecision` field — candidate writes now include `dedupDecision` + `dedupSignature` in [`AppContext.createCandidate`](../src/context/AppContext.tsx).
- [x] Unit tests for rule ordering §11.4 — [`__tests__/dedupGate.test.ts`](../__tests__/dedupGate.test.ts), passing.

**Exit:** synthetic sequence proves merge + suppress.

### Phase 7 — Officer confirmation

- [x] Candidate UI: `violationTypes[]`, images, plate field, confirm button — implemented in [`src/screens/CandidateQueueScreen.tsx`](../src/screens/CandidateQueueScreen.tsx) (plus discard action).
- [x] Transaction: upload final assets to `challans/` paths; write `challans` with `confirmedAt`, `expiresAt`, `confirmationOfficerId` — candidate confirmation clones candidate assets into `challans/{officerId}/{challanId}/...` via [`cloneStorageObjectToChallan`](../src/services/storageEvidence.ts), then writes challan doc fields in Firestore transaction.
- [x] Close/update `candidates` lifecycle — candidate status transitions to `confirmed` (or `discarded`), with challan linkage + timestamps in queue screen actions.
- [x] Queries: officer sees own confirmed; admin sees all — officer view [`MyChallansScreen`](../src/screens/MyChallansScreen.tsx) (`where('officerId','==',uid)`), admin view [`AllChallansScreen`](../src/screens/AllChallansScreen.tsx).

**Exit:** ACL matches §7 / §18.

### Phase 8 — PDF + retention

- [x] Generate PDF (prefer Cloud Function); upload to Storage; link in `challans` — current RN implementation builds lightweight PDF payload in [`src/services/challanPdf.ts`](../src/services/challanPdf.ts), uploads to `challans/{officerId}/{challanId}/challan.pdf` via [`uploadChallanPdfFromBase64`](../src/context/AppContext.tsx), and stores `challanPdfRef` on challan documents during confirmation.
- [x] Scheduler + job: delete or expire past `expiresAt` (Storage + Firestore) — admin cleanup job script [`scripts/cleanup-expired-challans.cjs`](../scripts/cleanup-expired-challans.cjs) removes expired challans + related storage refs (`evidenceImageRef`, `plateCropRef`, `challanPdfRef`); wired as `npm run cleanup:expired` (set from Cloud Scheduler/cron in deployment).

**Exit:** 7-day rule from `confirmedAt` enforced.

### Phase 9 — Information mode

- [x] Read `traffic_rules` in app — [`DetectionRulesScreen`](../src/screens/DetectionRulesScreen.tsx) now reads active rules from Firestore in real time and renders them for officers/admins.
- [x] Admin CRUD with validation — [`ManageRulesScreen`](../src/screens/ManageRulesScreen.tsx) now supports create/update/delete/toggle-active with validation (required fields, min/max lengths, duplicate-title checks).

**Exit:** admin edit visible to officer without reinstall.

### Phase 10 — Hardening

- [x] Rate-limit / backoff on proxy under burst frames — hosted inference client now uses retry + exponential backoff (429/5xx/network) in [`src/services/roboflowHostDetection.ts`](../src/services/roboflowHostDetection.ts). (Proxy path remains deferred.)
- [x] Security audit checklist (no client key, rules OK) — checklist document added: [`docs/SECURITY_AUDIT_CHECKLIST.md`](./SECURITY_AUDIT_CHECKLIST.md).
- [ ] Acceptance matrix documented and signed — matrix created at [`docs/ACCEPTANCE_MATRIX.md`](./ACCEPTANCE_MATRIX.md); supervisor signature still pending.
- [x] Demo script + offline fallback video — runbook added: [`docs/DEMO_SCRIPT_AND_OFFLINE_FALLBACK.md`](./DEMO_SCRIPT_AND_OFFLINE_FALLBACK.md).
- [x] Preflight validation command — `npm run preflight` checks critical files, env hygiene, and setup docs via [`scripts/preflight-check.cjs`](../scripts/preflight-check.cjs); passed locally.

**Exit:** defense-ready.

---

## 7. Parallel tracks (coordination)

- [x] Track A: Firebase rules + schema.
- [ ] Track B: Roboflow proxy + project routing table. (**Deferred** in current phase; direct hosted calls used.)
- [x] Track C: RN UI/navigation.
- [x] Track D: media + FPS + dedup. (**Current state:** native live ~1 FPS `takePhoto` + MP4→JPEG scan + dedup.)
- [x] Track E: PDF + scheduler. (PDF + cleanup job script done; scheduler wiring pending in deployment.)

---

## 8. Definition of Done — checklist

- [ ] All modes per `PROJECT_DOCUMENTATION.md` §6.2 / §11.
- [x] Roboflow projects: seatbelt, plate, phone, helmet IDs wired and verified.
- [x] No production Roboflow key in client binary (proxy or acceptable FYP exception documented). (FYP exception + deferred proxy documented in prerequisites/security sections.)
- [x] Dedup observable (`dedupDecision`).
- [ ] Retention job verified.
- [ ] Negative path leaves no stored media.
- [ ] Supervisor sign-off on acceptance matrix.

---

## 9. Open decisions (pick and tick)

- [x] PDF: on-device vs Cloud Function — **on-device for current phase** (see Phase 8); revisit Function path for production.
- [x] Always create `sessionId` for still capture (recommend yes for dedup).
- [x] **iOS scope** — explicitly **deferred**; Android-only until you reopen iOS.

---

## 10. Traceability (`PROJECT_DOCUMENTATION.md` → phases)

| Spec section | Phases |
| ------------ | ------ |
| §6 modes / violations | 4, 5, 9 |
| §8–§9 Roboflow | 3 (+ prerequisites table) |
| §10 modules | 4–9 |
| §11 workflows + §11.4 dedup | 4–6 |
| §13 data model | 1, 6, 7 |
| §14 storage + retention | 1, 7, 8 |
| §18 security | 1, 2, 7, 10 |

---

*Last updated: phases 0-10 implemented in repo scope with documented deferred items (proxy, full MP4/native live source, supervisor sign-off).*
