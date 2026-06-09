export type ReportDownloadPayload = {
  filename: string;
  mimeType: string;
  dataBase64: string;
};

/** Decode server export payload and trigger browser download. */
export function downloadReportFile(payload: ReportDownloadPayload): void {
  const binary = atob(payload.dataBase64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  const blob = new Blob([bytes], { type: payload.mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = payload.filename;
  link.click();
  URL.revokeObjectURL(url);
}
