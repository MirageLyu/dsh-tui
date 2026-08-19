/**
 * Approval answerer for the interactive chat channel. Registers a scoped
 * `approval/request` waterfall answerer, presents one approval dialog at a
 * time in FIFO order, and settles each request on decision, abort, overlay
 * error, or channel shutdown. Requests for other agents fall through to the
 * next answerer via `next()`.
 * @module @deepseek-ai/dsh-tui/chat/approval
 */

import type { Agent } from '@deepseek-ai/dsh-agent'
import type { ApprovalOutcome, ApprovalRequest } from '@deepseek-ai/dsh-user-approval'
import type { TuiOverlaySession } from '../extension/types.ts'
import { ApprovalDialog } from '../components/dialogs.ts'
import type { ChatChannelDeps } from './channel.ts'

/** Collaborators the approval queue needs from the chat channel. */
export interface ApprovalQueueDeps extends ChatChannelDeps {
  /** Exact agent whose requests this answerer claims. */
  readonly agent: Agent
}

/** One queued or active approval request and its pending overlay. */
interface PendingApproval {
  request: ApprovalRequest
  resolve(outcome: ApprovalOutcome): void
  overlay: TuiOverlaySession | undefined
  onAbort: () => void
}

/** Approval answerer controller for one chat channel. */
export interface ApprovalQueue {
  /** Settle the active and all queued requests as cancelled (shutdown). */
  rejectAll(): void
  /** Remove the waterfall answerer registration. */
  unregister(): void
}

/**
 * Build the approval answerer for one chat channel.
 * @param deps - channel collaborators and overlay host.
 * @returns the controller used at shutdown to drain and unregister.
 */
export function createApprovalQueue(deps: ApprovalQueueDeps): ApprovalQueue {
  const { ctx, agent, palette, overlayManager } = deps
  const pending: PendingApproval[] = []
  let active: PendingApproval | undefined

  const removeAbortListener = (entry: PendingApproval): void => {
    entry.request.signal?.removeEventListener('abort', entry.onAbort)
  }

  const settle = (entry: PendingApproval, outcome: ApprovalOutcome): void => {
    void entry.overlay?.close()
    entry.overlay = undefined
    removeAbortListener(entry)
    entry.resolve(outcome)
  }

  const startNext = (): void => {
    if (active !== undefined || deps.isDisposed()) return
    const entry = pending.shift()
    if (entry === undefined) return
    active = entry
    const show = (): void => {
      const session = overlayManager.open({
        ...entry.request.signal === undefined ? {} : { signal: entry.request.signal },
        create: () => new ApprovalDialog(
          entry.request,
          palette,
          (outcome) => {
            entry.overlay = undefined
            void session.close()
            active = undefined
            settle(entry, outcome)
            startNext()
          },
        ),
        options: { width: deps.resolved.questionDialogWidth, anchor: 'center', margin: 1 },
      }, 'inline')
      entry.overlay = session
      void session.closed.then((result) => {
        if (entry.overlay !== session) return
        entry.overlay = undefined
        /* v8 ignore next 2 -- close, abort, and shutdown settle the owner before this callback */
        if (result.reason !== 'error') return
        active = undefined
        removeAbortListener(entry)
        entry.resolve('cancelled')
        startNext()
      })
      deps.requestRender()
    }
    show()
  }


  const unregister = ctx.on('approval/request', (request, next) => {
    if (request.agent !== agent) return next()
    // An abort landing before registration would strand the pending entry;
    // settle synchronously like the service's own signal check.
    if (request.signal?.aborted === true) return Promise.resolve<ApprovalOutcome>('cancelled')
    return new Promise<ApprovalOutcome>((resolve) => {
      const entry: PendingApproval = {
        request,
        resolve,
        overlay: undefined,
        onAbort: () => {
          if (active === entry) {
            active = undefined
            settle(entry, 'cancelled')
            startNext()
            return
          }
          pending.splice(pending.indexOf(entry), 1)
          settle(entry, 'cancelled')
        },
      }
      request.signal?.addEventListener('abort', entry.onAbort, { once: true })
      pending.push(entry)
      startNext()
    })
  })

  return {
    rejectAll(): void {
      if (active !== undefined) {
        const entry = active
        active = undefined
        settle(entry, 'cancelled')
      }
      for (const entry of pending.splice(0)) settle(entry, 'cancelled')
    },
    unregister,
  }
}
