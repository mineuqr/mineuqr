import { afterEach, describe, expect, it, vi } from "vitest";
import {
  AGENT_CONFIG_DOWNLOAD_FILENAME,
  downloadAgentConfigFile,
  serializeAgentConfigForDownload,
} from "./downloadAgentConfigFile";

describe("downloadAgentConfigFile", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("serializes connect config with pretty-printed JSON", () => {
    const config = {
      agentId: "mineuqr-agent-720002",
      serverUrl: "wss://print.mineuqr.com/ws/print-agent",
      platform: "windows",
    };

    expect(serializeAgentConfigForDownload(config)).toBe(
      JSON.stringify(config, null, 2)
    );
  });

  it("downloads mineuqr-agent-config.json via blob URL", () => {
    const config = { agentId: "mineuqr-agent-1", platform: "windows" };
    const createObjectURL = vi.fn(() => "blob:mineuqr-config");
    const revokeObjectURL = vi.fn();
    const click = vi.fn();

    vi.stubGlobal("URL", {
      createObjectURL,
      revokeObjectURL,
    });

    const link = { href: "", download: "", click };
    vi.stubGlobal("document", {
      createElement: () => link,
    });

    downloadAgentConfigFile(config);

    expect(createObjectURL).toHaveBeenCalledOnce();
    const blob = createObjectURL.mock.calls[0]?.[0] as Blob;
    expect(blob).toBeInstanceOf(Blob);
    expect(blob.type).toBe("application/json;charset=utf-8");
    expect(link.download).toBe(AGENT_CONFIG_DOWNLOAD_FILENAME);
    expect(link.href).toBe("blob:mineuqr-config");
    expect(click).toHaveBeenCalledOnce();
    expect(revokeObjectURL).toHaveBeenCalledWith("blob:mineuqr-config");
  });
});
