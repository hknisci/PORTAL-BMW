// src/utils/file.ts
export function downloadBlob(
  content: string | Blob,
  filename: string,
  mimeType = "text/plain;charset=utf-8;"
) {
  const blob = content instanceof Blob
    ? content
    : new Blob([content], { type: mimeType });

  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = filename;

  document.body.appendChild(a);
  a.click();

  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}