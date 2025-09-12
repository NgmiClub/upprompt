import { Toaster } from "@/components/ui/toaster";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { PromptAnalytics } from "./components/analytics/PromptAnalytics";
import Auth from "./pages/Auth";
import AuthCallback from "./pages/AuthCallback";
import { Home } from "./pages/Home";
import Index from "./pages/Index";
import { Profile } from "./pages/Profile";
import { PromptDetail } from "./pages/PromptDetail";
import { Settings } from "./pages/Settings";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Index />} />
        <Route path="/auth" element={<Auth />} />
        <Route path="/auth/v1/callback" element={<AuthCallback />} />
        <Route path="/home" element={<Home />} />
        <Route path="/prompt/:id" element={<PromptDetail />} />
        <Route path="/profile/:username?" element={<Profile />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/analytics" element={<PromptAnalytics />} />
      </Routes>
      <Toaster />
    </BrowserRouter>
  );
}

export default App;
