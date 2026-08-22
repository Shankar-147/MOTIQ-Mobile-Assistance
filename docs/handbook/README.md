# The MOTIQ Engineering Bible — How It's Organized Here

This directory is the living, first-class copy of the MOTIQ Engineering Bible inside the codebase. It is expected to grow chapter by chapter as later volumes get written at full depth — treat it the same way you'd treat any other permanent part of this repository, not a one-time reference dump.

## Layout

- `00-table-of-contents.md` — the frozen 145-chapter structure across 14 volumes.
- `volume-01-foundations/` — Chapters 1–7, written at full handbook depth (3,000–6,500 words each). Read these in full before making product or business decisions; Chapter 4 is research methodology and is optional background reading.
- `volumes-02-to-14-condensed-reference.md` — Chapters 8–145, condensed reference entries (one-sentence purpose + binding key decisions) for everything not yet written at full depth.

## The binding-constraint rule

Per the Bible's own "About This Edition" note: **where a condensed chapter (8–145) states a concrete decision or constraint, treat it as binding**, exactly as if it were in a full chapter — these decisions were derived from the reasoning in Chapters 1–7 and the frozen Table of Contents, not invented casually. Where a condensed chapter is silent on something, that's an open question for the corresponding full chapter to resolve later, not license to assume anything convenient.

This repository's Phase 1 bootstrap (see `docs/architecture.md` and `docs/decisions/`) was built treating that rule as authoritative — for example, Ch25's "modular monolith" decision, Ch39's PostGIS requirement, and Ch98's two-tier provider verification status are all implemented as given, not re-derived.

## Provenance

- `MOTIQ-Bible/MOTIQ-Engineering-Bible-Complete.md` (and the accompanying `.pdf`) is the original single-file edition this directory was split from. It is preserved untouched as the pre-restructure snapshot — if the two ever disagree, treat that as a sign this directory's copy has drifted and needs reconciling, not as a reason to trust one over the other blindly.

## Updating this handbook

When a future chapter (8 onward) is written at full depth, add it as its own file under the appropriate `volume-NN-*/` directory (create the directory if it doesn't exist yet), and remove its entry from `volumes-02-to-14-condensed-reference.md`. Per Chapter 36 and Chapter 145's governance process, any ADR in `docs/decisions/` that cited the condensed version of that chapter should be revisited to confirm it still holds against the full version.
