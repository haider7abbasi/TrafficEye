# TrafficEye Demo Script + Offline Fallback

## Primary demo flow (online)

1. Sign in as officer.
2. Open **Capture** and run one still-image detection.
3. Show candidate created in **Candidate Queue** with evidence + plate entry.
4. Confirm challan from candidate queue.
5. Show challan in **My Challans**.
6. Sign in as admin and show **All Challans** + **Manage Rules** changes reflected in officer **Detection rules** screen.

## Primary talking points

- Violation policy: seatbelt/helmet/phone classes mapped to challan triggers.
- Dedup engine decisions: create/merge/suppress.
- Candidate to challan transaction with 7-day `expiresAt`.
- PDF asset generated and linked (`challanPdfRef`).

## Offline fallback video plan

If internet or Roboflow endpoint is unavailable:

1. Play pre-recorded app walkthrough video (screen recording) covering the full flow.
2. Use stored screenshots for:
   - Candidate queue confirm action
   - My Challans and All Challans views
   - Detection rules live Firestore section
3. Explain that hosted inference is dependency-bound and fallback demonstrates app logic end-to-end.

## Assets checklist

- [ ] Screen recording (full successful run)
- [ ] Backup compressed version on local device
- [ ] Backup copy on USB/Drive
- [ ] 5-8 screenshots for key states
- [ ] Emergency slides for architecture + security + retention
