/** Runs `worker` over `items` with at most `limit` in flight. */
export async function runPool<T>(
  items: readonly T[],
  limit: number,
  worker: (item: T, index: number) => Promise<void>,
): Promise<void> {
  const size = Math.max(1, Math.min(limit, items.length));
  let cursor = 0;

  async function drain(): Promise<void> {
    while (cursor < items.length) {
      const index = cursor++;
      await worker(items[index], index);
    }
  }

  await Promise.all(Array.from({ length: size }, drain));
}
