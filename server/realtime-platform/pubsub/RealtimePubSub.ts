/**
 * REALTIME-PLATFORM-FOUNDATION-1
 * In-memory pub/sub with multi-instance-ready interface.
 */

import type { RealtimeHint } from "@shared/realtime-platform";

export type RealtimeBusSubscriber = (hint: RealtimeHint) => void;

export type RealtimeTopic = {
  restaurantId: number;
  channel: string;
};

export function realtimeTopicKey(topic: RealtimeTopic): string {
  return `${topic.restaurantId}:${topic.channel}`;
}

/**
 * Transport-agnostic bus. Foundation ships InMemoryRealtimePubSub.
 * Future: RedisRealtimePubSub implementing the same interface.
 */
export interface RealtimePubSub {
  publish(hint: RealtimeHint): Promise<void> | void;
  subscribe(
    topic: RealtimeTopic,
    subscriber: RealtimeBusSubscriber
  ): () => void;
  /** Optional drain for tests / shutdown. */
  close?(): void;
}

export class InMemoryRealtimePubSub implements RealtimePubSub {
  private readonly subs = new Map<string, Set<RealtimeBusSubscriber>>();

  publish(hint: RealtimeHint): void {
    const key = realtimeTopicKey({
      restaurantId: hint.restaurantId,
      channel: hint.channel,
    });
    const set = this.subs.get(key);
    if (!set?.size) return;
    for (const sub of [...set]) {
      try {
        sub(hint);
      } catch {
        /* subscriber errors must not break fan-out */
      }
    }
  }

  subscribe(
    topic: RealtimeTopic,
    subscriber: RealtimeBusSubscriber
  ): () => void {
    const key = realtimeTopicKey(topic);
    let set = this.subs.get(key);
    if (!set) {
      set = new Set();
      this.subs.set(key, set);
    }
    set.add(subscriber);
    return () => {
      set!.delete(subscriber);
      if (set!.size === 0) this.subs.delete(key);
    };
  }

  close(): void {
    this.subs.clear();
  }

  /** Test helper */
  subscriberCount(topic: RealtimeTopic): number {
    return this.subs.get(realtimeTopicKey(topic))?.size ?? 0;
  }
}
