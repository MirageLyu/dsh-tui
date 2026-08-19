## Summary

What this PR changes and why. One or two sentences; the behavioral contract in [docs/contract.md](docs/contract.md) and the [README](README.md) document user-visible behavior, so name the sections that change.

## Checklist

- [ ] `pnpm typecheck` passes
- [ ] `pnpm test` passes
- [ ] `pnpm test:snapshot` passes (replay is keyless; record only when the model-visible output changes and needs re-recording)
- [ ] Docs updated in the same change: README, docs/contract.md, docs/terminal-ui.md, or the Agent Notes under `.agents/notes/`
- [ ] The pinned `@deepseek-ai/dsh-*` seam family is either untouched or bumped as a whole, with the suites green on the new set
