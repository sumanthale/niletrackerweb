export interface User {
  id: string;
  uid: string;
  email: string;
  fullName: string;
  role: 'admin' | 'manager' | 'employee';
  managerId?: string;
  createdAt: Date;
  lastLogin?: Date;
  updatedAt?: Date;
  photoURL?: string;
  isActive?: boolean; // For access control
}

export interface TimeSession {
  id: string;
  userId: string;
  userName?: string;
  userEmail?: string;
  date: string; // Format: 'YYYY-MM-DD'
  clockIn: string; // ISO string
  clockOut?: string; // ISO string
  totalMinutes: number;
  idleMinutes: number;
  productiveHours: number;
  screenshots: Screenshot[];
  status: 'submitted' | 'approved' | 'disapproved';
  approvalStatus: string;
  lessHoursComment?: string;
  managerComment?: string;
  managerId?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Screenshot {
  id: string;
  timestamp: string; // ISO string
  image: string; // URL to image
}

export interface IdleEvent {
  id: string;
  startTime: Date;
  endTime: Date;
  duration: number; // in minutes
  reason: string;
}

export interface ActivityLog {
  id: string;
  adminId: string;
  adminEmail: string;
  action: string;
  targetUserId?: string;
  targetUserEmail?: string;
  details: string;
  timestamp: Date;
}

export interface WeeklyStats {
  totalHours: number;
  idleHours: number;
  approvedSessions: number;
  pendingSessions: number;
  disapprovedSessions: number;
}