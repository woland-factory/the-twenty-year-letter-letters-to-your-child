// Standard modal focus management, shared by the dialogs. On open it moves focus
// into the dialog (onto the given control, or the dialog itself), keeps Tab and
// Shift+Tab cycling within the dialog, and on close returns focus to whatever the
// parent had focused before it opened.

import { useEffect } from "preact/hooks";
import type { RefObject } from "preact";

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), textarea:not([disabled]), ' +
  'select:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function useDialogFocus(
  dialogRef: RefObject<HTMLElement>,
  initialFocus?: RefObject<HTMLElement>,
) {
  useEffect(() => {
    const previouslyFocused = document.activeElement as HTMLElement | null;
    const dialog = dialogRef.current;

    function focusables(): HTMLElement[] {
      if (!dialog) return [];
      return Array.from(dialog.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
        (el) => el.offsetParent !== null || el === document.activeElement,
      );
    }

    (initialFocus?.current ?? dialog)?.focus();

    function onKeyDown(e: KeyboardEvent) {
      if (e.key !== "Tab") return;
      const items = focusables();
      if (items.length === 0) {
        e.preventDefault();
        return;
      }
      const first = items[0];
      const last = items[items.length - 1];
      const active = document.activeElement;
      if (e.shiftKey) {
        if (active === first || !dialog?.contains(active)) {
          e.preventDefault();
          last.focus();
        }
      } else if (active === last || !dialog?.contains(active)) {
        e.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      previouslyFocused?.focus?.();
    };
  }, []);
}
