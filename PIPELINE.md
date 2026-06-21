# Candidate Pipeline & Feature Details

## Candidate status state machine

```
Applied → Form Submitted → Interview Scheduled → Offer Sent → Hired
                                                              → Rejected (from any non-terminal state)
```

Rules:

- Hired requires an actual offer to have been generated first.
- Rejected requires a short free-text reason.
- Status transitions are logged in the candidate timeline.

## Key feature details (non-obvious from headings)

- **Magic link** (feature 3-4): 14-day expiry, one-time-use after submission.
  HR copies the link from the UI (no email delivery needed).
- **Offer/NDA PDFs** (feature 7): centerpiece tech step. Design two real-looking
  templates (header, body, signature blocks). Store on backend for re-download.
- **Interview feedback** (feature 5): hire/no-hire/maybe + free-text. Logged on
  candidate profile timeline.
- **Timeline** (feature 6): every status change, interview, feedback, offer
  recorded most-recent-first on candidate profile.

## Out of scope (spec explicitly says skip)

Real email delivery, e-signatures, Google Workspace integration,
third-party tools (Monday.com etc.), production observability.
