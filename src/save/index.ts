// Save orchestration. One controller per session holds the file handle and the
// baseline generation (the copy number the app is working from), routes to the
// right path, and returns a typed result the UI turns into a calm confirmation
// or a clear warning.

import type { Vault } from "../vault";
import { serialize } from "../template";
import { supportsFileSystemAccess } from "./capability";
import { decideSave, forcedGeneration } from "./generation";
import {
  pickSaveFile as realPickSaveFile,
  readDiskGeneration,
  writeFile,
  type FileHandleLike,
} from "./fsAccess";
import { DOWNLOAD_FILENAME, triggerDownload as realTriggerDownload } from "./download";

export const SUGGESTED_FILENAME = "the-twenty-year-letter.html";

export type SaveResult =
  | { status: "saved"; vault: Vault; via: "fsAccess" | "download" }
  | { status: "stale"; diskGeneration: number; myGeneration: number }
  | { status: "cancelled" }
  | { status: "error"; message: string };

export interface SaveDeps {
  now: () => string;
  supportsFsa: () => boolean;
  pickSaveFile: (suggestedName: string) => Promise<FileHandleLike>;
  readDiskGeneration: (handle: FileHandleLike) => Promise<number>;
  writeFile: (handle: FileHandleLike, contents: string) => Promise<void>;
  triggerDownload: (filename: string, contents: string) => void;
}

export const defaultSaveDeps: SaveDeps = {
  now: () => new Date().toISOString(),
  supportsFsa: supportsFileSystemAccess,
  pickSaveFile: realPickSaveFile,
  readDiskGeneration,
  writeFile,
  triggerDownload: realTriggerDownload,
};

// Build the outgoing vault for a save: the new copy number, the saved moment,
// and a stable fileId minted on first save. Pure, so it is easy to reason about.
export function applySaveMeta(
  vault: Vault,
  generation: number,
  nowIso: string,
  mintId: () => string,
): Vault {
  return {
    ...vault,
    generation,
    savedAt: nowIso,
    fileId: vault.fileId || mintId(),
  };
}

export class SaveController {
  private handle: FileHandleLike | null = null;
  private baseline: number;
  private deps: SaveDeps;
  private mintId: () => string;

  constructor(
    baselineGeneration: number,
    deps: Partial<SaveDeps> = {},
    mintId: () => string = () => cryptoId(),
  ) {
    this.baseline = baselineGeneration;
    this.deps = { ...defaultSaveDeps, ...deps };
    this.mintId = mintId;
  }

  get baselineGeneration(): number {
    return this.baseline;
  }

  usesFileSystem(): boolean {
    return this.deps.supportsFsa();
  }

  // True before the first save of a session on the Chromium path, when we must
  // ask the parent where their file lives.
  needsFilePick(): boolean {
    return this.usesFileSystem() && this.handle === null;
  }

  async save(vault: Vault): Promise<SaveResult> {
    try {
      if (this.usesFileSystem()) return await this.saveViaFsa(vault, false);
      return this.saveViaDownload(vault);
    } catch (err) {
      return { status: "error", message: messageFrom(err) };
    }
  }

  // Called after the parent chooses "Replace with my open copy" in the
  // stale-copy dialog. Climbs above both copies, then writes.
  async saveReplacingDisk(vault: Vault): Promise<SaveResult> {
    try {
      return await this.saveViaFsa(vault, true);
    } catch (err) {
      return { status: "error", message: messageFrom(err) };
    }
  }

  private async saveViaFsa(vault: Vault, force: boolean): Promise<SaveResult> {
    if (this.handle === null) {
      try {
        this.handle = await this.deps.pickSaveFile(SUGGESTED_FILENAME);
      } catch (err) {
        if (isAbort(err)) return { status: "cancelled" };
        throw err;
      }
    }
    const handle = this.handle;
    const diskGeneration = await this.deps.readDiskGeneration(handle);

    let outgoing: number;
    if (force) {
      outgoing = forcedGeneration(this.baseline, diskGeneration);
    } else {
      const decision = decideSave(this.baseline, diskGeneration);
      if (decision.action === "warn") {
        return {
          status: "stale",
          diskGeneration: decision.diskGeneration,
          myGeneration: this.baseline,
        };
      }
      outgoing = decision.outgoing;
    }

    const next = applySaveMeta(vault, outgoing, this.deps.now(), this.mintId);
    await this.deps.writeFile(handle, serialize(next));
    this.baseline = outgoing;
    return { status: "saved", vault: next, via: "fsAccess" };
  }

  private saveViaDownload(vault: Vault): SaveResult {
    const outgoing = this.baseline + 1;
    const next = applySaveMeta(vault, outgoing, this.deps.now(), this.mintId);
    this.deps.triggerDownload(DOWNLOAD_FILENAME, serialize(next));
    this.baseline = outgoing;
    return { status: "saved", vault: next, via: "download" };
  }
}

function cryptoId(): string {
  const c = globalThis.crypto as Crypto | undefined;
  if (c && typeof c.randomUUID === "function") return c.randomUUID();
  let out = "";
  for (let i = 0; i < 32; i++) out += Math.floor(Math.random() * 16).toString(16);
  return out;
}

function isAbort(err: unknown): boolean {
  return err instanceof Error && (err.name === "AbortError" || err.name === "NotAllowedError");
}

function messageFrom(err: unknown): string {
  if (err instanceof Error && err.message) return err.message;
  return "The save could not finish. Your file on disk is unchanged.";
}
