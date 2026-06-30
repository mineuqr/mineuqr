/**
 * PRINT-WORKSPACE-1 — operator action contracts only.
 * No implementation; reserved for PRINTING-1 / PRINT-CONNECTOR-1.
 */

export type PrintWorkspaceActionContext = {
  restaurantId: number;
  orderId: number;
  orderNumber: string;
  operatorUserId: number;
};

export type PrintOrderCommand = PrintWorkspaceActionContext;

export type ReprintOrderCommand = PrintWorkspaceActionContext & {
  reason?: string;
};

export type PreviewTicketCommand = PrintWorkspaceActionContext;

export type MarkPrintedCommand = PrintWorkspaceActionContext & {
  printedAt?: string;
};

export type CancelPrintCommand = PrintWorkspaceActionContext & {
  reason?: string;
};

export interface PrintWorkspaceActionPort {
  printOrder(command: PrintOrderCommand): Promise<void>;
  reprint(command: ReprintOrderCommand): Promise<void>;
  preview(command: PreviewTicketCommand): Promise<void>;
  markPrinted(command: MarkPrintedCommand): Promise<void>;
  cancelPrint(command: CancelPrintCommand): Promise<void>;
}
