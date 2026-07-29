/**
 * COMMERCIAL-CATALOG-ADMIN-EXPERIENCE-1 — dependency graph model (presentation).
 */

export type CatalogGraphNodeKind =
  | "plan"
  | "version"
  | "pricing"
  | "billing"
  | "bundle"
  | "limits"
  | "trial"
  | "regions"
  | "promotions"
  | "migration"
  | "retirement";

export type CatalogGraphNode = {
  id: string;
  kind: CatalogGraphNodeKind;
  label: string;
  meta?: string;
};

export type CatalogGraphEdge = {
  from: string;
  to: string;
};

export type CatalogGraphImpact = {
  nodeId: string;
  dependencies: string[];
  consumers: string[];
  blockers: string[];
};

export function buildVersionDependencyGraph(input: {
  plan: { id: string; name: string };
  version: { id: string; versionName: string; state: string };
  prices: Array<{ id: string; amount: string; currency: string; billingCycleId: string }>;
  cycles: Array<{ id: string; name: string }>;
  bundle?: { id: string; name: string } | null;
  limits?: { id: string; name: string } | null;
  trial?: { id: string; name: string } | null;
  regions: Array<{ id: string; name: string }>;
  promotions: Array<{ id: string; name: string }>;
  migration?: { id: string; name: string } | null;
  retirement?: { id: string; name: string } | null;
  blockers: string[];
}): { nodes: CatalogGraphNode[]; edges: CatalogGraphEdge[] } {
  const nodes: CatalogGraphNode[] = [
    { id: `plan:${input.plan.id}`, kind: "plan", label: input.plan.name },
    {
      id: `version:${input.version.id}`,
      kind: "version",
      label: input.version.versionName,
      meta: input.version.state,
    },
  ];
  const edges: CatalogGraphEdge[] = [
    { from: `plan:${input.plan.id}`, to: `version:${input.version.id}` },
  ];

  for (const p of input.prices) {
    const pid = `pricing:${p.id}`;
    nodes.push({
      id: pid,
      kind: "pricing",
      label: `${p.amount} ${p.currency}`,
    });
    edges.push({ from: `version:${input.version.id}`, to: pid });
    const cycle = input.cycles.find((c) => c.id === p.billingCycleId);
    if (cycle) {
      const cid = `billing:${cycle.id}`;
      if (!nodes.some((n) => n.id === cid)) {
        nodes.push({ id: cid, kind: "billing", label: cycle.name });
      }
      edges.push({ from: pid, to: cid });
    }
  }

  if (input.bundle) {
    const id = `bundle:${input.bundle.id}`;
    nodes.push({ id, kind: "bundle", label: input.bundle.name });
    edges.push({ from: `version:${input.version.id}`, to: id });
  }
  if (input.limits) {
    const id = `limits:${input.limits.id}`;
    nodes.push({ id, kind: "limits", label: input.limits.name });
    edges.push({ from: `version:${input.version.id}`, to: id });
  }
  if (input.trial) {
    const id = `trial:${input.trial.id}`;
    nodes.push({ id, kind: "trial", label: input.trial.name });
    edges.push({ from: `version:${input.version.id}`, to: id });
  }
  for (const r of input.regions) {
    const id = `regions:${r.id}`;
    nodes.push({ id, kind: "regions", label: r.name });
    edges.push({ from: `version:${input.version.id}`, to: id });
  }
  for (const p of input.promotions) {
    const id = `promotions:${p.id}`;
    nodes.push({ id, kind: "promotions", label: p.name });
    edges.push({ from: `version:${input.version.id}`, to: id });
  }
  if (input.migration) {
    const id = `migration:${input.migration.id}`;
    nodes.push({ id, kind: "migration", label: input.migration.name });
    edges.push({ from: `version:${input.version.id}`, to: id });
  }
  if (input.retirement) {
    const id = `retirement:${input.retirement.id}`;
    nodes.push({ id, kind: "retirement", label: input.retirement.name });
    edges.push({ from: `version:${input.version.id}`, to: id });
  }

  return { nodes, edges };
}

export function analyzeNodeImpact(
  nodeId: string,
  edges: CatalogGraphEdge[],
  blockers: string[]
): CatalogGraphImpact {
  const dependencies = edges.filter((e) => e.from === nodeId).map((e) => e.to);
  const consumers = edges.filter((e) => e.to === nodeId).map((e) => e.from);
  return {
    nodeId,
    dependencies,
    consumers,
    blockers: nodeId.startsWith("version:") ? blockers : [],
  };
}
