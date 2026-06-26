/**
 * PRINTING-RENDERING-1B — device capability contracts (rendering preparation only).
 *
 * Execution of QR, images, cutter, and drawer is out of scope for 1B.
 */
export type TicketRenderDeviceCapabilities = {
  cutter: boolean;
  cashDrawer: boolean;
  qrCode: boolean;
  imagePrinting: boolean;
};

export const DEFAULT_TICKET_RENDER_DEVICE_CAPABILITIES: TicketRenderDeviceCapabilities = {
  cutter: true,
  cashDrawer: false,
  qrCode: false,
  imagePrinting: false,
};

export type TicketRenderCapabilityDecision = {
  emitCut: boolean;
  emitDrawerKick: boolean;
  renderQrPlaceholders: boolean;
  renderImagePlaceholders: boolean;
};

export function resolveTicketRenderCapabilityDecision(input: {
  documentCut: boolean;
  capabilities?: TicketRenderDeviceCapabilities;
}): TicketRenderCapabilityDecision {
  const capabilities = input.capabilities ?? DEFAULT_TICKET_RENDER_DEVICE_CAPABILITIES;

  return {
    emitCut: input.documentCut && capabilities.cutter,
    emitDrawerKick: false,
    renderQrPlaceholders: capabilities.qrCode,
    renderImagePlaceholders: capabilities.imagePrinting,
  };
}
