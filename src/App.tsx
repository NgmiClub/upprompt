import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Toaster } from "@/components/ui/toaster";
import Index from "./pages/Index";
import { Home } from "./pages/Home";
import Auth from "./pages/Auth";
import { Profile } from "./pages/Profile";
import { Settings } from "./pages/Settings";
import { Dashboard } from "./pages/Dashboard";
import { PromptAnalytics } from "./components/analytics/PromptAnalytics";
import { PromptCollection } from "./components/collections/PromptCollection";
import { PromptTester } from "./components/testing/PromptTester";
import { PromptChallenges } from "./components/community/PromptChallenges";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Index />} />
        <Route path="/auth" element={<Auth />} />
        <Route path="/home" element={<Home />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/profile/:username?" element={<Profile />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/analytics" element={<PromptAnalytics />} />
        <Route path="/collections" element={<PromptCollection />} />
        <Route path="/tester" element={<PromptTester />} />
        <Route path="/challenges" element={<PromptChallenges />} />
      </Routes>
      <Toaster />
    </BrowserRouter>
  );
}

export default App;
