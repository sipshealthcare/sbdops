# Release log

Merged, deployed, and confirmed are three separate facts. This log records all three.

---

## 2026-08-12
**Live.** No Belt results can be approved without certifying the person White. Approving an
assessment and generating a PIN split into separate permissions. New SIPS admin role starting with
no capabilities. Facility admins can reach the observation consoles read-only.

Items: #79, #80 · Verified against the database.

---

## 2026-08-11
**Live.** Belt scoring brought into conformance with Scoring Specification v1. Item weighted means
across every item, a knowledge gate on belt selection, individual response minimum flat at 65,
full precision carried to every comparison.

Two defects surfaced by doing it: the belt test was selecting on blended score alone with no
knowledge gate, and a candidate clearing knowledge but not blended was being given White where the
specification records Knowledge Foundation.

Items: #96 · Re-verified against all 49 stored placements. No stored belt moved.

---

## 2026-07-30
**Rolled back.** Observer PIN hardening took ordinary staff reads down during a demo window.
Reverted within the hour, data confirmed intact. The rule it needed was narrower than the one that
went in. Narrower version shipped 2026-08-04.

Items: #37
