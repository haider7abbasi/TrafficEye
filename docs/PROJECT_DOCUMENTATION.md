# Automated Traffic Violation Detection System (TrafficEye)

## 1. Document Purpose

This document presents the complete project-level documentation for the TrafficEye system. It is written in a descriptive format for academic and stakeholder understanding, not as a code implementation plan. The goal is to clearly explain what the system is, why it is needed, how it works functionally, which technologies it uses, what modules it contains, who uses it, what data it handles, and what outcomes it produces.

The project focuses on automating common traffic violation detection tasks that are normally dependent on manual checking and human observation. By using AI-supported visual analysis and structured officer verification, the system aims to make traffic enforcement faster, more consistent, and better documented.

---

## 2. Project Title

Automated Traffic Violation Detection System (TrafficEye)

---

## 2.1 Currency Standard

All monetary values, cost estimates, and financial references in this project documentation are expressed in **PKR (Pakistani Rupee)**.

---

## 3. Abstract

Traffic violations are a major cause of road accidents and public safety risks. Traditional monitoring methods rely on human operators, CCTV review, and manual reporting, which are often slow and inconsistent. Due to fatigue, workload, and limitations in continuous attention, human-centered systems may miss critical violations.

TrafficEye addresses this challenge through an automated detection and reporting platform. The system supports camera-based capture, uploaded media analysis, and live monitoring workflows. It detects selected violations and guides an officer through a structured confirmation process before final record generation.

When a violation is identified, the system extracts relevant evidence, performs number plate localization, enables officer confirmation, and stores the finalized record in Firebase. Challan records are retained for a fixed short period (7 days), enabling operational follow-up while avoiding unnecessary long-term storage.

---

## 4. Problem Statement

Traffic rule violations such as seatbelt neglect, helmet neglect, and mobile phone use while driving are common and difficult to monitor continuously using manual processes. Existing operations face the following practical issues:

- continuous human monitoring is resource-intensive,
- manual logging is slow and error-prone,
- response time is delayed,
- enforcement quality varies from one observer to another,
- evidence management is often inconsistent.

A standardized automated process is required to detect, verify, and record violations in a repeatable and reliable manner.

---

## 5. Project Objectives

The project objectives are:

1. To detect selected traffic violations from image sources, with video inputs converted into static frames before detection.
2. To support three **detection intake** modes: camera capture, file upload, and live monitoring, plus a separate **information** mode for traffic rules and violation reference content (see Section 6.2).
3. To assist officers through a verification interface before finalizing a challan.
4. To capture and retain structured evidence records for enforcement use.
5. To improve consistency, speed, and transparency in violation handling.
6. To provide in-app traffic rules/regulations and violation details for user awareness and officer decision support.

---

## 6. Scope of the System

### 6.1 In-Scope Violations

- No seatbelt
- No helmet
- Mobile phone use while driving
- Calling on phone while driving
- Texting on phone while driving
- Number plate detection for challan association

### 6.2 In-Scope Functional Modes

- **Capture mode:** capture photo/video from mobile or system camera.
- **Upload mode:** upload image or MP4 video for analysis.
- **Live monitoring mode:** process live camera feed with frame sampling.
- **Information mode:** provide in-app traffic rules/regulations and violation detail reference content.

### 6.3 Out-of-Scope (Current Version)

- Automatic legal fine payment integration
- National-level centralized vehicle registry integration
- Long-term archival storage beyond configured retention policy
- Fully automated challan issuance without officer confirmation

---

## 7. Stakeholders and User Roles

### 7.1 Admin

The admin role governs platform-level control and supervision. Admin panels are already established in the project and are considered available for operational management. Admin also has access to update in-app Traffic Rules and Violation Details content so policy and guidance information remains current. For challans, **admin can view and manage all challan records** across the system (subject to security rules and audit policy).

### 7.2 Officer

The officer is the core verification actor in the workflow. Officers review detected violations, inspect violation evidence, confirm/edit number plate information, and approve final challan records.

**Related officer (intake session):** For each capture, upload, or live-monitoring session, the system associates a **related officer**—the authenticated officer who started that session (who is logged in while performing capture, upload, or live monitoring). This identity is used for visibility of **candidate** violations before final confirmation.

**Visibility before confirmation:** Candidate violation cases (not yet confirmed as a challan) are visible to **Admin** and to the **related officer** for that session only—not to every officer in the system.

**Visibility after confirmation:** Once a challan is confirmed, **each officer can only view and manage their own confirmed challan records**—cases where their officer ID matches the **confirmation** action. They cannot access another officer’s confirmed cases unless an admin workflow grants it.

### 7.3 System

The system performs media intake, detection processing, violation classification, plate region extraction, and record persistence.

---

## 8. Technologies Used

This section lists the principal technologies and platforms TrafficEye relies on. It is descriptive: versions may change with project maintenance; the stack category remains the same.

### 8.1 Client application (mobile)

- **React Native** — cross-platform mobile application framework for Android and iOS targets.
- **React** — UI layer used by React Native.
- **TypeScript / JavaScript** — application source language (project uses TypeScript configuration where applicable).
- **React Navigation** — in-app navigation (stack, drawer, and tab patterns as required by screens).
- **Redux Toolkit** — structured client state for **device-only** preferences (for example notification and appearance toggles).
- **Redux Persist** with **AsyncStorage** — persists selected Redux slices locally on the phone; **not** used for Firebase credentials or authoritative case data (those remain in Firebase). See [`docs/STATE_MANAGEMENT.md`](./STATE_MANAGEMENT.md).
- **react-native-compressor** / **react-native-create-thumbnail** — local MP4 handling: resolve file paths, read duration, and generate JPEG thumbnails at chosen timestamps for the ~1 FPS analysis path.
- **react-native-vision-camera** — native camera preview and periodic photo capture for the live ~1 FPS monitoring workflow.

### 8.2 Backend and persistence (Firebase)

- **Google Firebase** — primary backend integration.
  - **Firebase Authentication** — email and password sign-in for admins and officers.
  - **Cloud Firestore** — structured documents for challans, candidates, sessions, and metadata.
  - **Firebase Storage** — binary assets such as violation images, cropped plate images, and challan PDFs (referenced from Firestore).
- **@react-native-firebase** packages — native bridge modules connecting the app to Firebase services (for example App, Auth, Firestore; Storage when enabled in the build).

### 8.3 Artificial intelligence and computer vision

- **Roboflow** — dataset and workflow platform for object detection models.
- **Roboflow hosted inference API** — server-side prediction using a **Roboflow API key**; violation and number-plate models run on **Roboflow infrastructure** (see Section 9.1).

### 8.4 Supporting tooling (development and operations)

- **Node.js** — tooling and scripts (for example Metro bundler, project scripts).
- **Android / iOS native build chains** — Gradle, Xcode, and platform SDKs required to compile and run React Native on devices or emulators.
- **Version control** — Git (recommended for team collaboration and thesis submission artifacts).

---

## 9. High-Level System Description

TrafficEye is an AI-assisted traffic monitoring application with structured human-in-the-loop validation. It combines:

- media input interfaces,
- detection APIs/models,
- officer confirmation panel,
- Firebase Authentication for secure user login,
- Cloud Firestore for structured case data,
- Firebase Storage for images and document files,
- temporary challan retention for enforcement use.

The platform is designed so that AI identifies candidate violations, while officers retain final confirmation authority before record finalization.

### 9.1 Detection inference (Roboflow hosted API)

TrafficEye uses **Roboflow’s hosted inference servers** for object detection. The client (mobile app or a thin backend proxy) sends each image or frame to the **Roboflow model API**, authenticated with a **Roboflow API key**. Inference executes on **Roboflow infrastructure**; models are not bundled inside the app binary for on-device inference in this documented configuration.

Returned data includes detection labels, confidence scores, and bounding boxes, which the app uses for violation logic, plate cropping, and officer review.

*Self-hosted or exported-model deployment is out of scope for this documentation unless explicitly added later.*

### 9.2 Recommended practices (API and operations)

The following practices support reliable demos and safer operation when using **Roboflow cloud + 1 FPS** sampling. **Deduplication** is not optional here: the mandatory flow is defined in **Section 10.2a** and **Section 11.4**.

1. **API key protection:** Do **not** embed the Roboflow API key in public app builds if the binary can be extracted. Prefer a **small backend** or **Firebase Callable Function** that holds the key and forwards inference requests, or restrict keys in Roboflow to minimum required scopes and rotate if leaked.
2. **Rate limits and cost:** Each frame at 1 FPS triggers API calls (violation model and possibly plate model). For long live sessions, enforce **session limits**, **user confirmation to start/stop**, and monitor Roboflow usage quotas.
3. **Image payload size:** Resize or compress frames before upload to Roboflow to reduce latency, timeouts, and bandwidth (especially on mobile data).
4. **Offline behavior:** If the Roboflow API is unreachable, the app should show a clear error and **not** create partial Firebase records without successful inference policy (define explicitly in implementation).
5. **Logging:** Store **request IDs or timestamps** on candidate records for debugging, without logging raw API keys.

---

## 10. Core Functional Modules

### 10.1 Media Intake Module

Handles incoming traffic evidence through:

- image capture,
- video capture,
- image upload,
- MP4 upload,
- live camera stream.

### 10.2 Frame Sampling and Preprocessing Module

Normalizes media for detection by preparing frames in a consistent format. The current detection models support **images only**, so any video input is first converted into static frames. For video/live modes, the system samples at **1 frame per second (1 FPS)** to maintain manageable processing behavior while preserving temporal coverage.

**Repeated detections at 1 FPS (why this matters):** Live monitoring and video produce **many frames per minute**. The same vehicle may appear in consecutive sampled frames, so the model might flag similar violations repeatedly. TrafficEye addresses this with a **mandatory deduplication flow** (Sections **10.2a** and **11.4**), not ad-hoc filtering.

### 10.2a Deduplication module (mandatory)

Purpose: reduce duplicate **candidate** cases and duplicate **confirmed** noise from consecutive 1 FPS frames while keeping a clear audit trail.

**Inputs:** `sessionId` (intake session identifier), `relatedOfficerId`, detected violation class list for the current frame, timestamps, and—once available—**normalized confirmed plate** from a prior confirmation in the same session.

**Violation signature:** A stable key built from the **sorted set** of violation class identifiers detected on **one** frame (matches “one challan per frame” grouping before confirmation).

**Parameters (defaults for project documentation; tunable in implementation):**

- **T_merge = 60 seconds** — pending-candidate merge window.
- **T_cooldown = 90 seconds** — post-confirmation suppression window.

**Rules (applied in order after a positive detection on a frame):**

1. **Merge (pending queue):** If a **candidate** document already exists for this `sessionId` with status `pending_officer_confirmation`, the **same violation signature**, and `createdAt` (or `lastUpdatedAt`) within **T_merge**, then **do not** create a second candidate. Instead **merge into the existing candidate** by refreshing evidence (for example, update stored violation frame / plate crop pointers and `lastEvidenceAt`) so the officer keeps a **single** queue item with the freshest imagery.

2. **Suppress (post-confirmation cooldown):** If a **confirmed** challan exists for this `sessionId` with the **same violation signature** and the **same normalized confirmed plate** (after officer confirmation), and `confirmedAt` is within **T_cooldown**, then **suppress** the new event: do not create a new candidate and discard the duplicate frame evidence per the no-retention path for non-queued duplicates.

3. **Plate not yet known during cooldown:** If the newest event would match rule 2 by signature but **no** confirmed plate exists yet on the prior confirmed record (edge case), apply suppression for **same signature within T_cooldown** after confirmation using **sessionId + violationSignature** only for that edge window (implementation should still prefer plate match when available).

4. **Otherwise create:** Create a **new** candidate record for officer review.

**Audit fields (recommended on each detection handling step):** `dedupDecision` with values such as `created`, `merged`, or `suppressed`, plus `violationSignature` and `sessionId` on the candidate or on a companion log document.

### 10.3 Violation Detection Module

Uses **Roboflow object detection models** to analyze images/frames and identify:

- no-seatbelt violations,
- no-helmet violations,
- phone-use violations while driving (general phone use),
- calling while driving,
- texting while driving.

Detected events are treated as candidate violations pending officer verification.

**Multiple violation classes in one frame:** If more than one violation type is detected on the **same** evidence frame (for example, no seatbelt and phone use), the system produces **one challan** for that event. The record carries **all applicable violation types** for that frame (and one plate confirmation, one evidence bundle, one PDF). Officers see a combined classification, not separate challans per class for the same frame.

### 10.3a Roboflow class trigger rules (reference)

These labels must match the Roboflow model outputs (case-sensitive). Enforcement logic in the app uses the same strings (see `src/services/roboflowViolationPolicy.ts`).

1. **Seatbelt:** Challan when class **`no-seatbelt`** is detected above confidence threshold; ignore compliant **`seatbelt`** unless **`no-seatbelt`** is also present (violation takes precedence).

2. **Helmet:** Challan when class **`Without Helmet`** is detected; ignore **`With Helmet`** when it is the only helmet-related class above threshold.

3. **Mobile phone:** Challan when **any** of **`using_phone`**, **`calling_phone`**, or **`texting_phone`** is detected. **`phone_in_hand` alone** does **not** trigger a challan; if it appears together with one of the three violation classes, the violation still fires.

4. **Number plate (Option 1):** The system crops the image to the detected plate bounding box (best-confidence box from the plate model), shows the **cropped plate image** to the officer, the officer **manually types** the registration, then **confirms** the challan (no OCR-only auto plate text as the authority of record).

### 10.4 Number Plate Detection Module

When any violation is detected, the system triggers the **Roboflow number plate detection model**. The model locates the number plate region; the app derives a **pixel crop rectangle** for display and evidence. The cropped plate image is shown to officers for confirmation support, with **manual plate entry** per Option 1 in section 10.3a.

### 10.5 Officer Verification Module

Presents:

- violation type or **list of violation types** (when multiple apply on the same frame),
- violation frame/evidence image,
- cropped number plate image,
- plate input/confirmation field.

The officer verifies the event and confirms final record creation. In this step, the officer manually enters or corrects the plate number and then confirms the challan before final save.

### 10.6 Challan Generation and Persistence Module

After officer confirmation, the system generates a finalized record, prepares challan output (including PDF representation), and stores data in Firebase under the retention policy.

### 10.7 Traffic Rules and Violation Details Module

The app includes a dedicated informational section that presents traffic rules, regulations, and violation descriptions in a readable format. This module supports both awareness and operational consistency.

Access control for this module is role-based: admins can update this content, while other users can view it according to their permissions.

The in-app content should include:

- rule title and short legal description,
- what is considered compliant behavior,
- what is considered a violation condition,
- practical examples for each violation type,
- officer-facing notes for confirmation context.

For each tracked violation type (no seatbelt, no helmet, phone use/calling/texting), the app should show the rule summary and corresponding violation detail so that users and officers can understand why a detection is classified as a violation.

---

## 11. Detailed End-to-End Workflows

### 11.1 Capture Image Workflow

1. User captures an image.
2. Image is sent to detection APIs.
3. If no violation is found, flow ends with no challan and the temporary stored image is deleted.
4. If violation is found, officer review is opened.
5. Number plate detection model runs automatically and returns cropped plate object.
6. Officer sees violation type + cropped plate + evidence image.
7. Officer manually enters/confirms plate number.
8. Officer clicks confirm challan.
9. Record is saved in Firebase.
10. The **7-day** retention period for that challan **starts from officer confirmation time** (see Section 14.2).

### 11.1a Capture Video (Camera) Workflow

1. User records video with mobile or system camera.
2. Video is converted to static frames at **1 FPS** (models accept images only).
3. Each sampled frame is sent to detection APIs (same logic as upload video).
4. Frames with no violation are discarded/deleted after processing.
5. Run **deduplication flow** (Section 11.4): merge, suppress, or create candidate; only if **created** or **merged** does the case proceed to officer queue update.
6. For each **new or merged** candidate violation frame, officer confirmation remains or opens (visible to **Admin** and **related officer** for the session).
7. If multiple violation types appear on the **same** frame, they are combined into **one challan** for that frame.
8. After confirm, record is saved; **7-day** retention counts from **confirmation time**.

### 11.2 Upload File Workflow

1. User uploads image or MP4 file.
2. If file is image, process directly.
3. If file is MP4, convert video into static image frames at 1 FPS (because models process images, not raw video).
4. Send each relevant frame to detection APIs.
5. Frames/images with no violation result are deleted after processing.
6. For each positive detection on a frame, run **deduplication flow** (Section 11.4) before officer review.
7. For each **created** or **merged** candidate, officer confirmation flow applies (visible to **Admin** and **related officer**).
8. Store confirmed challan records; **7-day** retention starts at **confirmation time**.

### 11.3 Live Monitoring Workflow

1. User starts live monitoring from mobile camera.
2. Stream is sampled at 1 FPS.
3. Each sampled frame (static image) is analyzed for violation detection.
4. Frames with no detected violation are discarded/deleted after processing.
5. For each positive detection, run **deduplication flow** (Section 11.4); suppressed duplicates do not open a new officer task.
6. For **created** or **merged** candidates, prepare evidence and plate crop (visible to **Admin** and **related officer**).
7. Officer confirms and finalizes challan records.
8. Confirmed records are stored; **7-day** retention starts at **confirmation time**.

### 11.4 Deduplication flow (reference sequence)

This sequence runs **after** violation detection succeeds on a frame and **before** creating or updating officer-visible candidates (live, uploaded video, or camera-recorded video paths):

1. Compute **violationSignature** from the sorted violation classes on this frame.
2. Load session context: **`sessionId`**, **`relatedOfficerId`**, latest **pending** candidate for this session (if any), latest **confirmed** challan for this session (if any).
3. **If** a pending candidate exists with the same `violationSignature` and is within **T_merge** → **MERGE**: update that candidate’s evidence references and timestamps; set `dedupDecision = merged`; **stop** (no new document).
4. **Else if** a confirmed challan exists with the same `violationSignature`, same **normalized confirmed plate**, and `confirmedAt` within **T_cooldown** → **SUPPRESS**: discard duplicate frame handling per non-retained duplicate policy; set `dedupDecision = suppressed` on internal telemetry if used; **stop**.
5. **Else** → **CREATE**: insert a new candidate record; set `dedupDecision = created`.

Single-image capture (Section 11.1) may skip steps 3–4 when no `sessionId` video/live context exists, or apply the same rules when a session identifier is still used for consistency.

---

## 12. Violation Confirmation Logic

TrafficEye is designed as a semi-automated system. Detection alone does not directly finalize enforcement output. Instead:

- AI flags candidate violations,
- **deduplication** merges or suppresses repeated detections from 1 FPS streams before the officer queue grows unnecessarily,
- number plate detection is executed automatically on detected violation frames,
- officer validates violation evidence and cropped plate object,
- officer manually enters/validates plate number,
- officer confirmation creates the authoritative challan record.

**One challan per evidence frame:** When several violation classes are detected on the same frame, they are merged into **one** challan record listing all applicable types, with a single plate confirmation and one evidence set.

This design reduces false positive enforcement and keeps accountability with authorized personnel.

---

## 13. Data Model (Conceptual)

Each challan or violation case stored in **Cloud Firestore** is described below as a conceptual document. Fields are grouped by purpose.

### Core operational fields (Firestore)

- **Violation type and status** — one or more detected categories on the same frame (for example, no seatbelt and phone use together), encoded as a list or composite field, plus case status in the lifecycle (for example, candidate, pending officer confirmation, confirmed, expired).

- **Timestamp and workflow state** — when the violation was detected or confirmed, and the current workflow step so the app and officers can see whether the case is still awaiting confirmation or already finalized.

- **Officer ID linked to confirmation action** — the authenticated user who confirmed the challan, for accountability and for scoping which officer “owns” the record.

- **Confirmed number plate value** — the plate number after officer entry or correction at confirmation time.

- **References/URLs for stored evidence files** — pointers to files in **Firebase Storage** (for example, violation frame image and cropped plate image), not embedded binary inside Firestore.

- **Challan document reference and expiry-related metadata** — link to the generated challan PDF in Storage and fields that support the **7-day** retention rule. **Retention is measured from officer confirmation time** (`confirmedAt`): expiry is **confirmedAt + 7 days** (or equivalent stored `expiresAt`).

### Traceability fields (recommended)

- **Record ID** — stable unique identifier for the document.

- **Session ID** — intake session identifier used for deduplication and for binding the **related officer**.

- **Violation signature** — sorted violation-class key used by the deduplication module (Section 10.2a).

- **Dedup decision** — `created`, `merged`, or `suppressed` for auditability when handling frames.

- **Source type** — how media entered the app: capture, upload, or live monitoring (helps interpret the evidence chain).

- **Input type** — whether the underlying intake was **image** or **video** (video is converted to static frames before detection). This complements source type: source answers *which feature* was used; input type answers *whether the original media was still imagery or time-based footage*.

The model is intentionally audit-oriented so each challan can be traced to evidence, confirmation action, and retention policy. **Candidate** cases: readable by **Admin** and the **related officer** (session officer). **Confirmed** cases: **officers** read/update only their own confirmed records (officer ID on confirmation); **admins** may read and manage all documents according to policy and security rules.

---

## 14. Storage and Retention Policy

### 14.1 Database and Files

TrafficEye uses Firebase as the primary backend integration layer. The backend architecture is divided into three services, each with a specific responsibility to keep the system clear, maintainable, and secure.

#### 14.1.1 Firebase Authentication (Email/Password Login)

Firebase Authentication is used for user authentication through email and password login. This service verifies user credentials and establishes an authenticated session before a user can access protected application areas.

In this project context:

- users must sign in with registered email and password,
- authenticated sessions are required for admin/officer panel access,
- officer identity from authenticated account is attached to confirmed violation records,
- unauthenticated users cannot finalize challan workflows.

This ensures that violation confirmation actions are traceable to an authorized account.

#### 14.1.2 Cloud Firestore (Database Layer)

Cloud Firestore is used as the main database for structured application records. It stores operational data such as violation entries, challan metadata, and user-linked activity.

In this project context, Firestore stores:

- violation type and status,
- timestamp and workflow state,
- officer ID linked to confirmation action,
- confirmed number plate value,
- references/URLs for stored evidence files,
- challan document reference and expiry-related metadata.

Firestore is selected because it supports real-time updates, flexible document structures, and clear integration with mobile clients.

**Challan access model:** For **confirmed** challans, queries and security rules should enforce that an **officer** can list and modify only records where the **confirmation officer ID** matches their own authenticated identity. For **candidate** (pre-confirmation) cases, **Admin** and the **related officer** (intake session officer ID stored on the candidate) may access the case. **Admin** can list and manage **all** records. This matches Section 7.

#### 14.1.3 Firebase Storage (Evidence and Document Files)

Firebase Storage is used for file-level storage where binary objects are required. This includes captured violation images, cropped number plate images, and generated challan PDF documents.

In this project context:

- only violation-positive evidence is uploaded and stored as file objects,
- challan PDFs are stored as documents,
- Firestore keeps pointers (URLs/paths) to these files rather than embedding large binary data,
- non-violation temporary images/frames are deleted and are not retained.

This separation between metadata (Firestore) and files (Storage) keeps records lightweight and improves retrieval organization.

#### 14.1.4 Firebase Service Interaction in Finalized Flow

After officer confirmation, the backend interaction sequence is:

1. Officer is verified through Firebase Authentication session.
2. Violation evidence files and challan PDF are stored in Firebase Storage.
3. Structured challan record is written to Firestore with officer ID, plate number, violation type, timestamp, and file references.
4. Retention metadata is applied for 7-day availability handling.

This service separation provides a clean backend model: **Authentication for identity, Firestore for records, Storage for files**.

### 14.2 Retention Rule

Confirmed challan records are retained for **7 days** measured from **officer confirmation time** (the moment the officer clicks confirm and the system writes the finalized record). For example, if confirmation occurs at time T, the challan and linked Storage objects remain active under policy until T + 7 days (subject to automated cleanup jobs). After retention expiry, records are treated as expired according to project policy and no longer considered active operational records.

For negative results (no violation), no challan is generated and no evidence is retained. Any temporary image/frame created during processing is deleted immediately after the no-violation decision.

---

## 15. Expected Outputs

For each confirmed violation, the system provides:

- violation classification label (single type or combined types for one challan),
- evidence frame,
- cropped number plate image,
- officer-confirmed plate number,
- timestamped challan record,
- PDF challan output,
- Firebase-stored case entry (active for 7 days).

In addition to detection outputs, the app provides:

- in-app traffic rules/regulations reference,
- in-app violation detail reference per violation category.

---

## 16. Quality, Accuracy, and Reliability Considerations

System effectiveness depends on:

- camera angle and visibility,
- lighting conditions,
- object occlusion,
- image/frame clarity,
- model confidence threshold tuning.

Operational quality is improved by combining AI detection with officer verification before final save.

---

## 17. Constraints and Risks

Common constraints:

- low-light scenes can reduce detection reliability,
- heavy traffic congestion can increase visual complexity,
- motion blur in fast scenes can affect plate localization,
- model performance depends on dataset quality and variation.

Risk handling approach:

- standardized capture guidance,
- confidence threshold management,
- officer confirmation before finalization,
- iterative model improvement using observed cases.

---

## 18. Security and Governance Notes

- Only authorized users should access admin/officer panels.
- Officer identity should be attached to each confirmed record.
- **Challan visibility:** For **confirmed** challans, officers may only access their own records (matching **confirmation** officer ID). For **candidate** cases, **Admin** and the **related officer** (session officer who started capture/upload/live) may access. Admins may access and manage all challans. Enforce in Firestore security rules and app navigation so officers cannot open another officer’s **confirmed** case by document ID.
- Stored records should follow least-access principles.
- Retention limits reduce unnecessary long-term evidence exposure.

---

## 19. User Experience Summary

TrafficEye is designed to remain simple for field use:

- choose an input source,
- view rules/regulations and violation guidance when needed,
- run detection,
- review candidate violation,
- confirm and save.

The interface prioritizes officer decision flow and evidence visibility over complex controls, enabling fast operational action.

---

## 20. Documentation Coverage Mapping (Required 6-Step Flow)

This document supports the full requested documentation progression:

1. **Planning Abstract for Project** -> covered in Abstract and Problem sections.
2. **Review the Document** -> quality review can be performed against sections 3–9 (through High-Level System Description), including **Section 8 (Technologies Used)**.
3. **Planning Implementation** -> represented as functional modules (Section 10) and workflows (Section 11) in descriptive form.
4. **Review the Document** -> validate consistency of workflows (Section 11), data model (Section 13), and storage policy (Section 14).
5. **Prerequisite Needs for Implementation** -> represented via system, data, and role requirements (including Section 8 and Firebase details in Section 14).
6. **Implementation of Project** -> represented in end-to-end operational narrative (not code-level).

---

## 21. Conclusion

TrafficEye provides a practical, descriptive, and enforceable framework for AI-supported traffic violation handling. By combining three media intake modes, targeted violation detection, number plate evidence extraction, and officer-led confirmation, the system establishes a reliable path from raw visual input to structured challan output.

Its short-term retention policy, role-based flow, and evidence-centered process make it suitable for academic demonstration and real-world pilot environments where transparency, traceability, and consistency are required.
