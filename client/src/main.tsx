import { isAuthMeInitialLoadPending } from "@/lib/authSession";
import { isEmailNotVerifiedError } from "@/lib/trpcErrors";
import { trpc } from "@/lib/trpc";
import { createTrpcLinks } from "@/lib/trpcLinks";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { TRPCClientError } from "@trpc/client";
import { createRoot } from "react-dom/client";
import { UNAUTHED_ERR_MSG } from "@shared/const";
import { LanguageProvider } from "./contexts/LanguageContext";
import App from "./App";
import { getLoginUrl, spaNavigate } from "./const";
import "./index.css";

const queryClient = new QueryClient();

const redirectToLoginIfUnauthorized = (error: unknown) => {
  if (!(error instanceof TRPCClientError)) return;
  if (typeof window === "undefined") return;
  if (window.location.pathname.startsWith("/screen")) return;

  const isUnauthorized = error.message === UNAUTHED_ERR_MSG;

  if (!isUnauthorized) return;

  // Session may still be resolving; do not redirect until auth.me has settled.
  if (isAuthMeInitialLoadPending(queryClient)) return;

  spaNavigate(getLoginUrl());
};

queryClient.getQueryCache().subscribe(event => {
  if (event.type === "updated" && event.action.type === "error") {
    const error = event.query.state.error;
    redirectToLoginIfUnauthorized(error);
    if (!isEmailNotVerifiedError(error)) {
      console.error("[API Query Error]", error);
    }
  }
});

queryClient.getMutationCache().subscribe(event => {
  if (event.type === "updated" && event.action.type === "error") {
    const error = event.mutation.state.error;
    redirectToLoginIfUnauthorized(error);
    if (!isEmailNotVerifiedError(error)) {
      console.error("[API Mutation Error]", error);
    }
  }
});

const trpcClient = trpc.createClient({
  links: createTrpcLinks(),
});

createRoot(document.getElementById("root")!).render(
  <trpc.Provider client={trpcClient} queryClient={queryClient}>
    <QueryClientProvider client={queryClient}>
      <LanguageProvider>
        <App />
      </LanguageProvider>
    </QueryClientProvider>
  </trpc.Provider>
);
