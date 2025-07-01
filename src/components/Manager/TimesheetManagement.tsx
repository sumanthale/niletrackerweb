import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  collection,
  query,
  where,
  getDocs,
  orderBy,
  doc,
  updateDoc,
} from "firebase/firestore";
import { db } from "../../lib/firebase";
import { useAuth } from "../../contexts/AuthContext";
import { TimeSession, User } from "../../types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/Card";
import { Button } from "../ui/Button";
import { Badge } from "../ui/Badge";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/Avatar";
import { SimpleTable } from "../ui/SimpleTable";
import Select from "react-select";
import {
  Clock,
  Users,
  Calendar,
  CheckCircle,
  XCircle,
  AlertCircle,
  Eye,
  ChevronLeft,
  ChevronRight,
  Crown,
  UserCheck,
  Timer,
  BarChart3,
  TrendingUp,
  Activity,
  Camera,
  MessageSquare,
  CalendarDays,
  Download,
  RefreshCw,
  PlayCircle,
  PauseCircle,
  Target,
  Zap,
  Search,
  User as UserIcon,
  MoreHorizontal,
  FileText,
  Sparkles,
  Award,
  TrendingDown,
} from "lucide-react";
import {
  formatDuration,
  formatTime,
  formatDate,
  getStatusColor,
  getWeekDateRange,
} from "../../lib/utils";
import { SessionDetailsModal } from "./SessionDetailsModal";
import { cn } from "../../lib/utils";
import toast from "react-hot-toast";
import StatCard from "../Common/StatCard";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../ui/DropdownMenu";

interface UserOption {
  value: string;
  label: string;
  user: User;
}

export function TimesheetManagement() {
  const { user } = useAuth();
  const [sessions, setSessions] = useState<TimeSession[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUser, setSelectedUser] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedSession, setSelectedSession] = useState<TimeSession | null>(null);
  const [showSessionModal, setShowSessionModal] = useState(false);
  const [currentWeek, setCurrentWeek] = useState(new Date());

  // Memoized stats calculation
  const stats = useMemo(() => {
    const pending = sessions.filter(
      (s) => s.status === "submitted" || s.approvalStatus === "submitted"
    ).length;
    const approved = sessions.filter(
      (s) => s.status === "approved" || s.approvalStatus === "approved"
    ).length;
    const disapproved = sessions.filter(
      (s) => s.status === "disapproved" || s.approvalStatus === "disapproved"
    ).length;
    const totalMinutes = sessions.reduce((acc, s) => acc + s.totalMinutes, 0);
    const idleMinutes = sessions.reduce((acc, s) => acc + s.idleMinutes, 0);
    const activeMinutes = totalMinutes - idleMinutes;
    const productivityRate =
      totalMinutes > 0 ? Math.round((activeMinutes / totalMinutes) * 100) : 0;

    return {
      totalSessions: sessions.length,
      pending,
      approved,
      disapproved,
      totalMinutes,
      idleMinutes,
      activeMinutes,
      productivityRate,
      averageSessionLength: sessions.length > 0 ? totalMinutes / sessions.length : 0,
    };
  }, [sessions]);

  // Memoized week calculations
  const weekCalculations = useMemo(() => {
    const weekStart = new Date(currentWeek);
    weekStart.setDate(weekStart.getDate() - weekStart.getDay());

    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);

    // Check if current week is the actual current week
    const now = new Date();
    const currentWeekStart = new Date(now);
    currentWeekStart.setDate(now.getDate() - now.getDay());
    const isCurrentWeek =
      currentWeekStart.toDateString() === weekStart.toDateString();

    // Check if we can navigate to next week (prevent future weeks)
    const nextWeek = new Date(currentWeek);
    nextWeek.setDate(nextWeek.getDate() + 7);
    const nextWeekStart = new Date(nextWeek);
    nextWeekStart.setDate(nextWeek.getDate() - nextWeek.getDay());
    const canNavigateNext = nextWeekStart <= currentWeekStart;

    return {
      start: weekStart,
      end: weekEnd,
      isCurrentWeek,
      canNavigateNext,
    };
  }, [currentWeek]);

  // Prepare user options for react-select
  const userOptions: UserOption[] = useMemo(() => {
    return users.map((userData) => ({
      value: userData.id,
      label: userData.fullName,
      user: userData,
    }));
  }, [users]);

  // Get selected user option
  const selectedUserOption = useMemo(() => {
    return userOptions.find((option) => option.value === selectedUser) || null;
  }, [userOptions, selectedUser]);

  // Memoized selected user data
  const selectedUserData = useMemo(
    () => users.find((u) => u.id === selectedUser),
    [users, selectedUser]
  );

  useEffect(() => {
    if (user) {
      fetchAvailableUsers();
    }
  }, [user]);

  useEffect(() => {
    if (selectedUser) {
      fetchUserSessions(selectedUser);
    } else {
      setSessions([]);
    }
  }, [selectedUser, currentWeek]);

  const fetchAvailableUsers = useCallback(async () => {
    try {
      let usersQuery;

      if (user?.role === "admin") {
        usersQuery = query(collection(db, "users"));
      } else if (user?.role === "manager") {
        usersQuery = query(
          collection(db, "users"),
          where("managerId", "==", user?.id)
        );
      } else {
        setLoading(false);
        return;
      }

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
      })) as User[];

      const filteredUsers =
        user?.role === "manager"
          ? usersData.filter((u) => u.role !== "admin")
          : usersData;

      setUsers(filteredUsers);
      setLoading(false);
    } catch (error) {
      console.error("Error fetching users:", error);
      toast.error("Failed to load users");
      setLoading(false);
    }
  }, [user]);

  const fetchUserSessions = useCallback(
    async (userId: string) => {
      try {
        setRefreshing(true);
        const { start: startDate, end: endDate } = getWeekDateRange(currentWeek);

        const sessionsQuery = query(
          collection(db, "sessions"),
          where("userId", "==", userId),
          where("date", ">=", startDate),
          where("date", "<=", endDate),
          orderBy("date", "desc")
        );

        const querySnapshot = await getDocs(sessionsQuery);
        const sessionsData = querySnapshot.docs.map((doc) => {
          const data = doc.data();
          return {
            id: doc.id,
            userId: data.userId,
            userName: data.userName,
            userEmail: data.userEmail,
            date: data.date,
            clockIn: data.clockIn,
            clockOut: data.clockOut,
            totalMinutes: data.totalMinutes || 0,
            idleMinutes: data.idleMinutes || 0,
            productiveHours: data.productiveHours || 0,
            screenshots: data.screenshots || [],
            status: data.status || "submitted",
            approvalStatus: data.approvalStatus || data.status || "submitted",
            lessHoursComment: data.lessHoursComment,
            managerComment: data.managerComment,
            managerId: data.managerId,
            createdAt: data.createdAt?.toDate
              ? data.createdAt.toDate()
              : new Date(data.createdAt || Date.now()),
            updatedAt: data.updatedAt?.toDate
              ? data.updatedAt.toDate()
              : new Date(data.updatedAt || Date.now()),
          };
        }) as TimeSession[];

        const selectedUserData = users.find((u) => u.id === userId);
        const enrichedSessions = sessionsData.map((session) => ({
          ...session,
          userName:
            session.userName || selectedUserData?.fullName || "Unknown User",
          userEmail:
            session.userEmail || selectedUserData?.email || "unknown@email.com",
        }));

        setSessions(enrichedSessions);
      } catch (error) {
        console.error("Error fetching user sessions:", error);
        toast.error("Failed to load user sessions");
      } finally {
        setRefreshing(false);
      }
    },
    [currentWeek, users]
  );

  const handleViewSession = useCallback((session: TimeSession) => {
    setSelectedSession(session);
    setShowSessionModal(true);
  }, []);

  const handleSessionUpdate = useCallback(
    async (sessionId: string, updates: Partial<TimeSession>) => {
      try {
        const sessionRef = doc(db, "sessions", sessionId);
        await updateDoc(sessionRef, {
          ...updates,
          updatedAt: new Date(),
        });

        setSessions((prevSessions) =>
          prevSessions.map((session) =>
            session.id === sessionId
              ? { ...session, ...updates, updatedAt: new Date() }
              : session
          )
        );

        toast.success("Session updated successfully");
      } catch (error) {
        console.error("Error updating session:", error);
        toast.error("Failed to update session");
        throw error;
      }
    },
    []
  );

  const navigateWeek = useCallback((direction: "prev" | "next") => {
    setCurrentWeek((prevWeek) => {
      const newWeek = new Date(prevWeek);
      newWeek.setDate(newWeek.getDate() + (direction === "next" ? 7 : -7));
      return newWeek;
    });
  }, []);

  const goToCurrentWeek = useCallback(() => {
    setCurrentWeek(new Date());
  }, []);

  const getRoleIcon = useCallback((role: string) => {
    switch (role) {
      case "admin":
        return <Crown className="w-3 h-3" />;
      case "manager":
        return <UserCheck className="w-3 h-3" />;
      default:
        return <Timer className="w-3 h-3" />;
    }
  }, []);

  // Custom option component for react-select
  const CustomOption = ({ data, ...props }: any) => (
    <div
      {...props.innerProps}
      className="flex items-center gap-3 p-3 hover:bg-gray-50 cursor-pointer transition-colors"
    >
      <Avatar className="h-8 w-8 border border-border shadow-soft">
        <AvatarImage src={data.user.photoURL} alt={data.user.fullName} />
        <AvatarFallback className="text-xs bg-gradient-to-br from-blue-500 to-purple-600 text-white">
          {data.user.fullName?.slice(0, 2).toUpperCase() ||
            data.user.email?.slice(0, 2).toUpperCase()}
        </AvatarFallback>
      </Avatar>
      <div className="flex-1">
        <div className="font-semibold text-foreground">{data.user.fullName}</div>
        <div className="text-sm text-muted-foreground">{data.user.email}</div>
        <div className="flex items-center gap-1 mt-1">
          {getRoleIcon(data.user.role)}
          <span className="text-xs text-muted-foreground capitalize">
            {data.user.role}
          </span>
        </div>
      </div>
    </div>
  );

  // Custom single value component for react-select
  const CustomSingleValue = ({ data }: any) => (
    <div className="flex items-center gap-2">
      <Avatar className="h-6 w-6 border border-border">
        <AvatarImage src={data.user.photoURL} alt={data.user.fullName} />
        <AvatarFallback className="text-xs bg-gradient-to-br from-blue-500 to-purple-600 text-white">
          {data.user.fullName?.slice(0, 2).toUpperCase() ||
            data.user.email?.slice(0, 2).toUpperCase()}
        </AvatarFallback>
      </Avatar>
      <span className="font-semibold">{data.user.fullName}</span>
    </div>
  );

  // Custom styles for react-select
  const customStyles = {
    control: (provided: any, state: any) => ({
      ...provided,
      minHeight: "48px",
      border: "2px solid #e5e7eb",
      borderRadius: "12px",
      boxShadow: state.isFocused ? "0 0 0 3px rgba(59, 130, 246, 0.1)" : "0 2px 8px rgba(0, 0, 0, 0.04)",
      borderColor: state.isFocused ? "#3b82f6" : "#e5e7eb",
      "&:hover": {
        borderColor: "#d1d5db",
        boxShadow: "0 4px 16px rgba(0, 0, 0, 0.08)",
      },
    }),
    option: (provided: any, state: any) => ({
      ...provided,
      padding: 0,
      backgroundColor: state.isSelected
        ? "#eff6ff"
        : state.isFocused
        ? "#f9fafb"
        : "white",
      color: "#111827",
      "&:hover": {
        backgroundColor: "#f3f4f6",
      },
    }),
    singleValue: (provided: any) => ({
      ...provided,
      color: "#111827",
    }),
    placeholder: (provided: any) => ({
      ...provided,
      color: "#9ca3af",
      fontSize: "14px",
    }),
    menu: (provided: any) => ({
      ...provided,
      border: "1px solid #e5e7eb",
      borderRadius: "12px",
      boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)",
      zIndex: 50,
    }),
    menuList: (provided: any) => ({
      ...provided,
      maxHeight: "300px",
      padding: "8px",
    }),
  };

  // Define simple table columns
  const tableColumns = [
    {
      key: "date",
      header: "Date & Time",
      render: (session: TimeSession) => (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-blue-500 rounded-full shadow-glow"></div>
            <span className="font-semibold text-foreground">
              {formatDate(session.date)}
            </span>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <div className="flex items-center gap-1 text-emerald-600">
              <PlayCircle className="w-3 h-3" />
              <span className="font-medium">{formatTime(session.clockIn)}</span>
            </div>
            {session.clockOut && (
              <div className="flex items-center gap-1 text-red-600">
                <PauseCircle className="w-3 h-3" />
                <span className="font-medium">{formatTime(session.clockOut)}</span>
              </div>
            )}
          </div>
        </div>
      ),
    },
    {
      key: "duration",
      header: "Duration & Performance",
      render: (session: TimeSession) => {
        const activeMinutes = session.totalMinutes - session.idleMinutes;
        const productivityRate =
          session.totalMinutes > 0
            ? Math.round((activeMinutes / session.totalMinutes) * 100)
            : 0;

        return (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-blue-500" />
              <span className="font-bold text-foreground text-lg">
                {formatDuration(session.totalMinutes)}
              </span>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Active</span>
                <span className="font-semibold text-emerald-600">
                  {formatDuration(activeMinutes)}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Idle</span>
                <span className="font-semibold text-amber-600">
                  {formatDuration(session.idleMinutes)}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Productivity</span>
                <Badge 
                  variant={productivityRate >= 80 ? "success" : productivityRate >= 60 ? "warning" : "destructive"}
                  size="sm"
                >
                  {productivityRate}%
                </Badge>
              </div>
            </div>
          </div>
        );
      },
    },
    {
      key: "activity",
      header: "Activity & Evidence",
      render: (session: TimeSession) => (
        <div className="space-y-3">
          {session.screenshots.length > 0 && (
            <div className="flex items-center gap-2">
              <Camera className="w-4 h-4 text-purple-500" />
              <span className="text-sm font-semibold text-foreground">
                {session.screenshots.length} screenshots
              </span>
            </div>
          )}
          
          {session.screenshots.length > 0 && (
            <div className="flex -space-x-1">
              {session.screenshots.slice(0, 4).map((screenshot, idx) => (
                <img
                  key={screenshot.id}
                  src={screenshot.image}
                  alt="Screenshot"
                  className="w-8 h-8 rounded-lg border-2 border-white object-cover shadow-soft hover:scale-110 transition-transform cursor-pointer"
                />
              ))}
              {session.screenshots.length > 4 && (
                <div className="w-8 h-8 rounded-lg border-2 border-white bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center shadow-soft">
                  <span className="text-xs font-bold text-gray-600">
                    +{session.screenshots.length - 4}
                  </span>
                </div>
              )}
            </div>
          )}

          {session.lessHoursComment && (
            <div className="flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-blue-500" />
              <span className="text-sm font-medium text-blue-600">Has comment</span>
            </div>
          )}
        </div>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (session: TimeSession) => {
        const getStatusIcon = (status: string) => {
          switch (status) {
            case "approved":
              return <CheckCircle className="w-3 h-3" />;
            case "disapproved":
              return <XCircle className="w-3 h-3" />;
            default:
              return <AlertCircle className="w-3 h-3" />;
          }
        };

        return (
          <Badge 
            className={cn(getStatusColor(session.status), "font-semibold gap-1.5")}
            size="default"
          >
            {getStatusIcon(session.status)}
            <span className="capitalize">{session.status}</span>
          </Badge>
        );
      },
    },
    {
      key: "actions",
      header: "Actions",
      render: (session: TimeSession) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon-sm" className="hover:bg-accent">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuLabel>Session Actions</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => handleViewSession(session)}
              className="gap-2"
            >
              <Eye className="h-4 w-4" />
              View Details
            </DropdownMenuItem>
            {session.status === "submitted" && (
              <>
                <DropdownMenuItem
                  onClick={() =>
                    handleSessionUpdate(session.id, {
                      status: "approved",
                      approvalStatus: "approved",
                    })
                  }
                  className="gap-2 text-emerald-600"
                >
                  <CheckCircle className="h-4 w-4" />
                  Quick Approve
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => handleViewSession(session)}
                  className="gap-2 text-red-600"
                >
                  <XCircle className="h-4 w-4" />
                  Review & Reject
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin mx-auto"></div>
          <p className="text-sm text-muted-foreground">Loading timesheets...</p>
        </div>
      </div>
    );
  }

  if (users.length === 0) {
    return (
      <div className="text-center py-16">
        <div className="max-w-md mx-auto space-y-6">
          <div className="w-16 h-16 bg-muted rounded-3xl flex items-center justify-center mx-auto">
            <Users className="w-8 h-8 text-muted-foreground" />
          </div>
          <div>
            <h3 className="text-xl font-semibold mb-2">
              {user?.role === "admin" ? "No Users Found" : "No Managed Users"}
            </h3>
            <p className="text-muted-foreground">
              {user?.role === "admin"
                ? "No users are available in the system yet."
                : "You don't have any users assigned to you yet."}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Enhanced Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-emerald-500 to-blue-600 rounded-2xl text-white shadow-medium">
              <Timer className="w-6 h-6" />
            </div>
            {user?.role === "admin" ? "All Timesheets" : "Weekly Reviews"}
          </h1>
          <p className="text-muted-foreground text-lg">
            {user?.role === "admin"
              ? "Review and manage timesheets for all users in the system"
              : "Review and approve employee weekly timesheets"}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            onClick={() => selectedUser && fetchUserSessions(selectedUser)}
            disabled={refreshing || !selectedUser}
            leftIcon={<RefreshCw className={cn("w-4 h-4", refreshing && "animate-spin")} />}
          >
            Refresh
          </Button>
          <Button
            variant="outline"
            leftIcon={<Download className="w-4 h-4" />}
            disabled={!selectedUser}
          >
            Export
          </Button>
        </div>
      </div>

      {/* Enhanced User Selection */}
      {selectedUserData ? (
        <Card variant="elevated" className="border-2 border-emerald-200 bg-gradient-to-r from-emerald-50/50 to-blue-50/50 shadow-medium">
          <CardContent className="flex items-center gap-4 p-6">
            <Avatar className="h-12 w-12 border-2 border-white shadow-medium">
              <AvatarImage src={selectedUserData.photoURL} alt={selectedUserData.fullName} />
              <AvatarFallback className="bg-gradient-to-br from-emerald-500 to-blue-600 text-white font-bold">
                {selectedUserData.fullName?.slice(0, 2).toUpperCase() ||
                  selectedUserData.email?.slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <div className="font-bold text-foreground text-lg">
                {selectedUserData.fullName}
              </div>
              <div className="text-sm text-muted-foreground">
                {selectedUserData.email}
              </div>
              <Badge variant="outline" className="mt-2 gap-1 bg-white/80">
                {getRoleIcon(selectedUserData.role)}
                <span className="capitalize font-medium">{selectedUserData.role}</span>
              </Badge>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-emerald-600">
                {formatDuration(stats.totalMinutes)}
              </div>
              <div className="text-sm text-muted-foreground">
                Total this week
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => setSelectedUser("")}
              className="text-red-500 hover:bg-red-50"
              title="Clear selection"
            >
              <XCircle className="w-5 h-5" />
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card variant="elevated" className="border-2 border-blue-200 bg-gradient-to-r from-blue-50/50 to-indigo-50/50 shadow-medium">
          <CardHeader className="pb-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="space-y-1">
                <CardTitle className="flex items-center gap-3 text-xl">
                  <div className="p-2 bg-blue-100 rounded-xl">
                    <Search className="w-5 h-5 text-blue-600" />
                  </div>
                  {user?.role === "admin" ? "Select User to Review" : "Select Team Member"}
                </CardTitle>
                <CardDescription className="text-base">
                  {user?.role === "admin"
                    ? "Choose a user to view their weekly timesheet submissions"
                    : "Choose a team member to review their timesheet submissions"}
                </CardDescription>
              </div>
              <Badge variant="outline" className="gap-2 bg-white/80 text-blue-700 border-blue-200 px-4 py-2">
                <Users className="w-4 h-4" />
                {users.length} {users.length === 1 ? "User" : "Users"}
              </Badge>
            </div>
          </CardHeader>

          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-foreground flex items-center gap-2">
                <UserIcon className="w-4 h-4" />
                Choose Team Member
              </label>
              <Select
                value={selectedUserOption}
                onChange={(option) => setSelectedUser(option?.value || "")}
                options={userOptions}
                components={{
                  Option: CustomOption,
                  SingleValue: CustomSingleValue,
                }}
                styles={customStyles}
                placeholder="Search by name or email..."
                isSearchable
                isClearable
                className="react-select-container"
                classNamePrefix="react-select"
                noOptionsMessage={() => "No users found"}
                loadingMessage={() => "Loading users..."}
              />
            </div>

            {!selectedUser && (
              <div className="text-center py-8">
                <div className="w-12 h-12 bg-blue-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Search className="w-6 h-6 text-blue-600" />
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">
                  Select a Team Member
                </h3>
                <p className="text-muted-foreground max-w-sm mx-auto">
                  Use the search box above to find and select a team member to view their weekly timesheets.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {selectedUserData && (
        <>
          {/* Enhanced Week Navigation */}
          <Card variant="elevated" className="border-2 border-purple-200 bg-gradient-to-r from-purple-50/50 to-pink-50/50 shadow-medium">
            <CardContent className="p-6">
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
                <Button
                  variant="outline"
                  onClick={() => navigateWeek("prev")}
                  leftIcon={<ChevronLeft className="w-4 h-4" />}
                  className="bg-white/80 hover:bg-white border-purple-200 hover:border-purple-300 shadow-soft"
                >
                  Previous Week
                </Button>

                <div className="text-center space-y-3">
                  <div className="flex items-center justify-center gap-3">
                    <div className="p-2 bg-purple-100 rounded-xl">
                      <CalendarDays className="w-6 h-6 text-purple-600" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-foreground">
                        {weekCalculations.start.toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                        })}{" "}
                        -{" "}
                        {weekCalculations.end.toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        Week of{" "}
                        {weekCalculations.start.toLocaleDateString("en-US", {
                          month: "long",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </p>
                    </div>
                  </div>

                  {weekCalculations.isCurrentWeek && (
                    <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 gap-1">
                      <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
                      Current Week
                    </Badge>
                  )}
                </div>

                <div className="flex gap-2">
                  {!weekCalculations.isCurrentWeek && (
                    <Button
                      variant="outline"
                      onClick={goToCurrentWeek}
                      leftIcon={<Calendar className="w-4 h-4" />}
                      className="bg-white/80 hover:bg-white border-purple-200 hover:border-purple-300 shadow-soft"
                    >
                      Current Week
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    onClick={() => navigateWeek("next")}
                    disabled={!weekCalculations.canNavigateNext}
                    rightIcon={<ChevronRight className="w-4 h-4" />}
                    className={cn(
                      "shadow-soft",
                      weekCalculations.canNavigateNext
                        ? "bg-white/80 hover:bg-white border-purple-200 hover:border-purple-300"
                        : "opacity-50 cursor-not-allowed"
                    )}
                    title={!weekCalculations.canNavigateNext ? "Cannot navigate to future weeks" : "Next week"}
                  >
                    Next Week
                  </Button>
                </div>
              </div>

              <div className="mt-6 pt-6 border-t border-purple-200/50">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Week Progress</span>
                  <span className="font-semibold text-foreground">
                    {sessions.length} session{sessions.length !== 1 ? "s" : ""} recorded
                  </span>
                </div>
                <div className="mt-2 w-full bg-purple-100 rounded-full h-2">
                  <div
                    className="bg-gradient-to-r from-purple-500 to-pink-500 h-2 rounded-full transition-all duration-500"
                    style={{
                      width: `${Math.min((sessions.length / 7) * 100, 100)}%`,
                    }}
                  ></div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Enhanced Stats Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-6 gap-4 lg:gap-6">
            <StatCard
              title="Total Hours"
              value={formatDuration(stats.totalMinutes)}
              icon={Clock}
              color="blue"
              subtitle="This week"
            />
            <StatCard
              title="Pending"
              value={stats.pending}
              icon={AlertCircle}
              color="yellow"
              subtitle="Need review"
            />
            <StatCard
              title="Approved"
              value={stats.approved}
              icon={CheckCircle}
              color="green"
              subtitle="Completed"
            />
            <StatCard
              title="Rejected"
              value={stats.disapproved}
              icon={XCircle}
              color="red"
              subtitle="Need attention"
            />
            <StatCard
              title="Productivity"
              value={`${stats.productivityRate}%`}
              icon={TrendingUp}
              color="purple"
              subtitle="Active time"
            />
            <StatCard
              title="Avg Session"
              value={formatDuration(stats.averageSessionLength)}
              icon={Target}
              color="orange"
              subtitle="Per session"
            />
          </div>

          {/* Enhanced Sessions Table */}
          <Card variant="elevated" className="border-2 shadow-strong">
            <CardHeader divided>
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <CardTitle className="flex items-center gap-3 text-xl">
                    <div className="p-2 bg-gradient-to-br from-amber-100 to-orange-100 rounded-xl">
                      <FileText className="w-5 h-5 text-amber-600" />
                    </div>
                    Weekly Sessions - {selectedUserData.fullName}
                  </CardTitle>
                  <CardDescription className="text-base">
                    Detailed timesheet overview with session management
                  </CardDescription>
                </div>
                <div className="flex items-center gap-3">
                  <Badge variant="outline" className="gap-2 bg-amber-50 text-amber-700 border-amber-200">
                    <Activity className="w-3 h-3" />
                    {sessions.length} sessions
                  </Badge>
                  <Button
                    variant="outline"
                    size="sm"
                    leftIcon={<Download className="w-4 h-4" />}
                  >
                    Export
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <SimpleTable
                data={sessions}
                columns={tableColumns}
                onRowClick={handleViewSession}
                emptyMessage="No sessions found for this week"
                className="hover:shadow-soft transition-shadow"
              />
            </CardContent>
          </Card>
        </>
      )}

      {/* Session Details Modal */}
      {selectedSession && (
        <SessionDetailsModal
          isOpen={showSessionModal}
          onClose={() => {
            setShowSessionModal(false);
            setSelectedSession(null);
          }}
          session={selectedSession}
          onSessionUpdate={handleSessionUpdate}
        />
      )}
    </div>
  );
}