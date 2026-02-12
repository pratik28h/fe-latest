import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { FileProvider } from "@/contexts/FileContext";
import NotFound from "@/pages/not-found";
import AppLayout from "@/components/layout/AppLayout";
import Home from "@/pages/home";
import UploadPage from "@/pages/upload";
import PreviewPage from "@/pages/preview";
import ChatPage from "@/pages/chat";
import DashboardBuilder from "@/pages/dashboard-builder";

function Router() {
  return (
    <AppLayout>
      <Switch>
        <Route path="/" component={Home} />
        <Route path="/upload" component={UploadPage} />
        <Route path="/preview" component={PreviewPage} />
        <Route path="/chat" component={ChatPage} />
        <Route path="/builder" component={DashboardBuilder} />
        <Route component={NotFound} />
      </Switch>
    </AppLayout>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <FileProvider>
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </FileProvider>
    </QueryClientProvider>
  );
}

export default App;