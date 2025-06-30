import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { LoginForm } from './components/Auth/LoginForm';
import { AccessDenied } from './components/Auth/AccessDenied';
import { Sidebar } from './components/Layout/Sidebar';
import { UserManagement } from './components/Admin/UserManagement';
import { TimesheetManagement } from './components/Manager/TimesheetManagement';
import { MonthlyTimesheet } from './components/Manager/MonthlyTimesheet';
import { AnalyticsReports } from './components/Manager/AnalyticsReports';
import { Toaster } from 'react-hot-toast';
import { Menu, Loader2, PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import { Button } from './components/ui/Button';

function LoadingScreen() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center space-y-4">
        <Loader2 className="h-8 w-8 animate-spin mx-auto" />
        <p className="text-sm text-muted-foreground">Loading TimeTracker...</p>
      </div>
    </div>
  );
}

function ComingSoon({ title, description }: { title: string; description: string }) {
  return (
    <div className="text-center py-16">
      <div className="max-w-md mx-auto space-y-4">
        <div className="w-16 h-16 bg-muted rounded-lg flex items-center justify-center mx-auto">
          <div className="w-8 h-8 bg-primary rounded"></div>
        </div>
        <h3 className="text-2xl font-semibold">{title}</h3>
        <p className="text-muted-foreground">{description}</p>
      </div>
    </div>
  );
}

function AppContent() {
  const { user, loading } = useAuth();
  const [activeTab, setActiveTab] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  useEffect(() => {
    if (user) {
      if (user.role === 'admin') {
        setActiveTab('users');
      } else if (user.role === 'manager') {
        setActiveTab('timesheets');
      }
    }
  }, [user]);

  // Load sidebar collapsed state from localStorage
  useEffect(() => {
    const savedCollapsedState = localStorage.getItem('sidebarCollapsed');
    if (savedCollapsedState !== null) {
      setSidebarCollapsed(JSON.parse(savedCollapsedState));
    }
  }, []);

  // Save sidebar collapsed state to localStorage
  const toggleSidebarCollapsed = () => {
    const newCollapsedState = !sidebarCollapsed;
    setSidebarCollapsed(newCollapsedState);
    localStorage.setItem('sidebarCollapsed', JSON.stringify(newCollapsedState));
  };

  // Close mobile sidebar with smooth animation
  const closeMobileSidebar = () => {
    setSidebarOpen(false);
  };

  if (loading) {
    return <LoadingScreen />;
  }

  if (!user) {
    return <LoginForm />;
  }

  if (user.role === 'employee') {
    return <AccessDenied />;
  }

  const renderContent = () => {
    if (user.role === 'admin') {
      switch (activeTab) {
        case 'users':
          return <UserManagement />;
        case 'timesheets':
          return <TimesheetManagement />;
        case 'monthly':
          return <MonthlyTimesheet />;
        case 'activity':
          return (
            <ComingSoon
              title="Activity Log"
              description="Comprehensive activity tracking and audit logs are coming soon. Monitor all system activities and user interactions."
            />
          );
        case 'settings':
          return (
            <ComingSoon
              title="System Settings"
              description="Advanced configuration options and system preferences will be available here. Customize your TimeTracker experience."
            />
          );
        default:
          return <UserManagement />;
      }
    } else if (user.role === 'manager') {
      switch (activeTab) {
        case 'timesheets':
          return <TimesheetManagement />;
        case 'monthly':
          return <MonthlyTimesheet />;
        case 'calendar':
          return (
            <ComingSoon
              title="Calendar View"
              description="Interactive calendar interface for better timesheet visualization and planning. Coming soon with advanced scheduling features."
            />
          );
        case 'reports':
          return <AnalyticsReports />;
        default:
          return <TimesheetManagement />;
      }
    }
  };

  return (
    <div className="h-screen bg-background flex overflow-hidden">
      {/* Mobile sidebar overlay with smooth fade */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 z-40 bg-black/50 lg:hidden transition-opacity duration-300 ease-in-out backdrop-blur-sm"
          onClick={closeMobileSidebar}
        />
      )}

      {/* Sidebar with improved animations */}
      <div className={`
        fixed inset-y-0 left-0 z-50 lg:translate-x-0 lg:static lg:inset-0
        transition-all duration-300 ease-in-out
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        ${sidebarCollapsed ? 'lg:w-16' : 'lg:w-60'}
      `}>
        <div className="h-full shadow-xl lg:shadow-none border-r bg-background">
          <Sidebar 
            activeTab={activeTab} 
            onTabChange={setActiveTab}
            onClose={closeMobileSidebar}
            collapsed={sidebarCollapsed}
            onToggleCollapse={toggleSidebarCollapsed}
          />
        </div>
      </div>

      {/* Main content with smooth transitions */}
      <div className="flex-1 flex flex-col min-w-0 h-screen transition-all duration-300 ease-in-out">
        {/* Header with improved styling */}
        <div className="border-b bg-background/95 backdrop-blur-sm px-4 py-3 flex items-center justify-between shadow-sm">
          {/* Mobile menu button with hover effects */}
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden transition-all duration-200 hover:bg-muted/80 hover:scale-105"
            >
              <Menu className="w-5 h-5" />
            </Button>
            
            {/* Desktop sidebar toggle with smooth animation */}
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleSidebarCollapsed}
              className="hidden lg:flex transition-all duration-200 hover:bg-muted/80 hover:scale-105"
              title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              {sidebarCollapsed ? (
                <PanelLeftOpen className="w-5 h-5 transition-transform duration-200" />
              ) : (
                <PanelLeftClose className="w-5 h-5 transition-transform duration-200" />
              )}
            </Button>
          </div>

          <h1 className="font-semibold lg:hidden transition-all duration-200">TimeTracker</h1>
          <div className="w-9 lg:hidden" />
        </div>

        {/* Main content area with smooth transitions */}
        <main className="flex-1 overflow-auto transition-all duration-300 ease-in-out">
          <div className="container max-w-7xl mx-auto p-6">
            {renderContent()}
          </div>
        </main>
      </div>
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
      <Toaster 
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: 'hsl(var(--background))',
            color: 'hsl(var(--foreground))',
            border: '1px solid hsl(var(--border))',
          },
          success: {
            duration: 3000,
          },
          error: {
            duration: 5000,
          },
        }}
      />
    </AuthProvider>
  );
}

export default App;