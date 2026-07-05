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
import OrderConfirmationPage from "./pages/OrderConfirmationPage";
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
import SuperAdminDashboard from "./pages/SuperAdminDashboard";
import Statistics from "./pages/Statistics";
import Users from "./pages/Users";
import Terms from "./pages/Terms";
import Privacy from "./pages/Privacy";
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
        <Route path="/admin/security" component={AdminSecurityPage} />
        <Route path="/admin/reports" component={AdminReportsPage} />
        <Route path="/admin/launch-readiness" component={AdminLaunchReadinessPage} />
        <Route path="/admin" component={AdminDashboardHome} />
        <Route path="/super-admin" component={SuperAdminDashboard} />
        <Route path="/statistics" component={Statistics} />
        <Route path="/users" component={Users} />
        <Route path="/terms" component={Terms} />
        <Route path="/privacy" component={Privacy} />
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
