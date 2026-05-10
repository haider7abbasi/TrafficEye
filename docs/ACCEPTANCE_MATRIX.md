# TrafficEye Acceptance Matrix

> Status owner: supervisor + project team.

| Area | Criterion | Evidence | Status | Sign-off |
| --- | --- | --- | --- | --- |
| Auth/roles | Officer/admin access enforced by role and approval state | Login, pending approval, admin-only screens | Implemented (needs supervisor verification) | |
| Capture/still | Violation candidate generated from still image pipeline | Candidate queue record + evidence | Implemented (local URI path; validate on device) | |
| Live 1 FPS | Start/stop live monitoring works without crashes | Live counters + saved records | Implemented scaffold (demo frame provider) | |
| Dedup | Create/merge/suppress behavior matches timing rules | `dedupGate` tests + runtime logs | Unit-tested (runtime validation pending) | |
| Confirmation | Candidate confirms into challan with plate and expiry | Challan record + candidate status transition | Implemented (needs end-to-end demo sign-off) | |
| PDF | Challan PDF generated and linked in storage ref | `challanPdfRef` exists | Implemented (lightweight in-app PDF) | |
| Retention | Expired challans can be cleaned from Firestore + Storage | `cleanup:expired` dry run/output | Script ready (scheduler wiring pending) | |
| Rules mode | Admin edits rules and officer sees update live | Manage Rules + Detection Rules screens | Implemented (live Firestore subscription) | |

## Signatures

- Supervisor:
- Team lead:
- Date:
