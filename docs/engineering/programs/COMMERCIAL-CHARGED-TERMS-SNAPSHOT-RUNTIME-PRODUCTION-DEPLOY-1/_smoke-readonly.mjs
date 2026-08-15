/**
 * READ-ONLY Production HTTP smoke. GET only. No payment. No subscription create.
 */
const ORIGIN = "https://www.mineuqr.com";
const DEPLOY = "https://mineuqr-axeiqkxeb-mineuqr-s-projects.vercel.app";
const PRO_UUID = "0ade795a-02fa-4d3e-b9b5-262515bade09";
const ENT_UUID = "d836bd10-9d9f-4408-a076-f921354d785a";

async function probe(url, { parseJson = false } = {}) {
  const started = Date.now();
  const res = await fetch(url, {
    method: "GET",
    redirect: "follow",
    headers: { accept: "application/json, text/html;q=0.8" },
  });
  const text = await res.text();
  let json = null;
  if (parseJson) {
    try {
      json = JSON.parse(text);
    } catch {
      json = { parseError: true, preview: text.slice(0, 240) };
    }
  }
  return {
    url,
    status: res.status,
    ok: res.ok,
    ms: Date.now() - started,
    poweredBy: res.headers.get("x-powered-by"),
    vercelId: res.headers.get("x-vercel-id"),
    vercelCache: res.headers.get("x-vercel-cache"),
    contentType: res.headers.get("content-type"),
    bodyBytes: text.length,
    json,
    htmlTitle: /<title>([^<]*)<\/title>/i.exec(text)?.[1] ?? null,
  };
}

function trpc(origin, path, input) {
  const qs = input
    ? `?input=${encodeURIComponent(JSON.stringify({ json: input }))}`
    : "";
  return `${origin}/api/trpc/${path}${qs}`;
}

async function main() {
  const results = {};
  results.originHome = await probe(`${ORIGIN}/`);
  results.deployHome = await probe(`${DEPLOY}/`);
  results.pricing = await probe(`${ORIGIN}/pricing`);
  results.adminSubscription = await probe(`${ORIGIN}/admin/platform/subscription`);
  results.catalogStatus = await probe(trpc(ORIGIN, "commercialCatalog.public.status"), {
    parseJson: true,
  });
  results.listOfferings = await probe(
    trpc(ORIGIN, "commercialCatalog.public.listOfferings"),
    { parseJson: true }
  );
  results.getOfferingPro = await probe(
    trpc(ORIGIN, "commercialCatalog.public.getOffering", { planId: PRO_UUID }),
    { parseJson: true }
  );
  results.getOfferingEnterprise = await probe(
    trpc(ORIGIN, "commercialCatalog.public.getOffering", { planId: ENT_UUID }),
    { parseJson: true }
  );
  results.getOfferingInteger = await probe(
    trpc(ORIGIN, "commercialCatalog.public.getOffering", { planId: "30002" }),
    { parseJson: true }
  );
  results.mrr = await probe(trpc(ORIGIN, "analytics.getMRR"), { parseJson: true });
  results.arr = await probe(trpc(ORIGIN, "analytics.getARR"), { parseJson: true });
  console.log(JSON.stringify({ mutation: "NONE", probedAt: new Date().toISOString(), results }, null, 2));
}

main().catch((err) => {
  console.error(JSON.stringify({ mutation: "NONE", reason: String(err) }));
  process.exit(1);
});
