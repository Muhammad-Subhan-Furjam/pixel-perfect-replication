import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";
import RoleProtectedRoute from "./components/RoleProtectedRoute";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import Team from "./pages/Team";
import CheckIns from "./pages/CheckIns";
import Analysis from "./pages/Analysis";
import Analytics from "./pages/Analytics";
import Metrics from "./pages/Metrics";
import Permissions from "./pages/Permissions";
import Subscription from "./pages/Subscription";
import Subscribers from "./pages/Subscribers";
import Settings from "./pages/Settings";
import Reports from "./pages/Reports";
import NotFound from "./pages/NotFound";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import TermsOfService from "./pages/TermsOfService";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/privacy-policy" element={<PrivacyPolicy />} />
            <Route path="/terms-of-service" element={<TermsOfService />} />
            
            {/* Common routes for all authenticated users */}
            <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/metrics" element={<ProtectedRoute><Metrics /></ProtectedRoute>} />
            <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
            <Route path="/reports" element={<ProtectedRoute><Reports /></ProtectedRoute>} />
            
            {/* CEO-only routes */}
            <Route path="/team" element={
              <ProtectedRoute>
                <RoleProtectedRoute allowedRoles={["ceo", "hr", "executive_assistant"]} requireTeamManagement>
                  <Team />
                </RoleProtectedRoute>
              </ProtectedRoute>
            } />
            <Route path="/check-ins" element={
              <ProtectedRoute>
                <RoleProtectedRoute allowedRoles={["ceo"]}>
                  <CheckIns />
                </RoleProtectedRoute>
              </ProtectedRoute>
            } />
            <Route path="/analysis" element={
              <ProtectedRoute>
                <RoleProtectedRoute allowedRoles={["ceo"]}>
                  <Analysis />
                </RoleProtectedRoute>
              </ProtectedRoute>
            } />
            <Route path="/analytics" element={
              <ProtectedRoute>
                <RoleProtectedRoute allowedRoles={["ceo", "hr", "executive_assistant"]}>
                  <Analytics />
                </RoleProtectedRoute>
              </ProtectedRoute>
            } />
            <Route path="/permissions" element={
              <ProtectedRoute>
                <RoleProtectedRoute allowedRoles={["ceo"]}>
                  <Permissions />
                </RoleProtectedRoute>
              </ProtectedRoute>
            } />
            <Route path="/subscription" element={
              <ProtectedRoute>
                <RoleProtectedRoute allowedRoles={["ceo"]}>
                  <Subscription />
                </RoleProtectedRoute>
              </ProtectedRoute>
            } />
            <Route path="/subscribers" element={
              <ProtectedRoute>
                <RoleProtectedRoute allowedRoles={["ceo"]}>
                  <Subscribers />
                </RoleProtectedRoute>
              </ProtectedRoute>
            } />
            
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
