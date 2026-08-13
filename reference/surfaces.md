# The three surfaces

Who each one is for, what they can see, and where state crosses between them.

Self-contained HTML. No build step, no dependencies. Open a file or deploy the folder.

| File | Who | What they see |
|---|---|---|
| `report.html` | SIPS internal admin team | The intake form, and the status of their own reports. Nothing else. No tracker, no board, no other people's items. |
| `index.html` | Ignacio, master admin | Everything. Triage queue with analysis, tracker with staleness flags, decisions, the brief, capability register, releases. The only surface with decision authority. |
| `build.html` | Dev team | The brief as received, dates to confirm or adjust, their open questions with age, the sprint, approved intake, and forms to post EOD and releases. Never sees raw untriaged intake. |

## Why intake is not in the dashboard

Two different audiences. An administrator reporting a problem should not see the tracker, because
then they start asking about priorities and comparing their item to other people's. A submitter
sees their own item and its outcome, and that is the whole surface.

## Where state crosses between surfaces

Only three moments:

1. **Triage.** An item is approved and enters the tracker, which is when the dev team first sees it.
2. **Brief send.** A draft becomes visible to the dev team.
3. **Question raised.** A dev question becomes a dated item in `decisions/open.md`.

Everything else stays inside its own surface. That is what keeps this one record with three lenses
rather than three systems.

## Current state

`report.html` is wired. It posts to `/api/intake`, which commits the submission into `intake/` as a
file, and reads `/api/mine` to show a submitter their own items and what happened to each. It needs
`GITHUB_TOKEN` and `SUBMIT_CODE` set in the Vercel project; without them the pages render normally
but the submit button reports that intake is not configured.

`index.html` and `build.html` still run on illustrative data drawn from the real record. Reading the
tracker, decisions and briefs out of this repo at build time is the next step, not a finished thing.
