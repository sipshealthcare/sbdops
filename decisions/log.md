# Decision log

What was decided, when, and why. The reasoning matters more than the verdict, because it is what
stops the same question being reopened in six weeks.

---

## D-019 · Belt platform database is read-only to this system
**Decided** 2026-08-13 · **Approved** · binding

The Belt platform database is read-only to the SBD OPS system, permanently. Five rules, all
binding:

1. SBD OPS never writes to the Belt database. No insert, no update, no delete, no DDL, no
   extensions, no functions, no schema changes. Ever.
2. Access is a dedicated Postgres role, `sbdops_readonly`, with SELECT granted on named tables
   only. Enforced by Postgres, not by anyone remembering.
3. The Belt project is never connected to an AI session whose tooling can write. Verification runs
   from Claude Code on a local machine using that role. Verdicts are written to SBD OPS, never back
   to Belt.
4. SBD OPS stores verdicts and aggregates only. Never a staff name, a score, or an assessment row.
5. The Belt project is never transferred between Supabase organizations, and ops tables are never
   installed inside the Belt database.

Two projects in one organization are already fully isolated, so co-location was never the risk. The
risks are elsewhere. A project transfer moves billing to the destination org's plan, which can
silently remove daily backups and reduce compute on a platform that certifies competency.
Installing ops tables inside the Belt database would put every ops migration in the platform's
blast radius, and share `auth.users` between ops logins and platform accounts.

Most importantly: a promise not to write is not the same as being unable to write. A read-only
Postgres role is a wall. An instruction in a prompt is a rule, and rules get forgotten between
sessions and between people. This decision chooses the wall.

If any future plan, prompt or agent appears to write to the Belt database, that is a defect. Stop
it rather than reasoning about whether this once is fine.

---

## D-009 · Assessor rights granted per facility
**Decided** 2026-07-30 · **Approved** · live the same day

Assessor rights are granted per facility rather than platform wide.

This overrides the original specification, which set assessor deliberately as system wide on the
reasoning that assessors travel between facilities. Travelling assessors are handled by granting
all sites explicitly rather than by leaving the role unscoped. Enforced at the database, not only
on screen.

---

## D-007 · Observation records editable by admins and assessors only
**Decided** 2026-07-23 · **Approved** · live the same day

Hospital managers and system executives get view-only oversight. Only master admins and granted
assessors can alter an observation record.

A hospital manager being able to edit a result means a facility can change its own assessment
outcome, which defeats the purpose of the gate.

---

## D-008 · Facility level checklist editing
**Decided** 2026-07-24 · **Tabled** · review 2026-09-01

There is one checklist per belt, shared platform wide. A facility edit would not give that facility
its own version, it would change the standard every facility is measured against.

A read-only view is being added instead so leaders can see what they are held to. If genuinely
per-facility checklists are wanted later, that is a real build and gets scoped separately.
