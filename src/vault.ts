// The vault is the whole app state. It lives inside the HTML file itself,
// embedded as JSON. This module owns its shape, parsing, and forward-only
// migration. There is no database: schemaVersion + migrate() is the whole
// migration surface.

export const SCHEMA_VERSION = 4;

export type Child = { name: string; birthDate: string | null };

// One prompt and its verbatim answer inside an interview entry. promptText is
// stored on the entry, not looked up from the pack at render time, so an
// interview recorded in 2030 always shows its 2030 wording even if the pack is
// edited later. The entry is self-describing: the 20-year-artifact rule.
export type InterviewAnswer = {
  promptId: string; // stable id of the prompt as asked
  promptText: string; // the exact question text asked, stored verbatim
  answerText: string; // the child's answer, stored verbatim (may be "")
};

// A sealed entry carries only this blob. The letter's key is never here: it
// exists only on the paper the family keeps. iv and ciphertext are base64;
// keyHint is the parent's plaintext reminder of where the paper key lives.
export type Sealed = {
  iv: string; // base64, 12-byte AES-GCM nonce, fresh per seal
  ciphertext: string; // base64, AES-GCM output including the auth tag
  keyHint: string; // parent-chosen reminder, plaintext (the only human label)
  sealedAt: string; // ISO
  [extra: string]: unknown; // unknown future fields preserved, not dropped
};

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
  type: "letter" | "interview"; // "interview" added in v4
  createdAt: string; // ISO
  occasion: string; // free text, may be "" (added in v2; "" on an interview)
  title: string;
  body: string; // plain text ("" on an interview and on a sealed entry)
  photos: Photo[]; // may be [] (added in v2; [] on an interview and a sealed entry)
  childAgeYears?: number; // interview-only, present iff unsealed (added in v4)
  answers?: InterviewAnswer[]; // interview-only, present iff unsealed (added in v4)
  sealed?: Sealed; // present iff the entry is sealed (added in v3)
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
  if (data.schemaVersion === 2) {
    data = migrateV2toV3(data);
  }
  if (data.schemaVersion === 3) {
    data = migrateV3toV4(data);
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

// v3 adds the optional sealed blob on entries. A v2 vault has no sealed
// entries, so only the version bumps; existing entries are untouched.
function migrateV2toV3(data: Record<string, unknown>): Record<string, unknown> {
  return { ...data, schemaVersion: 3 };
}

// v4 adds the interview entry type. A v3 vault has no interview entries, so only
// the version bumps; existing entries are untouched.
function migrateV3toV4(data: Record<string, unknown>): Record<string, unknown> {
  return { ...data, schemaVersion: 4 };
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

function validateSealed(value: unknown): Sealed {
  if (!isObject(value)) throw new VaultParseError("A sealed letter is not readable.");
  if (typeof value.iv !== "string") throw new VaultParseError("A sealed letter is not readable.");
  if (typeof value.ciphertext !== "string")
    throw new VaultParseError("A sealed letter is not readable.");
  if (typeof value.keyHint !== "string")
    throw new VaultParseError("A sealed letter is not readable.");
  if (typeof value.sealedAt !== "string")
    throw new VaultParseError("A sealed letter is not readable.");
  // Keep the object itself so unknown extra fields survive, like every other field.
  return value as unknown as Sealed;
}

function validateAnswers(value: unknown): InterviewAnswer[] {
  if (!Array.isArray(value)) throw new VaultParseError("An interview answer is not readable.");
  for (const item of value) {
    if (
      !isObject(item) ||
      typeof item.promptId !== "string" ||
      typeof item.promptText !== "string" ||
      typeof item.answerText !== "string"
    ) {
      throw new VaultParseError("An interview answer is not readable.");
    }
  }
  return value as unknown as InterviewAnswer[];
}

function validateEntry(value: unknown): Entry {
  if (!isObject(value)) throw new VaultParseError("An entry is not readable.");
  if (typeof value.id !== "string") throw new VaultParseError("An entry is missing its id.");
  if (value.type !== "letter" && value.type !== "interview")
    throw new VaultParseError("An entry has an unknown type.");
  if (typeof value.createdAt !== "string")
    throw new VaultParseError("An entry is missing its date.");
  if (typeof value.occasion !== "string")
    throw new VaultParseError("An entry's occasion is not readable.");
  if (typeof value.title !== "string") throw new VaultParseError("An entry is missing its title.");
  if (typeof value.body !== "string") throw new VaultParseError("An entry is missing its text.");
  if (!Array.isArray(value.photos)) throw new VaultParseError("An entry's photos are not readable.");
  // Validate each photo; keep the entry's own object so unknown fields survive.
  const photos = value.photos.map(validatePhoto);
  // Interview fields, present only on an unsealed interview. A sealed interview
  // has neither, so they are optional. Malformed ones reach the designed error
  // state, never a silent drop.
  const answers = value.answers !== undefined ? validateAnswers(value.answers) : undefined;
  if (value.childAgeYears !== undefined && !isFiniteNumber(value.childAgeYears)) {
    throw new VaultParseError("An interview age is not readable.");
  }
  const withInterview = answers !== undefined ? { ...value, answers } : value;
  // A sealed entry carries the sealed blob; validate it when present. A
  // malformed blob reaches the designed error state, never a silent drop.
  if (value.sealed !== undefined && value.sealed !== null) {
    const sealed = validateSealed(value.sealed);
    return { ...withInterview, photos, sealed } as unknown as Entry;
  }
  return { ...withInterview, photos } as unknown as Entry;
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
