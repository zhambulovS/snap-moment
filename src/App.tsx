
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { useAuth } from "./hooks/useAuth";
import AuthPage from "./components/AuthPage";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import PublicAlbumView from "./components/PublicAlbumView";
import GuestMediaUpload from "./components/GuestMediaUpload";

const queryClient = new QueryClient();

const App = () => {
  const { user, loading, session } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-rose-50 via-pink-50 to-orange-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-rose-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Загрузка...</p>
        </div>
      </div>
    );
  }

  console.log('App render - User:', user?.id, 'Session:', !!session);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            {/* Public routes for guests - always available */}
            <Route path="/guest/:albumCode" element={<PublicAlbumView />} />
            <Route path="/guest/:albumCode/upload" element={<GuestMediaUpload />} />
            
            {/* Main app routes */}
            <Route path="/" element={user ? <Index /> : <AuthPage />} />
            
            {/* 404 page */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
