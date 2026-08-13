# Standing standards

Two classes of defect have recurred. Both were found and fixed by the dev team. They are written
down here so they are caught by process rather than by anyone having to remember.

## 1. A save is not done until it comes back

No write path is done until someone has saved, reloaded, and watched the value return, and until a
rejected write surfaces an error to the person doing it.

**Why.** Five separate instances of a write being rejected while the interface reported success:
the Foundations assign flow, the scheduling controls, Position School sign-off requests, schedule
and attendance, and Publish to Staff. The schedule case ran two months before anyone noticed,
because SIPS administrators had no schedule screen of their own to look at.

## 2. Never print a default where a decision belongs

Where a determination belongs, absence is shown as absence rather than filled with a fallback.

**Why.** White substituted as a belt when none was stored, and printed as a result. "Not gated"
printing as a blank that read like missing data. A report re-deriving a belt and erasing an
assessor's override. DAVID replacing a real error with a vague placeholder that then got saved. And
the manual add form, which still defaults to White today.

## Applying them

Any new feature with a write path is checked against 1 before it ships. Any new report or
determination surface is checked against 2. Neither check takes long, and both are cheaper than
the rework.
