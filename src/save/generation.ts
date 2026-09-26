// The generation counter is how a parent always knows which copy is real: it
// only ever goes up, and every save bumps it. These pure decisions are the
// heart of stale-copy protection, so they are unit-tested on their own.

// diskGeneration === -1 means the file on disk was empty or unreadable (for
// example the parent just picked a brand new file). That is never "stale".
export type SaveDecision =
  | { action: "write"; outgoing: number }
  | { action: "warn"; diskGeneration: number };

export function decideSave(baseline: number, diskGeneration: number): SaveDecision {
  if (diskGeneration > baseline) {
    return { action: "warn", diskGeneration };
  }
  return { action: "write", outgoing: baseline + 1 };
}

// When the parent chooses to replace a newer disk copy with their open copy,
// the outgoing generation must still climb above both so the canonical copy
// is always the highest number.
export function forcedGeneration(baseline: number, diskGeneration: number): number {
  return Math.max(baseline, diskGeneration) + 1;
}
