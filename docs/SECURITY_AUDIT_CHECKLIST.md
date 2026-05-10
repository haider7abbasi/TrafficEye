# TrafficEye Security Audit Checklist

Use this checklist before demo/release branches.

## Secrets & key handling

- [ ] `ROBOFLOW_API_KEY` is **not** committed to git (`.env` only).
- [ ] `.env.example` keeps `ROBOFLOW_API_KEY=` empty.
- [ ] If key was leaked in chat/issues, key is rotated in Roboflow.
- [ ] If preparing store/production build: use proxy/secret flow instead of device-embedded key.

## Firebase rules

- [ ] Firestore rules deployed from repo (`firestore.rules`) and include deny-by-default stance.
- [ ] Storage rules deployed from repo (`storage.rules`) and path limits/type limits enforced.
- [ ] `users` role/approved escalation is admin-only.
- [ ] Candidate/challan ACL matches officer-own + admin model.

## Data retention

- [ ] `challans` write includes `confirmedAt` and `expiresAt`.
- [ ] `cleanup:expired` job configured (Cloud Scheduler/cron) for expired Storage + Firestore cleanup.
- [ ] Dry run of cleanup job reviewed before production deletion.

## App runtime hardening

- [ ] Roboflow retry/backoff enabled (429/5xx/network) in `roboflowHostDetection`.
- [ ] No crash loops in capture/live flow when inference fails (fallback behavior verified).
- [ ] Offline fallback path prepared for demo.

## Audit notes

- Date:
- Auditor:
- Branch / commit:
- Open risks:
