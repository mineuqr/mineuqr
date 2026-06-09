import { getAllUsers, sanitizeUserForAdminResponse } from "../../db";
import { commercialReadService } from "../CommercialReadService";
import { canonicalMetricsService } from "../metrics/CanonicalMetricsService";
import type { CommercialOverviewSnapshot } from "../metrics/CommercialOverviewSnapshot";
import {
  ADMIN_REPORT_DEFINITIONS_REF,
  ADMIN_REPORT_VERSION,
  type AdminReportEnvelope,
  type CommercialExportPackage,
  type CommercialOverviewReportData,
  type SubscriberDetailReportData,
  type OperationalSummaryReportData,
} from "./reportContracts";
import {
  resolveDashboardEntityCounts,
  resolveOperationalCounts,
} from "./resolveOperationalCounts";
import { computeSnapshotFingerprint } from "./snapshotFingerprint";

export type BuildCommercialExportPackageOptions = {
  now?: Date;
  locale?: "en" | "ar";
  generatedByUserId?: number;
};

function buildPackageEnvelope(
  asOf: string,
  generatedAt: string,
  options: BuildCommercialExportPackageOptions
): AdminReportEnvelope {
  return {
    reportId: "commercial-export-package",
    reportName: "Commercial Overview Export",
    reportVersion: ADMIN_REPORT_VERSION,
    generatedAt,
    dataAsOf: asOf,
    authority: {
      source: "S1_CANONICAL",
      metricsSource: "CANONICAL_OWNER",
      assembler: "CanonicalMetricsService.getCommercialOverviewSnapshot",
    },
    definitionsRef: ADMIN_REPORT_DEFINITIONS_REF,
    locale: options.locale,
    generatedByUserId: options.generatedByUserId,
  };
}

function mapSnapshotToOverviewReport(
  snapshot: CommercialOverviewSnapshot
): CommercialOverviewReportData {
  return {
    executive: {
      ...snapshot.executive,
      currency: "USD",
    },
    subscriptionHealth: { ...snapshot.subscriptionHealth },
    needsAttention: {
      expiringWithin30Days: snapshot.needsAttention.expiringWithin30Days,
      windowDays: 30,
      canceledAccounts: snapshot.needsAttention.canceledAccounts,
      expiredAccounts: snapshot.needsAttention.expiredAccounts,
      graceAccounts: null,
      suspendedAccounts: null,
    },
    planDistribution: {
      entries: snapshot.planDistribution.entries.map((e) => ({ ...e })),
    },
    operational: {
      activeRestaurants: snapshot.executive.activeRestaurants,
      totalUsers: snapshot.executive.totalUsers,
      restaurantDistribution: null,
    },
    extensions: {
      recentActivity: {
        available: false,
        reason: "NO_ADMIN_COMMERCIAL_EVENT_READ_API",
      },
      growth: {
        available: false,
        reason: "NO_CANONICAL_GROWTH_METRIC",
      },
      internalStaff: {
        available: false,
        reason: "ADMIN_AUTH_1_NOT_IMPLEMENTED",
      },
    },
  };
}

/**
 * ADMIN-UX-1E — centralized commercial reporting.
 * Overview metrics: certified snapshot only. Detail/operational: extensions at same asOf.
 */
export class CommercialReportService {
  async buildCommercialExportPackage(
    options: BuildCommercialExportPackageOptions = {}
  ): Promise<CommercialExportPackage> {
    const now = options.now ?? new Date();
    const entityCounts = await resolveDashboardEntityCounts();

    const snapshot = await canonicalMetricsService.getCommercialOverviewSnapshot(
      entityCounts,
      now
    );

    const overviewReport = mapSnapshotToOverviewReport(snapshot);

    const [ownerStates, users, operational] = await Promise.all([
      commercialReadService.getAllOwnerCommercialStates(now),
      getAllUsers(),
      resolveOperationalCounts(),
    ]);

    ownerStates.sort((a, b) => a.ownerId - b.ownerId);

    const subscriberReport = this.buildSubscriberReport(ownerStates, users);
    const operationalReport = this.buildOperationalReport(operational);

    overviewReport.operational.restaurantDistribution =
      operational.restaurantDistribution.map((entry) => ({
        ownerId: entry.ownerId,
        restaurantCount: entry.restaurantCount,
      }));

    const envelope = buildPackageEnvelope(
      snapshot.asOf,
      snapshot.generatedAt,
      options
    );

    const snapshotFingerprint = computeSnapshotFingerprint(
      overviewReport,
      subscriberReport.summary
    );

    return {
      envelope,
      overviewReport,
      subscriberReport,
      operationalReport,
      snapshotFingerprint,
    };
  }

  private buildSubscriberReport(
    ownerStates: Awaited<ReturnType<typeof commercialReadService.getAllOwnerCommercialStates>>,
    users: Awaited<ReturnType<typeof getAllUsers>>
  ): SubscriberDetailReportData {
    const rows = ownerStates.map((commercial) => {
      const user = users.find((u) => u.id === commercial.ownerId);
      const safe = user ? sanitizeUserForAdminResponse(user) : null;
      return {
        ownerId: commercial.ownerId,
        ownerEmail: safe?.email ?? null,
        ownerName: safe?.name ?? null,
        ownerRole: (safe?.role ?? "user") as "user" | "admin",
        planCode: commercial.planCode,
        planName: commercial.planName,
        subscriptionStatus: commercial.subscriptionStatus,
        billingCycle: commercial.billingCycle,
        currentPeriodEnd: commercial.currentPeriodEnd,
        trialEndsAt: commercial.trialStatus.trialEndsAt,
        isEntitled: commercial.commercialStatus.isEntitled,
        countsInMrr: commercial.commercialStatus.countsInMrr,
      };
    });

    return {
      rows,
      summary: {
        rowCount: rows.length,
        entitledCount: rows.filter((r) => r.isEntitled).length,
      },
    };
  }

  private buildOperationalReport(
    operational: Awaited<ReturnType<typeof resolveOperationalCounts>>
  ): OperationalSummaryReportData {
    return {
      counts: operational.counts,
      restaurantDistribution: operational.restaurantDistribution,
    };
  }
}

export const commercialReportService = new CommercialReportService();

/** Reconciliation guard — detail entitled count must match overview subscribers. */
export function assertExportPackageReconciliation(pkg: CommercialExportPackage): void {
  const subscribers = pkg.overviewReport.executive.commercialSubscribers;
  const entitled = pkg.subscriberReport.summary.entitledCount;
  if (subscribers !== entitled) {
    throw new Error(
      `ADMIN-UX-1E reconciliation failed: commercialSubscribers=${subscribers} entitledCount=${entitled}`
    );
  }
}
