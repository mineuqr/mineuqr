import { createTRPCReact } from "@trpc/react-query";
import type { AppRouter } from "../../../../server/routers";

/** Isolated tRPC client for operational screen runtime — never uses dashboard session. */
export const screenTrpc = createTRPCReact<AppRouter>();
