# The Operations Repo, and Intake From the SIPS Admin Team

**Prepared for:** Ignacio Jose Zambrano II, Director of Growth Architecture
**Date:** Thursday, August 13, 2026
**Status:** Thinking document. Nothing built, nothing changed. Decisions at the end.

---

## Who does what

Three groups, and keeping them straight is what makes the design work.

| Group | Role in this system |
|---|---|
| **SIPS internal administrative team** | Use the platform day to day. They submit issues and suggestions. That is their only role here. |
| **Ignacio** | Receives the analysis, decides. Approve, deny, table. Owns the record. |
| **Dev team** | Downstream. They receive approved work through the daily brief, and they contribute the EOD, release notes and evidence to the record. They do not raise intake. |

Dr. Jake is not in this loop. Anything that needs to reach him goes from Ignacio, later, separately.

The population that submits is small and that should shape everything. Your live accounts show three active master admins and three active staff admins, so realistically this is around six people, plus whoever else internally is in the product regularly. **You do not build a ticketing system for six people.** You build the lightest possible front door and put the effort into the analysis instead.

---

## Why this group is worth listening to specifically

Your administrative team is not a random source of complaints. They are the only people who use the platform across every facility, across every role, every day. Which means two things:

**They hit things before hospitals do.** They are effectively your canary. A report from them is a leading indicator, not an incident report.

**They see the seams.** A facility leader only knows their own site. An admin moving between thirteen facilities and multiple portals is the person who notices that a control exists in one view and not another, which is exactly the class of problem your record is already full of. An assessor held a right with no screen to use it. A queue existed only in the admin view. Those are the things this group finds.

So the intake is not a complaints box. It is your best early-warning source, and the design should treat it that way.

---

## The front door

The people submitting are administrative, not technical. That rules out the answer I gave last time.

**GitHub Issues is wrong for this group.** It is the right home for the record, and it would be the right front door if developers were raising items. Asking an administrator to open a repo to report that a button did not save will produce silence, and you will read the silence as everything working.

Three realistic options:

### Option A. A report control inside the platform

They are already in the product when they hit the thing. One control, they type a sentence, everything else is captured automatically: who they are, their role, the screen, the facility context, the timestamp, and their recent actions from the activity log.

**For:** Zero friction at the exact moment of the problem, and the context arrives without anyone having to describe it. "It didn't save" is unusable. The same sentence with the screen, the record and the last ten actions attached is diagnosable without a conversation.
**Against:** It is dev work, and it goes into a queue that is already carrying more than it can land.

### Option B. A simple form

A short form, a link they can bookmark, four or five fields. What happened, where, what you expected, and how much it is in your way.

**For:** Live this week, essentially no dev cost, works for everyone.
**Against:** Weaker context, and it sits outside the product so it depends on people remembering it exists.

### Option C. A shared list or an email address

**For:** Free, starts today.
**Against:** Degrades into a graveyard quickly, and it is the option most likely to become a third board.

### What I would do

**Start with B, and let it tell you what A should be.**

Two or three weeks of a form answers questions you cannot answer today: what volume actually arrives, what proportion are defects versus suggestions versus "I could not find it," and which context fields you keep having to ask for. Then the in-app control gets built once, against real requirements, rather than twice against assumptions. It also keeps the dev team's hands free for the scripts and endoscopy work.

---

## What gets submitted, and how it gets classified

He said issues and suggestions, and those are genuinely different objects. Four types, decided at triage rather than by the submitter, because asking an administrator to classify their own report is how you get bad classification:

- **Defect.** Something is broken.
- **Suggestion.** Nothing is broken, this would be better.
- **Cannot find it.** They went looking and failed. Sometimes a real gap, often a navigation or scoping problem, occasionally a training gap. Almost never a defect, and routing it as one wastes everyone's time.
- **Question.** They want to know how something is supposed to work. The answer often belongs in the glossary or a runbook rather than in a queue.

**Submitters classify nothing and prioritize nothing.** They describe what happened. Everything else is the analysis layer's job, and that is what keeps submission cheap enough that people keep doing it.

---

## The flow

```
SIPS admin team submits
        ↓  (changes nothing: no status, no priority, no place on the board)
Analysis against the record and the live system
   repo · tracker · EOD archive · prior briefs · backend · server code
        ↓
Triage packet to Ignacio, batched
        ↓
APPROVE · DENY · TABLE
        ↓
Approved → tracker row → next daily brief → dev team
Tabled  → decision log with a review date
Denied  → closed with a reason
        ↓
Submitter hears back, every time
```

### The six buckets

Every item comes out of analysis as one of:

1. **Already fixed and live.** Closed with the date and the evidence.
2. **Already tracked.** Linked, count goes up. Frequency is signal.
3. **Already built but not reachable.** Access scoping, wrong portal, stale browser copy. **Expect this to be the largest bucket for this group,** because administrators move between portals constantly and that is exactly where these problems live.
4. **Blocked on a decision.** Goes to the open decisions list rather than the build queue.
5. **Not a defect.** Training, naming or navigation. Different fix, different owner, never reaches the dev team.
6. **Genuinely new.** Packaged for you.

### Closing the loop is not optional here

I dropped this when I thought developers were submitting. With administrative users it comes straight back, and it is the single thing that determines whether this system is alive in three months.

If someone reports something and never hears anything, they stop reporting. Then intake dries up, and you read the silence as the platform being fine. Every item needs a terminal state that reaches the person who raised it: fixed and here is when, tracked and here is the number, already works and here is where to look, or not doing it and here is why. Even a no keeps people submitting, as long as it arrives.

---

## Severity, tuned to what this platform is

| Tier | Meaning | From the record |
|---|---|---|
| **1. Determination integrity** | A belt, gate or record is wrong, or a safety finding is missed | White substituted as a placeholder belt and printed as a result |
| **2. Silent data loss** | Reports success, stores nothing | Schedule and attendance saving nothing for two months |
| **3. Access and exposure** | Someone sees or changes what they should not | The five areas readable by anyone signed in |
| **4. Blocked work** | Someone cannot do a required task | An assessor with the right and no screen |
| **5. Wrong display** | Data is right underneath, reads wrong on screen | "Not gated" printing as a blank that looked like missing data |
| **6. Suggestion** | Not broken, wanted | Endoscopy modules, scripts as a standalone module |

Tiers 1 and 2 reach you outside the batch. Everything else waits for the next packet.

Tiers 1, 2 and 5 are the same two defect classes already written into your daily brief as standards. One vocabulary, not two.

---

# The repo

The record itself. Separate from the front door, and the thing everything else reads from.

## What it holds

**The tracker, as the ledger.** Not a copy of the spreadsheet, the actual ledger. Every status change becomes a commit with an author and a date, which means a row untouched for three weeks while its subject shipped is detectable automatically rather than by someone reading 25 documents.

**EOD reports.** Same four sections the team already writes. One new ask only: shipped items name their tracker number. That single change makes reconciliation mechanical instead of interpretive.

**Briefs, archived.** So "when did we first raise the manual add problem" is a search, not archaeology.

**The decision log, plus a live list of what is open.** Two files. Fifteen decisions have been carried unanswered across EOD reports with no artifact recording any of them. This is also where the EOD "Needs you" section graduates to, because prose in a Word file ages quietly and a file with an old date does not.

**Intake items and their outcomes**, so a report and its resolution live in the same place as everything else.

## What I had not named, and would now

**The capability register.** The one I would put first. Plain language, present tense, what the platform can do right now and is confirmed live. Not roadmap, not backlog. The tracker says what is being built and the EOD says what happened yesterday. **Neither answers what the platform does today**, which is the question your leadership, sales and client success teams actually need answered. It does not exist anywhere right now.

**The known limitations register.** Its twin. What we know does not work yet, in language safe to say out loud. This is what prevents overpromising in a room.

**The release log.** What went out, when, what to check. Gives "shipped" a fixed meaning instead of blurring merged, deployed and visible.

**The access and role map.** Tracker item 71 is literally "Nobody has a list of who can reach the three consoles." Generate it from the backend on a schedule.

**Metrics snapshots, weekly.** Every number I give you today is point-in-time and then disappears. Committed weekly you get trend for free, and you can see when something changed. Your observation gate has been stuck at three records and nobody can currently say since when.

**Velocity, landed versus committed per sprint.** They hit 7 of 10 in S5. That number is what makes a deadline realistic. Two figures a sprint, and after four sprints you can plan properly.

**Standing checks, the glossary, and runbooks.** Your two defect classes as an actual checklist. The 74-check access verification the team already built. A glossary, which is what prevents the item 84 class of error and gets a new person useful in a day. And runbooks, because the re-score tool is careful work that only its author knows how to run.

## Making it answerable

You want to ask it questions and build against it. That has one design consequence: **the record has to be structured data that renders as documents, not documents that happen to live in git.**

If the tracker is a plain markdown table I can read it, but I cannot reliably answer "what changed status this week" or "what has been open longest." A few machine-readable fields at the top of each item makes both instant, for me and for anything you build later. Renders fine on GitHub, reads fine to a person. Small discipline, disproportionate return.

## The live view

A read-only internal dashboard deployed from the repo: today's brief, open intake by severity, decisions waiting on you with their age, the tracker board with staleness visible, the release log, the capability register and known limitations, and the metrics trend.

Read-only deliberately. Everything changes through the repo, so the dashboard can never become a second place where state lives. It is a window, not a door.

Worth noting this is a very different thing from the internal deployment I cautioned about earlier. That risk was a second copy of the belt platform drifting from production while looking authoritative. A dashboard rendering the record carries none of that.

## Automation

Where "notice issues before they happen" stops being a habit and becomes a property of the system.

- **Flag any tracker row untouched for N days** while its subject appears in a recent EOD. That is the stale-rows problem, caught automatically.
- **Reject an EOD claim that something shipped without a tracker ID.** Cheapest rule, biggest downstream payoff.
- Warn when a date passes with no status change.
- Nightly reconciliation against the live backend, posted as a diff.
- Weekly metrics snapshot, committed automatically.

The first two are worth doing on day one. The rest can wait.

---

## The rule that decides whether this works

> **The repo has to be the ledger, not a copy of it.**

You already have two boards that disagree: the published tracker and the internal ledger the dev team audits against the merge history. A third thing needing sync makes it worse. This only works if the dev team's actual working ledger moves in, and that is a conversation to have deliberately rather than an assumption to make.

---

## Sequencing

**This week.** Repo exists. Tracker moves in as the ledger. EODs and briefs land in it. Decision log starts. Intake form goes live. That already fixes what has been costing you.

**Once it is habit.** Structured fields so it is queryable. The two cheap automations. Capability register and known limitations, because those serve the purpose you started from.

**When there is enough in it to look at.** Dashboard, metrics and velocity history, generated access map, runbooks, and the in-app report control specced from what the form taught you.

---

## Failure modes

**It becomes a graveyard.** Three EODs land and everyone goes back to Word files. Defense: it has to be less work than today, not more, which argues for starting minimal.

**Intake dries up because nobody hears back.** The most likely failure with this group, and the reason closing the loop is in the design rather than in someone's good intentions.

**Over-structuring.** Eleven fields on an EOD gets you eleven badly filled fields. Two or three is the whole ask.

**Three ledgers instead of two.** Covered above, and the one that actually matters.

**It becomes about proving people did things rather than knowing where things are.** Reporting quality drops immediately and quietly when that happens. The tone rule from your daily brief applies to this system too.

---

## Decisions

**Yours**

1. **Front door.** Form now and in-app later, as recommended, or straight to in-app.
2. **Who submits.** All internal admin accounts, or a named set?
3. **Who closes the loop** back to a submitter. It is a communication job, and it needs an owner or it does not happen.
4. **Is the ops repo a yes**, and does the dev team's working ledger move into it as the ledger?
5. **Read access for me.** Move this first. Everything depends on it, and this environment has no GitHub authentication configured today.
6. **How much structure to ask of the EOD.** My recommendation is exactly one thing: shipped items name their tracker ID.
7. **How often the triage packet reaches you.** Daily alongside the brief, or twice a week.
8. **Is the dashboard in scope**, or is GitHub's own rendering enough for now?

**Later, separate**

9. **The application repo**, for the client-side code gap and change attribution.
10. **Anything that needs to reach Dr. Jake**, which comes from you, on your timing, outside this system.

---

*Nothing has been built and nothing in the system has been changed. Design proposal only.*
