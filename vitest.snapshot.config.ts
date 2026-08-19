import { availableParallelism } from 'node:os'
import { defineConfig } from 'vitest/config'

const DEFAULT_SNAPSHOT_MAX_CONCURRENCY = 5

function positiveIntFromEnv(name: string, fallback: number): number {
  const raw = process.env[name]
  if (raw === undefined || raw === '') return fallback

  const value = Number(raw)
  if (!Number.isInteger(value) || value < 1) {
    throw new Error(`${name} must be a positive integer, got ${JSON.stringify(raw)}`)
  }
  return value
}

const snapshotMaxConcurrency = positiveIntFromEnv(
  'DSH_SNAPSHOT_MAX_CONCURRENCY',
  Math.min(DEFAULT_SNAPSHOT_MAX_CONCURRENCY, availableParallelism()),
)

// Replay is the keyless default: boot the assembled composition from recorded
// model responses and diff terminal frames plus persisted-log expected
// outputs. `record` calls the real API and updates fixtures and expected
// outputs; `refresh` replays committed scripts and updates current expected
// outputs. Replay/refresh never load `.env`; only record reads a key from the
// environment or root `.env`.
if (process.env.DSH_SNAPSHOT === 'record') {
  try {
    process.loadEnvFile(new URL('.env', import.meta.url).pathname)
  } catch (error) {
    // ENOENT (no .env) is fine — the key may already be in the environment.
    if ((error as NodeJS.ErrnoException | null)?.code !== 'ENOENT') throw error
  }
}

export default defineConfig({
  test: {
    include: ['tests/**/*.snapshot.ts'],
    testTimeout: 120_000,
    hookTimeout: 30_000,
    fileParallelism: (process.env.DSH_SNAPSHOT || 'replay') === 'replay' && snapshotMaxConcurrency > 1,
    maxConcurrency: snapshotMaxConcurrency,
  },
})
