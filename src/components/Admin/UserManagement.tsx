import React, { useState, useEffect, useMemo, useCallback } from "react";
import { collection, query, getDocs, doc, updateDoc } from "firebase/firestore";
import { db } from "../../lib/firebase";
import { User } from "../../types";
import { Button } from "../ui/Button";
import { Badge } from "../ui/Badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../ui/Card";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/Avatar";
import {
  DataTable,
  createSortableHeader,
  createActionCell,
} from "../ui/DataTable";
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
} from "lucide-react";
import { ColumnDef } from "@tanstack/react-table";
import toast from "react-hot-toast";
import { EditUserModal } from "./EditUserModal";
import { cn } from "../../lib/utils";
import StatCard from "../Common/StatCard";

export function UserManagement() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
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
      setLoading(false);
    } catch (error) {
      console.error("Error fetching users:", error);
      toast.error("Failed to load users");
      setLoading(false);
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

  // Define table columns (without checkboxes)
  const columns: ColumnDef<User>[] = useMemo(
    () => [
      {
        accessorKey: "fullName",
        header: createSortableHeader("User"),
        cell: ({ row }) => {
          const user = row.original;
          return (
            <div className="flex items-center space-x-3">
              <Avatar className="h-10 w-10 border-2 border-background shadow-sm">
                <AvatarImage src={user.photoURL} alt={user.fullName} />
                <AvatarFallback className="text-sm font-medium">
                  {user.fullName?.slice(0, 2).toUpperCase() ||
                    user.email?.slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <p className="font-medium truncate">{user.fullName}</p>
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
              className="flex items-center gap-1 w-fit"
            >
              {getRoleIcon(role)}
              <span className="capitalize">{role}</span>
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
            <span className="text-sm">{manager.fullName}</span>
          ) : (
            <span className="text-sm text-muted-foreground">None</span>
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
                  isActive !== false ? "bg-green-500" : "bg-red-500"
                )}
              />
              <Badge variant={isActive !== false ? "default" : "destructive"}>
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
        header: createSortableHeader("Created"),
        cell: ({ row }) => {
          const createdAt = row.getValue("createdAt") as Date;
          return (
            <span className="text-sm">
              {createdAt instanceof Date
                ? createdAt.toLocaleDateString()
                : new Date(createdAt).toLocaleDateString()}
            </span>
          );
        },
      },
      {
        id: "actions",
        header: "Actions",
        cell: ({ row }) => {
          const user = row.original as User;
          return (
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleEditUser(user)}
              className="text-xs"
            >
              <Settings className="w-4 h-4 mr-1" />
              View
            </Button>
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
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">
            User Management
          </h1>
          <p className="text-muted-foreground">
            Manage team members, roles, and access permissions
          </p>
        </div>
      </div>

      {/* Enhanced Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 sm:gap-6">
        <StatCard
          title="Total Users"
          value={users.length}
          icon={Users}
          color="blue"
        />
        <StatCard
          title="Managers"
          value={stats.managerCount}
          icon={UserCheck}
          color="purple"
        />
        <StatCard
          title="Employees"
          value={stats.employeeCount}
          icon={Timer}
          color="orange"
        />
        <StatCard
          title="Active"
          value={stats.activeUsers}
          icon={Shield}
          color="green"
        />
        <StatCard
          title="Revoked"
          value={stats.revokedUsers}
          icon={ShieldOff}
          color="red"
        />
      </div>

      {/* Search and Filters */}
      <Card className="border-2">
        <CardContent className="p-6">
          <div className="space-y-4">
            {/* Search and Role Filters Row */}
            <div className="flex flex-col sm:flex-row gap-4">
              {/* <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search users by name, email, or role..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 pr-10"
                />
                {searchTerm && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setSearchTerm("")}
                    className="absolute right-1 top-1/2 transform -translate-y-1/2 h-7 w-7"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div> */}

              {/* Role Filter Buttons */}
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-gray-600">
                  Filter by role:
                </span>
                <Button
                  variant={
                    selectedRoles.includes("admin") ? "default" : "outline"
                  }
                  size="sm"
                  onClick={() => toggleRoleFilter("admin")}
                  className="gap-2"
                >
                  <Crown className="w-3 h-3" />
                  Admin
                  {stats.adminCount > 0 && (
                    <Badge variant="secondary" className="ml-1 text-xs">
                      {stats.adminCount}
                    </Badge>
                  )}
                </Button>

                <Button
                  variant={
                    selectedRoles.includes("manager") ? "default" : "outline"
                  }
                  size="sm"
                  onClick={() => toggleRoleFilter("manager")}
                  className="gap-2"
                >
                  <UserCheck className="w-3 h-3" />
                  Manager
                  {stats.managerCount > 0 && (
                    <Badge variant="secondary" className="ml-1 text-xs">
                      {stats.managerCount}
                    </Badge>
                  )}
                </Button>

                <Button
                  variant={
                    selectedRoles.includes("employee") ? "default" : "outline"
                  }
                  size="sm"
                  onClick={() => toggleRoleFilter("employee")}
                  className="gap-2"
                >
                  <Timer className="w-3 h-3" />
                  Employee
                  {stats.employeeCount > 0 && (
                    <Badge variant="secondary" className="ml-1 text-xs">
                      {stats.employeeCount}
                    </Badge>
                  )}
                </Button>

                {/* Clear Filters */}
                {hasActiveFilters && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={clearFilters}
                    className="gap-2 text-red-600 border-red-300 hover:bg-red-50"
                  >
                    <X className="w-3 h-3" />
                    Clear
                  </Button>
                )}
              </div>
            </div>

            {/* Active Filters Display */}
            {hasActiveFilters && (
              <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg">
                <Filter className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Active filters:</span>
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
                <div className="ml-auto text-sm text-muted-foreground">
                  {filteredUsers.length} of {users.length} user(s)
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Enhanced Data Table */}
      <Card className="border-2">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5 text-primary" />
            Team Members
          </CardTitle>
          <CardDescription>
            Comprehensive user management with advanced filtering and role-based
            actions
          </CardDescription>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={columns}
            data={filteredUsers}
            searchPlaceholder="Search users..."
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
