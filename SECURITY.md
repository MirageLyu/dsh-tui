# Security Policy

## Supported versions

Only the latest published release of `@miragelyu/dsh-tui` receives security fixes. The pinned `@deepseek-ai/dsh-*` family in `package.json` is the compatibility statement; older families are unsupported.

## Reporting a vulnerability

Report vulnerabilities privately through [GitHub Security Advisories](https://github.com/MirageLyu/dsh-tui/security/advisories/new) on this repository. Do not open a public issue.

Include:

- the affected version and the `dsh --version` / seam-family versions it ran against
- a minimal reproduction, when one exists
- the impact you expect

We acknowledge within 5 business days and publish a fix together with an advisory.

## What to report

- Escape-sequence or terminal-title injection: any path where untrusted text (model output, tool results, session titles, filenames) could reach the terminal renderer without going through `host.display()` or the palette wrappers
- Overlay or dialog state leaking across sessions, plugins, or disposal boundaries
- Anything in the resume handoff (`ctx.tuiResumeHost`) that could commit process teardown before validating the workspace
- Supply-chain issues in the pinned dependencies

## Out of scope

- Model-output content itself (the TUI renders what the model produces; harness-level policy lives in the dsh repository)
- Behavior of the dsh launcher, profiles, or seam packages — report those to [deepseek-ai/deepseek-harness](https://github.com/deepseek-ai/deepseek-harness/security)
- Vulnerabilities in terminal emulators triggered by user-initiated terminal input
