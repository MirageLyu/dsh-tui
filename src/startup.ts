/**
 * The TUI app's command-line provider: it parses the `dsh --profile tui` flag
 * family (`--resume`, `--continue`, `--workspace`, `--model`) and its `--help`
 * text, then provides the immutable values as {@link TUI_STARTUP_SERVICE}.
 * Ordinary rows inject that service before reading it from lazy config.
 * @module @deepseek-ai/dsh-tui/startup
 */

import { Command } from 'commander'
import type { Context } from '@deepseek-ai/cordis'
import { parseCmdline } from '@deepseek-ai/dsh-cmdline'
import { isAbsolute, resolve } from 'node:path'

/** Stable Cordis plugin name. */
export const name = 'tui-startup'

/** Services required before the flags can be resolved. */
export const inject = ['cmdlineArgs']

/** Service provided by this ordinary plugin and injected by the runner row. */
export const TUI_STARTUP_SERVICE = 'tuiStartup'

declare module '@deepseek-ai/cordis' {
  interface Context {
    /** Parsed TUI flags, provided by the startup row; absent before it mounts or on --help. */
    tuiStartup?: TuiStartupValues
  }
}

/** What the runner reads from {@link TUI_STARTUP_SERVICE}. */
export interface TuiStartupValues {
  /** `--resume`: persisted session id to resume; absent leaves the choice to the runner. */
  resumeSessionId?: string
  /** `--continue`: resume the most recent persisted session instead of minting one. */
  continueMostRecent: boolean
  /** `--workspace`: absolute session workspace; defaults to the invoking directory. */
  workspace?: string
  /** `--model`: provider/model override for this session; absent uses the stored default. */
  model?: string
}

/** The TUI flag family, as commander parsed it. */
interface TuiOptions {
  resume?: string
  continue?: boolean
  workspace?: string
  model?: string
}

/**
 * This app's command: its flags, its description, and its help text.
 * @returns a fresh program, so one process can parse more than once (tests).
 */
function tuiCommand(): Command {
  return new Command()
    .name('dsh --profile tui')
    .description('Open the full-screen interactive terminal agent.')
    .helpOption('-h, --help', 'show this help')
    .option('--resume <session-id>', 'resume a persisted session by id (see /resume inside the app)')
    .option('--continue', 'resume the most recently persisted session')
    .option('--workspace <dir>', 'workspace directory for the session; defaults to the invoking directory')
    .option('--model <provider/model>', 'provider/model route for this session; defaults to the stored selection')
    .addHelpText('after', `
Examples:
  dsh --profile tui                        start a fresh session in this directory
  dsh --profile tui --continue             resume the most recent session
  dsh --profile tui --resume <id>          resume a specific persisted session
  dsh --profile tui --workspace ~/project open a fresh session in another workspace
`)
}

/**
 * Parse and provide the TUI invocation as an ordinary Cordis service. The
 * command's action publishes the flags this invocation named; `--resume`
 * combined with `--continue` or a non-absolute `--workspace` is a usage error,
 * so on rejection (and on `--help`) nothing is provided.
 * @param ctx - plugin context carrying the command line.
 */
export function apply(ctx: Context): void {
  const program = tuiCommand()
  program.action(() => {
    const options = program.opts<TuiOptions>()
    if (options.resume !== undefined && options.continue === true) {
      program.error('error: --resume and --continue are mutually exclusive')
    }
    if (options.resume === '' ) {
      program.error('error: --resume needs a session id')
    }
    if (options.workspace !== undefined && !isAbsolute(options.workspace)) {
      program.error(`error: --workspace must be an absolute path, got ${JSON.stringify(options.workspace)}`)
    }
    if (options.model !== undefined && options.model.trim() === '') {
      program.error('error: --model needs a provider/model value')
    }
    ctx.provide(TUI_STARTUP_SERVICE, {
      ...options.resume !== undefined && { resumeSessionId: options.resume },
      continueMostRecent: options.continue === true,
      ...options.workspace !== undefined && { workspace: resolve(options.workspace) },
      ...options.model !== undefined && { model: options.model },
    } satisfies TuiStartupValues)
  })
  parseCmdline(ctx, program)
}
