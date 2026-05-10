# TrafficEye — Release / demo go–no-go

Use this before viva, demo day, or any “release candidate” build. **Go** only when every **blocking** row is satisfied or explicitly waived in writing.

## Blocking (must be green or waived)

| # | Item | How to verify | Owner | Status | Waived by / date |
|---|------|----------------|-------|--------|------------------|
| B1 | Firebase rules + indexes + Storage rules **deployed** to the target project | `firebase deploy --only firestore:rules,firestore:indexes,storage` succeeds; spot-check in Console | | ☐ | |
| B2 | Storage bucket exists; app can **upload** candidate/challan objects on a **physical device** | Confirm flow + evidence visible in Storage | | ☐ | |
| B3 | **Roboflow** works on-device with a **real local image** (`file://` / `content://`) | Capture path hits `analyzeLocalImageForViolations`; no repeated fallback alerts | | ☐ | |
| B4 | **Retention cleanup** scheduled or manually run before demo overflow | `npm run cleanup:expired -- --dry-run` then real run documented | | ☐ | |
| B5 | **Supervisor sign-off** on acceptance matrix + demo policy | `docs/ACCEPTANCE_MATRIX.md` signatures + `docs/DEMO_CONSENT_AND_VENUE_RULES.md` aligned | | ☐ | |

## Non-blocking (known gaps — document for examiners)

| # | Gap | Mitigation for demo |
|---|-----|---------------------|
| N1 | Roboflow API key in app bundle (FYP path) | State deferred proxy in report; rotate key if exposed |
| N2 | MP4 decode + native live camera not finished | Use still capture + live scaffold; show roadmap |
| N3 | PDF is lightweight in-app generator, not Cloud Function | Acceptable for FYP; note production upgrade path |

## Quick commands

```bash
npm run preflight
npm test -- dedupGate.test.ts --watch=false
npm test -- challanPdf.test.ts --watch=false
```

## Decision

- **GO** for demo: ☐ Yes ☐ No  
- **GO** for production: ☐ Yes ☐ No  

**Signed (team):** _________________ **Date:** _________________
