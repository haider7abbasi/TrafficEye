# TrafficEye — documentation index

Start here, then open the linked files in `docs/` or the repo root.

| Document | Purpose |
| -------- | ------- |
| [docs/PROJECT_DOCUMENTATION.md](docs/PROJECT_DOCUMENTATION.md) | Full project-level system description (stakeholder / academic). |
| [docs/DETAILED_IMPLEMENTATION_PLAN.md](docs/DETAILED_IMPLEMENTATION_PLAN.md) | Implementation checklist, phases, Firebase + Roboflow alignment. |
| [docs/PROCESSING_FLOWS.md](docs/PROCESSING_FLOWS.md) | Car / bike / seatbelt / helmet / mobile IF–THEN rules + link to `violationProcessingFlow.ts`. |
| [docs/STATE_MANAGEMENT.md](docs/STATE_MANAGEMENT.md) | Redux vs `AppContext` / Firebase boundaries. |
| [docs/FIREBASE_REQUIREMENTS.md](docs/FIREBASE_REQUIREMENTS.md) | Firebase + Android wiring requirements. |
| [docs/RELEASE_GO_NO_GO.md](docs/RELEASE_GO_NO_GO.md) | Demo / release blocking checks. |
| [docs/ACCEPTANCE_MATRIX.md](docs/ACCEPTANCE_MATRIX.md) | Acceptance criteria table. |
| [docs/DEMO_SCRIPT_AND_OFFLINE_FALLBACK.md](docs/DEMO_SCRIPT_AND_OFFLINE_FALLBACK.md) | Demo flow + offline fallback plan. |
| [docs/DEMO_CONSENT_AND_VENUE_RULES.md](docs/DEMO_CONSENT_AND_VENUE_RULES.md) | Demo consent / venue draft. |
| [docs/SECURITY_AUDIT_CHECKLIST.md](docs/SECURITY_AUDIT_CHECKLIST.md) | Pre-release security checklist. |
| [android/FIREBASE_SETUP.txt](android/FIREBASE_SETUP.txt) | Android Firebase checklist (SHA, Console). |
| [README.md](README.md) | React Native CLI getting started (generic). |

**Firebase deploy (repo root):** `firebase.json`, `firestore.rules`, `firestore.indexes.json`, `storage.rules` — use `npm run firebase:deploy` after `firebase login`.
