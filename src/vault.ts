// The vault is the whole app state. It lives inside the HTML file itself,
// embedded as JSON. This module owns its shape, parsing, and forward-only
// migration. There is no database: schemaVersion + migrate() is the whole
// migration surface.

export const SCHEMA_VERSION = 2;

export type Child = { name: string; birthDate: string | null };

// A photo, recompressed in the browser before it is embedded. dataUrl is a
// JPEG data URL; bytes is its decoded payload size, tracked for the budget.
export type Photo = {
  id: string;
  dataUrl: string;
  caption: string; // free text, may be ""
  w: number; // recompressed pixel width
  h: number; // recompressed pixel height
  bytes: number; // recompressed size in bytes
  [extra: string]: unknown; // unknown future fields preserved, not dropped
};

export type Entry = {
  id: string;
  type: "letter";
  createdAt: string; // ISO
  occasion: string; // free text, may be "" (added in v2)
  title: string;
  body: string; // plain text
  photos: Photo[]; // may be [] (added in v2)
  [extra: string]: unknown; // unknown future fields preserved, not dropped
};

export type Vault = {
  schemaVersion: number;
  generation: number;
  savedAt: string | null;
  fileId: string;
  child: Child | null;
  entries: Entry[];
  firstRunDone: boolean;
  [extra: string]: unknown; // unknown future fields preserved, not dropped
};

// Thrown whenever the vault cannot be trusted. The UI turns this into the
// designed error state; it never reaches the parent as a stack trace.
export class VaultParseError extends Error {
  readonly kind: "malformed" | "newer-version";
  constructor(message: string, kind: "malformed" | "newer-version" = "malformed") {
    super(message);
    this.name = "VaultParseError";
    this.kind = kind;
  }
}

export function emptyVault(): Vault {
  return {
    schemaVersion: SCHEMA_VERSION,
    generation: 0,
    savedAt: null,
    fileId: "",
    child: null,
    entries: [],
    firstRunDone: false,
  };
}

// Forward-only. Each case raises the version and adds fields, never mutating
// the meaning of an existing field. A file that reaches an older shell hits
// the newer-version error state instead of silently losing its new fields.
export function migrate(raw: Record<string, unknown>): Record<string, unknown> {
  const version = raw.schemaVersion as number;
  let data = raw;
  if (version < 1) {
    throw new VaultParseError("This file is older than any version we know.");
  }
  if (data.schemaVersion === 1) {
    data = migrateV1toV2(data);
  }
  return data;
}

// v1 entries had no occasion or photos. Fill both with empty defaults so every
// entry carries the v2 shape; existing fields are untouched.
function migrateV1toV2(data: Record<string, unknown>): Record<string, unknown> {
  const entries = Array.isArray(data.entries)
    ? data.entries.map((entry) => {
        if (!isObject(entry)) return entry; // validateEntry will reject it
        const next = { ...entry };
        if (!("occasion" in next)) next.occasion = "";
        if (!("photos" in next)) next.photos = [];
        return next;
      })
    : data.entries;
  return { ...data, entries, schemaVersion: 2 };
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function validatePhoto(value: unknown): Photo {
  if (!isObject(value)) throw new VaultParseError("A photo is not readable.");
  if (typeof value.id !== "string") throw new VaultParseError("A photo is missing its id.");
  if (typeof value.dataUrl !== "string") throw new VaultParseError("A photo is missing its image.");
  if (typeof value.caption !== "string")
    throw new VaultParseError("A photo caption is not readable.");
  if (!isFiniteNumber(value.w) || !isFiniteNumber(value.h))
    throw new VaultParseError("A photo size is not readable.");
  if (!isFiniteNumber(value.bytes)) throw new VaultParseError("A photo size is not readable.");
  return value as unknown as Photo;
}

function validateEntry(value: unknown): Entry {
  if (!isObject(value)) throw new VaultParseError("An entry is not readable.");
  if (typeof value.id !== "string") throw new VaultParseError("An entry is missing its id.");
  if (value.type !== "letter") throw new VaultParseError("An entry has an unknown type.");
  if (typeof value.createdAt !== "string")
    throw new VaultParseError("An entry is missing its date.");
  if (typeof value.occasion !== "string")
    throw new VaultParseError("An entry's occasion is not readable.");
  if (typeof value.title !== "string") throw new VaultParseError("An entry is missing its title.");
  if (typeof value.body !== "string") throw new VaultParseError("An entry is missing its text.");
  if (!Array.isArray(value.photos)) throw new VaultParseError("An entry's photos are not readable.");
  // Validate each photo; keep the entry's own object so unknown fields survive.
  const photos = value.photos.map(validatePhoto);
  return { ...value, photos } as unknown as Entry;
}

function validateChild(value: unknown): Child | null {
  if (value === null) return null;
  if (!isObject(value)) throw new VaultParseError("The child details are not readable.");
  if (typeof value.name !== "string") throw new VaultParseError("The child name is not readable.");
  if (value.birthDate !== null && typeof value.birthDate !== "string")
    throw new VaultParseError("The birth date is not readable.");
  return value as unknown as Child;
}

// Parse text pulled from the vault-data block. Any failure throws
// VaultParseError; the parent's file on disk is never touched by a parse.
export function parseVault(text: string): Vault {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    throw new VaultParseError("The saved data is not readable.");
  }
  if (!isObject(raw)) throw new VaultParseError("The saved data is not an object.");
  if (typeof raw.schemaVersion !== "number" || !Number.isFinite(raw.schemaVersion)) {
    throw new VaultParseError("The saved data has no version.");
  }
  if (raw.schemaVersion > SCHEMA_VERSION) {
    throw new VaultParseError(
      "This file was saved by a newer version.",
      "newer-version",
    );
  }

  const migrated = migrate(raw);

  if (typeof migrated.generation !== "number" || !Number.isFinite(migrated.generation)) {
    throw new VaultParseError("The copy number is not readable.");
  }
  if (migrated.savedAt !== null && typeof migrated.savedAt !== "string") {
    throw new VaultParseError("The saved date is not readable.");
  }
  if (typeof migrated.fileId !== "string") {
    throw new VaultParseError("The file id is not readable.");
  }
  if (!Array.isArray(migrated.entries)) {
    throw new VaultParseError("The letters are not readable.");
  }
  const entries = migrated.entries.map(validateEntry);
  const child = validateChild(migrated.child);
  const firstRunDone =
    typeof migrated.firstRunDone === "boolean" ? migrated.firstRunDone : false;

  // Preserve unknown fields: start from the migrated object so nothing a newer
  // version wrote is dropped, then overwrite the known fields with validated
  // values.
  return {
    ...migrated,
    schemaVersion: SCHEMA_VERSION,
    generation: migrated.generation,
    savedAt: migrated.savedAt,
    fileId: migrated.fileId,
    child,
    entries,
    firstRunDone,
  } as Vault;
}
