// Which save path this browser can use. Chromium-family browsers expose the
// File System Access API, so we can write straight back to the parent's file.
// Everywhere else we fall back to the download-and-replace ritual.
export function supportsFileSystemAccess(): boolean {
  return (
    typeof globalThis !== "undefined" &&
    typeof (globalThis as { showSaveFilePicker?: unknown }).showSaveFilePicker === "function"
  );
}
