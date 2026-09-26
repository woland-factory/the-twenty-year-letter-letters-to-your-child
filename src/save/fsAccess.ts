// The Chromium in-place path. We hold a file handle for the session and write
// straight to the parent's file. Before every write we re-read what is on disk
// so we never quietly overwrite a newer copy.

import { parseVault } from "../vault";

export interface WritableFileLike {
  write(data: string): Promise<void>;
  close(): Promise<void>;
}

export interface FileHandleLike {
  getFile(): Promise<{ text(): Promise<string> }>;
  createWritable(): Promise<WritableFileLike>;
}

export async function pickSaveFile(suggestedName: string): Promise<FileHandleLike> {
  const picker = (
    globalThis as {
      showSaveFilePicker?: (opts: unknown) => Promise<FileHandleLike>;
    }
  ).showSaveFilePicker;
  if (!picker) throw new Error("This browser cannot pick a file to save.");
  return picker({
    suggestedName,
    types: [
      {
        description: "The Twenty-Year Letter file",
        accept: { "text/html": [".html"] },
      },
    ],
  });
}

// Read the generation the file on disk currently carries. Returns -1 when the
// file is empty or unreadable, which we treat as "not newer than anything".
// We parse the HTML and read the real #vault-data element rather than scan with
// a regex: the app's own source (inlined into the file) contains marker strings
// as text, and only the genuine element is a parseable node.
export async function readDiskGeneration(handle: FileHandleLike): Promise<number> {
  try {
    const file = await handle.getFile();
    const text = await file.text();
    if (!text.trim()) return -1;
    const doc = new DOMParser().parseFromString(text, "text/html");
    const el = doc.getElementById("vault-data");
    if (!el || !el.textContent) return -1;
    const disk = parseVault(el.textContent);
    return disk.generation;
  } catch {
    return -1;
  }
}

export async function writeFile(handle: FileHandleLike, contents: string): Promise<void> {
  const writable = await handle.createWritable();
  await writable.write(contents);
  await writable.close();
}
