import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, useLocation } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/hooks/use-auth";
import TikoChatWidget from "@/components/TikoChatWidget";
import Index from "./pages/Index.tsx";
import EventDetail from "./pages/EventDetail.tsx";
import SellPage from "./pages/SellPage.tsx";
import NegotiationsPage from "./pages/NegotiationsPage.tsx";
import MyTicketsPage from "./pages/MyTicketsPage.tsx";
import TicketDetailPage from "./pages/TicketDetailPage.tsx";
import SellerProfilePage from "./pages/SellerProfilePage.tsx";
import AuthPage from "./pages/AuthPage.tsx";
import ProfilePage from "./pages/ProfilePage.tsx";
import PaymentSuccess from "./pages/PaymentSuccess.tsx";
import WalletPage from "./pages/WalletPage.tsx";
import WelcomePage from "./pages/WelcomePage.tsx";
import PrivacyPage from "./pages/PrivacyPage.tsx";
import TermsPage from "./pages/TermsPage.tsx";
import FaqPage from "./pages/FaqPage.tsx";
import AdminPage from "./pages/AdminPage.tsx";
import NotFound from "./pages/NotFound.tsx";
const TikoChatWidgetWrapper = () => {
  const location = useLocation();
  if (location.pathname === "/auth" || location.pathname === "/welcome") return null;
  return <TikoChatWidget />;
};

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/ticket/:ticketId" element={<TicketDetailPage />} />
            <Route path="/event/:eventId" element={<EventDetail />} />
            <Route path="/sell" element={<SellPage />} />
            <Route path="/negotiations" element={<NegotiationsPage />} />
            <Route path="/my-tickets" element={<MyTicketsPage />} />
            <Route path="/seller/:userId" element={<SellerProfilePage />} />
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/auth" element={<AuthPage />} />
            <Route path="/payment-success" element={<PaymentSuccess />} />
            <Route path="/wallet" element={<WalletPage />} />
            <Route path="/welcome" element={<WelcomePage />} />
            <Route path="/privacy" element={<PrivacyPage />} />
            <Route path="/terms" element={<TermsPage />} />
            <Route path="/faq" element={<FaqPage />} />
            <Route path="/admin" element={<AdminPage />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
          <TikoChatWidgetWrapper />
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
