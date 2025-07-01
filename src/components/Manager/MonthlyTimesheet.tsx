import React, { useState, useEffect, useMemo, useCallback } from "react";
import { collection, query, where, getDocs, orderBy } from "firebase/firestore";
import { db } from "../../lib/firebase";
import { useAuth } from "../../contexts/AuthContext";
import { TimeSession, User } from "../../types";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/Card";
import { Button } from "../ui/Button";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/Avatar";
import Select from "react-select";
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Download,
  RefreshCw,
  Clock,
  User as UserIcon,
  Timer,
  Crown,
  UserCheck,
  Search,
} from "lucide-react";
import { formatDuration, cn } from "../../lib/utils";
import toast from "react-hot-toast";

interface CalendarDay {
  date: number;
  fullDate: Date;
  isCurrentMonth: boolean;
  isToday: boolean;
  sessions: TimeSession[];
  totalMinutes: number;
}

interface UserOption {
  value: string;
  label: string;
  user: User;
}

export function MonthlyTimesheet() {
  const { user } = useAuth();
  const [sessions, setSessions] = useState<TimeSession[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUser, setSelectedUser] = useState<string>(""); // No default selection
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(new Date());

  // Get working days in month (excluding weekends)
  const getWorkingDaysInMonth = useCallback((date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    let workingDays = 0;

    for (let day = 1; day <= daysInMonth; day++) {
      const dayOfWeek = new Date(year, month, day).getDay();
      if (dayOfWeek !== 0 && dayOfWeek !== 6) {
        // Not Sunday (0) or Saturday (6)
        workingDays++;
      }
    }

    return workingDays;
  }, []);

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

  // Fixed calendar calculations
  const calendarData = useMemo(() => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();

    // Get first day of month and last day of month
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);

    // Get first day of calendar (start from Monday)
    const startDate = new Date(firstDay);
    const firstDayOfWeek = firstDay.getDay();
    // Adjust to start from Monday (0 = Sunday, 1 = Monday, etc.)
    const daysToSubtract = firstDayOfWeek === 0 ? 6 : firstDayOfWeek - 1;
    startDate.setDate(startDate.getDate() - daysToSubtract);

    // Get last day of calendar (end on Sunday)
    const endDate = new Date(lastDay);
    const lastDayOfWeek = lastDay.getDay();
    const daysToAdd = lastDayOfWeek === 0 ? 0 : 7 - lastDayOfWeek;
    endDate.setDate(endDate.getDate() + daysToAdd);

    const days: CalendarDay[] = [];
    const currentDate = new Date(startDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Reset time for accurate comparison

    while (currentDate <= endDate) {
      const dateString = currentDate.toISOString().split("T")[0];
      const daySessions = sessions.filter(
        (session) => session.date === dateString
      );
      const totalMinutes = daySessions.reduce(
        (sum, session) => sum + session.totalMinutes,
        0
      );

      const dayDate = new Date(currentDate);
      dayDate.setHours(0, 0, 0, 0);

      days.push({
        date: currentDate.getDate(),
        fullDate: new Date(currentDate),
        isCurrentMonth: currentDate.getMonth() === month,
        isToday: dayDate.getTime() === today.getTime(),
        sessions: daySessions,
        totalMinutes,
      });

      currentDate.setDate(currentDate.getDate() + 1);
    }

    return days;
  }, [currentMonth, sessions]);

  // Memoized stats calculation
  const monthlyStats = useMemo(() => {
    const totalMinutes = sessions.reduce((acc, s) => acc + s.totalMinutes, 0);
    const workingDaysInMonth = getWorkingDaysInMonth(currentMonth);
    const expectedMinutes = workingDaysInMonth * 8 * 60; // 8 hours per day

    return {
      totalMinutes,
      expectedMinutes,
      workingDaysInMonth,
      totalSessions: sessions.length,
      averageDailyHours:
        sessions.length > 0 ? totalMinutes / sessions.length / 60 : 0,
    };
  }, [sessions, currentMonth, getWorkingDaysInMonth]);

  // Check if current month is the actual current month
  const isCurrentMonth = useMemo(() => {
    const now = new Date();
    return (
      currentMonth.getMonth() === now.getMonth() &&
      currentMonth.getFullYear() === now.getFullYear()
    );
  }, [currentMonth]);

  // Check if we can navigate to next month (prevent future months)
  const canNavigateNext = useMemo(() => {
    const now = new Date();
    const nextMonth = new Date(currentMonth);
    nextMonth.setMonth(nextMonth.getMonth() + 1);
    return nextMonth <= now;
  }, [currentMonth]);

  useEffect(() => {
    if (user) {
      fetchAvailableUsers();
    }
  }, [user]);

  useEffect(() => {
    if (selectedUser) {
      fetchMonthlyUserSessions(selectedUser);
    } else {
      // Clear sessions when no user is selected
      setSessions([]);
    }
  }, [selectedUser, currentMonth]);

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
      // Don't auto-select any user - let user choose
      setLoading(false);
    } catch (error) {
      console.error("Error fetching users:", error);
      toast.error("Failed to load users");
      setLoading(false);
    }
  }, [user]);

  const fetchMonthlyUserSessions = useCallback(
    async (userId: string) => {
      try {
        setRefreshing(true);

        // Get start and end of the month
        const startOfMonth = new Date(
          currentMonth.getFullYear(),
          currentMonth.getMonth(),
          1
        );
        const endOfMonth = new Date(
          currentMonth.getFullYear(),
          currentMonth.getMonth() + 1,
          0
        );

        const startDate = startOfMonth.toISOString().split("T")[0];
        const endDate = endOfMonth.toISOString().split("T")[0];

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
        console.error("Error fetching monthly sessions:", error);
        toast.error("Failed to load monthly sessions");
      } finally {
        setRefreshing(false);
      }
    },
    [currentMonth, users]
  );

  const navigateMonth = useCallback((direction: "prev" | "next") => {
    setCurrentMonth((prevMonth) => {
      const newMonth = new Date(prevMonth);
      if (direction === "next") {
        newMonth.setMonth(newMonth.getMonth() + 1);
      } else {
        newMonth.setMonth(newMonth.getMonth() - 1);
      }
      return newMonth;
    });
  }, []);

  const goToCurrentMonth = useCallback(() => {
    setCurrentMonth(new Date());
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

  const selectedUserData = useMemo(
    () => users.find((u) => u.id === selectedUser),
    [users, selectedUser]
  );

  const getTimeColor = (minutes: number) => {
    if (minutes === 0) return "text-gray-400";
    if (minutes < 240) return "text-red-600"; // Less than 4 hours
    if (minutes < 360) return "text-orange-600"; // Less than 6 hours
    if (minutes < 480) return "text-yellow-600"; // Less than 8 hours
    return "text-green-600"; // 8+ hours
  };

  const getTimeBgColor = (minutes: number) => {
    if (minutes === 0) return "bg-gray-100";
    if (minutes < 240) return "bg-red-100"; // Less than 4 hours
    if (minutes < 360) return "bg-orange-100"; // Less than 6 hours
    if (minutes < 480) return "bg-yellow-100"; // Less than 8 hours
    return "bg-green-100"; // 8+ hours
  };

  // Custom option component for react-select
  const CustomOption = ({ data, ...props }: any) => (
    <div
      {...props.innerProps}
      className="flex items-center gap-3 p-3 hover:bg-gray-50 cursor-pointer"
    >
      <Avatar className="h-8 w-8">
        <AvatarImage src={data.user.photoURL} alt={data.user.fullName} />
        <AvatarFallback className="text-xs">
          {data.user.fullName?.slice(0, 2).toUpperCase() ||
            data.user.email?.slice(0, 2).toUpperCase()}
        </AvatarFallback>
      </Avatar>
      <div className="flex-1">
        <div className="font-medium text-gray-900">{data.user.fullName}</div>
        <div className="text-sm text-gray-500">{data.user.email}</div>
        <div className="flex items-center gap-1 mt-1">
          {getRoleIcon(data.user.role)}
          <span className="text-xs text-gray-600 capitalize">
            {data.user.role}
          </span>
        </div>
      </div>
    </div>
  );

  // Custom single value component for react-select
  const CustomSingleValue = ({ data }: any) => (
    <div className="flex items-center gap-2">
      <Avatar className="h-6 w-6">
        <AvatarImage src={data.user.photoURL} alt={data.user.fullName} />
        <AvatarFallback className="text-xs">
          {data.user.fullName?.slice(0, 2).toUpperCase() ||
            data.user.email?.slice(0, 2).toUpperCase()}
        </AvatarFallback>
      </Avatar>
      <span className="font-medium">{data.user.fullName}</span>
    </div>
  );

  // Custom styles for react-select
  const customStyles = {
    control: (provided: any, state: any) => ({
      ...provided,
      minHeight: "48px",
      border: "2px solid #e5e7eb",
      borderRadius: "12px",
      boxShadow: state.isFocused ? "0 0 0 3px rgba(59, 130, 246, 0.1)" : "none",
      borderColor: state.isFocused ? "#3b82f6" : "#e5e7eb",
      "&:hover": {
        borderColor: "#d1d5db",
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
      boxShadow:
        "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)",
      zIndex: 50,
    }),
    menuList: (provided: any) => ({
      ...provided,
      maxHeight: "300px",
      padding: "8px",
    }),
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="text-sm text-muted-foreground">
            Loading monthly timesheets...
          </p>
        </div>
      </div>
    );
  }

  if (users.length === 0) {
    return (
      <div className="text-center py-16">
        <div className="max-w-md mx-auto space-y-6">
          <div className="w-16 h-16 bg-muted rounded-2xl flex items-center justify-center mx-auto">
            <UserIcon className="w-8 h-8 text-muted-foreground" />
          </div>
          <div>
            <h3 className="text-xl font-semibold mb-2">No Users Found</h3>
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

  // Fixed week days array starting with Monday
  const weekDays = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-gray-900">
            Monthly Timesheet
          </h1>
          <p className="text-sm text-muted-foreground">
            Track and manage team members' monthly hours
          </p>
        </div>

        <div className="flex flex-wrap gap-2 sm:gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              selectedUser && fetchMonthlyUserSessions(selectedUser)
            }
            disabled={refreshing || !selectedUser}
            className="gap-1.5"
          >
            <RefreshCw
              className={cn("w-4 h-4", refreshing && "animate-spin")}
            />
            Refresh
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={!selectedUser}
            className="gap-1.5"
          >
            <Download className="w-4 h-4" />
            Export
          </Button>
        </div>
      </div>

      {/* Enhanced User Selection Card */}
      <Card className="border-2 border-blue-200 bg-gradient-to-r from-blue-50/50 to-indigo-50/50 shadow-lg">
        <CardHeader className="pb-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1">
              <CardTitle className="flex items-center gap-3 text-xl font-semibold">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Search className="w-5 h-5 text-blue-600" />
                </div>
                Select Team Member
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Choose a team member to view their timesheet
              </p>
            </div>
            <div className="flex items-center gap-1 text-sm">
              <span className="text-muted-foreground">Available:</span>
              <span className="font-medium text-blue-700">
                {users.length} users
              </span>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* User Selector + Month Navigation Row */}
          <div className="flex flex-col-reverse gap-6 md:flex-row md:items-end md:justify-between">
            {/* User Select Dropdown */}
            <div className="w-full md:w-1/2 space-y-1.5">
              <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                <UserIcon className="w-4 h-4 text-gray-500" />
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
                placeholder="Search by name, email, or role..."
                isSearchable
                isClearable
                className="react-select-container"
                classNamePrefix="react-select"
                noOptionsMessage={() => "No users found"}
                loadingMessage={() => "Loading users..."}
              />
            </div>

            {/* Month Navigation */}
            <div className="flex items-center gap-2 md:gap-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigateMonth("prev")}
                className="flex items-center gap-1"
              >
                <ChevronLeft className="w-4 h-4" />
                <span className="hidden sm:inline">Previous Month</span>
              </Button>

              <div className="text-center">
                <h3 className="text-base font-semibold text-gray-900">
                  {currentMonth.toLocaleDateString("en-US", {
                    month: "long",
                    year: "numeric",
                  })}
                </h3>
                {!isCurrentMonth && (
                  <Button
                    variant="link"
                    size="sm"
                    onClick={goToCurrentMonth}
                    className="text-blue-600 hover:text-blue-700 px-0"
                  >
                    Current Month (
                    {new Date().toLocaleDateString("en-US", {
                      month: "long",
                      year: "numeric",
                    })}
                    )
                  </Button>
                )}
              </div>

              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigateMonth("next")}
                disabled={!canNavigateNext}
                className="flex items-center gap-1"
              >
                <span className="hidden sm:inline">Next Month</span>
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Empty State */}
          {!selectedUser && (
            <div className="py-10 text-center border border-dashed rounded-lg bg-muted/10">
              <div className="w-14 h-14 mx-auto flex items-center justify-center rounded-full bg-blue-100 mb-4">
                <Search className="w-6 h-6 text-blue-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-1">
                No Team Member Selected
              </h3>
              <p className="text-sm text-muted-foreground max-w-md mx-auto">
                Use the dropdown above to search and select a team member to
                view their monthly timesheet.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Calendar or Empty State */}
      {selectedUser && (
        <>
          {/* Calendar */}
          <Card className="bg-white border border-gray-200 shadow-sm rounded-xl">
            <CardContent className="p-6">
              {/* Calendar Header */}
              <div className="grid grid-cols-7 gap-1 mb-4 text-center">
                {weekDays.map((day) => (
                  <div
                    key={day}
                    className="text-sm font-semibold text-muted-foreground"
                  >
                    {day}
                  </div>
                ))}
              </div>

              {/* Calendar Grid */}
              <div className="grid grid-cols-7 gap-1 text-sm">
                {calendarData.map((day, index) => (
                  <div
                    key={index}
                    className={cn(
                      "flex flex-col justify-between p-3 rounded-md border transition-all group",
                      "hover:shadow-sm hover:ring-1 hover:ring-gray-200",
                      day.isToday &&
                        "border-blue-500 bg-blue-50 ring-2 ring-blue-400",
                      !day.isCurrentMonth && "bg-gray-50 text-muted-foreground"
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <span
                        className={cn(
                          "text-sm font-medium",
                          day.isToday ? "text-blue-600 font-semibold" : "",
                          !day.isCurrentMonth ? "text-gray-400" : ""
                        )}
                      >
                        {day.date}
                      </span>
                      {day.isToday && (
                        <span className="text-[10px] px-2 py-0.5 bg-blue-600 text-white rounded-full">
                          Today
                        </span>
                      )}
                    </div>

                    {day.totalMinutes > 0 ? (
                      <div
                        className={cn(
                          "text-[11px] font-medium mt-auto w-fit px-2 py-0.5 rounded-md",
                          getTimeBgColor(day.totalMinutes),
                          getTimeColor(day.totalMinutes)
                        )}
                      >
                        {formatDuration(day.totalMinutes)}
                      </div>
                    ) : (
                      <div className="text-[11px] text-gray-400 mt-auto">
                        No Data
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Selected User Info */}
          {selectedUserData && (
            <Card className="bg-white border border-gray-200 shadow-sm rounded-xl">
              <CardContent className="p-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex items-center gap-4">
                  <Avatar className="h-12 w-12 border shadow">
                    <AvatarImage src={selectedUserData.photoURL} />
                    <AvatarFallback className="bg-gradient-to-r from-blue-500 to-purple-600 text-white text-lg font-semibold">
                      {selectedUserData.fullName?.slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <h3 className="text-lg font-semibold">
                      {selectedUserData.fullName}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {selectedUserData.email}
                    </p>
                    <div className="flex items-center gap-2 mt-1 text-sm text-gray-600 capitalize">
                      {getRoleIcon(selectedUserData.role)}
                      {selectedUserData.role}
                    </div>
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-2xl font-bold text-blue-800">
                    {formatDuration(monthlyStats.totalMinutes)}
                  </div>
                  <div className="text-sm text-gray-600">
                    Total Hours This Month
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    {monthlyStats.totalSessions} sessions •{" "}
                    {monthlyStats.workingDaysInMonth} working days
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
