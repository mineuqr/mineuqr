/**
 * @vitest-environment jsdom
 */
import { act, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it } from "vitest";
import { useGracePeriod } from "../useGracePeriod";

type Row = { orderId: number };

function Harness({ onRender }: { onRender: () => void }) {
  const items = useMemo(() => [{ orderId: 1 } satisfies Row], []);
  const [, setSelected] = useState<number | null>(null);
  const { displayItems } = useGracePeriod(items, (o) => String(o.orderId));

  onRender();

  return (
    <button type="button" data-count={displayItems.length} onClick={() => setSelected(1)}>
      open
    </button>
  );
}

describe("useGracePeriod render stability", () => {
  let container: HTMLDivElement;
  let root: ReturnType<typeof createRoot>;

  afterEach(() => {
    act(() => {
      root?.unmount();
    });
    container?.remove();
  });

  it("does not exceed render depth when inline keyFn re-renders after click", async () => {
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);

    let renderCount = 0;

    await act(async () => {
      root.render(<Harness onRender={() => { renderCount += 1; }} />);
    });

    const button = container.querySelector("button");
    expect(button).not.toBeNull();

    const beforeClick = renderCount;

    await act(async () => {
      button!.click();
    });

    expect(renderCount).toBeLessThan(beforeClick + 10);
    expect(renderCount).toBeGreaterThan(beforeClick);
  });
});
