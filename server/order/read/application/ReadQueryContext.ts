/**
 * Context passed to query application handlers (authorization already applied).
 */
export type ReadQueryContext = {
  userId: number;
  isAdmin: boolean;
};
