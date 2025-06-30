import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuth } from '../../contexts/AuthContext';
import { TimeSession, User } from '../../types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/Card';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/Avatar';
import Select from 'react-select';
import { 
  BarChart3,
  TrendingUp,
  TrendingDown,
  Clock,
  Users,
  Calendar,
  Download,
  RefreshCw,
  Filter,
  Eye,
  Target,
  Zap,
  Activity,
  PieChart,
  LineChart,
  Award,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Timer,
  Crown,
  UserCheck,
  Search,
  Calendar as CalendarIcon,
  FileText,
  Printer,
  Share2,
  Settings,
  Info,
  ArrowUp,
  ArrowDown,
  Minus
} from 'lucide-react';
import { formatDuration, formatDate, cn } from '../../lib/utils';
import toast from 'react-hot-toast';

interface UserOption {
  value: string;
  label: string;
  user: User;
}

interface DateRange {
  start: Date;
  end: Date;
  label: string;
}

interface ProductivityMetrics {
  totalHours: number;
  activeHours: number;
  idleHours: number;
  productivityRate: number;
  averageDailyHours: number;
  totalSessions: number;
  approvedSessions: number;
  pendingSessions: number;
  rejectedSessions: number;
}

interface DailyStats {
  date: string;
  totalMinutes: number;
  activeMinutes: number;
  idleMinutes: number;
  sessions: number;
  productivityRate: number;
}

interface WeeklyComparison {
  currentWeek: ProductivityMetrics;
  previousWeek: ProductivityMetrics;
  change: {
    totalHours: number;
    productivityRate: number;
    sessions: number;
  };
}

export function AnalyticsReports() {
  const { user } = useAuth();
  const [sessions, setSessions] = useState<TimeSession[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [dateRange, setDateRange] = useState<DateRange>({
    start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Last 30 days
    end: new Date(),
    label: 'Last 30 Days'
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [viewType, setViewType] = useState<'overview' | 'detailed' | 'comparison'>('overview');

  // Date range options
  const dateRangeOptions = [
    {
      value: 'last7days',
      label: 'Last 7 Days',
      start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      end: new Date()
    },
    {
      value: 'last30days',
      label: 'Last 30 Days',
      start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      end: new Date()
    },
    {
      value: 'last90days',
      label: 'Last 90 Days',
      start: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000),
      end: new Date()
    },
    {
      value: 'thisMonth',
      label: 'This Month',
      start: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
      end: new Date()
    },
    {
      value: 'lastMonth',
      label: 'Last Month',
      start: new Date(new Date().getFullYear(), new Date().getMonth() - 1, 1),
      end: new Date(new Date().getFullYear(), new Date().getMonth(), 0)
    }
  ];

  // Prepare user options for react-select
  const userOptions: UserOption[] = useMemo(() => {
    return users.map(userData => ({
      value: userData.id,
      label: userData.fullName,
      user: userData
    }));
  }, [users]);

  // Get selected user options
  const selectedUserOptions = useMemo(() => {
    return userOptions.filter(option => selectedUsers.includes(option.value));
  }, [userOptions, selectedUsers]);

  // Calculate overall metrics
  const overallMetrics = useMemo((): ProductivityMetrics => {
    const totalMinutes = sessions.reduce((acc, s) => acc + s.totalMinutes, 0);
    const idleMinutes = sessions.reduce((acc, s) => acc + s.idleMinutes, 0);
    const activeMinutes = totalMinutes - idleMinutes;
    const productivityRate = totalMinutes > 0 ? Math.round((activeMinutes / totalMinutes) * 100) : 0;
    
    const uniqueDays = new Set(sessions.map(s => s.date)).size;
    const averageDailyHours = uniqueDays > 0 ? totalMinutes / uniqueDays / 60 : 0;
    
    const approvedSessions = sessions.filter(s => s.status === 'approved').length;
    const pendingSessions = sessions.filter(s => s.status === 'submitted').length;
    const rejectedSessions = sessions.filter(s => s.status === 'disapproved').length;

    return {
      totalHours: totalMinutes / 60,
      activeHours: activeMinutes / 60,
      idleHours: idleMinutes / 60,
      productivityRate,
      averageDailyHours,
      totalSessions: sessions.length,
      approvedSessions,
      pendingSessions,
      rejectedSessions
    };
  }, [sessions]);

  // Calculate daily stats for charts
  const dailyStats = useMemo((): DailyStats[] => {
    const statsMap = new Map<string, DailyStats>();
    
    sessions.forEach(session => {
      const existing = statsMap.get(session.date) || {
        date: session.date,
        totalMinutes: 0,
        activeMinutes: 0,
        idleMinutes: 0,
        sessions: 0,
        productivityRate: 0
      };
      
      existing.totalMinutes += session.totalMinutes;
      existing.activeMinutes += (session.totalMinutes - session.idleMinutes);
      existing.idleMinutes += session.idleMinutes;
      existing.sessions += 1;
      existing.productivityRate = existing.totalMinutes > 0 
        ? Math.round((existing.activeMinutes / existing.totalMinutes) * 100) 
        : 0;
      
      statsMap.set(session.date, existing);
    });
    
    return Array.from(statsMap.values()).sort((a, b) => a.date.localeCompare(b.date));
  }, [sessions]);

  // Calculate weekly comparison
  const weeklyComparison = useMemo((): WeeklyComparison | null => {
    const now = new Date();
    const currentWeekStart = new Date(now);
    currentWeekStart.setDate(now.getDate() - now.getDay());
    currentWeekStart.setHours(0, 0, 0, 0);
    
    const previousWeekStart = new Date(currentWeekStart);
    previousWeekStart.setDate(currentWeekStart.getDate() - 7);
    
    const currentWeekEnd = new Date(currentWeekStart);
    currentWeekEnd.setDate(currentWeekStart.getDate() + 6);
    currentWeekEnd.setHours(23, 59, 59, 999);
    
    const previousWeekEnd = new Date(previousWeekStart);
    previousWeekEnd.setDate(previousWeekStart.getDate() + 6);
    previousWeekEnd.setHours(23, 59, 59, 999);
    
    const currentWeekSessions = sessions.filter(s => {
      const sessionDate = new Date(s.date);
      return sessionDate >= currentWeekStart && sessionDate <= currentWeekEnd;
    });
    
    const previousWeekSessions = sessions.filter(s => {
      const sessionDate = new Date(s.date);
      return sessionDate >= previousWeekStart && sessionDate <= previousWeekEnd;
    });
    
    const calculateWeekMetrics = (weekSessions: TimeSession[]): ProductivityMetrics => {
      const totalMinutes = weekSessions.reduce((acc, s) => acc + s.totalMinutes, 0);
      const idleMinutes = weekSessions.reduce((acc, s) => acc + s.idleMinutes, 0);
      const activeMinutes = totalMinutes - idleMinutes;
      const productivityRate = totalMinutes > 0 ? Math.round((activeMinutes / totalMinutes) * 100) : 0;
      
      return {
        totalHours: totalMinutes / 60,
        activeHours: activeMinutes / 60,
        idleHours: idleMinutes / 60,
        productivityRate,
        averageDailyHours: totalMinutes / 7 / 60,
        totalSessions: weekSessions.length,
        approvedSessions: weekSessions.filter(s => s.status === 'approved').length,
        pendingSessions: weekSessions.filter(s => s.status === 'submitted').length,
        rejectedSessions: weekSessions.filter(s => s.status === 'disapproved').length
      };
    };
    
    const currentWeek = calculateWeekMetrics(currentWeekSessions);
    const previousWeek = calculateWeekMetrics(previousWeekSessions);
    
    const change = {
      totalHours: previousWeek.totalHours > 0 
        ? ((currentWeek.totalHours - previousWeek.totalHours) / previousWeek.totalHours) * 100 
        : 0,
      productivityRate: previousWeek.productivityRate > 0 
        ? currentWeek.productivityRate - previousWeek.productivityRate 
        : 0,
      sessions: previousWeek.totalSessions > 0 
        ? ((currentWeek.totalSessions - previousWeek.totalSessions) / previousWeek.totalSessions) * 100 
        : 0
    };
    
    return { currentWeek, previousWeek, change };
  }, [sessions]);

  // Top performers
  const topPerformers = useMemo(() => {
    const userStats = new Map<string, {
      user: User;
      totalHours: number;
      productivityRate: number;
      sessions: number;
    }>();
    
    sessions.forEach(session => {
      const userData = users.find(u => u.id === session.userId);
      if (!userData) return;
      
      const existing = userStats.get(session.userId) || {
        user: userData,
        totalHours: 0,
        productivityRate: 0,
        sessions: 0
      };
      
      const activeMinutes = session.totalMinutes - session.idleMinutes;
      existing.totalHours += session.totalMinutes / 60;
      existing.sessions += 1;
      
      // Recalculate productivity rate
      const totalMinutes = existing.totalHours * 60;
      const totalActiveMinutes = sessions
        .filter(s => s.userId === session.userId)
        .reduce((acc, s) => acc + (s.totalMinutes - s.idleMinutes), 0);
      
      existing.productivityRate = totalMinutes > 0 
        ? Math.round((totalActiveMinutes / totalMinutes) * 100) 
        : 0;
      
      userStats.set(session.userId, existing);
    });
    
    return Array.from(userStats.values())
      .sort((a, b) => b.productivityRate - a.productivityRate)
      .slice(0, 5);
  }, [sessions, users]);

  useEffect(() => {
    if (user) {
      fetchAvailableUsers();
    }
  }, [user]);

  useEffect(() => {
    if (selectedUsers.length > 0) {
      fetchAnalyticsData();
    } else {
      setSessions([]);
    }
  }, [selectedUsers, dateRange]);

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
      // Auto-select all users for overview
      setSelectedUsers(filteredUsers.map(u => u.id));
      setLoading(false);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast.error('Failed to load users');
      setLoading(false);
    }
  }, [user]);

  const fetchAnalyticsData = useCallback(async () => {
    try {
      setRefreshing(true);
      
      const startDate = dateRange.start.toISOString().split('T')[0];
      const endDate = dateRange.end.toISOString().split('T')[0];

      const allSessions: TimeSession[] = [];
      
      // Fetch sessions for each selected user
      for (const userId of selectedUsers) {
        const sessionsQuery = query(
          collection(db, 'sessions'),
          where('userId', '==', userId),
          where('date', '>=', startDate),
          where('date', '<=', endDate),
          orderBy('date', 'desc')
        );
        
        const querySnapshot = await getDocs(sessionsQuery);
        const userSessions = querySnapshot.docs.map(doc => {
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
        
        allSessions.push(...userSessions);
      }
      
      // Enrich sessions with user data
      const enrichedSessions = allSessions.map(session => {
        const userData = users.find(u => u.id === session.userId);
        return {
          ...session,
          userName: session.userName || userData?.fullName || 'Unknown User',
          userEmail: session.userEmail || userData?.email || 'unknown@email.com'
        };
      });
      
      setSessions(enrichedSessions);
    } catch (error) {
      console.error('Error fetching analytics data:', error);
      toast.error('Failed to load analytics data');
    } finally {
      setRefreshing(false);
    }
  }, [selectedUsers, dateRange, users]);

  const handleDateRangeChange = (option: any) => {
    const range = dateRangeOptions.find(r => r.value === option.value);
    if (range) {
      setDateRange({
        start: range.start,
        end: range.end,
        label: range.label
      });
    }
  };

  const exportReport = useCallback(async (format: 'pdf' | 'csv' | 'excel') => {
    toast.success(`Exporting report as ${format.toUpperCase()}...`);
    // Implementation for export functionality would go here
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

  const getChangeIcon = (change: number) => {
    if (change > 0) return <ArrowUp className="w-4 h-4 text-green-600" />;
    if (change < 0) return <ArrowDown className="w-4 h-4 text-red-600" />;
    return <Minus className="w-4 h-4 text-gray-600" />;
  };

  const getChangeColor = (change: number) => {
    if (change > 0) return 'text-green-600';
    if (change < 0) return 'text-red-600';
    return 'text-gray-600';
  };

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

  // Custom multi value component for react-select
  const CustomMultiValue = ({ data, removeProps }: any) => (
    <div className="flex items-center gap-1 bg-blue-100 text-blue-800 px-2 py-1 rounded-md text-sm">
      <Avatar className="h-4 w-4">
        <AvatarImage src={data.user.photoURL} alt={data.user.fullName} />
        <AvatarFallback className="text-xs">
          {data.user.fullName?.slice(0, 2).toUpperCase() || data.user.email?.slice(0, 2).toUpperCase()}
        </AvatarFallback>
      </Avatar>
      <span>{data.user.fullName}</span>
      <button {...removeProps} className="ml-1 hover:bg-blue-200 rounded">
        ×
      </button>
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
    multiValue: (provided: any) => ({
      ...provided,
      backgroundColor: 'transparent',
      border: 'none',
      padding: 0,
      margin: '2px'
    }),
    multiValueLabel: (provided: any) => ({
      ...provided,
      padding: 0,
      paddingLeft: 0
    }),
    multiValueRemove: (provided: any) => ({
      ...provided,
      padding: 0,
      paddingLeft: 0,
      '&:hover': {
        backgroundColor: 'transparent'
      }
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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="text-sm text-muted-foreground">Loading analytics...</p>
        </div>
      </div>
    );
  }

  if (users.length === 0) {
    return (
      <div className="text-center py-16">
        <div className="max-w-md mx-auto space-y-6">
          <div className="w-16 h-16 bg-muted rounded-2xl flex items-center justify-center mx-auto">
            <BarChart3 className="w-8 h-8 text-muted-foreground" />
          </div>
          <div>
            <h3 className="text-xl font-semibold mb-2">No Data Available</h3>
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
            <h1 className="text-2xl lg:text-3xl font-bold tracking-tight text-gray-900 flex items-center gap-3">
              <div className="p-2 bg-gradient-to-br from-purple-500 to-blue-600 rounded-xl text-white">
                <BarChart3 className="w-6 lg:w-8 h-6 lg:h-8" />
              </div>
              Analytics & Reports
            </h1>
            <p className="text-sm lg:text-base text-gray-600">
              Comprehensive productivity insights and performance analytics
            </p>
          </div>
          
          <div className="flex items-center gap-2 lg:gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={fetchAnalyticsData}
              disabled={refreshing || selectedUsers.length === 0}
              className="gap-2"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Refresh</span>
            </Button>
            
            <div className="flex items-center bg-gray-100 rounded-lg p-1">
              <Button
                variant={viewType === 'overview' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewType('overview')}
                className="gap-1 lg:gap-2 px-2 lg:px-3"
              >
                <Eye className="w-4 h-4" />
                <span className="hidden sm:inline">Overview</span>
              </Button>
              <Button
                variant={viewType === 'detailed' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewType('detailed')}
                className="gap-1 lg:gap-2 px-2 lg:px-3"
              >
                <BarChart3 className="w-4 h-4" />
                <span className="hidden sm:inline">Detailed</span>
              </Button>
              <Button
                variant={viewType === 'comparison' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewType('comparison')}
                className="gap-1 lg:gap-2 px-2 lg:px-3"
              >
                <TrendingUp className="w-4 h-4" />
                <span className="hidden sm:inline">Compare</span>
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Filters Section */}
      <Card className="border-2 border-purple-200 bg-gradient-to-r from-purple-50/50 to-blue-50/50 shadow-lg">
        <CardHeader className="pb-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="space-y-1">
              <CardTitle className="flex items-center gap-3 text-lg lg:text-xl">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <Filter className="w-4 lg:w-5 h-4 lg:h-5 text-purple-600" />
                </div>
                Analytics Filters
              </CardTitle>
              <CardDescription className="text-sm lg:text-base text-gray-600">
                Configure your analytics view and select data parameters
              </CardDescription>
            </div>
            <Badge variant="outline" className="gap-2 bg-white/80 text-purple-700 border-purple-200 px-3 lg:px-4 py-1 lg:py-2 text-xs lg:text-sm">
              <Activity className="w-3 lg:w-4 h-3 lg:h-4" />
              {sessions.length} Sessions Analyzed
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* User Selection */}
            <div className="space-y-3">
              <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                <Users className="w-4 h-4" />
                Select Team Members
              </label>
              <Select
                value={selectedUserOptions}
                onChange={(options) => setSelectedUsers(options ? options.map(opt => opt.value) : [])}
                options={userOptions}
                components={{
                  Option: CustomOption,
                  MultiValue: CustomMultiValue
                }}
                styles={customStyles}
                placeholder="Choose team members to analyze..."
                isSearchable
                isMulti
                className="react-select-container"
                classNamePrefix="react-select"
                noOptionsMessage={() => "No users found"}
                closeMenuOnSelect={false}
              />
            </div>

            {/* Date Range Selection */}
            <div className="space-y-3">
              <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                <CalendarIcon className="w-4 h-4" />
                Date Range
              </label>
              <Select
                value={{ value: dateRange.label, label: dateRange.label }}
                onChange={handleDateRangeChange}
                options={dateRangeOptions.map(range => ({ value: range.value, label: range.label }))}
                styles={customStyles}
                placeholder="Select date range..."
                isSearchable={false}
                className="react-select-container"
                classNamePrefix="react-select"
              />
            </div>
          </div>

          {/* Export Options */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pt-4 border-t border-purple-200/50">
            <div className="space-y-1">
              <h4 className="text-sm font-semibold text-gray-700">Export Reports</h4>
              <p className="text-xs text-gray-600">Download analytics data in various formats</p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => exportReport('pdf')}
                className="gap-2"
                disabled={sessions.length === 0}
              >
                <FileText className="w-4 h-4" />
                PDF
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => exportReport('csv')}
                className="gap-2"
                disabled={sessions.length === 0}
              >
                <Download className="w-4 h-4" />
                CSV
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => exportReport('excel')}
                className="gap-2"
                disabled={sessions.length === 0}
              >
                <FileText className="w-4 h-4" />
                Excel
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Analytics Content */}
      {sessions.length === 0 ? (
        <Card className="border-2 border-gray-200">
          <CardContent className="p-12">
            <div className="text-center space-y-4">
              <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto">
                <BarChart3 className="w-8 h-8 text-gray-400" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">No Data Available</h3>
                <p className="text-gray-600">
                  Select team members and a date range to view analytics data
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Overview Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 lg:gap-4">
            <Card className="border-2 border-blue-200 bg-gradient-to-br from-blue-50 to-blue-100 shadow-sm">
              <CardContent className="p-3 lg:p-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <p className="text-xs lg:text-sm font-medium text-blue-700">Total Hours</p>
                    <p className="text-lg lg:text-2xl font-bold text-blue-900">
                      {Math.round(overallMetrics.totalHours)}h
                    </p>
                  </div>
                  <div className="p-2 lg:p-3 bg-blue-200 rounded-xl">
                    <Clock className="w-4 lg:w-6 h-4 lg:h-6 text-blue-700" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-2 border-green-200 bg-gradient-to-br from-green-50 to-green-100 shadow-sm">
              <CardContent className="p-3 lg:p-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <p className="text-xs lg:text-sm font-medium text-green-700">Productivity</p>
                    <p className="text-lg lg:text-2xl font-bold text-green-900">
                      {overallMetrics.productivityRate}%
                    </p>
                  </div>
                  <div className="p-2 lg:p-3 bg-green-200 rounded-xl">
                    <TrendingUp className="w-4 lg:w-6 h-4 lg:h-6 text-green-700" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-2 border-purple-200 bg-gradient-to-br from-purple-50 to-purple-100 shadow-sm">
              <CardContent className="p-3 lg:p-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <p className="text-xs lg:text-sm font-medium text-purple-700">Sessions</p>
                    <p className="text-lg lg:text-2xl font-bold text-purple-900">
                      {overallMetrics.totalSessions}
                    </p>
                  </div>
                  <div className="p-2 lg:p-3 bg-purple-200 rounded-xl">
                    <Activity className="w-4 lg:w-6 h-4 lg:h-6 text-purple-700" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-2 border-yellow-200 bg-gradient-to-br from-yellow-50 to-yellow-100 shadow-sm">
              <CardContent className="p-3 lg:p-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <p className="text-xs lg:text-sm font-medium text-yellow-700">Avg Daily</p>
                    <p className="text-lg lg:text-2xl font-bold text-yellow-900">
                      {Math.round(overallMetrics.averageDailyHours * 10) / 10}h
                    </p>
                  </div>
                  <div className="p-2 lg:p-3 bg-yellow-200 rounded-xl">
                    <Target className="w-4 lg:w-6 h-4 lg:h-6 text-yellow-700" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-2 border-emerald-200 bg-gradient-to-br from-emerald-50 to-emerald-100 shadow-sm">
              <CardContent className="p-3 lg:p-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <p className="text-xs lg:text-sm font-medium text-emerald-700">Approved</p>
                    <p className="text-lg lg:text-2xl font-bold text-emerald-900">
                      {overallMetrics.approvedSessions}
                    </p>
                  </div>
                  <div className="p-2 lg:p-3 bg-emerald-200 rounded-xl">
                    <CheckCircle className="w-4 lg:w-6 h-4 lg:h-6 text-emerald-700" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-2 border-orange-200 bg-gradient-to-br from-orange-50 to-orange-100 shadow-sm">
              <CardContent className="p-3 lg:p-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <p className="text-xs lg:text-sm font-medium text-orange-700">Idle Time</p>
                    <p className="text-lg lg:text-2xl font-bold text-orange-900">
                      {Math.round(overallMetrics.idleHours)}h
                    </p>
                  </div>
                  <div className="p-2 lg:p-3 bg-orange-200 rounded-xl">
                    <AlertTriangle className="w-4 lg:w-6 h-4 lg:h-6 text-orange-700" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Weekly Comparison */}
          {weeklyComparison && (
            <Card className="border-2 border-indigo-200 bg-gradient-to-r from-indigo-50/50 to-purple-50/50 shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-3 text-xl">
                  <div className="p-2 bg-indigo-100 rounded-lg">
                    <TrendingUp className="w-5 h-5 text-indigo-600" />
                  </div>
                  Weekly Performance Comparison
                </CardTitle>
                <CardDescription>
                  Compare current week performance with previous week
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-600">Total Hours</span>
                      <div className="flex items-center gap-2">
                        {getChangeIcon(weeklyComparison.change.totalHours)}
                        <span className={cn("text-sm font-semibold", getChangeColor(weeklyComparison.change.totalHours))}>
                          {Math.abs(weeklyComparison.change.totalHours).toFixed(1)}%
                        </span>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Current Week</span>
                        <span className="font-semibold">{Math.round(weeklyComparison.currentWeek.totalHours)}h</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Previous Week</span>
                        <span className="font-semibold">{Math.round(weeklyComparison.previousWeek.totalHours)}h</span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-600">Productivity Rate</span>
                      <div className="flex items-center gap-2">
                        {getChangeIcon(weeklyComparison.change.productivityRate)}
                        <span className={cn("text-sm font-semibold", getChangeColor(weeklyComparison.change.productivityRate))}>
                          {Math.abs(weeklyComparison.change.productivityRate).toFixed(1)}%
                        </span>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Current Week</span>
                        <span className="font-semibold">{weeklyComparison.currentWeek.productivityRate}%</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Previous Week</span>
                        <span className="font-semibold">{weeklyComparison.previousWeek.productivityRate}%</span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-600">Sessions</span>
                      <div className="flex items-center gap-2">
                        {getChangeIcon(weeklyComparison.change.sessions)}
                        <span className={cn("text-sm font-semibold", getChangeColor(weeklyComparison.change.sessions))}>
                          {Math.abs(weeklyComparison.change.sessions).toFixed(1)}%
                        </span>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Current Week</span>
                        <span className="font-semibold">{weeklyComparison.currentWeek.totalSessions}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Previous Week</span>
                        <span className="font-semibold">{weeklyComparison.previousWeek.totalSessions}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Top Performers */}
          {topPerformers.length > 0 && (
            <Card className="border-2 border-amber-200 bg-gradient-to-r from-amber-50/50 to-yellow-50/50 shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-3 text-xl">
                  <div className="p-2 bg-amber-100 rounded-lg">
                    <Award className="w-5 h-5 text-amber-600" />
                  </div>
                  Top Performers
                </CardTitle>
                <CardDescription>
                  Highest productivity rates in the selected period
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {topPerformers.map((performer, index) => (
                    <div key={performer.user.id} className="flex items-center justify-between p-4 bg-white rounded-lg border border-amber-200/50">
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-3">
                          <div className={cn(
                            "w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold",
                            index === 0 ? "bg-yellow-500 text-white" :
                            index === 1 ? "bg-gray-400 text-white" :
                            index === 2 ? "bg-amber-600 text-white" :
                            "bg-gray-200 text-gray-600"
                          )}>
                            {index + 1}
                          </div>
                          <Avatar className="h-10 w-10">
                            <AvatarImage src={performer.user.photoURL} alt={performer.user.fullName} />
                            <AvatarFallback className="text-sm">
                              {performer.user.fullName?.slice(0, 2).toUpperCase() || performer.user.email?.slice(0, 2).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900">{performer.user.fullName}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge variant="outline" className="text-xs">
                              {getRoleIcon(performer.user.role)}
                              <span className="ml-1 capitalize">{performer.user.role}</span>
                            </Badge>
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold text-amber-600">{performer.productivityRate}%</p>
                        <p className="text-sm text-gray-600">{Math.round(performer.totalHours)}h • {performer.sessions} sessions</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Daily Productivity Chart Placeholder */}
          <Card className="border-2 border-gray-200 shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-3 text-xl">
                <div className="p-2 bg-gray-100 rounded-lg">
                  <LineChart className="w-5 h-5 text-gray-600" />
                </div>
                Daily Productivity Trends
              </CardTitle>
              <CardDescription>
                Track productivity patterns over time
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-64 flex items-center justify-center bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                <div className="text-center space-y-2">
                  <LineChart className="w-12 h-12 text-gray-400 mx-auto" />
                  <p className="text-gray-600 font-medium">Interactive Chart Coming Soon</p>
                  <p className="text-sm text-gray-500">Daily productivity visualization will be displayed here</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Detailed Breakdown */}
          {viewType === 'detailed' && (
            <Card className="border-2 border-gray-200 shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-3 text-xl">
                  <div className="p-2 bg-gray-100 rounded-lg">
                    <PieChart className="w-5 h-5 text-gray-600" />
                  </div>
                  Detailed Breakdown
                </CardTitle>
                <CardDescription>
                  Comprehensive analysis of time allocation and productivity metrics
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  <div className="space-y-4">
                    <h4 className="font-semibold text-gray-900">Time Distribution</h4>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">Active Time</span>
                        <span className="font-semibold text-green-600">
                          {Math.round(overallMetrics.activeHours)}h ({Math.round((overallMetrics.activeHours / overallMetrics.totalHours) * 100)}%)
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">Idle Time</span>
                        <span className="font-semibold text-orange-600">
                          {Math.round(overallMetrics.idleHours)}h ({Math.round((overallMetrics.idleHours / overallMetrics.totalHours) * 100)}%)
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h4 className="font-semibold text-gray-900">Session Status</h4>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">Approved</span>
                        <span className="font-semibold text-green-600">
                          {overallMetrics.approvedSessions} ({Math.round((overallMetrics.approvedSessions / overallMetrics.totalSessions) * 100)}%)
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">Pending</span>
                        <span className="font-semibold text-yellow-600">
                          {overallMetrics.pendingSessions} ({Math.round((overallMetrics.pendingSessions / overallMetrics.totalSessions) * 100)}%)
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">Rejected</span>
                        <span className="font-semibold text-red-600">
                          {overallMetrics.rejectedSessions} ({Math.round((overallMetrics.rejectedSessions / overallMetrics.totalSessions) * 100)}%)
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h4 className="font-semibold text-gray-900">Performance Metrics</h4>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">Avg Session Length</span>
                        <span className="font-semibold text-blue-600">
                          {Math.round((overallMetrics.totalHours / overallMetrics.totalSessions) * 10) / 10}h
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">Daily Average</span>
                        <span className="font-semibold text-purple-600">
                          {Math.round(overallMetrics.averageDailyHours * 10) / 10}h
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">Productivity Score</span>
                        <span className={cn(
                          "font-semibold",
                          overallMetrics.productivityRate >= 80 ? "text-green-600" :
                          overallMetrics.productivityRate >= 60 ? "text-yellow-600" : "text-red-600"
                        )}>
                          {overallMetrics.productivityRate}%
                        </span>
                      </div>
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