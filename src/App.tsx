import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/lib/auth";
import { CartProvider } from "@/contexts/CartContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { AdminRoute } from "@/components/AdminRoute";
import { RoleRoute } from "@/components/RoleRoute";

import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import Systems from "./pages/Systems";
import Catalogue from "./pages/Catalogue";
import Builder from "./pages/Builder";
import Cart from "./pages/Cart";
import CartReview from "./pages/CartReview";
import Orders from "./pages/Orders";
import Account from "./pages/Account";
import PendingApproval from "./pages/PendingApproval";
import CheckoutReturn from "./pages/CheckoutReturn";
import ImportPage from "./pages/Import";
import AdminDashboard from "./pages/AdminDashboard";
import AdminProducts from "./pages/AdminProducts";
import AdminOrders from "./pages/AdminOrders";
import AdminSettings from "./pages/AdminSettings";
import AdminQuotes from "./pages/AdminQuotes";
import Quotes from "./pages/Quotes";
import QuoteNew from "./pages/QuoteNew";
import QuoteDetail from "./pages/QuoteDetail";
import AdminPartners from "./pages/AdminPartners";
import AdminPartnersReport from "./pages/AdminPartnersReport";
import AdminUsers from "./pages/AdminUsers";
import PartnerPortal from "./pages/PartnerPortal";
import Team from "./pages/Team";
import AcceptInvite from "./pages/AcceptInvite";
import AcceptPlatformInvite from "./pages/AcceptPlatformInvite";
import NotFound from "./pages/NotFound";
import Terms from "./pages/Terms";
import Returns from "./pages/Returns";
import BacsConfirmed from "./pages/BacsConfirmed";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      staleTime: 1000 * 60 * 5,
    },
  },
});

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AuthProvider>
        <CartProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/auth" element={<Auth />} />
              <Route path="/accept-invite" element={<AcceptInvite />} />
              <Route path="/accept-platform-invite" element={<AcceptPlatformInvite />} />
              <Route path="/terms" element={<Terms />} />
              <Route path="/returns" element={<Returns />} />
              <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
              <Route path="/team" element={<ProtectedRoute><Team /></ProtectedRoute>} />
              <Route path="/systems" element={<ProtectedRoute><Systems /></ProtectedRoute>} />
              <Route path="/catalogue" element={<RoleRoute allow={["master_admin","admin","standard"]}><Catalogue /></RoleRoute>} />
              <Route path="/builder" element={<ProtectedRoute><Builder /></ProtectedRoute>} />
              <Route path="/builder/:id" element={<ProtectedRoute><Builder /></ProtectedRoute>} />
              <Route path="/cart" element={<RoleRoute allow={["master_admin","admin"]}><Cart /></RoleRoute>} />
              <Route path="/cart/review" element={<RoleRoute allow={["master_admin","admin"]}><CartReview /></RoleRoute>} />
              <Route path="/basket" element={<RoleRoute allow={["master_admin","admin"]}><Cart /></RoleRoute>} />
              <Route path="/basket/review" element={<RoleRoute allow={["master_admin","admin"]}><CartReview /></RoleRoute>} />
              <Route path="/checkout/return" element={<ProtectedRoute><CheckoutReturn /></ProtectedRoute>} />
              <Route path="/orders" element={<RoleRoute allow={["master_admin","admin","standard"]}><Orders /></RoleRoute>} />
              <Route path="/orders/bacs-confirmed" element={<ProtectedRoute><BacsConfirmed /></ProtectedRoute>} />
              <Route path="/account" element={<ProtectedRoute><Account /></ProtectedRoute>} />
              <Route path="/import" element={<ProtectedRoute><ImportPage /></ProtectedRoute>} />
              <Route path="/admin" element={<AdminRoute><AdminDashboard /></AdminRoute>} />
              <Route path="/admin/orders" element={<AdminRoute><AdminOrders /></AdminRoute>} />
              <Route path="/admin/quotes" element={<AdminRoute><AdminQuotes /></AdminRoute>} />
              <Route path="/admin/users" element={<AdminRoute><AdminUsers /></AdminRoute>} />
              <Route path="/admin/partners" element={<AdminRoute><AdminPartners /></AdminRoute>} />
              <Route path="/admin/partners/report" element={<AdminRoute><AdminPartnersReport /></AdminRoute>} />
              <Route path="/partner-portal" element={<PartnerPortal />} />
              <Route path="/admin/products" element={<AdminRoute><AdminProducts /></AdminRoute>} />
              <Route path="/admin/settings" element={<AdminRoute><AdminSettings /></AdminRoute>} />
              <Route path="/quotes" element={<RoleRoute allow={["master_admin","admin","standard"]}><Quotes /></RoleRoute>} />
              <Route path="/quotes/new" element={<RoleRoute allow={["master_admin","admin","standard"]}><QuoteNew /></RoleRoute>} />
              <Route path="/quotes/:id" element={<RoleRoute allow={["master_admin","admin","standard"]}><QuoteDetail /></RoleRoute>} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </CartProvider>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
