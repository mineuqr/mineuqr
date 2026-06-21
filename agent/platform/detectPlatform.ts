/**
 * THERMAL-PRINTING-6D — platform detection for reference agent (platform-neutral config).
 */
import type { AgentPlatform } from "../../shared/printing/agentTypes";

export function detectReferenceAgentPlatform(
  platform: NodeJS.Platform = process.platform
): AgentPlatform {
  switch (platform) {
    case "win32":
      return "windows";
    case "android":
      return "android";
    case "darwin":
    case "ios":
      return "ios";
    default:
      return "windows";
  }
}
