/**
 * @deprecated Do not use `importOriginal` on `server/db.ts`.
 * `db.ts` imports `platformAccount.ts`, which imports `getUserById` from `db.ts`.
 * Spreading the actual module breaks platform-account test isolation.
 *
 * Use `server/testing/routerDbMock.ts` and explicit stub exports instead.
 */
export async function partialDbMock<T extends Record<string, unknown>>(
  importOriginal: () => Promise<T>,
  overrides: Record<string, unknown>
): Promise<T> {
  const actual = await importOriginal();
  return { ...actual, ...overrides };
}
