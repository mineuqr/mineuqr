import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/Home";
import Dashboard from "./pages/Dashboard";
import MenuView from "./pages/MenuView";
import TableOrderingShell from "./pages/TableOrderingShell";
import KioskShell from "./pages/kiosk/KioskShell";
import WaiterShell from "./pages/waiter/WaiterShell";
import OrderConfirmationPage from "./pages/OrderConfirmationPage";

/** Dashboard routes — WaiterShell also accepts optional Screen Runtime activation props. */
function WaiterShellRoute() {
  return <WaiterShell />;
}
import OrderStatusPage from "./pages/OrderStatusPage";
import Pricing from "./pages/Pricing";
import SubscriptionSuccess from "./pages/SubscriptionSuccess";
import SubscriptionCancel from "./pages/SubscriptionCancel";
import PaymentHistory from "./pages/PaymentHistory";
import SubscriptionManagement from "./pages/SubscriptionManagement";
import AdminManagement from "./pages/AdminManagement";
import AdminDashboardHome from "./pages/admin/AdminDashboardHome";
import AdminAnalyticsPage from "./pages/admin/AdminAnalyticsPage";
import AdminCommercialPage from "./pages/admin/AdminCommercialPage";
import {
  AdminCustomerSuccessPage,
  AdminHealthPage,
  AdminLaunchReadinessPage,
  AdminReportsPage,
  AdminTenantsPage,
} from "./pages/admin/placeholderPages";
import AdminSecurityPage from "./pages/admin/AdminSecurityPage";
import {
  AdminPlatformOpsOverviewPage,
  AdminPlatformOpsRealtimePage,
  AdminPlatformOpsHealthPage,
  AdminPlatformOpsPerformancePage,
  AdminPlatformOpsDevicesPage,
  AdminPlatformOpsSubscriptionPage,
  AdminPlatformOpsJobsPage,
  AdminPlatformOpsEventsPage,
  AdminPlatformOpsAuditPage,
  AdminPlatformOpsDiagnosticsPage,
} from "./pages/admin/platform-ops/AdminPlatformOpsPages";
import SuperAdminDashboard from "./pages/SuperAdminDashboard";
import Statistics from "./pages/Statistics";
import Users from "./pages/Users";
import Terms from "./pages/Terms";
import Privacy from "./pages/Privacy";
import Security from "./pages/Security";
import Billing from "./pages/Billing";
import Trust from "./pages/Trust";
import Subprocessors from "./pages/Subprocessors";
import Dpa from "./pages/Dpa";
import ResponsibleDisclosure from "./pages/ResponsibleDisclosure";
import Docs from "./pages/Docs";
import Roadmap from "./pages/Roadmap";
import Status from "./pages/Status";
import About from "./pages/About";
import Contact from "./pages/Contact";
import TemplateSelector from "./pages/TemplateSelector";
import SubscriberLogin from "./pages/SubscriberLogin";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import Register from "./pages/Register";
import VerifyEmailSuccess from "./pages/VerifyEmailSuccess";
import VerifyEmailFailed from "./pages/VerifyEmailFailed";
import Profile from "./pages/Profile";
import Notifications from "./pages/Notifications";
import CommercialDiagnostics from "./pages/CommercialDiagnostics";
import OperationalScreenEntry from "./pages/screen/OperationalScreenEntry";
import DeviceActivationPage from "./pages/device/DeviceActivationPage";
import OperationalScreenPair from "./pages/screen/OperationalScreenPair";
import OperationalScreenRun from "./pages/screen/OperationalScreenRun";
import { useLanguage } from "./contexts/LanguageContext";
import { Suspense } from "react";

function RouteTransitionFallback() {
  return <div className="min-h-screen bg-[#0b0e14]" aria-hidden />;
}

function Router() {
  const { dir } = useLanguage();
  return (
    <Suspense fallback={<RouteTransitionFallback />}>
      <Switch>
        <Route path="/" component={Home} />
        <Route path="/device" component={DeviceActivationPage} />
        <Route path="/screen/pair" component={OperationalScreenPair} />
        <Route path="/screen/run" component={OperationalScreenRun} />
        <Route path="/screen" component={OperationalScreenEntry} />
        <Route path="/dashboard" component={Dashboard} />
        <Route path="/dashboard/templates/:restaurantId" component={TemplateSelector} />
        <Route path="/dashboard/:section" component={Dashboard} />
        <Route path="/menu/:slug/order/:trackingToken/confirmed" component={OrderConfirmationPage} />
        <Route path="/menu/:slug/order/:trackingToken" component={OrderStatusPage} />
        <Route path="/menu/:slug/table/:tableNumber/checkout" component={TableOrderingShell} />
        <Route path="/menu/:slug/table/:tableNumber" component={TableOrderingShell} />
        <Route path="/menu/:slug" component={MenuView} />
        <Route path="/kiosk/:slug/confirmed" component={KioskShell} />
        <Route path="/kiosk/:slug/checkout" component={KioskShell} />
        <Route path="/kiosk/:slug/cart" component={KioskShell} />
        <Route path="/kiosk/:slug/menu" component={KioskShell} />
        <Route path="/kiosk/:slug/language" component={KioskShell} />
        <Route path="/kiosk/:slug" component={KioskShell} />
        <Route path="/waiter/:slug/confirmed" component={WaiterShellRoute} />
        <Route path="/waiter/:slug/checkout" component={WaiterShellRoute} />
        <Route path="/waiter/:slug/cart" component={WaiterShellRoute} />
        <Route path="/waiter/:slug/menu" component={WaiterShellRoute} />
        <Route path="/waiter/:slug/workspace" component={WaiterShellRoute} />
        <Route path="/waiter/:slug/tables" component={WaiterShellRoute} />
        <Route path="/waiter/:slug" component={WaiterShellRoute} />
        <Route path="/waiter" component={WaiterShellRoute} />
        <Route path="/pricing" component={Pricing} />
        <Route path="/subscription/success" component={SubscriptionSuccess} />
        <Route path="/subscription/cancel" component={SubscriptionCancel} />
        <Route path="/payments" component={PaymentHistory} />
        <Route path="/subscription" component={SubscriptionManagement} />
        <Route path="/commercial/diagnostics" component={CommercialDiagnostics} />
        <Route path="/login" component={SubscriberLogin} />
        <Route path="/register" component={Register} />
        <Route path="/verify-email/success" component={VerifyEmailSuccess} />
        <Route path="/verify-email/failed" component={VerifyEmailFailed} />
        <Route path="/forgot-password" component={ForgotPassword} />
        <Route path="/reset-password" component={ResetPassword} />
        <Route path="/profile" component={Profile} />
        <Route path="/notifications" component={Notifications} />
        <Route path="/admin/operations" component={AdminManagement} />
        <Route path="/admin/commercial" component={AdminCommercialPage} />
        <Route path="/admin/analytics" component={AdminAnalyticsPage} />
        <Route path="/admin/tenants" component={AdminTenantsPage} />
        <Route path="/admin/customer-success" component={AdminCustomerSuccessPage} />
        <Route path="/admin/health" component={AdminHealthPage} />
        <Route path="/admin/platform/realtime" component={AdminPlatformOpsRealtimePage} />
        <Route path="/admin/platform/health" component={AdminPlatformOpsHealthPage} />
        <Route path="/admin/platform/performance" component={AdminPlatformOpsPerformancePage} />
        <Route path="/admin/platform/devices" component={AdminPlatformOpsDevicesPage} />
        <Route path="/admin/platform/subscription" component={AdminPlatformOpsSubscriptionPage} />
        <Route path="/admin/platform/jobs" component={AdminPlatformOpsJobsPage} />
        <Route path="/admin/platform/events" component={AdminPlatformOpsEventsPage} />
        <Route path="/admin/platform/audit" component={AdminPlatformOpsAuditPage} />
        <Route path="/admin/platform/diagnostics" component={AdminPlatformOpsDiagnosticsPage} />
        <Route path="/admin/platform" component={AdminPlatformOpsOverviewPage} />
        <Route path="/admin/security" component={AdminSecurityPage} />
        <Route path="/admin/reports" component={AdminReportsPage} />
        <Route path="/admin/launch-readiness" component={AdminLaunchReadinessPage} />
        <Route path="/admin" component={AdminDashboardHome} />
        <Route path="/super-admin" component={SuperAdminDashboard} />
        <Route path="/statistics" component={Statistics} />
        <Route path="/users" component={Users} />
        <Route path="/terms" component={Terms} />
        <Route path="/privacy" component={Privacy} />
        <Route path="/security/disclosure" component={ResponsibleDisclosure} />
        <Route path="/security" component={Security} />
        <Route path="/billing" component={Billing} />
        <Route path="/trust" component={Trust} />
        <Route path="/subprocessors" component={Subprocessors} />
        <Route path="/dpa" component={Dpa} />
        <Route path="/docs" component={Docs} />
        <Route path="/roadmap" component={Roadmap} />
        <Route path="/status" component={Status} />
        <Route path="/about" component={About} />
        <Route path="/contact" component={Contact} />
        <Route path="/404" component={NotFound} />
        <Route component={NotFound} />
      </Switch>
    </Suspense>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="dark">
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
