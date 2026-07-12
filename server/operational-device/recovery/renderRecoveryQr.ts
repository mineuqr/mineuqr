import QRCode from "qrcode";

/** Server-side QR rendering — recovery plaintext never sent to operator JavaScript. */
export async function renderRecoveryQrSvg(payloadJson: string): Promise<string> {
  return QRCode.toString(payloadJson, {
    type: "svg",
    errorCorrectionLevel: "M",
    margin: 1,
    width: 200,
  });
}
