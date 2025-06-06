import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/useAuth";
import { usePreferences } from "@/hooks/usePreferences";
import { ClientProvider } from "@/components/client-selector";
import Landing from "@/pages/landing";
import LoginPage from "@/pages/login";
import SignupPage from "@/pages/signup";
import Dashboard from "@/pages/dashboard";
import ProfileSettings from "@/pages/profile-settings";
import Preferences from "@/pages/preferences";
import NotFound from "@/pages/not-found";

function Router() {
  const { isAuthenticated, isLoading } = useAuth();
  const { isLoading: preferencesLoading } = usePreferences();

  return (
    <Switch>
      {/* REF: Public routes - always accessible */}
      <Route path="/login" component={LoginPage} />
      <Route path="/signup" component={SignupPage} />
      
      {/* REF: Protected routes - require authentication */}
      <Route path="/dashboard">
        {isLoading ? (
          <div className="min-h-screen flex items-center justify-center">
            <div className="text-center">Loading...</div>
          </div>
        ) : isAuthenticated ? (
          <ClientProvider>
            <Dashboard />
          </ClientProvider>
        ) : (
          <LoginPage />
        )}
      </Route>
      
      <Route path="/profile-settings">
        {isLoading ? (
          <div className="min-h-screen flex items-center justify-center">
            <div className="text-center">Loading...</div>
          </div>
        ) : isAuthenticated ? (
          <ClientProvider>
            <ProfileSettings />
          </ClientProvider>
        ) : (
          <LoginPage />
        )}
      </Route>
      
      <Route path="/preferences">
        {isLoading ? (
          <div className="min-h-screen flex items-center justify-center">
            <div className="text-center">Loading...</div>
          </div>
        ) : isAuthenticated ? (
          <ClientProvider>
            <Preferences />
          </ClientProvider>
        ) : (
          <LoginPage />
        )}
      </Route>
      
      {/* REF: Root route - show dashboard if authenticated, landing page if not */}
      <Route path="/">
        {isLoading ? (
          <div className="min-h-screen flex items-center justify-center">
            <div className="text-center">Loading...</div>
          </div>
        ) : isAuthenticated ? (
          <ClientProvider>
            <Dashboard />
          </ClientProvider>
        ) : (
          <Landing />
        )}
      </Route>
      
      {/* REF: 404 fallback */}
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
