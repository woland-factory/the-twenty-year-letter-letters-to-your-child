// The paper key as words. A random 256-bit key is encoded as a 24-word BIP39
// list, and back. The words ARE the key material (a reversible encoding), never
// a passphrase. The final word carries the BIP39 checksum, so a mistyped word
// is caught here, before any decryption is attempted.

import { entropyToMnemonic, mnemonicToEntropy } from "@scure/bip39";
import { wordlist } from "@scure/bip39/wordlists/english";
import { UnsealError } from "./seal";

// 32 bytes (256 bits) -> exactly 24 words.
export function bytesToWords(bytes: Uint8Array): string[] {
  return entropyToMnemonic(bytes, wordlist).split(" ");
}

// Normalize what a parent typed (trim, lowercase, collapse whitespace), then
// validate with the wordlist and checksum. Any unknown word, wrong count, or
// checksum mismatch throws UnsealError "bad-words" so the caller shows the calm
// keyed message and never touches the crypto.
export function wordsToBytes(words: string[]): Uint8Array {
  const phrase = words.join(" ").trim().toLowerCase().replace(/\s+/g, " ");
  try {
    return mnemonicToEntropy(phrase, wordlist);
  } catch {
    throw new UnsealError("Those words are not a valid key.", "bad-words");
  }
}
