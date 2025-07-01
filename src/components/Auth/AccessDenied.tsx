import React from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Button } from '../ui/Button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/Card';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/Avatar';
import { Badge } from '../ui/Badge';
import { 
  ShieldAlert, 
  LogOut, 
  Users, 
  Timer,
  Crown,
  UserCheck,
  ArrowLeft,
  AlertTriangle
} from 'lucide-react';

export function AccessDenied() {
  const { user, signOut } = useAuth();

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'admin':
        return <Crown className="w-4 h-4" />;
      case 'manager':
        return <UserCheck className="w-4 h-4" />;
      default:
        return <Timer className="w-4 h-4" />;
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin':
        return 'destructive';
      case 'manager':
        return 'default';
      default:
        return 'secondary';
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-25 via-white to-gray-50 p-4">
      <div className="w-full max-w-lg space-y-8 animate-fade-in">
        {/* Header */}
        <div className="text-center space-y-4">
          <div className="flex justify-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-gradient-to-br from-red-500 to-orange-500 shadow-strong">
              <ShieldAlert className="h-8 w-8 text-white" />
            </div>
          </div>
          <div className="space-y-2">
            <h1 className="text-3xl font-bold tracking-tight text-foreground">Access Restricted</h1>
            <p className="text-muted-foreground">
              This dashboard is for administrators and managers only
            </p>
          </div>
        </div>

        {/* Main Card */}
        <Card variant="elevated" className="border-0 shadow-strong">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-500" />
              Account Information
            </CardTitle>
            <CardDescription>
              Your current account details and access permissions
            </CardDescription>
          </CardHeader>
          
          <CardContent className="space-y-6">
            {/* User Profile */}
            <div className="flex items-center space-x-4 p-4 rounded-xl bg-gradient-to-r from-gray-50 to-gray-100 border border-border">
              <Avatar className="h-12 w-12 border-2 border-background shadow-soft">
                <AvatarImage src={user?.photoURL} alt={user?.fullName} />
                <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white font-semibold">
                  {user?.fullName?.slice(0, 2).toUpperCase() || user?.email?.slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-foreground truncate">
                  {user?.fullName || 'User'}
                </p>
                <p className="text-sm text-muted-foreground truncate">
                  {user?.email}
                </p>
                <div className="mt-2">
                  <Badge variant={getRoleColor(user?.role || 'employee')} className="gap-1">
                    {getRoleIcon(user?.role || 'employee')}
                    <span className="capitalize">{user?.role}</span>
                  </Badge>
                </div>
              </div>
            </div>

            {/* Access Requirements */}
            <div className="space-y-4">
              <h4 className="font-semibold text-foreground">Dashboard Access Requirements</h4>
              
              <div className="space-y-3">
                <div className="flex items-center space-x-3 p-4 rounded-xl border border-border bg-background">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-100">
                    <Crown className="h-5 w-5 text-red-600" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-foreground">Administrator Access</p>
                    <p className="text-sm text-muted-foreground">
                      Full system management and user administration
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center space-x-3 p-4 rounded-xl border border-border bg-background">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100">
                    <UserCheck className="h-5 w-5 text-blue-600" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-foreground">Manager Access</p>
                    <p className="text-sm text-muted-foreground">
                      Timesheet review and team management
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Current Status */}
            <div className="p-4 rounded-xl bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200">
              <div className="flex items-start space-x-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-100">
                  <Timer className="h-4 w-4 text-amber-600" />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-amber-900">Employee Account</p>
                  <p className="text-sm text-amber-700 mt-1 leading-relaxed">
                    This dashboard is for administrators and managers only. 
                    Employee time tracking is handled through the desktop application.
                  </p>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="space-y-3">
              <Button
                onClick={handleSignOut}
                variant="destructive"
                className="w-full"
                size="lg"
                leftIcon={<LogOut className="w-4 h-4" />}
              >
                Sign Out
              </Button>
              
              <p className="text-xs text-center text-muted-foreground leading-relaxed">
                Contact your system administrator to upgrade your account permissions
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}