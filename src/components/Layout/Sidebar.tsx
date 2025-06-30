import React from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { 
  Users, 
  Clock, 
  Settings, 
  LogOut, 
  BarChart3,
  Calendar,
  X,
  Activity,
  FileText,
  Timer,
  CalendarDays
} from 'lucide-react';
import { Button } from '../ui/Button';
import { Avatar, AvatarFallback } from '../ui/Avatar';
import { Separator } from '../ui/Separator';
import { cn } from '../../lib/utils';

interface SidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  onClose?: () => void;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
}

export function Sidebar({ activeTab, onTabChange, onClose, collapsed = false }: SidebarProps) {
  const { user, signOut } = useAuth();

  const adminTabs = [
    { id: 'users', label: 'User Management', icon: Users, description: 'Manage team members' },
    { id: 'timesheets', label: 'Weekly Timesheets', icon: Timer, description: 'Review weekly submissions' },
    { id: 'monthly', label: 'Monthly Timesheets', icon: CalendarDays, description: 'Monthly calendar view' },
    { id: 'activity', label: 'Activity Log', icon: Activity, description: 'System logs' },
    { id: 'settings', label: 'Settings', icon: Settings, description: 'Configuration' },
  ];

  const managerTabs = [
    { id: 'timesheets', label: 'Weekly Timesheets', icon: Timer, description: 'Review weekly submissions' },
    { id: 'monthly', label: 'Monthly Timesheets', icon: CalendarDays, description: 'Monthly calendar view' },
    { id: 'calendar', label: 'Calendar', icon: Calendar, description: 'Schedule view' },
    { id: 'reports', label: 'Reports', icon: FileText, description: 'Analytics' },
  ];

  const tabs = user?.role === 'admin' ? adminTabs : managerTabs;

  const handleTabChange = (tabId: string) => {
    onTabChange(tabId);
    if (onClose) onClose();
  };

  return (
    <div className={cn(
      "flex h-full flex-col bg-background border-r ease-in-out",
      collapsed ? "w-16" : "w-60"
    )}>
      {/* Header */}
      <div className={cn(
        "flex items-center  ease-in-out",
        collapsed ? "justify-center p-4" : "justify-between p-2"
      )}>
        {!collapsed && (
          <div className="flex items-center space-x-3 opacity-100 transition-opacity duration-300">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Timer className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-lg font-semibold">NileTracker</h2>
              <p className="text-xs text-muted-foreground capitalize">{user?.role}</p>
            </div>
          </div>
        )}
        
        {collapsed && (
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary text-primary-foreground transition-all duration-300">
            <Timer className="h-4 w-4" />
          </div>
        )}
        
        {onClose && !collapsed && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="lg:hidden opacity-100 transition-all duration-200 hover:bg-muted/80"
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      <Separator />

      {/* Navigation */}
      <nav className={cn(
        "flex-1 space-y-1 transition-all duration-300 ease-in-out",
        collapsed ? "p-2" : "p-4"
      )}>
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <Button
              key={tab.id}
              variant={isActive ? "secondary" : "ghost"}
              className={cn(
                "w-full transition-all duration-200 ease-in-out",
                collapsed 
                  ? "h-10 w-10 p-0 justify-center" 
                  : "h-auto p-3 justify-start",
                isActive && "bg-secondary shadow-sm",
                !collapsed && "hover:bg-muted/60 hover:translate-x-1"
              )}
              onClick={() => handleTabChange(tab.id)}
              title={collapsed ? tab.label : undefined}
            >
              <Icon className={cn(
                "h-4 w-4 flex-shrink-0 transition-all duration-200",
                collapsed ? "" : "mr-3",
                isActive && "text-primary"
              )} />
              {!collapsed && (
                <div className={cn(
                  "flex flex-col items-start transition-all duration-300 ease-in-out",
                  collapsed ? "opacity-0 w-0" : "opacity-100"
                )}>
                  <span className="font-medium">{tab.label}</span>
                  <span className="text-xs text-muted-foreground">{tab.description}</span>
                </div>
              )}
            </Button>
          );
        })}
      </nav>

      <Separator />

      {/* User Profile */}
      <div className={cn(
        "transition-all duration-300 ease-in-out",
        collapsed ? "p-2" : "p-4 space-y-4"
      )}>
        {!collapsed ? (
          <div className="space-y-4 transition-all duration-300 ease-in-out">
            <div className="flex items-center space-x-3">
              <Avatar className="h-8 w-8 transition-all duration-200 hover:scale-105">
                <AvatarFallback className="text-xs">
                  {user?.fullName?.slice(0, 2).toUpperCase() || user?.email?.slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0 transition-all duration-300">
                <p className="text-sm font-medium truncate">
                  {user?.fullName || 'User'}
                </p>
                <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
              </div>
            </div>
            
            <Button
              variant="outline"
              size="sm"
              onClick={signOut}
              className="w-full transition-all duration-200 hover:bg-destructive hover:text-destructive-foreground hover:border-destructive"
            >
              <LogOut className="mr-2 h-4 w-4" />
              Sign Out
            </Button>
          </div>
        ) : (
          <div className="space-y-2 transition-all duration-300 ease-in-out">
            <div className="flex justify-center">
              <Avatar className="h-8 w-8 transition-all duration-200 hover:scale-105">
                <AvatarFallback className="text-xs">
                  {user?.fullName?.slice(0, 2).toUpperCase() || user?.email?.slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
            </div>
            
            <Button
              variant="outline"
              size="icon"
              onClick={signOut}
              className="w-full h-8 transition-all duration-200 hover:bg-destructive hover:text-destructive-foreground hover:border-destructive"
              title="Sign Out"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}