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

  // Memoized calendar calculations
  const calendarData = useMemo(() => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();

    // Get first day of month and last day of month
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);

    // Get first day of calendar (might be from previous month)
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - firstDay.getDay());

    // Get last day of calendar (might be from next month)
    const endDate = new Date(lastDay);
    endDate.setDate(endDate.getDate() + (6 - lastDay.getDay()));

    const days: CalendarDay[] = [];
    const currentDate = new Date(startDate);
    const today = new Date();

    while (currentDate <= endDate) {
      const dateString = currentDate.toISOString().split("T")[0];
      const daySessions = sessions.filter(
        (session) => session.date === dateString
      );
      const totalMinutes = daySessions.reduce(
        (sum, session) => sum + session.totalMinutes,
        0
      );

      days.push({
        date: currentDate.getDate(),
        isCurrentMonth: currentDate.getMonth() === month,
        isToday: currentDate.toDateString() === today.toDateString(),
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

  const weekDays = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        {/* Title & Subtitle */}
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold text-gray-900 leading-tight">
            Monthly Timesheet
          </h1>
          <p className="text-sm text-gray-600">
            Track and manage monthly work hours
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              selectedUser && fetchMonthlyUserSessions(selectedUser)
            }
            disabled={refreshing || !selectedUser}
            className="flex items-center gap-1.5"
          >
            <RefreshCw
              className={cn("w-4 h-4", refreshing && "animate-spin")}
            />
            <span>Refresh</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            className="flex items-center gap-1.5"
            disabled={!selectedUser}
          >
            <Download className="w-4 h-4" />
            <span>Export</span>
          </Button>
        </div>
      </div>

      {/* Enhanced User Selection Card */}
      <Card className="border-2 border-blue-200 bg-gradient-to-r from-blue-50/50 to-indigo-50/50 shadow-lg">
        <CardHeader className="pb-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="space-y-1">
              <CardTitle className="flex items-center gap-3 text-xl">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Search className="w-5 h-5 text-blue-600" />
                </div>
                Select Team Member
              </CardTitle>
              <p className="text-gray-600">
                Search and choose a team member to view their monthly timesheet
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">Available:</span>
              <span className="font-semibold text-blue-600">
                {users.length} users
              </span>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Enhanced User Selection with React Select */}
          <div className="space-y-3">
            <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
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
          <div className="flex items-center justify-between">
            <Button
              variant="outline"
              onClick={() => navigateMonth("prev")}
              className="gap-2"
            >
              <ChevronLeft className="w-4 h-4" />
              Previous Month
            </Button>

            <div className="text-center">
              <h3 className="text-lg font-semibold">
                {currentMonth.toLocaleDateString("en-US", {
                  month: "long",
                  year: "numeric",
                })}
              </h3>
              {!isCurrentMonth && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={goToCurrentMonth}
                  className="text-blue-600 hover:text-blue-700"
                >
                  Go to Current Month
                </Button>
              )}
            </div>

            <Button
              variant="outline"
              onClick={() => navigateMonth("next")}
              disabled={!canNavigateNext}
              className="gap-2"
            >
              Next Month
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>

          {/* Empty State */}
          {!selectedUser && (
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Search className="w-8 h-8 text-blue-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Select a Team Member
              </h3>
              <p className="text-gray-600 max-w-md mx-auto">
                Use the search dropdown above to find and select a team member
                to view their monthly timesheet.
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
              <div className="grid grid-cols-7 gap-1">
                {calendarData.map((day, index) => (
                  <div
                    key={index}
                    className={cn(
                      "rounded-lg border p-3 h-[110px] flex flex-col justify-between transition-all duration-200 group",
                      "hover:shadow-sm hover:ring-1 hover:ring-gray-200",
                      !day.isCurrentMonth &&
                        "bg-muted/20 text-muted-foreground",
                      day.isToday &&
                        "border-blue-500 bg-blue-50/50 ring-2 ring-blue-400"
                    )}
                  >
                    {/* Date Header */}
                    <div className="flex items-center justify-between">
                      <span
                        className={cn(
                          "text-sm font-medium",
                          day.isToday
                            ? "text-blue-600 font-bold"
                            : "text-gray-700",
                          !day.isCurrentMonth && "text-gray-400"
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

                    {/* Time Entry Tag */}
                    {day.totalMinutes > 0 && (
                      <div
                        className={cn(
                          "text-[11px] font-semibold mt-auto w-fit px-2 py-0.5 rounded-md",
                          getTimeBgColor(day.totalMinutes),
                          getTimeColor(day.totalMinutes),
                          "transition-colors duration-150"
                        )}
                      >
                        {formatDuration(day.totalMinutes)}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Selected User Info */}
          {selectedUserData && (
            <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <Avatar className="h-12 w-12 border-2 border-white shadow-sm">
                      <AvatarImage
                        src={selectedUserData.photoURL}
                        alt={selectedUserData.fullName}
                      />
                      <AvatarFallback className="text-lg font-semibold bg-gradient-to-br from-blue-500 to-purple-600 text-white">
                        {selectedUserData.fullName?.slice(0, 2).toUpperCase() ||
                          selectedUserData.email?.slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">
                        {selectedUserData.fullName}
                      </h3>
                      <p className="text-gray-600">{selectedUserData.email}</p>
                      <div className="flex items-center gap-2 mt-1">
                        {getRoleIcon(selectedUserData.role)}
                        <span className="text-sm text-gray-600 capitalize">
                          {selectedUserData.role}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="text-2xl font-bold text-blue-900">
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
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
