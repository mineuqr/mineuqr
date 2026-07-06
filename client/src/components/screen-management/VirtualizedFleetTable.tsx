import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";

type VirtualizedFleetTableProps<T> = {
  items: T[];
  rowHeight: number;
  className?: string;
  getKey: (item: T) => string;
  renderRow: (item: T) => ReactNode;
  header: ReactNode;
  onEndReached?: () => void;
};

/**
 * Windowed fleet table — renders visible rows only.
 */
export function VirtualizedFleetTable<T>({
  items,
  rowHeight,
  className,
  getKey,
  renderRow,
  header,
  onEndReached,
}: VirtualizedFleetTableProps<T>) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [viewportHeight, setViewportHeight] = useState(480);

  const overscan = 4;
  const startIndex = Math.max(0, Math.floor(scrollTop / rowHeight) - overscan);
  const endIndex = Math.min(
    items.length,
    Math.ceil((scrollTop + viewportHeight) / rowHeight) + overscan
  );
  const visibleItems = items.slice(startIndex, endIndex);

  const onScroll = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    setScrollTop(el.scrollTop);
    if (onEndReached && el.scrollTop + el.clientHeight >= el.scrollHeight - rowHeight * 2) {
      onEndReached();
    }
  }, [onEndReached, rowHeight]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new ResizeObserver(() => setViewportHeight(el.clientHeight));
    observer.observe(el);
    setViewportHeight(el.clientHeight);
    return () => observer.disconnect();
  }, []);

  const totalHeight = items.length * rowHeight;
  const offsetY = startIndex * rowHeight;

  return (
    <div className={className} data-virtualized="fleet-table">
      {header}
      <div
        ref={containerRef}
        style={{ maxHeight: "60vh", overflowY: "auto" }}
        onScroll={onScroll}
      >
        <div style={{ height: totalHeight, position: "relative" }}>
          <div style={{ position: "absolute", top: offsetY, left: 0, right: 0 }}>
            {visibleItems.map((item) => (
              <div key={getKey(item)} style={{ minHeight: rowHeight }}>
                {renderRow(item)}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
