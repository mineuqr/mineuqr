import { AddPrinterDialog } from "@/components/dashboard/printing/AddPrinterDialog";
import { ConnectDeviceGuideSheet } from "@/components/dashboard/printing/ConnectDeviceGuideSheet";
import { DiagnosticHistoryPanel } from "@/components/dashboard/printing/DiagnosticHistoryPanel";
import { PrinterDiscoveryDiagnosticsPanel } from "@/components/dashboard/printing/PrinterDiscoveryDiagnosticsPanel";
import { PrinterProvisioningPanel } from "@/components/dashboard/printing/PrinterProvisioningPanel";
import { useAuth } from "@/_core/hooks/useAuth";
import { RestaurantDashSection } from "@/components/dashboard/RestaurantDashSection";
import {
  RestaurantKpiCard,
  RestaurantKpiGridSkeleton,
} from "@/components/dashboard/RestaurantKpiCard";
import { RestaurantSectionError } from "@/components/dashboard/RestaurantSectionStates";
import { restaurantDash } from "@/components/dashboard/restaurantDashStyles";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { restaurantQueriesEnabled } from "@/lib/queryRuntime";
import {
  authorityTestPrintPrinterId,
  canRunAuthorityTestPrintForPrinter,
  getAuthorityPrinterStatusBadge,
  type PrintingSetupStatus,
} from "@/lib/printing/printingReadinessAuthority";
import { trpc } from "@/lib/trpc";
import {
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Printer,
  RefreshCw,
  TestTube2,
} from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

const PAGE_SIZE = 15;

function statusBadgeVariant(
  status: string
): "default" | "secondary" | "destructive" | "outline" {
  if (status === "failed" || status === "cancelled" || status === "expired") {
    return "destructive";
  }
  if (status === "delivered") {
    return "default";
  }
  if (status === "queued") {
    return "outline";
  }
  return "secondary";
}

function formatTimestamp(value: string | null | undefined, isAr: boolean): string {
  if (!value) {
    return isAr ? "—" : "—";
  }
  return value.replace("T", " ").slice(0, 19);
}

export function PrintingOperationsPanel({
  restaurantId,
  language,
}: {
  restaurantId: number;
  language: string;
}) {
  const isAr = language === "ar";
  const { isAuthenticated, authPending } = useAuth();
  const queriesEnabled = restaurantQueriesEnabled(authPending, isAuthenticated, restaurantId);

  const [jobPage, setJobPage] = useState(0);
  const [selectedPrinterId, setSelectedPrinterId] = useState<number | null>(null);
  const [selectedJobId, setSelectedJobId] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<
    "printers" | "agents" | "stations" | "queue" | "failures" | "diagnostics"
  >("printers");
  const [addPrinterOpen, setAddPrinterOpen] = useState(false);
  const [connectDeviceOpen, setConnectDeviceOpen] = useState(false);

  const copy = useMemo(
    () => ({
      title: isAr ? "عمليات الطباعة" : "Printer Operations",
      subtitle: isAr
        ? "مراقبة الطابعات وقائمة انتظار الطباعة وحالات الفشل"
        : "Monitor printers, print queue, and failure visibility",
      printers: isAr ? "الطابعات" : "Printers",
      agents: isAr ? "الوكلاء" : "Agents",
      stations: isAr ? "المحطات" : "Stations",
      queue: isAr ? "قائمة الطباعة" : "Print Queue",
      failures: isAr ? "الفشل" : "Failures",
      diagnostics: isAr ? "التشخيص" : "Diagnostics",
      emptyStations: isAr ? "لا توجد محطات طباعة مهيأة" : "No print stations configured",
      emptyPrinters: isAr ? "لا توجد طابعات مهيأة" : "No printers configured",
      emptyAgents: isAr ? "لا يوجد وكلاء طباعة متصلون" : "No connected print agents",
      emptyJobs: isAr ? "لا توجد مهام طباعة" : "No print jobs yet",
      emptyFailures: isAr ? "لا توجد حالات فشل حديثة" : "No recent failures",
      active: isAr ? "نشطة" : "Active",
      inactive: isAr ? "غير نشطة" : "Inactive",
      default: isAr ? "افتراضية" : "Default",
      refresh: isAr ? "تحديث" : "Refresh",
      retry: isAr ? "إعادة المحاولة" : "Retry",
      printerDetails: isAr ? "تفاصيل الطابعة" : "Printer Details",
      jobDetails: isAr ? "تفاصيل مهمة الطباعة" : "Print Job Details",
      resolution: isAr ? "حالة الربط" : "Resolution",
      agent: isAr ? "الوكيل" : "Agent",
      agentId: isAr ? "معرف الوكيل" : "Agent ID",
      connectivity: isAr ? "الاتصال" : "Connectivity",
      connectedAt: isAr ? "وقت الاتصال" : "Connected At",
      lastHeartbeat: isAr ? "آخر نبضة" : "Last Heartbeat",
      profileCount: isAr ? "الملفات المبلغ عنها" : "Reported Profiles",
      platform: isAr ? "المنصة" : "Platform",
      transport: isAr ? "النقل" : "Transport",
      totalPrinters: isAr ? "إجمالي الطابعات" : "Total Printers",
      activePrinters: isAr ? "طابعات نشطة" : "Active Printers",
      totalJobs: isAr ? "إجمالي المهام" : "Total Jobs",
      queuedJobs: isAr ? "مهام بالانتظار" : "Queued Jobs",
      failedJobs: isAr ? "مهام فاشلة" : "Failed Jobs",
      successfulJobs: isAr ? "مهام ناجحة" : "Successful Jobs",
      testPrint: isAr ? "طباعة تجريبية" : "Test Print",
      testPrintSubmitting: isAr ? "جاري الإرسال..." : "Submitting...",
    }),
    [isAr]
  );

  const testPrintMutation = trpc.printOps.testPrint.useMutation({
    onSuccess: (result) => {
      if (result.accepted) {
        toast.success(isAr ? "تم إرسال الطباعة التجريبية" : "Test Print Submitted", {
          description: [
            `${isAr ? "معرف التشخيص" : "Diagnostic ID"}: ${result.diagnosticId}`,
            `${isAr ? "الطابعة" : "Printer"}: ${result.printerName}`,
            result.warning,
          ]
            .filter(Boolean)
            .join("\n"),
        });
      } else {
        toast.error(isAr ? "تعذر إرسال الطباعة التجريبية" : "Test Print Failed", {
          description: result.reason,
        });
      }
    },
    onError: (error) => {
      toast.error(isAr ? "تعذر إرسال الطباعة التجريبية" : "Test Print Failed", {
        description: error.message,
      });
    },
  });

  function handleTestPrint(printerId: number) {
    if (!canRunAuthorityTestPrintForPrinter(setupStatus, printerId)) {
      return;
    }
    testPrintMutation.mutate({ restaurantId, printerId });
  }

  const summaryQuery = trpc.printOps.getSummary.useQuery(
    { restaurantId },
    { enabled: queriesEnabled }
  );
  const discoveryQuery = trpc.printOps.getDiscoveryDiagnostics.useQuery(
    { restaurantId },
    { enabled: queriesEnabled }
  );
  const setupStatusQuery = trpc.printOps.getPrintingSetupStatus.useQuery(
    { restaurantId },
    { enabled: queriesEnabled }
  );
  const diagnosticRunsQuery = trpc.printOps.listDiagnosticRuns.useQuery(
    { restaurantId, limit: 20 },
    { enabled: queriesEnabled && activeTab === "diagnostics" }
  );
  const printersQuery = trpc.printOps.listPrinters.useQuery(
    { restaurantId },
    { enabled: queriesEnabled }
  );
  const agentsQuery = trpc.printOps.listAgents.useQuery(
    { restaurantId },
    { enabled: queriesEnabled && activeTab === "agents" }
  );
  const stationsQuery = trpc.printOps.listStations.useQuery(
    { restaurantId },
    { enabled: queriesEnabled && activeTab === "stations" }
  );
  const jobsQuery = trpc.printOps.listPrintJobs.useQuery(
    { restaurantId, limit: PAGE_SIZE, offset: jobPage * PAGE_SIZE },
    { enabled: queriesEnabled && activeTab === "queue" }
  );
  const failuresQuery = trpc.printOps.listFailures.useQuery(
    { restaurantId, limit: 25 },
    { enabled: queriesEnabled && activeTab === "failures" }
  );
  const printerDetailQuery = trpc.printOps.getPrinter.useQuery(
    { restaurantId, printerId: selectedPrinterId ?? 0 },
    { enabled: queriesEnabled && selectedPrinterId != null }
  );
  const jobDetailQuery = trpc.printOps.getPrintJob.useQuery(
    { restaurantId, jobId: selectedJobId ?? 0 },
    { enabled: queriesEnabled && selectedJobId != null }
  );

  const refetchAll = () => {
    void summaryQuery.refetch();
    void printersQuery.refetch();
    void agentsQuery.refetch();
    void stationsQuery.refetch();
    void jobsQuery.refetch();
    void failuresQuery.refetch();
    void discoveryQuery.refetch();
    void setupStatusQuery.refetch();
    void diagnosticRunsQuery.refetch();
  };

  const jobTotal = jobsQuery.data?.total ?? 0;
  const jobPageCount = Math.max(1, Math.ceil(jobTotal / PAGE_SIZE));
  const provisioning = discoveryQuery.data?.provisioning;
  const setupStatus: PrintingSetupStatus | undefined = setupStatusQuery.data;

  const refetchProvisioning = () => {
    refetchAll();
  };

  function handleAuthorityTestPrint() {
    const printerId = authorityTestPrintPrinterId(setupStatus);
    if (printerId != null) {
      handleTestPrint(printerId);
    }
  }

  return (
    <div className={restaurantDash.stack}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">{copy.title}</h1>
          <p className="max-w-2xl text-sm leading-relaxed text-slate-400">{copy.subtitle}</p>
        </div>
        <Button variant="outline" size="sm" onClick={refetchAll} className="shrink-0">
          <RefreshCw className="h-4 w-4" />
          {copy.refresh}
        </Button>
      </div>

      {summaryQuery.isLoading ? (
        <RestaurantKpiGridSkeleton count={6} />
      ) : summaryQuery.isError ? (
        <RestaurantSectionError
          message={summaryQuery.error.message}
          retryLabel={copy.retry}
          onRetry={() => summaryQuery.refetch()}
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
          <RestaurantKpiCard label={copy.totalPrinters} value={summaryQuery.data?.totalPrinters ?? 0} icon={Printer} tone="primary" />
          <RestaurantKpiCard label={copy.activePrinters} value={summaryQuery.data?.activePrinters ?? 0} icon={Printer} tone="success" />
          <RestaurantKpiCard label={copy.totalJobs} value={summaryQuery.data?.totalJobs ?? 0} icon={Printer} />
          <RestaurantKpiCard label={copy.successfulJobs} value={summaryQuery.data?.successfulJobs ?? 0} icon={Printer} tone="success" />
          <RestaurantKpiCard label={copy.queuedJobs} value={summaryQuery.data?.queuedJobs ?? 0} icon={Printer} tone="warning" />
          <RestaurantKpiCard label={copy.failedJobs} value={summaryQuery.data?.failedJobs ?? 0} icon={AlertTriangle} tone="warning" />
        </div>
      )}

      <PrinterProvisioningPanel
        setupStatus={setupStatus}
        isAr={isAr}
        isLoading={setupStatusQuery.isLoading}
        testPrintPending={testPrintMutation.isPending}
        onAddPrinter={() => setAddPrinterOpen(true)}
        onConnectDevice={() => setConnectDeviceOpen(true)}
        onTestPrint={handleAuthorityTestPrint}
      />

      <AddPrinterDialog
        open={addPrinterOpen}
        onOpenChange={setAddPrinterOpen}
        restaurantId={restaurantId}
        isAr={isAr}
        hasExistingPrinters={(printersQuery.data?.length ?? 0) > 0}
        onCreated={refetchProvisioning}
      />

      <ConnectDeviceGuideSheet
        open={connectDeviceOpen}
        onOpenChange={setConnectDeviceOpen}
        provisioning={provisioning}
        setupStatus={setupStatus}
        isAr={isAr}
        onRefresh={refetchProvisioning}
      />

      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as typeof activeTab)}>
        <TabsList className="flex h-auto w-full flex-wrap justify-start gap-1">
          <TabsTrigger value="printers">{copy.printers}</TabsTrigger>
          <TabsTrigger value="agents">{copy.agents}</TabsTrigger>
          <TabsTrigger value="stations">{copy.stations}</TabsTrigger>
          <TabsTrigger value="queue">{copy.queue}</TabsTrigger>
          <TabsTrigger value="failures">{copy.failures}</TabsTrigger>
          <TabsTrigger value="diagnostics">{copy.diagnostics}</TabsTrigger>
        </TabsList>

        <TabsContent value="printers" className="mt-4">
          <RestaurantDashSection title={copy.printers}>
            {!summaryQuery.isLoading && summaryQuery.data ? (
              <p className="mb-3 text-xs text-muted-foreground">
                {isAr
                  ? `${summaryQuery.data.totalPrinters} إجمالي · ${summaryQuery.data.activePrinters} نشطة · ${summaryQuery.data.inactivePrinters} غير نشطة`
                  : `${summaryQuery.data.totalPrinters} total · ${summaryQuery.data.activePrinters} active · ${summaryQuery.data.inactivePrinters} inactive`}
              </p>
            ) : null}
            <div className="mb-4">
              <PrinterDiscoveryDiagnosticsPanel
                data={discoveryQuery.data}
                setupStatus={setupStatus}
                isAr={isAr}
                isLoading={discoveryQuery.isLoading || setupStatusQuery.isLoading}
              />
            </div>
            {printersQuery.isLoading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : printersQuery.isError ? (
              <RestaurantSectionError
                message={printersQuery.error.message}
                retryLabel={copy.retry}
                onRetry={() => printersQuery.refetch()}
              />
            ) : (printersQuery.data?.length ?? 0) === 0 ? (
              setupStatus?.checklist.printerCreated ? null : (
                <Card>
                  <CardContent className="py-10 text-center text-sm text-muted-foreground">
                    {copy.emptyPrinters}
                  </CardContent>
                </Card>
              )
            ) : (
              <div className="overflow-x-auto rounded-xl border border-border/40">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{isAr ? "الاسم" : "Name"}</TableHead>
                      <TableHead>{isAr ? "الملف" : "Profile ID"}</TableHead>
                      <TableHead>{copy.transport}</TableHead>
                      <TableHead>{isAr ? "الحالة" : "Status"}</TableHead>
                      <TableHead>{isAr ? "آخر نشاط" : "Last Activity"}</TableHead>
                      <TableHead className="w-[140px]">{copy.testPrint}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {printersQuery.data?.map((printer) => {
                      const statusBadge = getAuthorityPrinterStatusBadge(
                        setupStatus,
                        printer.id,
                        isAr
                      );
                      const testPrintAllowed = canRunAuthorityTestPrintForPrinter(
                        setupStatus,
                        printer.id
                      );

                      return (
                      <TableRow
                        key={printer.id}
                        className="cursor-pointer"
                        onClick={() => setSelectedPrinterId(printer.id)}
                      >
                        <TableCell className="font-medium">
                          {printer.name}
                          {printer.isDefault ? (
                            <Badge variant="outline" className="ms-2">
                              {copy.default}
                            </Badge>
                          ) : null}
                        </TableCell>
                        <TableCell dir="ltr">{printer.profileId}</TableCell>
                        <TableCell>{printer.transport}</TableCell>
                        <TableCell>
                          <Badge variant={statusBadge.variant}>
                            {statusBadge.label}
                          </Badge>
                        </TableCell>
                        <TableCell dir="ltr">{formatTimestamp(printer.lastActivityAt, isAr)}</TableCell>
                        <TableCell>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            disabled={testPrintMutation.isPending || !testPrintAllowed}
                            onClick={(event) => {
                              event.stopPropagation();
                              handleTestPrint(printer.id);
                            }}
                          >
                            {testPrintMutation.isPending ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <TestTube2 className="h-4 w-4" />
                            )}
                            <span className="ms-2">{copy.testPrint}</span>
                          </Button>
                        </TableCell>
                      </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </RestaurantDashSection>
        </TabsContent>

        <TabsContent value="agents" className="mt-4">
          <RestaurantDashSection title={copy.agents}>
            {agentsQuery.isLoading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : agentsQuery.isError ? (
              <RestaurantSectionError
                message={agentsQuery.error.message}
                retryLabel={copy.retry}
                onRetry={() => agentsQuery.refetch()}
              />
            ) : (agentsQuery.data?.length ?? 0) === 0 ? (
              <Card>
                <CardContent className="py-10 text-center text-sm text-muted-foreground">
                  {copy.emptyAgents}
                </CardContent>
              </Card>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-border/40">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{copy.agentId}</TableHead>
                      <TableHead>{copy.connectivity}</TableHead>
                      <TableHead>{copy.platform}</TableHead>
                      <TableHead>{copy.profileCount}</TableHead>
                      <TableHead>{copy.connectedAt}</TableHead>
                      <TableHead>{copy.lastHeartbeat}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {agentsQuery.data?.map((agent) => (
                      <TableRow key={agent.agentId}>
                        <TableCell dir="ltr" className="font-medium">
                          {agent.agentId}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              agent.status === "online"
                                ? "default"
                                : agent.status === "stale"
                                  ? "outline"
                                  : "secondary"
                            }
                          >
                            {agent.status}
                          </Badge>
                        </TableCell>
                        <TableCell>{agent.platform}</TableCell>
                        <TableCell dir="ltr">{agent.reportedProfileCount}</TableCell>
                        <TableCell dir="ltr">{formatTimestamp(agent.connectedAt, isAr)}</TableCell>
                        <TableCell dir="ltr">
                          {formatTimestamp(agent.lastHeartbeatAt, isAr)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </RestaurantDashSection>
        </TabsContent>

        <TabsContent value="stations" className="mt-4">
          <RestaurantDashSection title={copy.stations}>
            {stationsQuery.isLoading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : stationsQuery.isError ? (
              <RestaurantSectionError
                message={stationsQuery.error.message}
                retryLabel={copy.retry}
                onRetry={() => stationsQuery.refetch()}
              />
            ) : (stationsQuery.data?.length ?? 0) === 0 ? (
              <Card>
                <CardContent className="py-10 text-center text-sm text-muted-foreground">
                  {copy.emptyStations}
                </CardContent>
              </Card>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-border/40">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{isAr ? "المحطة" : "Station"}</TableHead>
                      <TableHead>{isAr ? "الطابعة" : "Printer"}</TableHead>
                      <TableHead>{isAr ? "عدد المهام" : "Job Count"}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {stationsQuery.data?.map((station) => (
                      <TableRow key={station.id}>
                        <TableCell className="font-medium">{station.name}</TableCell>
                        <TableCell dir="ltr">
                          {station.printerName ?? `#${station.printerId}`}
                        </TableCell>
                        <TableCell dir="ltr">{station.jobCount}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </RestaurantDashSection>
        </TabsContent>

        <TabsContent value="queue" className="mt-4">
          <RestaurantDashSection title={copy.queue}>
            {jobsQuery.isLoading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : jobsQuery.isError ? (
              <RestaurantSectionError
                message={jobsQuery.error.message}
                retryLabel={copy.retry}
                onRetry={() => jobsQuery.refetch()}
              />
            ) : (jobsQuery.data?.jobs.length ?? 0) === 0 ? (
              <Card>
                <CardContent className="py-10 text-center text-sm text-muted-foreground">
                  {copy.emptyJobs}
                </CardContent>
              </Card>
            ) : (
              <>
                <div className="overflow-x-auto rounded-xl border border-border/40">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{isAr ? "المهمة" : "Job"}</TableHead>
                        <TableHead>{isAr ? "الطلب" : "Order"}</TableHead>
                        <TableHead>{isAr ? "المحطة" : "Station"}</TableHead>
                        <TableHead>{isAr ? "الطابعة" : "Printer"}</TableHead>
                        <TableHead>{isAr ? "الحالة" : "Status"}</TableHead>
                        <TableHead>{isAr ? "أُنشئت" : "Created"}</TableHead>
                        <TableHead>{isAr ? "آخر تحديث" : "Updated"}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {jobsQuery.data?.jobs.map((job) => (
                        <TableRow
                          key={job.id}
                          className="cursor-pointer"
                          onClick={() => setSelectedJobId(job.id)}
                        >
                          <TableCell dir="ltr">#{job.id}</TableCell>
                          <TableCell dir="ltr">#{job.orderId}</TableCell>
                          <TableCell>{job.stationName ?? "—"}</TableCell>
                          <TableCell dir="ltr">{job.printerId ?? "—"}</TableCell>
                          <TableCell>
                            <Badge variant={statusBadgeVariant(job.operationalStatus)}>
                              {job.operationalStatus}
                            </Badge>
                          </TableCell>
                          <TableCell dir="ltr">{formatTimestamp(job.createdAt, isAr)}</TableCell>
                          <TableCell dir="ltr">{formatTimestamp(job.updatedAt, isAr)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                <div className="mt-4 flex items-center justify-between gap-3">
                  <p className="text-xs text-muted-foreground" dir="ltr">
                    {jobPage * PAGE_SIZE + 1}–{Math.min((jobPage + 1) * PAGE_SIZE, jobTotal)} / {jobTotal}
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={jobPage <= 0}
                      onClick={() => setJobPage((page) => Math.max(0, page - 1))}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={jobPage + 1 >= jobPageCount}
                      onClick={() => setJobPage((page) => page + 1)}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </>
            )}
          </RestaurantDashSection>
        </TabsContent>

        <TabsContent value="failures" className="mt-4">
          <RestaurantDashSection title={copy.failures}>
            {failuresQuery.isLoading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : failuresQuery.isError ? (
              <RestaurantSectionError
                message={failuresQuery.error.message}
                retryLabel={copy.retry}
                onRetry={() => failuresQuery.refetch()}
              />
            ) : (failuresQuery.data?.length ?? 0) === 0 ? (
              <Card>
                <CardContent className="py-10 text-center text-sm text-muted-foreground">
                  {copy.emptyFailures}
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {failuresQuery.data?.map((failure) => (
                  <Card key={`${failure.jobId}-${failure.timestamp}-${failure.failureCode}`}>
                    <CardHeader className="pb-2">
                      <CardTitle className="flex flex-wrap items-center gap-2 text-sm">
                        <Badge variant="destructive">{failure.failureLayer}</Badge>
                        <span dir="ltr">Job #{failure.jobId}</span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-1 text-sm text-muted-foreground">
                      <p dir="ltr">{failure.failureCode}</p>
                      <p>{failure.failureMessage}</p>
                      <p dir="ltr">{formatTimestamp(failure.timestamp, isAr)}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </RestaurantDashSection>
        </TabsContent>

        <TabsContent value="diagnostics" className="mt-4">
          <RestaurantDashSection title={copy.diagnostics}>
            <div className="mb-4">
              <PrinterDiscoveryDiagnosticsPanel
                data={discoveryQuery.data}
                setupStatus={setupStatus}
                isAr={isAr}
                isLoading={discoveryQuery.isLoading || setupStatusQuery.isLoading}
              />
            </div>
            <DiagnosticHistoryPanel
              runs={diagnosticRunsQuery.data}
              isAr={isAr}
              isLoading={diagnosticRunsQuery.isLoading}
            />
          </RestaurantDashSection>
        </TabsContent>
      </Tabs>

      <Sheet open={selectedPrinterId != null} onOpenChange={(open) => !open && setSelectedPrinterId(null)}>
        <SheetContent side={isAr ? "left" : "right"} className="overflow-y-auto sm:max-w-lg">
          <SheetHeader>
            <SheetTitle>{copy.printerDetails}</SheetTitle>
            <SheetDescription dir="ltr">
              {selectedPrinterId != null ? `#${selectedPrinterId}` : ""}
            </SheetDescription>
          </SheetHeader>
          {printerDetailQuery.isLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : printerDetailQuery.data?.found ? (
            <div className="mt-6 space-y-4 text-sm">
              <div>
                <p className="font-medium text-foreground">{printerDetailQuery.data.printer.name}</p>
                <p className="text-muted-foreground" dir="ltr">
                  {printerDetailQuery.data.printer.profileId}
                </p>
              </div>
              <div className="grid gap-2">
                <p>
                  {copy.transport}: {printerDetailQuery.data.printer.transport}
                </p>
                <p>
                  {copy.resolution}:{" "}
                  {printerDetailQuery.data.printer.resolution.status === "resolved"
                    ? `${copy.agent} ${printerDetailQuery.data.printer.resolution.agentId}`
                    : printerDetailQuery.data.printer.resolution.reason}
                </p>
              </div>
              {selectedPrinterId != null ? (
                <Button
                  type="button"
                  className="w-full"
                  disabled={
                    testPrintMutation.isPending ||
                    !canRunAuthorityTestPrintForPrinter(setupStatus, selectedPrinterId)
                  }
                  onClick={() => handleTestPrint(selectedPrinterId)}
                >
                  {testPrintMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <TestTube2 className="h-4 w-4" />
                  )}
                  <span className="ms-2">{copy.testPrint}</span>
                </Button>
              ) : null}
              <div>
                <p className="mb-2 font-medium">{isAr ? "مهام حديثة" : "Recent Jobs"}</p>
                <div className="space-y-2">
                  {printerDetailQuery.data.printer.recentJobs.map((job) => (
                    <button
                      key={job.id}
                      type="button"
                      className="flex w-full items-center justify-between rounded-lg border border-border/40 px-3 py-2 text-start"
                      onClick={() => {
                        setSelectedPrinterId(null);
                        setSelectedJobId(job.id);
                        setActiveTab("queue");
                      }}
                    >
                      <span dir="ltr">#{job.id}</span>
                      <Badge variant={statusBadgeVariant(job.operationalStatus)}>
                        {job.operationalStatus}
                      </Badge>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : null}
        </SheetContent>
      </Sheet>

      <Sheet open={selectedJobId != null} onOpenChange={(open) => !open && setSelectedJobId(null)}>
        <SheetContent side={isAr ? "left" : "right"} className="overflow-y-auto sm:max-w-lg">
          <SheetHeader>
            <SheetTitle>{copy.jobDetails}</SheetTitle>
            <SheetDescription dir="ltr">
              {selectedJobId != null ? `#${selectedJobId}` : ""}
            </SheetDescription>
          </SheetHeader>
          {jobDetailQuery.isLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : jobDetailQuery.data?.found ? (
            <div className="mt-6 space-y-4 text-sm">
              <div className="grid gap-2">
                <p dir="ltr">Order #{jobDetailQuery.data.job.orderId}</p>
                {jobDetailQuery.data.job.stationName ? (
                  <p>
                    {isAr ? "المحطة" : "Station"}: {jobDetailQuery.data.job.stationName}
                  </p>
                ) : null}
                <p dir="ltr">Printer #{jobDetailQuery.data.job.printerId ?? "—"}</p>
                <Badge variant={statusBadgeVariant(jobDetailQuery.data.job.operationalStatus)}>
                  {jobDetailQuery.data.job.operationalStatus}
                </Badge>
              </div>
              {jobDetailQuery.data.job.assignment ? (
                <div>
                  <p className="font-medium">{isAr ? "التعيين" : "Assignment"}</p>
                  <p dir="ltr">{jobDetailQuery.data.job.assignment.agentId}</p>
                  <p dir="ltr">{formatTimestamp(jobDetailQuery.data.job.assignment.assignedAt, isAr)}</p>
                </div>
              ) : null}
              {jobDetailQuery.data.job.executionOutcome ? (
                <div>
                  <p className="font-medium">{isAr ? "نتيجة التنفيذ" : "Execution Outcome"}</p>
                  <p dir="ltr">{jobDetailQuery.data.job.executionOutcome.category}</p>
                  <p>{jobDetailQuery.data.job.executionOutcome.message ?? "—"}</p>
                </div>
              ) : null}
              {jobDetailQuery.data.job.deliveryState ? (
                <div>
                  <p className="font-medium">{isAr ? "التسليم" : "Delivery"}</p>
                  <p dir="ltr">{jobDetailQuery.data.job.deliveryState.state}</p>
                </div>
              ) : null}
            </div>
          ) : null}
        </SheetContent>
      </Sheet>
    </div>
  );
}
