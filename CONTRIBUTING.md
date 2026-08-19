# Contributing

Thanks for contributing to the terminal UI. This repository is the standalone home of `@miragelyu/dsh-tui`, an out-of-tree plugin bundle for [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness). Everything here — the interaction surface, configuration, and rendering contracts — lives behind the [README](README.md), the [behavioral contract](docs/contract.md), and the [service contracts](docs/terminal-ui.md).

## Setup

Node in the dsh engines range (`^22.19.0 || >=24.0.0`) and pnpm 11:

```sh
pnpm install        # installs the pinned seam family from the registry
```

## Checks

| Command | What it verifies |
|---|---|
| `pnpm typecheck` | tsc over `src/` and `tests/` |
| `pnpm build` | the publishable `lib/` bundles |
| `pnpm test` | 243 behavioral specs against the pinned seams |
| `pnpm test:snapshot` | 36 assembled recorded-session snapshots, keyless replay |

CI runs all four on Ubuntu, macOS, and Windows.

### Snapshots

The snapshot suites replay recorded session logs through the assembled composition and diff terminal frames. Replay needs no key. Recording new fixtures or refreshing goldens needs a real model key:

```sh
DSH_SNAPSHOT=record pnpm test:snapshot     # re-record fixtures (calls the API)
DSH_SNAPSHOT=refresh pnpm test:snapshot    # refresh goldens from committed fixtures
```

Record only when the model-visible output genuinely changed; fix fixtures, not normalizers.

## The seam-family rule

`package.json` pins every `@deepseek-ai/dsh-*` package to one published family (`0.1.0-rc.7` today), plus `@deepseek-ai/cordis` 4.x and `@deepseek-ai/cordis-plugin-loader` 1.x. Bump the family as a whole — never one package at a time — and land the bump only when all suites pass on the new set. The bundle resolves its peers from the running dsh installation at runtime, so the pinned family is also the compatibility statement published in the README.

## Changes

- Tests describe behavior: change obsolete behavior together with its tests.
- User-visible behavior changes update the README and `docs/contract.md` in the same PR.
- Non-trivial decisions get an Agent Note under `.agents/notes/implemented/` (bilingual, with the hash record), following the format of the existing notes.
- Keep terminal rendering to the palette in `src/components/theme.ts`; new colors are a contract change, not a local tweak.

## Pull requests

The [PR template](.github/PULL_REQUEST_TEMPLATE.md) lists the checklist. CI must be green; snapshots are part of the gate.
