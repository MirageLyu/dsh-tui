# AGENTS.md — dsh-tui

Rules for this standalone repository.

- **The pinned seam versions are the contract.** `package.json` pins the
  `@deepseek-ai/dsh-*` family at the published versions this repository was
  tested against. Bumping one seam package bumps the whole family together,
  never individually, and the behavioral and snapshot suites must pass
  against the new set before the bump lands.
- **Present TUI designs in tmux, not in the session transcript.** When tmux
  is available, run the assembled TUI in a pane of the same window the
  session runs in and point the user at it; print a rendering into the
  transcript only as a fallback.
- **The TUI is an external plugin.** It must never rely on being shipped
  inside the dsh installation: every seam access goes through the public
  service contracts of the pinned packages, and installation is through
  `dsh plugin --profile <name> add @miragelyu/dsh-tui`.
