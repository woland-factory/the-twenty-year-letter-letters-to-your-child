// The signature moment: sealing a letter and, eighteen years later, opening it
// again. A random 256-bit key encrypts the letter with AES-GCM in the browser.
// The key never enters the vault. It leaves this module once, as 24 words for
// the paper key sheet, and is then discarded.

import { base64 } from "@scure/base";
import type { InterviewAnswer, Photo, Sealed } from "./vault";
import { bytesToWords, wordsToBytes } from "./mnemonic";

// Exactly the content stripped from an entry when it is sealed. The interview
// fields are present only when the sealed entry was an interview; seal() and
// unsealWithWords() only JSON-serialize the payload, so they flow through with
// no crypto change.
export type SealedPayload = {
  occasion: string;
  title: string;
  body: string;
  photos: Photo[];
  childAgeYears?: number; // present when the sealed entry was an interview
  answers?: InterviewAnswer[]; // present when the sealed entry was an interview
};

// Both unseal paths (typed words, scanned QR) fail through this one error, so
// the UI shows one calm keyed message and the vault is never touched.
export class UnsealError extends Error {
  readonly reason: "bad-words" | "wrong-key";
  constructor(message: string, reason: "bad-words" | "wrong-key") {
    super(message);
    this.name = "UnsealError";
    this.reason = reason;
  }
}

// Whether this browser can seal. crypto.subtle is available on file:// in every
// engine we target; when it is missing we disable sealing and leave the rest of
// the app working, mirroring the save capability pattern.
export function sealingAvailable(): boolean {
  return typeof globalThis.crypto?.subtle !== "undefined";
}

function toBase64(bytes: Uint8Array): string {
  return base64.encode(bytes);
}

function fromBase64(text: string): Uint8Array {
  return base64.decode(text);
}

async function importKey(keyBytes: Uint8Array): Promise<CryptoKey> {
  return crypto.subtle.importKey("raw", keyBytes, { name: "AES-GCM" }, false, [
    "encrypt",
    "decrypt",
  ]);
}

// Encrypt the payload with a fresh random key and IV. Returns the sealed blob
// (safe to store in the vault) and the 24 words (for the key sheet only). The
// raw key and words are the caller's to show once and then discard; they are
// never put on the blob and never logged.
export async function seal(
  payload: SealedPayload,
  keyHint: string,
  sealedAtIso: string,
): Promise<{ sealed: Sealed; words: string[] }> {
  const keyBytes = crypto.getRandomValues(new Uint8Array(32));
  const key = await importKey(keyBytes);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const data = new TextEncoder().encode(JSON.stringify(payload));
  const ct = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, data));
  const sealed: Sealed = {
    iv: toBase64(iv),
    ciphertext: toBase64(ct),
    keyHint,
    sealedAt: sealedAtIso,
  };
  return { sealed, words: bytesToWords(keyBytes) };
}

// Open a sealed letter from the 24 words. A bad or mistyped word fails as
// "bad-words" before any crypto runs; a valid-but-wrong key (or tampered
// ciphertext) fails the auth check and becomes "wrong-key". Pure read: it never
// touches the vault, so a failure cannot corrupt anything.
export async function unsealWithWords(
  sealed: Sealed,
  words: string[],
): Promise<SealedPayload> {
  const keyBytes = wordsToBytes(words); // throws UnsealError "bad-words"
  let plaintext: ArrayBuffer;
  try {
    const key = await importKey(keyBytes);
    plaintext = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv: fromBase64(sealed.iv) },
      key,
      fromBase64(sealed.ciphertext),
    );
  } catch {
    throw new UnsealError("That key does not open this letter.", "wrong-key");
  }
  return JSON.parse(new TextDecoder().decode(plaintext)) as SealedPayload;
}
