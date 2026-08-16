# SBD Build, from Claude Code

An MCP server that puts the `/build` board inside your terminal. Read the queue, answer
dates, mark work done, read Ignacio's answers and file the end of day report without
opening a browser or writing a status update by hand.

## Install

Node 18 or newer. From the repo root:

```bash
cd mcp
npm install
```

Then register it with Claude Code, putting your own name in so confirmations and
questions land with the right person on them:

```bash
claude mcp add sbd-build \
  --env SBD_WHO="Shawn" \
  -- node /absolute/path/to/sbdops/mcp/server.js
```

Sriman runs the same command with his own name. Nothing else needs configuring: the
project URL and the publishable key are already in the server, exactly as they are in
the page source.

Check it came up:

```bash
claude mcp list
```

## Start every session with one call

```
sbd_status
```

It returns everything that is out of date or waiting on you in one shot: items past
their agreed date, proposed dates that need an answer, whether the sprint tracker
spreadsheet is behind, whether an end of day report is missing, and how many of
Ignacio's answers are unread. If `all_current` comes back true, the board matches the
work and there is nothing to clear.

## The tools

**Reading**

| Tool | What it gives you |
|---|---|
| `sbd_status` | Everything out of date or waiting on you. Start here. |
| `sbd_queue` | Open work in board order. `overdue_only` narrows it. |
| `sbd_item` | One item in full, with its note and how to check it. |
| `sbd_dates_to_answer` | Dates Ignacio proposed that still need a yes or a different date. |
| `sbd_answers` | Ignacio's decisions with his reasoning, and whether each is read. |
| `sbd_brief` | The morning brief in full. |

**Dates**

| Tool | What it does |
|---|---|
| `sbd_confirm_date` | Accept the proposed date. |
| `sbd_counter_date` | Send back a date you can hit, with the reason. Required. |

`sbd_counter_date` also works on an item whose date has already passed. That is how a
slip gets reported instead of going quiet, and it is never treated as a failure.

**Work**

| Tool | What it does |
|---|---|
| `sbd_mark_done` | Close an item. Evidence required, see below. |
| `sbd_ask_ignacio` | Ask a question against an item. It shows as waiting on him. |
| `sbd_post_release` | Record what shipped and how it was verified. |
| `sbd_tracker_synced` | Say the sprint tracker spreadsheet is up to date. |

**Answers from Ignacio**

| Tool | What it does |
|---|---|
| `sbd_got_it` | Mark an answer read so he can see it landed. |
| `sbd_not_clear` | Say it is not enough to build from. Raises a linked question. |
| `sbd_propose_from_answer` | Turn an answer into a dated tracker item. |

**End of day**

`sbd_post_eod` takes what was completed, what was verified, what is still in flight with
expected dates, and anything blocked on Ignacio. What goes under `needs_ignacio` becomes
a decision on his board rather than a line he might skim past.

## The one rule worth reading

`sbd_mark_done` asks for evidence, and it means it. Say how you checked the thing is live
in the running system, not that you believe it is. That line is published to leadership as
the proof the item shipped.

Good: *read the column straight back out of the live database.*
Good: *signed in as a granted assessor and reached the Assessment Queue screen.*
Not enough: *done*, *tested*, *works.*

## What this cannot do

Scope is narrow on purpose. Every tool calls one of the database functions the `/build`
page already calls, with the same publishable key that already sits in that page's
source. So this server can do nothing a person with the `/build` URL could not already do
in a browser.

It cannot answer a decision, which is Ignacio's and stays his. It cannot read or write
intake. It cannot delete anything. And it has no path of any kind to the Belt platform
database, which is read only from the ops side and stays that way.

## Environment

| Variable | Default | For |
|---|---|---|
| `SBD_WHO` | none | Your name on confirmations, questions, EODs. Set it. |
| `SBD_URL` | the SBD OPS project URL | Only if the project ever moves. |
| `SBD_KEY` | the publishable key | Only if the key is ever rotated. |

The key is publishable by design. It is not a secret, which is why this needs no
credential setup and no `.env` file.
