# Tracker

One file per item in `items/`, named by ID. Every status change is a commit, so every status
carries an author and a date. That is the property the spreadsheet never had.

## Format

YAML frontmatter for the machine, prose for the human.

```yaml
---
id: 26
title: Make Publish to Staff actually publish
status: shipped        # open | in-progress | shipped | blocked | backlog
priority: high         # critical | high | medium | low
sprint: S4
owner: dev
shipped: 2026-07-26
source: internal       # internal | intake | audit
intake: SBD-091        # when it came from the admin team
---
```

`status` and `shipped` are the two fields the automation reads. Keep them accurate and everything
else follows.

## Statuses

- **open** — real, not started
- **in-progress** — someone is on it
- **shipped** — merged, deployed, and confirmed present. All three, not one.
- **blocked** — waiting on a decision. There should be a matching entry in `decisions/open.md`.
- **backlog** — deliberately parked, not forgotten. Carries a review date.
