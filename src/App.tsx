import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { LoginForm } from './components/Auth/LoginForm';
import { AccessDenied } from './components/Auth/AccessDenied';
import { Sidebar } from './components/Layout/Sidebar';
import { UserManagement } from './components/Admin/UserManagement';
import { TimesheetManagement } from './components/Manager/TimesheetManagement';
import { MonthlyTimesheet } from './components/Manager/MonthlyTimesheet';
import { AnalyticsReports } from './components/Manager/AnalyticsReports';
import { LoadingScreen } from './components/ui/LoadingScreen';
import { Toaster } from 'react-hot-toast';
import { Menu, PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import { Button } from './components/ui/Button';
import { cn } from './lib/utils';

function ComingSoon({ title, description }: { title: string; description: string }) {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="text-center space-y-6 max-w-md">
        <div className="w-20 h-20 bg-gradient-to-br from-blue-100 to-purple-100 rounded-3xl flex items-center justify-center mx-auto">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl"></div>
        </div>
        <div className="space-y-3">
          <h3 className="text-2xl font-bold text-foreground">{title}</h3>
          <p className="text-muted-foreground leading-relaxed">{description}</p>
        </div>
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
              title="Activity Monitoring"
              description="Comprehensive activity tracking and audit logs are coming soon. Monitor all system activities and user interactions with detailed insights."
            />
          );
        case 'settings':
          return (
            <ComingSoon
              title="System Configuration"
              description="Advanced configuration options and system preferences will be available here. Customize your TimeTracker experience with powerful settings."
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
              title="Calendar Integration"
              description="Interactive calendar interface for better timesheet visualization and planning. Coming soon with advanced scheduling features and team coordination tools."
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
    <div className="h-screen bg-gray-25 flex overflow-hidden">
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 z-40 bg-black/20 backdrop-blur-sm lg:hidden transition-all duration-300 ease-in-out"
          onClick={closeMobileSidebar}
        />
      )}

      {/* Sidebar */}
      <div className={cn(
        "fixed inset-y-0 left-0 z-50 lg:translate-x-0 lg:static lg:inset-0",
        "transition-all duration-300 ease-in-out",
        sidebarOpen ? "translate-x-0" : "-translate-x-full",
        sidebarCollapsed ? "lg:w-16" : "lg:w-64"
      )}>
        <Sidebar 
          activeTab={activeTab} 
          onTabChange={setActiveTab}
          onClose={closeMobileSidebar}
          collapsed={sidebarCollapsed}
          onToggleCollapse={toggleSidebarCollapsed}
        />
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Header */}
        <header className="bg-white/80 backdrop-blur-xl border-b border-border px-4 lg:px-6 py-4 flex items-center justify-between shadow-soft">
          {/* Left side */}
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden"
            >
              <Menu className="w-5 h-5" />
            </Button>
            
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={toggleSidebarCollapsed}
              className="hidden lg:flex"
              title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              {sidebarCollapsed ? (
                <PanelLeftOpen className="w-5 h-5" />
              ) : (
                <PanelLeftClose className="w-5 h-5" />
              )}
            </Button>

            <div className="hidden sm:block">
              <h1 className="text-lg font-semibold text-foreground">
                {user.role === 'admin' ? 'Admin Dashboard' : 'Manager Dashboard'}
              </h1>
              <p className="text-sm text-muted-foreground">
                Welcome back, {user.fullName || user.email}
              </p>
            </div>
          </div>

          {/* Right side - could add notifications, search, etc. */}
          <div className="flex items-center gap-3">
            {/* Placeholder for future features */}
          </div>
        </header>

        {/* Main content area */}
        <main className="flex-1 overflow-auto bg-gray-25">
          <div className="container mx-auto p-4 lg:p-6 max-w-7xl">
            <div className="animate-fade-in">
              {renderContent()}
            </div>
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
          className: 'bg-white border border-border shadow-strong rounded-xl',
          style: {
            background: 'white',
            color: 'hsl(var(--foreground))',
            border: '1px solid hsl(var(--border))',
            borderRadius: '0.75rem',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.12), 0 4px 8px rgba(0, 0, 0, 0.08)',
          },
          success: {
            duration: 3000,
            iconTheme: {
              primary: '#10b981',
              secondary: 'white',
            },
          },
          error: {
            duration: 5000,
            iconTheme: {
              primary: '#ef4444',
              secondary: 'white',
            },
          },
        }}
      />
    </AuthProvider>
  );
}

export default App;