import { ShieldCheck } from "lucide-react";
import {
  formatCommercialOverviewTimestamp,
  formatMetadataAuthorityValue,
  formatMetadataMetricsSourceValue,
  formatMetadataSchemaVersionValue,
} from "@/lib/admin/formatCommercialOverviewDisplay";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { adminDash } from "@/components/admin/layout/adminDashStyles";
import { cn } from "@/lib/utils";

type CommercialOverviewMetadata = {
  authorityVersion?: string;
  commercialAuthoritySource?: string;
  asOf?: string;
  generatedAt?: string;
  schemaVersion?: string;
  metricsSource?: string;
};

type CommercialOverviewMetadataPanelProps = {
  metadata?: CommercialOverviewMetadata;
  loading?: boolean;
  locale: "ar" | "en";
  labels: {
    title: string;
    commercialAuthority: string;
    reportGenerated: string;
    dataAsOf: string;
    schemaVersion: string;
    metricsSource: string;
    unavailable: string;
  };
};

function MetadataSkeleton() {
  return (
    <Card className={adminDash.card}>
      <CardHeader className="pb-3">
        <Skeleton className="h-5 w-40" />
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-3">
          {Array.from({ length: 2 }).map((_, i) => (
            <div
              key={`primary-${i}`}
              className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between"
            >
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-5 w-52" />
            </div>
          ))}
        </div>
        <div className="space-y-2 border-t border-border/40 pt-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={`secondary-${i}`}
              className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between"
            >
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-3 w-40" />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function MetadataUnavailable({ message }: { message: string }) {
  return (
    <Card className={adminDash.card}>
      <CardContent className="py-8 text-center text-sm text-muted-foreground">
        {message}
      </CardContent>
    </Card>
  );
}

type MetadataRowProps = {
  label: string;
  value: string;
  tier: "primary" | "secondary";
};

function MetadataRow({ label, value, tier }: MetadataRowProps) {
  const isPrimary = tier === "primary";
  return (
    <div
      className={cn(
        "flex flex-col gap-0.5 sm:flex-row sm:items-baseline sm:justify-between",
        isPrimary ? "gap-1" : "gap-0.5"
      )}
    >
      <dt
        className={cn(
          isPrimary
            ? "text-sm font-medium text-foreground"
            : "text-xs text-muted-foreground"
        )}
      >
        {label}
      </dt>
      <dd
        className={cn(
          "text-foreground",
          isPrimary ? "text-sm font-semibold" : "text-xs font-medium text-muted-foreground",
          isPrimary && "tabular-nums"
        )}
        dir={isPrimary ? "ltr" : undefined}
      >
        {value}
      </dd>
    </div>
  );
}

export function CommercialOverviewMetadataPanel({
  metadata,
  loading = false,
  locale,
  labels,
}: CommercialOverviewMetadataPanelProps) {
  if (loading) {
    return <MetadataSkeleton />;
  }

  if (!metadata) {
    return <MetadataUnavailable message={labels.unavailable} />;
  }

  const authorityRaw =
    metadata.commercialAuthoritySource ?? metadata.authorityVersion;

  const primaryRows: MetadataRowProps[] = [
    {
      label: labels.commercialAuthority,
      value: formatMetadataAuthorityValue(authorityRaw, locale),
      tier: "primary",
    },
    {
      label: labels.reportGenerated,
      value: formatCommercialOverviewTimestamp(metadata.generatedAt, locale),
      tier: "primary",
    },
  ];

  const secondaryRows: MetadataRowProps[] = [
    {
      label: labels.dataAsOf,
      value: formatCommercialOverviewTimestamp(metadata.asOf, locale),
      tier: "secondary",
    },
    {
      label: labels.schemaVersion,
      value: formatMetadataSchemaVersionValue(metadata.schemaVersion, locale),
      tier: "secondary",
    },
    {
      label: labels.metricsSource,
      value: formatMetadataMetricsSourceValue(metadata.metricsSource, locale),
      tier: "secondary",
    },
  ];

  return (
    <Card className={adminDash.card}>
      <CardHeader className="flex flex-row items-center gap-2 space-y-0 pb-3">
        <ShieldCheck className="h-4 w-4 shrink-0 text-primary" aria-hidden />
        <CardTitle className="text-base">{labels.title}</CardTitle>
      </CardHeader>
      <CardContent>
        <dl className="space-y-3">
          {primaryRows.map((row) => (
            <MetadataRow key={row.label} {...row} />
          ))}
        </dl>
        <dl className="mt-4 space-y-2 border-t border-border/40 pt-3">
          {secondaryRows.map((row) => (
            <MetadataRow key={row.label} {...row} />
          ))}
        </dl>
      </CardContent>
    </Card>
  );
}
