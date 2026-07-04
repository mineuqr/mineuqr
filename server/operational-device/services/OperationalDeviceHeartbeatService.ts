import { summarizeDeviceHealth } from "../domain/deviceHealth";
import type { OperationalDeviceStore } from "../infrastructure/OperationalDeviceStore";

export class OperationalDeviceHeartbeatService {
  constructor(
    private readonly store: OperationalDeviceStore,
    private readonly now: () => number = () => Date.now()
  ) {}

  async recordHeartbeat(input: {
    deviceId: string;
    reportedVersion?: string | null;
  }) {
    const nowIso = new Date(this.now()).toISOString();
    await this.store.touchDeviceHeartbeat(input.deviceId, {
      lastSeenAt: nowIso,
      reportedVersion: input.reportedVersion ?? null,
    });
    const device = await this.store.getDevice(input.deviceId);
    if (!device) return null;
    const activeToken = await this.store.findActiveTokenForDevice(device.deviceId);
    return summarizeDeviceHealth({
      status: device.status,
      lastSeenAt: nowIso,
      reportedVersion: input.reportedVersion ?? device.reportedVersion,
      hasActiveToken: activeToken != null,
      now: this.now(),
    });
  }
}
