# @miragelyu/pi-tui

A fork of [`@earendil-works/pi-tui@0.80.7`](https://www.npmjs.com/package/@earendil-works/pi-tui) with the
[editor prompt patch](../../patches/@earendil-works__pi-tui@0.80.7.patch) applied to `dist/`: fixed-width first and
continuation prompt prefixes, the `frame: "horizontal" | "none"` editor option, and `Editor.setPrompt()`.

The fork exists because pnpm patches do not travel with published packages: a registry install of `@miragelyu/dsh-tui`
into a `dsh` profile would otherwise fetch an unpatched pi-tui and crash at startup. The TUI depends on this package
through an npm alias (`"@earendil-works/pi-tui": "npm:@miragelyu/pi-tui@0.80.7"`), so its source imports keep the
upstream name while every install resolves to the patched fork.

**Updating**: unpack the new upstream tarball into this directory, re-apply the patch (`git apply --directory=vendor/pi-tui`),
fix the manifest (name, publishConfig, repository, description), and publish with a `pi-tui-v<version>` tag.
