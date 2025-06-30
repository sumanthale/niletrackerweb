import React from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Button } from '../ui/Button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/Card';
import { Avatar, AvatarFallback } from '../ui/Avatar';
import { Badge } from '../ui/Badge';
import { 
  ShieldAlert, 
  LogOut, 
  Users, 
  Timer,
  ArrowLeft
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

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/50 p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center space-y-2">
          <div className="flex justify-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-destructive text-destructive-foreground">
              <ShieldAlert className="h-6 w-6" />
            </div>
          </div>
          <h1 className="text-2xl font-semibold tracking-tight">Access Denied</h1>
          <p className="text-sm text-muted-foreground">
            You don't have permission to access this dashboard
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Account Information</CardTitle>
            <CardDescription>
              Your current account details and access level
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* User Info */}
            <div className="flex items-center space-x-3 p-3 rounded-lg bg-muted">
              <Avatar>
                <AvatarFallback>
                  {user?.fullName?.slice(0, 2).toUpperCase() || user?.email?.slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{user?.fullName || 'User'}</p>
                <p className="text-sm text-muted-foreground truncate">{user?.email}</p>
                <Badge variant="secondary" className="mt-1">
                  <Timer className="mr-1 h-3 w-3" />
                  {user?.role}
                </Badge>
              </div>
            </div>

            {/* Access Requirements */}
            <div className="space-y-3">
              <h4 className="font-medium">Dashboard Access Requirements</h4>
              
              <div className="space-y-2">
                <div className="flex items-center space-x-3 p-3 rounded-lg border">
                  <Users className="h-4 w-4 text-primary" />
                  <div className="flex-1">
                    <p className="text-sm font-medium">Admin Access</p>
                    <p className="text-xs text-muted-foreground">
                      Full system management and user administration
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center space-x-3 p-3 rounded-lg border">
                  <Timer className="h-4 w-4 text-primary" />
                  <div className="flex-1">
                    <p className="text-sm font-medium">Manager Access</p>
                    <p className="text-xs text-muted-foreground">
                      Timesheet review and team management
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Current Status */}
            <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20">
              <div className="flex items-start space-x-3">
                <ShieldAlert className="h-4 w-4 text-destructive mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-destructive">Employee Account</p>
                  <p className="text-xs text-muted-foreground mt-1">
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
              >
                <LogOut className="mr-2 h-4 w-4" />
                Sign Out
              </Button>
              
              <p className="text-xs text-center text-muted-foreground">
                Contact your administrator to upgrade your account permissions
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}