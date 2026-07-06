import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";

type VirtualizedFleetGridProps<T> = {
  items: T[];
  columns: number;
  estimateRowHeight: number;
  gap?: number;
  className?: string;
  getKey: (item: T) => string;
  renderItem: (item: T) => ReactNode;
  onEndReached?: () => void;
};

/**
 * Windowed fleet card grid — renders visible rows only (no thousands of DOM nodes).
 */
export function VirtualizedFleetGrid<T>({
  items,
  columns,
  estimateRowHeight,
  gap = 16,
  className,
  getKey,
  renderItem,
  onEndReached,
}: VirtualizedFleetGridProps<T>) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [viewportHeight, setViewportHeight] = useState(720);

  const rowHeight = estimateRowHeight + gap;
  const rowCount = Math.ceil(items.length / columns);
  const overscan = 2;

  const startRow = Math.max(0, Math.floor(scrollTop / rowHeight) - overscan);
  const endRow = Math.min(
    rowCount,
    Math.ceil((scrollTop + viewportHeight) / rowHeight) + overscan
  );

  const startIndex = startRow * columns;
  const endIndex = Math.min(items.length, endRow * columns);
  const visibleItems = items.slice(startIndex, endIndex);

  const onScroll = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    setScrollTop(el.scrollTop);
    if (onEndReached && el.scrollTop + el.clientHeight >= el.scrollHeight - rowHeight) {
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

  const totalHeight = rowCount * rowHeight;
  const offsetY = startRow * rowHeight;

  return (
    <div
      ref={containerRef}
      className={className}
      style={{ maxHeight: "70vh", overflowY: "auto" }}
      onScroll={onScroll}
      data-virtualized="fleet-grid"
    >
      <div style={{ height: totalHeight, position: "relative" }}>
        <div
          style={{
            position: "absolute",
            top: offsetY,
            left: 0,
            right: 0,
            display: "grid",
            gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
            gap,
          }}
        >
          {visibleItems.map((item) => (
            <div key={getKey(item)}>{renderItem(item)}</div>
          ))}
        </div>
      </div>
    </div>
  );
}
