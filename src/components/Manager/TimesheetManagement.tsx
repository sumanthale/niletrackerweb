import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { collection, query, where, getDocs, orderBy, doc, updateDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuth } from '../../contexts/AuthContext';
import { TimeSession, User } from '../../types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/Card';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/Avatar';
import { SimpleTable } from '../ui/SimpleTable';
import Select from 'react-select';
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
  Grid3X3,
  List,
  Download,
  RefreshCw,
  PlayCircle,
  PauseCircle,
  Target,
  Zap,
  Search,
  User as UserIcon,
  MoreHorizontal
} from 'lucide-react';
import { formatDuration, formatTime, formatDate, getStatusColor, getWeekDateRange } from '../../lib/utils';
import { SessionDetailsModal } from './SessionDetailsModal';
import { WeeklyCalendarView } from './WeeklyCalendarView';
import { cn } from '../../lib/utils';
import toast from 'react-hot-toast';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../ui/DropdownMenu';

interface UserOption {
  value: string;
  label: string;
  user: User;
}

export function TimesheetManagement() {
  const { user } = useAuth();
  const [sessions, setSessions] = useState<TimeSession[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUser, setSelectedUser] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedSession, setSelectedSession] = useState<TimeSession | null>(null);
  const [showSessionModal, setShowSessionModal] = useState(false);
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list');
  const [currentWeek, setCurrentWeek] = useState(new Date());

  // Memoized stats calculation
  const stats = useMemo(() => {
    const pending = sessions.filter(s => s.status === 'submitted' || s.approvalStatus === 'submitted').length;
    const approved = sessions.filter(s => s.status === 'approved' || s.approvalStatus === 'approved').length;
    const disapproved = sessions.filter(s => s.status === 'disapproved' || s.approvalStatus === 'disapproved').length;
    const totalMinutes = sessions.reduce((acc, s) => acc + s.totalMinutes, 0);
    const idleMinutes = sessions.reduce((acc, s) => acc + s.idleMinutes, 0);
    const activeMinutes = totalMinutes - idleMinutes;
    const productivityRate = totalMinutes > 0 ? Math.round((activeMinutes / totalMinutes) * 100) : 0;

    return { pending, approved, disapproved, totalMinutes, idleMinutes, activeMinutes, productivityRate };
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
    const isCurrentWeek = currentWeekStart.toDateString() === weekStart.toDateString();
    
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
      canNavigateNext 
    };
  }, [currentWeek]);

  // Prepare user options for react-select
  const userOptions: UserOption[] = useMemo(() => {
    return users.map(userData => ({
      value: userData.id,
      label: userData.fullName,
      user: userData
    }));
  }, [users]);

  // Get selected user option
  const selectedUserOption = useMemo(() => {
    return userOptions.find(option => option.value === selectedUser) || null;
  }, [userOptions, selectedUser]);

  // Memoized selected user data
  const selectedUserData = useMemo(() => 
    users.find(u => u.id === selectedUser), 
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
      // Clear sessions when no user is selected
      setSessions([]);
    }
  }, [selectedUser, currentWeek]);

  const fetchAvailableUsers = useCallback(async () => {
    try {
      let usersQuery;
      
      if (user?.role === 'admin') {
        usersQuery = query(collection(db, 'users'));
      } else if (user?.role === 'manager') {
        usersQuery = query(
          collection(db, 'users'),
          where('managerId', '==', user?.id)
        );
      } else {
        setLoading(false);
        return;
      }

      const querySnapshot = await getDocs(usersQuery);
      const usersData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate ? doc.data().createdAt.toDate() : new Date(doc.data().createdAt || Date.now()),
        lastLogin: doc.data().lastLogin?.toDate ? doc.data().lastLogin.toDate() : doc.data().lastLogin ? new Date(doc.data().lastLogin) : undefined
      })) as User[];
      
      const filteredUsers = user?.role === 'manager' 
        ? usersData.filter(u => u.role !== 'admin')
        : usersData;
      
      setUsers(filteredUsers);
      // Don't auto-select any user - let user choose
      setLoading(false);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast.error('Failed to load users');
      setLoading(false);
    }
  }, [user]);

  const fetchUserSessions = useCallback(async (userId: string) => {
    try {
      setRefreshing(true);
      const { start: startDate, end: endDate } = getWeekDateRange(currentWeek);

      const sessionsQuery = query(
        collection(db, 'sessions'),
        where('userId', '==', userId),
        where('date', '>=', startDate),
        where('date', '<=', endDate),
        orderBy('date', 'desc')
      );
      
      const querySnapshot = await getDocs(sessionsQuery);
      const sessionsData = querySnapshot.docs.map(doc => {
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
          status: data.status || 'submitted',
          approvalStatus: data.approvalStatus || data.status || 'submitted',
          lessHoursComment: data.lessHoursComment,
          managerComment: data.managerComment,
          managerId: data.managerId,
          createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : new Date(data.createdAt || Date.now()),
          updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate() : new Date(data.updatedAt || Date.now())
        };
      }) as TimeSession[];
      
      const selectedUserData = users.find(u => u.id === userId);
      const enrichedSessions = sessionsData.map(session => ({
        ...session,
        userName: session.userName || selectedUserData?.fullName || 'Unknown User',
        userEmail: session.userEmail || selectedUserData?.email || 'unknown@email.com'
      }));
      
      setSessions(enrichedSessions);
    } catch (error) {
      console.error('Error fetching user sessions:', error);
      toast.error('Failed to load user sessions');
    } finally {
      setRefreshing(false);
    }
  }, [currentWeek, users]);

  const handleViewSession = useCallback((session: TimeSession) => {
    setSelectedSession(session);
    setShowSessionModal(true);
  }, []);

  const handleSessionUpdate = useCallback(async (sessionId: string, updates: Partial<TimeSession>) => {
    try {
      const sessionRef = doc(db, 'sessions', sessionId);
      await updateDoc(sessionRef, {
        ...updates,
        updatedAt: new Date()
      });

      setSessions(prevSessions => 
        prevSessions.map(session => 
          session.id === sessionId ? { ...session, ...updates, updatedAt: new Date() } : session
        )
      );

      toast.success('Session updated successfully');
    } catch (error) {
      console.error('Error updating session:', error);
      toast.error('Failed to update session');
      throw error;
    }
  }, []);

  const navigateWeek = useCallback((direction: 'prev' | 'next') => {
    setCurrentWeek(prevWeek => {
      const newWeek = new Date(prevWeek);
      newWeek.setDate(newWeek.getDate() + (direction === 'next' ? 7 : -7));
      return newWeek;
    });
  }, []);

  const goToCurrentWeek = useCallback(() => {
    setCurrentWeek(new Date());
  }, []);

  const getRoleIcon = useCallback((role: string) => {
    switch (role) {
      case 'admin':
        return <Crown className="w-3 h-3" />;
      case 'manager':
        return <UserCheck className="w-3 h-3" />;
      default:
        return <Timer className="w-3 h-3" />;
    }
  }, []);

  const getRoleBadgeVariant = useCallback((role: string) => {
    switch (role) {
      case 'admin':
        return 'destructive';
      case 'manager':
        return 'default';
      default:
        return 'secondary';
    }
  }, []);

  // Custom option component for react-select
  const CustomOption = ({ data, ...props }: any) => (
    <div {...props.innerProps} className="flex items-center gap-3 p-3 hover:bg-gray-50 cursor-pointer">
      <Avatar className="h-8 w-8">
        <AvatarImage src={data.user.photoURL} alt={data.user.fullName} />
        <AvatarFallback className="text-xs">
          {data.user.fullName?.slice(0, 2).toUpperCase() || data.user.email?.slice(0, 2).toUpperCase()}
        </AvatarFallback>
      </Avatar>
      <div className="flex-1">
        <div className="font-medium text-gray-900">{data.user.fullName}</div>
        <div className="text-sm text-gray-500">{data.user.email}</div>
        <div className="flex items-center gap-1 mt-1">
          {getRoleIcon(data.user.role)}
          <span className="text-xs text-gray-600 capitalize">{data.user.role}</span>
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
          {data.user.fullName?.slice(0, 2).toUpperCase() || data.user.email?.slice(0, 2).toUpperCase()}
        </AvatarFallback>
      </Avatar>
      <span className="font-medium">{data.user.fullName}</span>
    </div>
  );

  // Custom styles for react-select
  const customStyles = {
    control: (provided: any, state: any) => ({
      ...provided,
      minHeight: '48px',
      border: '2px solid #e5e7eb',
      borderRadius: '12px',
      boxShadow: state.isFocused ? '0 0 0 3px rgba(59, 130, 246, 0.1)' : 'none',
      borderColor: state.isFocused ? '#3b82f6' : '#e5e7eb',
      '&:hover': {
        borderColor: '#d1d5db'
      }
    }),
    option: (provided: any, state: any) => ({
      ...provided,
      padding: 0,
      backgroundColor: state.isSelected ? '#eff6ff' : state.isFocused ? '#f9fafb' : 'white',
      color: '#111827',
      '&:hover': {
        backgroundColor: '#f3f4f6'
      }
    }),
    singleValue: (provided: any) => ({
      ...provided,
      color: '#111827'
    }),
    placeholder: (provided: any) => ({
      ...provided,
      color: '#9ca3af',
      fontSize: '14px'
    }),
    menu: (provided: any) => ({
      ...provided,
      border: '1px solid #e5e7eb',
      borderRadius: '12px',
      boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
      zIndex: 50
    }),
    menuList: (provided: any) => ({
      ...provided,
      maxHeight: '300px',
      padding: '8px'
    })
  };

  // Define simple table columns
  const tableColumns = [
    {
      key: 'date',
      header: 'Date & Time',
      render: (session: TimeSession) => (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
            <span className="font-medium text-gray-900">{formatDate(session.date)}</span>
          </div>
          <div className="flex items-center gap-3 text-sm text-gray-600">
            <div className="flex items-center gap-1">
              <PlayCircle className="w-3 h-3 text-green-600" />
              <span>{formatTime(session.clockIn)}</span>
            </div>
            {session.clockOut && (
              <div className="flex items-center gap-1">
                <PauseCircle className="w-3 h-3 text-red-600" />
                <span>{formatTime(session.clockOut)}</span>
              </div>
            )}
          </div>
        </div>
      )
    },
    {
      key: 'duration',
      header: 'Duration & Productivity',
      render: (session: TimeSession) => {
        const activeMinutes = session.totalMinutes - session.idleMinutes;
        const productivityRate = session.totalMinutes > 0 ? Math.round((activeMinutes / session.totalMinutes) * 100) : 0;
        
        return (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-blue-500" />
              <span className="font-semibold text-gray-900">{formatDuration(session.totalMinutes)}</span>
            </div>
            
            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-500">Active</span>
                <span className="font-medium text-green-600">{formatDuration(activeMinutes)}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-500">Idle</span>
                <span className="font-medium text-orange-600">{formatDuration(session.idleMinutes)}</span>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <div className={cn(
                "w-2 h-2 rounded-full",
                productivityRate >= 80 ? "bg-green-500" : 
                productivityRate >= 60 ? "bg-yellow-500" : "bg-red-500"
              )}></div>
              <span className="text-xs font-medium text-gray-600">{productivityRate}% productive</span>
            </div>
          </div>
        );
      }
    },
    {
      key: 'activity',
      header: 'Activity & Notes',
      render: (session: TimeSession) => (
        <div className="space-y-3">
          {session.screenshots.length > 0 && (
            <div className="flex items-center gap-2">
              <Camera className="w-4 h-4 text-purple-500" />
              <span className="text-sm font-medium text-gray-700">{session.screenshots.length} screenshots</span>
              <div className="flex -space-x-1">
                {session.screenshots.slice(0, 3).map((screenshot, idx) => (
                  <img
                    key={screenshot.id}
                    src={screenshot.image}
                    alt="Screenshot"
                    className="w-6 h-6 rounded border-2 border-white object-cover shadow-sm"
                  />
                ))}
                {session.screenshots.length > 3 && (
                  <div className="w-6 h-6 rounded border-2 border-white bg-gray-100 flex items-center justify-center shadow-sm">
                    <span className="text-xs font-medium text-gray-600">+{session.screenshots.length - 3}</span>
                  </div>
                )}
              </div>
            </div>
          )}
          
          {session.lessHoursComment && (
            <div className="flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-blue-500" />
              <span className="text-sm text-gray-600">Has comment</span>
            </div>
          )}
          
          {!session.screenshots.length && !session.lessHoursComment && (
            <span className="text-sm text-gray-400">No activity recorded</span>
          )}
        </div>
      )
    },
    {
      key: 'status',
      header: 'Status',
      render: (session: TimeSession) => (
        <Badge className={cn(getStatusColor(session.status), "font-medium")}>
          {session.status === 'submitted' && <AlertCircle className="w-3 h-3 mr-1" />}
          {session.status === 'approved' && <CheckCircle className="w-3 h-3 mr-1" />}
          {session.status === 'disapproved' && <XCircle className="w-3 h-3 mr-1" />}
          {session.status}
        </Badge>
      )
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (session: TimeSession) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 w-8 p-0">
              <span className="sr-only">Open menu</span>
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Actions</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => handleViewSession(session)} className="gap-2">
              <Eye className="h-4 w-4" />
              View Details
            </DropdownMenuItem>
            {session.status === 'submitted' && (
              <>
                <DropdownMenuItem 
                  onClick={() => handleSessionUpdate(session.id, { status: 'approved', approvalStatus: 'approved' })}
                  className="gap-2"
                >
                  <CheckCircle className="h-4 w-4" />
                  Quick Approve
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={() => handleViewSession(session)}
                  className="gap-2"
                >
                  <XCircle className="h-4 w-4" />
                  Quick Reject
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      )
    }
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="text-sm text-muted-foreground">Loading timesheets...</p>
        </div>
      </div>
    );
  }

  if (users.length === 0) {
    return (
      <div className="text-center py-16">
        <div className="max-w-md mx-auto space-y-6">
          <div className="w-16 h-16 bg-muted rounded-2xl flex items-center justify-center mx-auto">
            <Users className="w-8 h-8 text-muted-foreground" />
          </div>
          <div>
            <h3 className="text-xl font-semibold mb-2">
              {user?.role === 'admin' ? 'No Users Found' : 'No Managed Users'}
            </h3>
            <p className="text-muted-foreground">
              {user?.role === 'admin' 
                ? 'No users are available in the system yet.' 
                : 'You don\'t have any users assigned to you yet.'
              }
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-2xl lg:text-3xl font-bold tracking-tight text-gray-900">
              {user?.role === 'admin' ? 'All User Timesheets' : 'Weekly Timesheets'}
            </h1>
            <p className="text-sm lg:text-base text-gray-600">
              {user?.role === 'admin' 
                ? 'Review and manage timesheets for all users in the system'
                : 'Review and approve employee weekly timesheets'
              }
            </p>
          </div>
          
          <div className="flex items-center gap-2 lg:gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => selectedUser && fetchUserSessions(selectedUser)}
              disabled={refreshing || !selectedUser}
              className="gap-2"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Refresh</span>
            </Button>
            
            <div className="flex items-center bg-gray-100 rounded-lg p-1">
              <Button
                variant={viewMode === 'list' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('list')}
                className="gap-1 lg:gap-2 px-2 lg:px-3"
              >
                <List className="w-4 h-4" />
                <span className="hidden sm:inline">List</span>
              </Button>
              <Button
                variant={viewMode === 'calendar' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('calendar')}
                className="gap-1 lg:gap-2 px-2 lg:px-3"
              >
                <Grid3X3 className="w-4 h-4" />
                <span className="hidden sm:inline">Calendar</span>
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Enhanced User Selection Card */}
      <Card className="border-2 border-blue-200 bg-gradient-to-r from-blue-50/50 to-indigo-50/50 shadow-lg">
        <CardHeader className="pb-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="space-y-1">
              <CardTitle className="flex items-center gap-3 text-lg lg:text-xl">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Search className="w-4 lg:w-5 h-4 lg:h-5 text-blue-600" />
                </div>
                {user?.role === 'admin' ? 'Select User to Review' : 'Select Employee to Review'}
              </CardTitle>
              <CardDescription className="text-sm lg:text-base text-gray-600">
                {user?.role === 'admin' 
                  ? 'Search and choose any user to view their timesheets and activity'
                  : 'Search and choose an employee to view their timesheets'
                }
              </CardDescription>
            </div>
            <Badge variant="outline" className="gap-2 bg-white/80 text-blue-700 border-blue-200 px-3 lg:px-4 py-1 lg:py-2 text-xs lg:text-sm">
              <Users className="w-3 lg:w-4 h-3 lg:h-4" />
              {users.length} {users.length === 1 ? 'User' : 'Users'} Available
            </Badge>
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
              onChange={(option) => setSelectedUser(option?.value || '')}
              options={userOptions}
              components={{
                Option: CustomOption,
                SingleValue: CustomSingleValue
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

          {/* Empty State */}
          {!selectedUser && (
            <div className="text-center py-6 lg:py-8">
              <div className="w-12 lg:w-16 h-12 lg:h-16 bg-blue-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Search className="w-6 lg:w-8 h-6 lg:h-8 text-blue-600" />
              </div>
              <h3 className="text-base lg:text-lg font-semibold text-gray-900 mb-2">Select a Team Member</h3>
              <p className="text-sm lg:text-base text-gray-600 max-w-md mx-auto">
                Use the search dropdown above to find and select a team member to view their weekly timesheets and activity.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {selectedUserData && (
        <>
          {/* Enhanced Week Navigation */}
          <Card className="bg-gradient-to-r from-blue-50/50 to-indigo-50/50 border-blue-200/50 shadow-sm">
            <CardContent className="p-4 lg:p-8">
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 lg:gap-6">
                {/* Left: Previous Week Button */}
                <div className="flex justify-start">
                  <Button
                    variant="outline"
                    onClick={() => navigateWeek('prev')}
                    className="gap-2 bg-white/80 hover:bg-white border-blue-200 hover:border-blue-300 transition-all duration-200 shadow-sm text-sm lg:text-base"
                    size="sm"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    <span className="hidden sm:inline">Previous Week</span>
                    <span className="sm:hidden">Prev</span>
                  </Button>
                </div>
                
                {/* Center: Week Info */}
                <div className="text-center space-y-2 lg:space-y-3">
                  <div className="flex items-center justify-center gap-2 lg:gap-3">
                    <div className="p-1.5 lg:p-2 bg-blue-100 rounded-lg">
                      <CalendarDays className="w-4 lg:w-6 h-4 lg:h-6 text-blue-600" />
                    </div>
                    <div>
                      <h3 className="text-lg lg:text-xl font-bold text-gray-900">
                        {weekCalculations.start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - {' '}
                        {weekCalculations.end.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </h3>
                      <p className="text-xs lg:text-sm text-gray-600 mt-1">
                        Week of {weekCalculations.start.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex flex-col sm:flex-row items-center justify-center gap-2 lg:gap-3">
                    <div className="flex items-center gap-2">
                      <Avatar className="h-5 lg:h-6 w-5 lg:w-6">
                        <AvatarImage src={selectedUserData.photoURL} alt={selectedUserData.fullName} />
                        <AvatarFallback className="text-xs">
                          {selectedUserData.fullName?.slice(0, 2).toUpperCase() || selectedUserData.email?.slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <span className="font-medium text-gray-700 text-sm lg:text-base">{selectedUserData.fullName}</span>
                    </div>
                    
                    <Badge className="border text-xs lg:text-sm">
                      {getRoleIcon(selectedUserData.role)}
                      <span className="ml-1 capitalize">{selectedUserData.role}</span>
                    </Badge>
                    
                    {weekCalculations.isCurrentWeek && (
                      <Badge className="bg-green-100 text-green-800 border-green-200 text-xs lg:text-sm">
                        <div className="w-2 h-2 bg-green-500 rounded-full mr-1 animate-pulse"></div>
                        Current Week
                      </Badge>
                    )}
                  </div>
                </div>
                
                {/* Right: Next Week Button & Today Button */}
                <div className="flex justify-end gap-2">
                  {!weekCalculations.isCurrentWeek && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={goToCurrentWeek}
                      className="gap-2 bg-white/80 hover:bg-white border-blue-200 hover:border-blue-300 shadow-sm text-xs lg:text-sm"
                    >
                      <Calendar className="w-4 h-4" />
                      <span className="hidden sm:inline">Current Week</span>
                      <span className="sm:hidden">Today</span>
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    onClick={() => navigateWeek('next')}
                    disabled={!weekCalculations.canNavigateNext}
                    className={`gap-2 transition-all duration-200 shadow-sm text-sm lg:text-base ${
                      weekCalculations.canNavigateNext 
                        ? 'bg-white/80 hover:bg-white border-blue-200 hover:border-blue-300' 
                        : 'opacity-50 cursor-not-allowed bg-gray-100 border-gray-200'
                    }`}
                    title={!weekCalculations.canNavigateNext ? 'Cannot navigate to future weeks' : 'Next week'}
                    size="sm"
                  >
                    <span className="hidden sm:inline">Next Week</span>
                    <span className="sm:hidden">Next</span>
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
              
              {/* Week Progress Indicator */}
              <div className="mt-4 lg:mt-6 pt-4 lg:pt-6 border-t border-blue-200/50">
                <div className="flex items-center justify-between text-xs lg:text-sm">
                  <span className="text-gray-600">Week Progress</span>
                  <span className="font-medium text-gray-900">
                    {sessions.length} session{sessions.length !== 1 ? 's' : ''} recorded
                  </span>
                </div>
                <div className="mt-2 w-full bg-blue-100 rounded-full h-2">
                  <div 
                    className="bg-gradient-to-r from-blue-500 to-blue-600 h-2 rounded-full transition-all duration-500"
                    style={{ width: `${Math.min((sessions.length / 7) * 100, 100)}%` }}
                  ></div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Compact Responsive Stats Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 lg:gap-4">
            <Card className="border-2 border-blue-200 bg-gradient-to-br from-blue-50 to-blue-100 shadow-sm">
              <CardContent className="p-3 lg:p-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <p className="text-xs lg:text-sm font-medium text-blue-700">Total Hours</p>
                    <p className="text-lg lg:text-2xl font-bold text-blue-900">{formatDuration(stats.totalMinutes)}</p>
                  </div>
                  <div className="p-2 lg:p-3 bg-blue-200 rounded-xl">
                    <Clock className="w-4 lg:w-6 h-4 lg:h-6 text-blue-700" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-2 border-yellow-200 bg-gradient-to-br from-yellow-50 to-yellow-100 shadow-sm">
              <CardContent className="p-3 lg:p-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <p className="text-xs lg:text-sm font-medium text-yellow-700">Pending</p>
                    <p className="text-lg lg:text-2xl font-bold text-yellow-900">{stats.pending}</p>
                  </div>
                  <div className="p-2 lg:p-3 bg-yellow-200 rounded-xl">
                    <AlertCircle className="w-4 lg:w-6 h-4 lg:h-6 text-yellow-700" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-2 border-green-200 bg-gradient-to-br from-green-50 to-green-100 shadow-sm">
              <CardContent className="p-3 lg:p-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <p className="text-xs lg:text-sm font-medium text-green-700">Approved</p>
                    <p className="text-lg lg:text-2xl font-bold text-green-900">{stats.approved}</p>
                  </div>
                  <div className="p-2 lg:p-3 bg-green-200 rounded-xl">
                    <CheckCircle className="w-4 lg:w-6 h-4 lg:h-6 text-green-700" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-2 border-red-200 bg-gradient-to-br from-red-50 to-red-100 shadow-sm">
              <CardContent className="p-3 lg:p-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <p className="text-xs lg:text-sm font-medium text-red-700">Rejected</p>
                    <p className="text-lg lg:text-2xl font-bold text-red-900">{stats.disapproved}</p>
                  </div>
                  <div className="p-2 lg:p-3 bg-red-200 rounded-xl">
                    <XCircle className="w-4 lg:w-6 h-4 lg:h-6 text-red-700" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-2 border-purple-200 bg-gradient-to-br from-purple-50 to-purple-100 shadow-sm">
              <CardContent className="p-3 lg:p-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <p className="text-xs lg:text-sm font-medium text-purple-700">Productivity</p>
                    <p className="text-lg lg:text-2xl font-bold text-purple-900">{stats.productivityRate}%</p>
                  </div>
                  <div className="p-2 lg:p-3 bg-purple-200 rounded-xl">
                    <TrendingUp className="w-4 lg:w-6 h-4 lg:h-6 text-purple-700" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-2 border-orange-200 bg-gradient-to-br from-orange-50 to-orange-100 shadow-sm">
              <CardContent className="p-3 lg:p-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <p className="text-xs lg:text-sm font-medium text-orange-700">Idle Time</p>
                    <p className="text-lg lg:text-2xl font-bold text-orange-900">{formatDuration(stats.idleMinutes)}</p>
                  </div>
                  <div className="p-2 lg:p-3 bg-orange-200 rounded-xl">
                    <BarChart3 className="w-4 lg:w-6 h-4 lg:h-6 text-orange-700" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Content based on view mode */}
          {viewMode === 'calendar' ? (
            <WeeklyCalendarView
              sessions={sessions}
              weekStart={weekCalculations.start}
              onSessionClick={handleViewSession}
            />
          ) : (
            /* Simple Sessions Table */
            <Card className="border-2 border-gray-200 shadow-sm">
              <CardHeader>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div className="space-y-1">
                    <CardTitle className="flex items-center gap-2 text-lg lg:text-xl">
                      <Calendar className="w-4 lg:w-5 h-4 lg:h-5 text-blue-600" />
                      Sessions - {selectedUserData.fullName}
                    </CardTitle>
                    <CardDescription className="text-sm lg:text-base text-gray-600">
                      Weekly timesheet overview with session details
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="gap-1 bg-blue-50 text-blue-700 border-blue-200 text-xs lg:text-sm">
                      <Activity className="w-3 h-3" />
                      {sessions.length} sessions
                    </Badge>
                    <Button variant="outline" size="sm" className="gap-2 text-xs lg:text-sm">
                      <Download className="w-4 h-4" />
                      <span className="hidden sm:inline">Export</span>
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
                />
              </CardContent>
            </Card>
          )}
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