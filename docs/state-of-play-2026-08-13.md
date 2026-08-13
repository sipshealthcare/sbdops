# SBD Platform — State of Play

**Prepared for:** Dr. Jake Tayler Jacobs DBA, MBA, B.Ed.
**Date:** Thursday, August 13, 2026
**Sources:** 25 dev EOD briefs (June 16 to August 12), SBD_Task_Tracker.xlsx, the published live sprint tracker, and a direct read of the live SIPS backend taken today.

---

## 0. The short version

The platform is real, it is in production, and usage is climbing. This week has the highest number of distinct human users of any week in the last nine.

The build is not the problem. The **ledger** is the problem.

The published sprint tracker you sent me says 51 tasks are "Open / Not started / Not scheduled." I cross-checked every one of them against the dev team's own EOD briefs and against the live database. At least twelve of those "not started" items shipped between July 26 and August 12 and are live right now. The tracker is showing you a backlog that is roughly a third larger than it actually is, and it is showing every open item stamped into a sprint that ends tomorrow with no date attached to any of it.

You cannot hold anyone to a realistic deadline off that sheet. Fixing the ledger is the first move, before any feature work, and it is a day of work not a week.

---

## 1. Where we came from — the arc, June 16 to today

### Phase 1 (mid-June): Get the three gates working
June 16 was the turning point. David came fully online with the belt curriculum loaded. The scoring engine was fixed so belt suggestion runs on blended, knowledge and simulation floors plus a dangerous-answer block rather than knowledge alone. The assessment report went from two outcomes to four (Clean, Conditional, Knowledge Foundation, No Belt) and was aligned to the Governing Standards. The observer gate — request, PIN handshake, checklist, Stop Work, confirm — went end to end for the first time.

### Phase 2 (late June to mid-July): Build out the learning layer
Foundations and Instruments went live and role-scoped. The placement safety net landed, so a completed assessment can no longer get stuck on a candidate's device. David usage metering went per-facility and per-app. The three-pass rule arrived (80% or higher, three times, fresh questions each attempt, before observation unlocks). Override-assign was built with a reason and an audit trail. Star awards got gated behind the three passes. The early-open window control shipped the same day you answered the questions on it.

### Phase 3 (July 16 to July 31): The reckoning
You asked for a full security review on July 16. What it found, over two weeks, was the most important stretch of this entire build:

- **Five areas of the platform were readable and editable by anyone signed in**, regardless of role or facility. Belt placement decisions (49 records). Belt gate requests (56 records). Shift definitions. The released staff register, which holds names, belts, star counts and reason for leaving, was readable by all 66 non-SIPS accounts.
- **A signed-in staff member could set their own belt, award themselves stars, open their own assessment gates, and change their own role to master admin.**
- **Schedule, attendance and promotions had never saved a single record.** Not once, since the feature shipped. Every write was being rejected by the database and the rejection was being silently discarded, so the screen said "saved" and nothing was stored. Two months of that went unnoticed because SIPS administrators had no schedule screen of their own to look at.
- **The account request table was storing every user's chosen password in plain text**, in an area open to anyone signed in.
- **The placement report was measuring people against the wrong belt.** When a review had no belt stored, the report substituted White and printed the whole document against White thresholds. That is why David Williams read "White Belt Conditional." The White was never a decision anybody made. It was a placeholder that leaked onto the page and looked like a result.
- The review queue held 27 open items that stood for 6 real decisions. One candidate had raised the same request eleven times since June 25 because nothing was moving.

All of that is now closed. Every item above is fixed and live. But it is worth sitting with what that list is: this platform was carrying department-level and patient-safety-adjacent decisions on top of a foundation that had never been checked.

### Phase 4 (August 4 to 12): Precision
The last ten days have been quieter and much higher quality. Foundations carries full document content across all ten modules (77 sections). Observation evidence must now be typed or spoken, so an observation cannot be passed by picking from a list. Belt scoring was brought into conformance with your Scoring Specification v1, and doing that surfaced two real defects: the belt test was selecting a belt on blended score alone with no knowledge gate, and a candidate who cleared knowledge but not blended was being handed a White belt the score had not earned. Both fixed, and all 49 stored placements were re-verified against your own reference implementation with no belt moved.

Two other things from that stretch are worth naming because they are the same category of failure:

- **David's knowledge base was never connected.** It had been pointed at an index that does not exist, so the knowledge search silently returned nothing and David had been answering from reasoning alone the whole time. Found and fixed August 11.
- **The report was re-judging your assessor's override out of existence.** Sharon Greene-Golden's Brown was being re-derived from the scores, so the report printed no belt at all.

---

## 2. Where we are — live backend, read today

**Scale**

| | |
|---|---|
| Facilities | 13 (12 hospital systems) |
| Staff records | 92 |
| Portal accounts | 101 (69 staff, 12 hospital, 11 facility admin, 3 master admin, 3 staff admin, 3 system admin) |
| Active staff accounts | 46 of 69 |
| Public tables | 105, all with row-level security on |
| Server functions | 57 edge functions |
| Schema migrations | 195 |

**Adoption is accelerating, which is the good news and the risk at the same time**

Distinct users touching the platform per week:

```
Jun 15   15 users   1,557 events
Jun 22   25         2,107
Jun 29   13         1,060
Jul 06   12         1,176
Jul 13    9           870
Jul 20    8         1,533
Jul 27   13         2,702
Aug 03   17         2,008
Aug 10   27         2,605   <- highest distinct-user week on record
```

**Queue health**

- Assessment queue: 57 rows total, but only **7 are live decisions** (2 approved and 2 pending Competency, 1 approved and 2 pending Simulation). 21 are marked superseded, which is the duplicate cleanup working as designed. Oldest live item is 31 days.
- Placement reviews: 71 total. **1 still pending, and it has been sitting 54 days.** 39 confirmed, 29 adjusted, 2 closed with no person attached.
- Transfer requests: 32 open.
- Free agents: 13, and your own SIPS staff are among them because SIPS has no home facility. That has been flagged since July 29 and is still waiting on your call.
- **Observations: 3 records. Ever.** Against 12 seeded checklists. The observer gate is fully built, hardened, PIN-protected, facility-scoped, and effectively unused.

**Security posture**

The formal scan comes back clean at ERROR level. No table has RLS switched off. No security-definer views. No exposed auth tables. No mutable function search paths. That is a genuinely good result and it reflects the two weeks of hardening.

But the scan surfaces one thing that is not in your tracker and should be:

> **29 privileged database functions are callable without signing in at all.** They are all in the `aip_*` family — the assessment/candidate module. Several of them take the acting admin's ID as a *parameter* rather than reading it from the login token, which means anyone who obtains or guesses an ID can act as an admin. One of them returns answer keys. Two accept PINs as parameters, which allows unlimited offline PIN guessing. A thirtieth function, `sbd_set_user_capabilities`, is callable by any signed-in user.

I want to be careful here: this is the AIP module, which looks like a separate build track from the main belt path and may not be publicly reachable. That is the first thing to confirm. But if AIP is live anywhere, this is the most serious item on the board and it is currently represented in your tracker only as a Medium priority line reading "Review the SECURITY DEFINER execute grants."

---

## 3. The tracker problem, item by item

Your live sheet has 72 rows. 10 Done, 2 In progress, 54 Open, 6 Blocked. Here is what the EOD record and the live database say about the "Open / Not started" ones:

| # | Task as tracked | Reality |
|---|---|---|
| 26 | Make Publish to Staff actually publish | **Live.** Shipped July 26, publish gate moved to the database July 31 |
| 27 | Persist attendance edits | **Live.** July 26, confirmed in the July 31 sign-off pass |
| 28 | Persist quick-fill schedule overwrites | **Live.** July 31, with a uniqueness rule on the schedule |
| 32 | Remove the cross-facility read leak | **Closed.** July 28 |
| 37 | Move the observer PIN check server side | **Substantially done.** Rolled back July 30, PINs moved to a locked table August 4. The database itself carries the note |
| 60 | Signup form writes a plaintext password | **Half done.** Stored passwords purged July 27 and the table locked to SIPS only; the form still holds one until approval. This one is genuinely still open |
| 65 | Placement scoring: one threshold table, no placeholder belts, Dangerous provision | **Live.** All of it, July 27 |
| 74 | Grantable roles per facility | **Assessor half live** July 30. Preceptor half was due August 6 |
| 77 | Granted assessor has no Assessment Queue screen | **Live.** July 30 |
| 79 | SIPS admin role, approval split from PIN generation | **Live.** August 12 |
| 80 | Facility admin cannot reach the observer portal | **Live.** August 12 |
| 104 | The client's sprint tracker, back in his hands | Open — and this line is the tell |

That last row is the diagnosis. The team is auditing a working ledger internally (the August 11 brief says five stale items were corrected, August 12 says six more closed), but the sheet you have been reading is not that ledger. Two different sources of truth, and the one you can see is the stale one.

**Second problem with the sheet:** every single one of the 54 open items carries Sprint = "S7 (Fri 8 Aug – Fri 14 Aug)" and Expected = "Not scheduled." That is a bulk stamp, not a plan. S7 closes tomorrow. A sprint that contains 54 undated items is not a sprint, it is a backlog wearing a sprint's name tag.

---

## 4. Patterns worth naming, because they will repeat

These are not individual bugs. They are two classes of defect that this codebase produces repeatedly, and until each gets a standing rule they will keep costing you weeks.

**Class 1 — The screen said saved and nothing was stored.**
Five separate instances: the Foundations assign flow (July 1), the scheduling controls (July 24), Position School sign-off requests (July 24), schedule/attendance/promotions (July 26, two months of silent loss), Publish to Staff (July 26). Every one of them reported success while the write was being rejected and discarded.

*Standing rule to impose:* no write path ships unless the failure is surfaced to the user, and no write feature is marked done until someone has saved, reloaded, and seen the value come back.

**Class 2 — A fallback printed itself as a determination.**
Four instances: White substituted as a belt when none was stored (July 27), "not gated" printing as a blank that read like missing data (August 10), the report re-deriving a belt and erasing an assessor's override (August 11), David replacing a real error with a vague "no answer" placeholder that then got saved (August 10).

*Standing rule to impose:* the platform never prints a default in the place where a decision belongs. Absence gets stated as absence.

**Class 3 — Chronic slippage on three specific items.**
Observer PIN hardening: due July 30, rolled back the same evening after it took ordinary staff reads down during your demo window, re-dated August 4. Registration password removal: July 28, then July 30, then July 31, then August 6, still partial. SIPS admin schedule screen: July 29, then July 31, then "no date yet," and it is still sitting on the sheet as #58. Three items, ten-plus re-dates between them.

Those three do not need another date. They need either a hard commitment with a named owner or a formal decision to cut them.

---

## 5. What is actually blocking, and it is mostly you

This is the uncomfortable part of the read. The dev team's throughput is not the constraint right now. Their landed-versus-committed rate in the last measured sprint was **7 of 10**, which is a normal and honest number.

The constraint is a decision queue that has been carried, unanswered, across multiple EOD briefs. Counting from the record:

**Open since late July or earlier**
1. **Black Belt observation checklist content.** Waiting since June. This is content only you can supply, and the Black Belt gate cannot exist without it.
2. **PSOP credentials in the page source.** Flagged July 14 — a month ago. Admin passwords for you, Donnie and the master PIN are readable by anyone who opens the page source on a public page. Tracker status: "Blocked / waiting on a decision." This is the item I would move first, today.
3. **A live API key was shared outside secret storage and needs rotating.** High priority, not started, no date.
4. Which facilities Kirti Chaudhary and Amy Cooper each assess.
5. Which of the two duplicate facility-name pairs are real sites.
6. Whether observer rights and the practice-gate waiver follow the same per-facility rule.
7. The 15 authorization-queue entries with no facility attached.
8. Whether a second request after an approval is a duplicate or a genuine second attempt.
9. Whether a promotion that changes a role without changing a belt is a real case.
10. SIPS home facility, so your own staff stop sitting in the Free Agent row.
11. David chat protection: alert-only or auto-limit, and at what threshold.
12. The two SOP tool decisions: shared database or its own, and whether drafting is open to regular users from day one.

**New this week**
13. Whether historical placements get re-run (the re-score sheet on 14 people is built and waiting on your read).
14. Whether belt determination moves fully server-side (section 16 of your spec).
15. The load question for the onboarding wave.

That last one deserves its own line. **Nothing has measured what happens when a site brings on 200 people at once.** Your busiest week on record is 27 distinct users. A 200-person onboarding is an order of magnitude past anything this platform has ever seen, and it is sitting on the tracker as High, not started, not scheduled. If a real onboarding wave is on the calendar, that is the item that turns a good platform into a public failure.

---

## 6. Where we are going — what I would set up

You asked for four things: create updates, create briefs, notice issues before they happen, and keep the team on realistic deadlines. Here is the shape I would build, and none of it is heavy.

**A. Reconcile the ledger, once, this week.**
One pass that takes the published tracker, the 25 EOD briefs, the migration history and the live edge-function deploy timestamps, and produces a corrected sheet where every row's status is backed by evidence rather than by memory. That is the foundation for every other thing on this list. Roughly 12 items move from Open to Done immediately and the real backlog becomes visible.

**B. A morning brief, out before the day starts.**
The team explicitly asked for this on August 12: "if we know each morning where you want the focus, the day gets planned around it rather than around what came in overnight." One page. Three things: today's focus, decisions I am answering today, decisions still with me. That single habit converts your decision queue from a silent tax into a scheduled item.

**C. An EOD reconciliation, automatic.**
When their brief lands, it gets checked rather than filed. Every "live now" claim gets verified against the database and the deploy record before it is marked done. The August 11 and 12 briefs show the team already moving to this method internally, which is a very good sign. Doing it independently on your side means you are never again in a position where a status you are quoting to a client is wrong.

**D. Sprint close on a real number.**
Stop planning 54 items into a week. Their demonstrated rate is 7 to 10 landed items per sprint. Commit 8. Everything else goes to a dated backlog. A sprint you can hit builds trust with the team and gives you a date you can actually give a hospital.

**E. A risk register that runs ahead of the work.**
The two defect classes above are predictive, not historical. Any new feature with a write path gets checked against Class 1 before it ships. Any new report or determination surface gets checked against Class 2. That is how you notice issues before they happen rather than after a client does.

---

## 7. If I were you, this is the order

1. **Today.** Take the PSOP page down or password it, and rotate those three passwords and the master PIN. A month is too long on a known credential exposure.
2. **Today.** Rotate the shared API key (#87).
3. **This week.** Confirm whether the AIP module is publicly reachable. If it is, the 29 unauthenticated functions become the top item on the board.
4. **This week.** Reconcile the tracker. Then set S8 with 8 dated items and nothing else.
5. **This week.** Answer the twelve carried decisions. Most of them take you under a minute each and several have been blocking work for three weeks.
6. **Before any onboarding wave is scheduled.** Load test at 200 concurrent.
7. **Ongoing.** Black Belt checklist content. Nothing else unblocks that gate.

---

*Nothing in this document was built or changed. This is a read of the current state only.*
