import type { PlatformType } from "./PlatformType";
import type { TransportType } from "./TransportType";

export type PrinterInfo = {
  id: string;
  name: string;
  platform: PlatformType;
  transport: TransportType;
  isDefault: boolean;
  isOnline: boolean;
  location?: string | null;
  manufacturer?: string | null;
};
