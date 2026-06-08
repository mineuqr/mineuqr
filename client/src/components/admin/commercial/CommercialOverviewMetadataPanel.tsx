import { ShieldCheck } from "lucide-react";
import { formatCommercialOverviewTimestamp } from "@/lib/admin/formatCommercialOverviewDisplay";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { adminDash } from "@/components/admin/layout/adminDashStyles";

type CommercialOverviewMetadataPanelProps = {
  metadata?: {
    authorityVersion: string;
    asOf: string;
    generatedAt: string;
  };
  loading?: boolean;
  locale: "ar" | "en";
  labels: {
    title: string;
    authorityVersion: string;
    asOf: string;
    generatedAt: string;
  };
};

function MetadataSkeleton() {
  return (
    <Card className={adminDash.card}>
      <CardHeader className="pb-3">
        <Skeleton className="h-5 w-40" />
      </CardHeader>
      <CardContent className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-48" />
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

export function CommercialOverviewMetadataPanel({
  metadata,
  loading = false,
  locale,
  labels,
}: CommercialOverviewMetadataPanelProps) {
  if (loading || !metadata) {
    return <MetadataSkeleton />;
  }

  const rows = [
    {
      label: labels.authorityVersion,
      value: metadata.authorityVersion,
    },
    {
      label: labels.asOf,
      value: formatCommercialOverviewTimestamp(metadata.asOf, locale),
    },
    {
      label: labels.generatedAt,
      value: formatCommercialOverviewTimestamp(metadata.generatedAt, locale),
    },
  ];

  return (
    <Card className={adminDash.card}>
      <CardHeader className="flex flex-row items-center gap-2 space-y-0 pb-3">
        <ShieldCheck className="h-4 w-4 shrink-0 text-primary" aria-hidden />
        <CardTitle className="text-base">{labels.title}</CardTitle>
      </CardHeader>
      <CardContent>
        <dl className="space-y-3 text-sm">
          {rows.map((row) => (
            <div
              key={row.label}
              className="flex flex-col gap-0.5 sm:flex-row sm:items-center sm:justify-between"
            >
              <dt className="text-muted-foreground">{row.label}</dt>
              <dd className="font-medium tabular-nums text-foreground" dir="ltr">
                {row.value}
              </dd>
            </div>
          ))}
        </dl>
      </CardContent>
    </Card>
  );
}
