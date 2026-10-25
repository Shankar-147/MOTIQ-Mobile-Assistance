# Contributing to MOTIQ

## Branch workflow

- `main` is protected in practice — land work through a PR, not a direct push.
- Each contributor works on their own `feature/<area>` branch off `main`.
- Current ownership:
  - `feature/payments` — Vishwa C ([@VISWA0006](https://github.com/VISWA0006)) — `apps/api/src/modules/payment`
  - `feature/admin-console` — SelvaPriya S ([@2024115046](https://github.com/2024115046)) — `apps/api/src/modules/admin`
- Open a PR back into `main` when a piece of work is ready for review.

## Commit identity

Make sure git is configured with your **own** name and email before committing, so
authorship in the history is accurate:

```bash
git config user.name "Your Name"
git config user.email "you@example.com"
```

Do not add `Co-Authored-By` trailers for tools — only for a real human who
worked on that commit with you.

## Before opening a PR

- Follow the module/architecture rules in [CLAUDE.md](CLAUDE.md) and
  `docs/handbook/`.
- Run `npm run --workspace apps/api test` and `npm run lint` for anything
  touching `apps/api`.
