// The non-Chromium path. We cannot write to the parent's file directly, so we
// hand them a fresh copy and, in the ritual surface, tell them plainly which
// copy is now the real one.

export const DOWNLOAD_FILENAME = "the-twenty-year-letter.html";

export function triggerDownload(filename: string, contents: string): void {
  const blob = new Blob([contents], { type: "text/html" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  // Give the download a tick to start before releasing the blob.
  setTimeout(() => URL.revokeObjectURL(url), 0);
}
