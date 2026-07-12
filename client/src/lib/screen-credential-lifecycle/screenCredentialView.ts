/** Recovery presentation helpers — no authentication material. */

export function renderRecoveryQrHtml(recoveryQrSvg: string): { __html: string } {
  return { __html: recoveryQrSvg };
}
