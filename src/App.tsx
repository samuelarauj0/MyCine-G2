import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Catalog from "./pages/Catalog";
import TitleDetail from "./pages/TitleDetail";
import Profile from "./pages/Profile";
import Leaderboard from "./pages/Leaderboard";
import Challenges from "./pages/Challenges";
import Achievements from "./pages/Achievements";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { AdminLayout } from "./pages/admin/AdminLayout";
import { AdminDashboard } from "./pages/admin/AdminDashboard";
import { AdminTitles } from "./pages/admin/AdminTitles";
import { AdminModeration } from "./pages/admin/AdminModeration";
import { AdminChallenges } from "./pages/admin/AdminChallenges";
import AdminBanners from "./pages/admin/AdminBanners";
import AdminPopulateTitles from "./pages/admin/AdminPopulateTitles";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Sonner />
      <Routes>
        <Route path="/auth" element={<Auth />} />
        <Route path="/" element={
          <ProtectedRoute>
            <Index />
          </ProtectedRoute>
        } />
        <Route path="/catalog" element={
          <ProtectedRoute>
            <Catalog />
          </ProtectedRoute>
        } />
        <Route path="/title/:id" element={
          <ProtectedRoute>
            <TitleDetail />
          </ProtectedRoute>
        } />
        <Route path="/profile" element={
          <ProtectedRoute>
            <Profile />
          </ProtectedRoute>
        } />
        <Route path="/leaderboard" element={
          <ProtectedRoute>
            <Leaderboard />
          </ProtectedRoute>
        } />
        <Route path="/challenges" element={
          <ProtectedRoute>
            <Challenges />
          </ProtectedRoute>
        } />
        <Route path="/achievements" element={
          <ProtectedRoute>
            <Achievements />
          </ProtectedRoute>
        } />
        <Route path="/admin" element={
          <ProtectedRoute>
            <AdminLayout>
              <AdminDashboard />
            </AdminLayout>
          </ProtectedRoute>
        } />
        <Route path="/admin/titles" element={
          <ProtectedRoute>
            <AdminLayout>
              <AdminTitles />
            </AdminLayout>
          </ProtectedRoute>
        } />
        <Route path="/admin/moderation" element={
          <ProtectedRoute>
            <AdminLayout>
              <AdminModeration />
            </AdminLayout>
          </ProtectedRoute>
        } />
        <Route path="/admin/challenges" element={
          <ProtectedRoute>
            <AdminLayout>
              <AdminChallenges />
            </AdminLayout>
          </ProtectedRoute>
        } />
        <Route path="/admin/banners" element={
          <ProtectedRoute>
            <AdminLayout>
              <AdminBanners />
            </AdminLayout>
          </ProtectedRoute>
        } />
        <Route path="/admin/populate-titles" element={
          <ProtectedRoute>
            <AdminLayout>
              <AdminPopulateTitles />
            </AdminLayout>
          </ProtectedRoute>
        } />
      </Routes>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
