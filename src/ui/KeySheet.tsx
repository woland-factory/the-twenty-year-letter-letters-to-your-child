// The once-shown key sheet, right after a letter is sealed and saved. It holds
// the only copy of the key: 24 words and a QR of the same words. It says plainly
// the key is not in the file. Dismissing it clears the words from memory, so
// this screen is the single moment the key exists for the parent.

import { useMemo } from "preact/hooks";
import { qrSvg } from "../qr";

export function KeySheet({
  words,
  keyHint,
  onDismiss,
}: {
  words: string[];
  keyHint: string;
  onDismiss: () => void;
}) {
  const svg = useMemo(() => qrSvg(words.join(" ")), [words]);

  return (
    <div class="backdrop key-sheet-backdrop" role="presentation">
      <div
        class="key-sheet"
        role="dialog"
        aria-modal="true"
        aria-labelledby="key-sheet-title"
      >
        <h2 id="key-sheet-title">Your key for this letter</h2>
        <p class="key-sheet-note">Print this page and keep it safe. This key is not saved in your file.</p>
        {keyHint.trim() !== "" && (
          <p class="key-sheet-hint">Where the key lives: {keyHint}</p>
        )}

        <h3 class="key-sheet-subhead">Your 24 words</h3>
        <ol class="words-grid">
          {words.map((word, i) => (
            <li key={i} class="word">
              <span class="word-num">{i + 1}</span>
              <span class="word-text">{word}</span>
            </li>
          ))}
        </ol>

        <div class="key-sheet-qr">
          <h3 class="key-sheet-subhead">Or scan this code</h3>
          <div
            class="qr"
            role="img"
            aria-label="QR code of your 24 words"
            // Generated locally from the words, no external or user HTML.
            dangerouslySetInnerHTML={{ __html: svg }}
          />
        </div>

        <div class="key-sheet-actions">
          <button type="button" class="btn btn-primary" onClick={() => window.print()}>
            Print this key
          </button>
          <button type="button" class="btn btn-secondary" onClick={onDismiss}>
            I have saved the key
          </button>
        </div>
      </div>
    </div>
  );
}
