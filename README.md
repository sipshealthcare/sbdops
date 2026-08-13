# SBD Platform Ops

The operational record for the SBD platform build. One record, three lenses.

This repository is the **ledger**, not a copy of one. If a status lives in two places, this
project has failed at the thing it was built to fix.

## Who does what

| Group | Role |
|---|---|
| **SIPS internal admin team** | Use the platform daily. Submit issues and suggestions through the report page. They do not work in this repo. |
| **Ignacio Zambrano** | Triage, decide, direct. Approve, deny or table. Owns `briefs/`, `decisions/`, `reference/capability.md`. |
| **Dev team** | Build. Own `eod/`, `releases/`, and tracker status. Raise questions that become dated decision items. |

Nothing here is a client escalation. The purpose is internal: so leadership, sales and client
success can accurately describe what the platform does today.

## Where everything lives

```
index.html         SIPS admin intake      → sbdops.vercel.app
dash.html          master admin surface   → sbdops.vercel.app/dash
build.html         dev team surface       → sbdops.vercel.app/build
tracker/items/     one file per item, one status change per commit
eod/               one file per day, from the dev team
briefs/            the daily brief, from Ignacio to the dev team
decisions/         open.md is the live queue, log.md is what was decided and why
releases/          what went out, when, and what to check
reference/         capability, limitations, standards, glossary, severity
templates/         EOD and item templates
docs/              design notes, state of play, surface notes
```

## Rules that make it work

1. **Submitting changes nothing.** An intake item has no status, priority or sprint until it is
   triaged and approved. Raw submissions stay in the intake form, not here.
2. **Shipped items name their tracker ID.** One small discipline that makes every reconciliation
   mechanical instead of interpretive.
3. **Dev pushes tracker status directly.** They know when something shipped. The protection is the
   audit trail and the automation, not a gate.
4. **One file per item.** Two people are almost never editing the same file, so simultaneous work
   does not produce merge conflicts.
5. **Dates are proposals until confirmed.** The team confirms or sends a corrected date with a
   reason. A date agreed by default is the failure mode this is designed against.

## Path ownership

Use `CODEOWNERS` so review is required only where it matters:

```
/briefs/                 @ignacio
/decisions/              @ignacio
/reference/capability.md @ignacio
```

Everything else is direct push.

## Deployment

Static. Vercel serves the three HTML files straight from the repo root, no build step.
`vercel.json` turns on clean URLs so `/dash` and `/build` work without the extension, and sets
`noindex` on every response.

**Before real data goes in this repo, turn on Vercel deployment protection.** The capability
register, the known limitations and the decision log are exactly the things that should not sit on
a public URL. Right now the surfaces run on illustrative data so the exposure is low, but that
stops being true the moment they read from here.

## Intake

`index.html` calls two Supabase database functions directly. `submit_intake` writes a submission,
`my_intake` reads back a submitter's own items and nothing else. Both calls go through database
functions rather than straight at a table, which is what stops a submitter reading the triage
queue.

No serverless functions and no environment variables. The Supabase publishable key lives in the
page by design, because it is not a secret, so changing the surface never needs a redeploy to
reconfigure.

Triage fields on a submission (`status`, `severity`, `verdict`, `analysis`, `decision`, `tracker`)
arrive empty by design. Submitting changes nothing until it is triaged and approved.

Outcomes shown to a submitter are only ever done, in progress, or tabled. Nothing reads as a
refusal, because tabled is honest and leaves the door open.
