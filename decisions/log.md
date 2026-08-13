# Decision log

What was decided, when, and why. The reasoning matters more than the verdict, because it is what
stops the same question being reopened in six weeks.

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
