import React, { useState, useEffect, useMemo, useCallback } from "react";
import { collection, query, getDocs, doc, updateDoc } from "firebase/firestore";
import { db } from "../../lib/firebase";
import { User } from "../../types";
import { Button } from "../ui/Button";
import { Badge } from "../ui/Badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/Card";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/Avatar";
import { DataTable, createSortableHeader, createActionCell } from "../ui/DataTable";
import { Input } from "../ui/Input";
import {
  Users,
  Shield,
  UserCheck,
  Timer,
  ShieldOff,
  UserX,
  Settings,
  Crown,
  Eye,
  Search,
  X,
  Filter,
  Plus,
  Download,
  RefreshCw,
  MoreHorizontal,
  Edit,
  UserPlus,
  Zap,
  TrendingUp,
  Activity,
  CheckCircle,
  AlertCircle,
} from "lucide-react";
import { ColumnDef } from "@tanstack/react-table";
import toast from "react-hot-toast";
import { EditUserModal } from "./EditUserModal";
import { cn } from "../../lib/utils";
import StatCard from "../Common/StatCard";

export function UserManagement() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);

  // Memoized stats calculation
  const stats = useMemo(() => {
    const activeUsers = users.filter((u) => u.isActive !== false).length;
    const revokedUsers = users.filter((u) => u.isActive === false).length;
    const adminCount = users.filter((u) => u.role === "admin").length;
    const managerCount = users.filter((u) => u.role === "manager").length;
    const employeeCount = users.filter((u) => u.role === "employee").length;

    return {
      totalUsers: users.length,
      activeUsers,
      revokedUsers,
      adminCount,
      managerCount,
      employeeCount,
    };
  }, [users]);

  // Filtered users based on search and role filters
  const filteredUsers = useMemo(() => {
    let filtered = users;

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(
        (user) =>
          user.fullName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          user.role?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Apply role filters
    if (selectedRoles.length > 0) {
      filtered = filtered.filter((user) => selectedRoles.includes(user.role));
    }

    return filtered;
  }, [users, searchTerm, selectedRoles]);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = useCallback(async () => {
    try {
      setRefreshing(true);
      const usersQuery = query(collection(db, "users"));
      const querySnapshot = await getDocs(usersQuery);
      const usersData = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate
          ? doc.data().createdAt.toDate()
          : new Date(doc.data().createdAt || Date.now()),
        lastLogin: doc.data().lastLogin?.toDate
          ? doc.data().lastLogin.toDate()
          : doc.data().lastLogin
          ? new Date(doc.data().lastLogin)
          : undefined,
        updatedAt: doc.data().updatedAt?.toDate
          ? doc.data().updatedAt.toDate()
          : doc.data().updatedAt
          ? new Date(doc.data().updatedAt)
          : undefined,
        isActive: doc.data().isActive !== false, // Default to true if not set
      })) as User[];

      setUsers(usersData);
    } catch (error) {
      console.error("Error fetching users:", error);
      toast.error("Failed to load users");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  const handleEditUser = useCallback((user: User) => {
    setSelectedUser(user);
    setShowEditModal(true);
  }, []);

  const handleUpdateUser = useCallback(
    async (userId: string, updates: Partial<User>) => {
      try {
        await updateDoc(doc(db, "users", userId), updates);
        setUsers((prevUsers) =>
          prevUsers.map((user) =>
            user.id === userId ? { ...user, ...updates } : user
          )
        );
        toast.success("User updated successfully");
      } catch (error) {
        console.error("Error updating user:", error);
        toast.error("Failed to update user");
      }
    },
    []
  );

  const quickToggleAccess = useCallback(
    async (user: User) => {
      const newStatus = !user.isActive;
      try {
        await handleUpdateUser(user.id, {
          isActive: newStatus,
          updatedAt: new Date(),
        });
        toast.success(`User access ${newStatus ? "granted" : "revoked"}`);
      } catch (error) {
        toast.error("Failed to update user access");
      }
    },
    [handleUpdateUser]
  );

  const getRoleIcon = useCallback((role: string) => {
    switch (role) {
      case "admin":
        return <Crown className="w-4 h-4" />;
      case "manager":
        return <UserCheck className="w-4 h-4" />;
      default:
        return <Timer className="w-4 h-4" />;
    }
  }, []);

  const getRoleBadgeVariant = useCallback((role: string) => {
    switch (role) {
      case "admin":
        return "destructive";
      case "manager":
        return "default";
      default:
        return "secondary";
    }
  }, []);

  const toggleRoleFilter = useCallback((role: string) => {
    setSelectedRoles((prev) =>
      prev.includes(role) ? prev.filter((r) => r !== role) : [...prev, role]
    );
  }, []);

  const clearFilters = useCallback(() => {
    setSearchTerm("");
    setSelectedRoles([]);
  }, []);

  const hasActiveFilters = searchTerm || selectedRoles.length > 0;

  // Define table columns
  const columns: ColumnDef<User>[] = useMemo(
    () => [
      {
        accessorKey: "fullName",
        header: createSortableHeader("User"),
        cell: ({ row }) => {
          const user = row.original;
          return (
            <div className="flex items-center space-x-3">
              <Avatar className="h-10 w-10 border-2 border-background shadow-soft">
                <AvatarImage src={user.photoURL} alt={user.fullName} />
                <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white font-semibold">
                  {user.fullName?.slice(0, 2).toUpperCase() ||
                    user.email?.slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-foreground truncate">{user.fullName}</p>
                <p className="text-sm text-muted-foreground truncate">
                  {user.email}
                </p>
              </div>
            </div>
          );
        },
      },
      {
        accessorKey: "role",
        header: createSortableHeader("Role"),
        cell: ({ row }) => {
          const role = row.getValue("role") as string;
          return (
            <Badge
              variant={getRoleBadgeVariant(role)}
              className="flex items-center gap-1.5 w-fit"
            >
              {getRoleIcon(role)}
              <span className="capitalize font-medium">{role}</span>
            </Badge>
          );
        },
        filterFn: (row, id, value) => {
          return value.includes(row.getValue(id));
        },
      },
      {
        accessorKey: "managerId",
        header: "Manager",
        cell: ({ row }) => {
          const managerId = row.getValue("managerId") as string;
          const manager = users.find((u) => u.id === managerId);
          return manager ? (
            <div className="flex items-center gap-2">
              <Avatar className="h-6 w-6">
                <AvatarImage src={manager.photoURL} alt={manager.fullName} />
                <AvatarFallback className="text-xs bg-accent">
                  {manager.fullName?.slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <span className="text-sm font-medium">{manager.fullName}</span>
            </div>
          ) : (
            <span className="text-sm text-muted-foreground">None assigned</span>
          );
        },
      },
      {
        accessorKey: "isActive",
        header: createSortableHeader("Status"),
        cell: ({ row }) => {
          const isActive = row.getValue("isActive") as boolean;
          return (
            <div className="flex items-center gap-2">
              <div
                className={cn(
                  "w-2 h-2 rounded-full",
                  isActive !== false ? "bg-emerald-500 shadow-glow" : "bg-red-500"
                )}
              />
              <Badge 
                variant={isActive !== false ? "success" : "destructive"}
                size="sm"
              >
                {isActive !== false ? (
                  <CheckCircle className="w-3 h-3 mr-1" />
                ) : (
                  <AlertCircle className="w-3 h-3 mr-1" />
                )}
                {isActive !== false ? "Active" : "Revoked"}
              </Badge>
            </div>
          );
        },
        filterFn: (row, id, value) => {
          const isActive = row.getValue(id) as boolean;
          if (value === "active") return isActive !== false;
          if (value === "revoked") return isActive === false;
          return true;
        },
      },
      {
        accessorKey: "createdAt",
        header: createSortableHeader("Joined"),
        cell: ({ row }) => {
          const createdAt = row.getValue("createdAt") as Date;
          return (
            <div className="text-sm">
              <div className="font-medium text-foreground">
                {createdAt instanceof Date
                  ? createdAt.toLocaleDateString()
                  : new Date(createdAt).toLocaleDateString()}
              </div>
              <div className="text-muted-foreground">
                {createdAt instanceof Date
                  ? createdAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                  : new Date(createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </div>
            </div>
          );
        },
      },
      {
        id: "actions",
        header: "Actions",
        cell: ({ row }) => {
          const user = row.original as User;
          return (
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => handleEditUser(user)}
                className="hover:bg-blue-50 hover:text-blue-600"
                title="Edit user"
              >
                <Edit className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => quickToggleAccess(user)}
                className={cn(
                  "hover:shadow-soft",
                  user.isActive 
                    ? "hover:bg-red-50 hover:text-red-600" 
                    : "hover:bg-green-50 hover:text-green-600"
                )}
                title={user.isActive ? "Revoke access" : "Grant access"}
              >
                {user.isActive ? (
                  <ShieldOff className="w-4 h-4" />
                ) : (
                  <Shield className="w-4 h-4" />
                )}
              </Button>
            </div>
          );
        },
        enableSorting: false,
        enableHiding: false,
      },
    ],
    [users, getRoleIcon, getRoleBadgeVariant, handleEditUser, quickToggleAccess]
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin mx-auto"></div>
          <p className="text-sm text-muted-foreground">Loading team members...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl text-white shadow-medium">
              <Users className="w-6 h-6" />
            </div>
            Team Management
          </h1>
          <p className="text-muted-foreground text-lg">
            Manage team members, roles, and access permissions
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            onClick={fetchUsers}
            disabled={refreshing}
            leftIcon={<RefreshCw className={cn("w-4 h-4", refreshing && "animate-spin")} />}
          >
            Refresh
          </Button>
          <Button
            variant="outline"
            leftIcon={<Download className="w-4 h-4" />}
          >
            Export
          </Button>
          <Button
            leftIcon={<UserPlus className="w-4 h-4" />}
            className="shadow-medium hover:shadow-strong"
          >
            Add User
          </Button>
        </div>
      </div>

      {/* Enhanced Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-4 lg:gap-6">
        <StatCard
          title="Total Users"
          value={stats.totalUsers}
          icon={Users}
          color="blue"
          className="lg:col-span-1"
        />
        <StatCard
          title="Active"
          value={stats.activeUsers}
          icon={CheckCircle}
          color="green"
          subtitle={`${Math.round((stats.activeUsers / stats.totalUsers) * 100)}% of total`}
        />
        <StatCard
          title="Revoked"
          value={stats.revokedUsers}
          icon={ShieldOff}
          color="red"
          subtitle={stats.revokedUsers > 0 ? "Need attention" : "All active"}
        />
        <StatCard
          title="Admins"
          value={stats.adminCount}
          icon={Crown}
          color="purple"
          subtitle="Full access"
        />
        <StatCard
          title="Managers"
          value={stats.managerCount}
          icon={UserCheck}
          color="orange"
          subtitle="Team leads"
        />
        <StatCard
          title="Employees"
          value={stats.employeeCount}
          icon={Timer}
          color="gray"
          subtitle="Team members"
        />
      </div>

      {/* Enhanced Filters Card */}
      <Card variant="elevated" className="border-2 border-blue-100 bg-gradient-to-r from-blue-50/50 to-indigo-50/50">
        <CardHeader className="pb-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="space-y-1">
              <CardTitle className="flex items-center gap-3 text-xl">
                <div className="p-2 bg-blue-100 rounded-xl">
                  <Filter className="w-5 h-5 text-blue-600" />
                </div>
                Search & Filter
              </CardTitle>
              <CardDescription className="text-base">
                Find and filter team members by role, status, or search terms
              </CardDescription>
            </div>
            <Badge variant="outline" className="gap-2 bg-white/80 text-blue-700 border-blue-200 px-4 py-2">
              <Activity className="w-4 h-4" />
              {filteredUsers.length} of {users.length} users
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Search Bar */}
          <div className="relative max-w-md">
            <Input
              placeholder="Search by name, email, or role..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              leftIcon={<Search className="w-4 h-4" />}
              rightIcon={searchTerm && (
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => setSearchTerm("")}
                  className="h-6 w-6"
                >
                  <X className="h-3 w-3" />
                </Button>
              )}
              className="pr-10"
            />
          </div>

          {/* Role Filter Buttons */}
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-sm font-medium text-foreground">Filter by role:</span>
            <div className="flex flex-wrap gap-2">
              <Button
                variant={selectedRoles.includes("admin") ? "default" : "outline"}
                size="sm"
                onClick={() => toggleRoleFilter("admin")}
                leftIcon={<Crown className="w-3 h-3" />}
                className="gap-2"
              >
                Admin
                {stats.adminCount > 0 && (
                  <Badge variant="secondary" size="sm" className="ml-1">
                    {stats.adminCount}
                  </Badge>
                )}
              </Button>

              <Button
                variant={selectedRoles.includes("manager") ? "default" : "outline"}
                size="sm"
                onClick={() => toggleRoleFilter("manager")}
                leftIcon={<UserCheck className="w-3 h-3" />}
                className="gap-2"
              >
                Manager
                {stats.managerCount > 0 && (
                  <Badge variant="secondary" size="sm" className="ml-1">
                    {stats.managerCount}
                  </Badge>
                )}
              </Button>

              <Button
                variant={selectedRoles.includes("employee") ? "default" : "outline"}
                size="sm"
                onClick={() => toggleRoleFilter("employee")}
                leftIcon={<Timer className="w-3 h-3" />}
                className="gap-2"
              >
                Employee
                {stats.employeeCount > 0 && (
                  <Badge variant="secondary" size="sm" className="ml-1">
                    {stats.employeeCount}
                  </Badge>
                )}
              </Button>

              {hasActiveFilters && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={clearFilters}
                  leftIcon={<X className="w-3 h-3" />}
                  className="text-red-600 border-red-300 hover:bg-red-50"
                >
                  Clear All
                </Button>
              )}
            </div>
          </div>

          {/* Active Filters Display */}
          {hasActiveFilters && (
            <div className="flex items-center gap-2 p-4 bg-white/60 rounded-xl border border-blue-200/50">
              <Zap className="h-4 w-4 text-blue-600" />
              <span className="text-sm font-medium text-blue-900">Active filters:</span>
              <div className="flex flex-wrap gap-2">
                {searchTerm && (
                  <Badge variant="secondary" className="gap-1">
                    Search: "{searchTerm}"
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setSearchTerm("")}
                      className="h-3 w-3 p-0 hover:bg-transparent"
                    >
                      <X className="h-2 w-2" />
                    </Button>
                  </Badge>
                )}
                {selectedRoles.map((role) => (
                  <Badge key={role} variant="secondary" className="gap-1">
                    {getRoleIcon(role)}
                    <span className="capitalize">{role}</span>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => toggleRoleFilter(role)}
                      className="h-3 w-3 p-0 hover:bg-transparent"
                    >
                      <X className="h-2 w-2" />
                    </Button>
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Enhanced Data Table */}
      <Card variant="elevated" className="border-2 shadow-strong">
        <CardHeader divided>
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <CardTitle className="flex items-center gap-3 text-xl">
                <div className="p-2 bg-gradient-to-br from-emerald-100 to-blue-100 rounded-xl">
                  <Users className="w-5 h-5 text-emerald-600" />
                </div>
                Team Directory
              </CardTitle>
              <CardDescription className="text-base">
                Comprehensive user management with advanced filtering and role-based actions
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="gap-2 bg-emerald-50 text-emerald-700 border-emerald-200">
                <TrendingUp className="w-3 h-3" />
                {filteredUsers.length} members
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={columns}
            data={filteredUsers}
            searchPlaceholder="Search team members..."
            className="border-0"
          />
        </CardContent>
      </Card>

      {/* Edit User Modal */}
      {selectedUser && (
        <EditUserModal
          isOpen={showEditModal}
          onClose={() => {
            setShowEditModal(false);
            setSelectedUser(null);
          }}
          user={selectedUser}
          users={users}
          onUserUpdated={handleUpdateUser}
        />
      )}
    </div>
  );
}