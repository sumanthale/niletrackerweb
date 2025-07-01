import React from "react";
import { useAuth } from "../../contexts/AuthContext";
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
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Zap,
} from "lucide-react";
import { Button } from "../ui/Button";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/Avatar";
import { Separator } from "../ui/Separator";
import { Badge } from "../ui/Badge";
import { cn } from "../../lib/utils";

interface SidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  onClose?: () => void;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
}

export function Sidebar({
  activeTab,
  onTabChange,
  onClose,
  collapsed = false,
  onToggleCollapse,
}: SidebarProps) {
  const { user, signOut } = useAuth();

  const adminTabs = [
    {
      id: "users",
      label: "Team",
      icon: Users,
      description: "Manage team members",
      badge: null,
    },
    {
      id: "timesheets",
      label: "Weekly Reviews",
      icon: Timer,
      description: "Review submissions",
      badge: null,
    },
    {
      id: "monthly",
      label: "Monthly View",
      icon: CalendarDays,
      description: "Calendar overview",
      badge: null,
    },
  ];

  const managerTabs = [
    {
      id: "timesheets",
      label: "Weekly Reviews",
      icon: Timer,
      description: "Review submissions",
      badge: null,
    },
    {
      id: "monthly",
      label: "Monthly View",
      icon: CalendarDays,
      description: "Calendar overview",
      badge: null,
    },
    {
      id: "calendar",
      label: "Calendar",
      icon: Calendar,
      description: "Schedule view",
      badge: "Soon",
    },
    {
      id: "reports",
      label: "Analytics",
      icon: BarChart3,
      description: "Performance insights",
      badge: null,
    },
  ];

  const tabs = user?.role === "admin" ? adminTabs : managerTabs;

  const handleTabChange = (tabId: string) => {
    onTabChange(tabId);
    if (onClose) onClose();
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case "admin":
        return "bg-red-500";
      case "manager":
        return "bg-blue-500";
      default:
        return "bg-gray-500";
    }
  };

  return (
    <div
      className={cn(
        "flex h-full flex-col bg-white border-r border-border transition-all duration-300 ease-in-out",
        collapsed ? "w-16" : "w-64"
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border">
        {!collapsed && (
          <div className="flex items-center space-x-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 shadow-soft">
              <Zap className="h-4 w-4 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-foreground">TimeTracker</h2>
              <p className="text-xs text-muted-foreground capitalize">
                {user?.role} Dashboard
              </p>
            </div>
          </div>
        )}

        {collapsed && (
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 shadow-soft mx-auto">
            <Zap className="h-4 w-4 text-white" />
          </div>
        )}

        {/* Mobile close button */}
        {onClose && !collapsed && (
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={onClose}
            className="lg:hidden"
          >
            <X className="h-4 w-4" />
          </Button>
        )}

        {/* Desktop collapse toggle */}
        {onToggleCollapse && (
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={onToggleCollapse}
            className="hidden lg:flex"
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? (
              <ChevronRight className="h-4 w-4" />
            ) : (
              <ChevronLeft className="h-4 w-4" />
            )}
          </Button>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-2 overflow-y-auto scrollbar-thin">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          
          return (
            <Button
              key={tab.id}
              variant={isActive ? "secondary" : "ghost"}
              className={cn(
                "w-full justify-start transition-all duration-200",
                collapsed ? "px-0 justify-center" : "px-3",
                isActive && "bg-primary/10 text-primary border border-primary/20 shadow-soft",
                !isActive && "hover:bg-accent/50"
              )}
              onClick={() => handleTabChange(tab.id)}
              title={collapsed ? tab.label : undefined}
            >
              <Icon
                className={cn(
                  "h-4 w-4 flex-shrink-0",
                  !collapsed && "mr-3",
                  isActive && "text-primary"
                )}
              />
              {!collapsed && (
                <div className="flex-1 text-left">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{tab.label}</span>
                    {tab.badge && (
                      <Badge variant="secondary" size="sm">
                        {tab.badge}
                      </Badge>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    {tab.description}
                  </div>
                </div>
              )}
            </Button>
          );
        })}
      </nav>

      <Separator />

      {/* User Profile */}
      <div className="p-4">
        {!collapsed ? (
          <div className="space-y-4">
            {/* User Info Card */}
            <div className="flex items-center space-x-3 p-3 rounded-xl bg-accent/50 border border-border/50">
              <div className="relative">
                <Avatar className="h-10 w-10 border-2 border-background shadow-soft">
                  <AvatarImage src={user?.photoURL} alt={user?.fullName} />
                  <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white font-semibold">
                    {user?.fullName?.slice(0, 2).toUpperCase() ||
                      user?.email?.slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className={cn(
                  "absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white",
                  getRoleColor(user?.role || "employee")
                )} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">
                  {user?.fullName || "User"}
                </p>
                <p className="text-xs text-muted-foreground truncate">
                  {user?.email}
                </p>
              </div>
            </div>

            {/* Sign Out Button */}
            <Button
              variant="outline"
              size="sm"
              onClick={signOut}
              className="w-full text-red-600 border-red-200 hover:bg-red-50 hover:border-red-300"
              leftIcon={<LogOut className="h-4 w-4" />}
            >
              Sign Out
            </Button>
          </div>
        ) : (
          <div className="space-y-3 flex flex-col items-center">
            {/* Collapsed User Avatar */}
            <div className="relative">
              <Avatar className="h-10 w-10 border-2 border-background shadow-soft">
                <AvatarImage src={user?.photoURL} alt={user?.fullName} />
                <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white font-semibold">
                  {user?.fullName?.slice(0, 2).toUpperCase() ||
                    user?.email?.slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className={cn(
                "absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white",
                getRoleColor(user?.role || "employee")
              )} />
            </div>

            {/* Collapsed Sign Out Button */}
            <Button
              variant="outline"
              size="icon-sm"
              onClick={signOut}
              className="text-red-600 border-red-200 hover:bg-red-50 hover:border-red-300"
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