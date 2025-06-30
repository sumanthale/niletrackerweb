import React from 'react';
import { TimeSession } from '../../types';
import { Card, CardContent } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { formatTime, formatDuration, getStatusColor, formatDate } from '../../lib/utils';
import { Clock, Camera, MessageSquare, Timer } from 'lucide-react';

interface WeeklyCalendarViewProps {
  sessions: TimeSession[];
  weekStart: Date;
  onSessionClick: (session: TimeSession) => void;
}

export function WeeklyCalendarView({ sessions, weekStart, onSessionClick }: WeeklyCalendarViewProps) {
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  
  const getDateForDay = (dayIndex: number) => {
    const date = new Date(weekStart);
    date.setDate(date.getDate() + dayIndex);
    return date;
  };

  const getSessionsForDay = (dayIndex: number) => {
    const dayDate = getDateForDay(dayIndex);
    const dayDateString = dayDate.toISOString().split('T')[0]; // Format: YYYY-MM-DD
    
    return sessions.filter(session => session.date === dayDateString);
  };

  const getStatusBorderColor = (status: string) => {
    switch (status) {
      case 'approved':
        return '#10B981'; // green-500
      case 'disapproved':
        return '#EF4444'; // red-500
      case 'submitted':
      default:
        return '#F59E0B'; // amber-500
    }
  };

  const isToday = (date: Date) => {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  return (
    <Card>
      <CardContent className="p-6">
        <div className="grid grid-cols-1 lg:grid-cols-7 gap-4">
          {days.map((day, index) => {
            const dayDate = getDateForDay(index);
            const daySessions = getSessionsForDay(index);
            const todayFlag = isToday(dayDate);
            
            return (
              <div key={day} className="space-y-3">
                {/* Fixed Height Day Header */}
                <div className={`relative text-center p-4 rounded-xl transition-all border-2 ${
                  todayFlag 
                    ? 'bg-gradient-to-br from-blue-50 to-blue-100 border-blue-300 shadow-sm' 
                    : 'bg-gradient-to-br from-gray-50 to-gray-100 border-gray-200'
                } h-24 flex flex-col justify-center`}>
                  <p className={`text-sm font-medium mb-1 ${
                    todayFlag ? 'text-blue-700' : 'text-gray-600'
                  }`}>
                    {day}
                  </p>
                  <p className={`text-2xl font-bold ${
                    todayFlag ? 'text-blue-900' : 'text-gray-900'
                  }`}>
                    {dayDate.getDate()}
                  </p>
                  {/* Today Badge - Positioned Absolutely */}
                  {todayFlag && (
                    <div className="absolute -top-2 -right-2">
                      <Badge className="bg-blue-600 text-white text-xs px-2 py-1 shadow-md border-2 border-white">
                        Today
                      </Badge>
                    </div>
                  )}
                </div>

                {/* Sessions Container - Fixed Height */}
                <div className="space-y-3 min-h-[400px]">
                  {daySessions.length === 0 ? (
                    <div className="text-center py-8">
                      <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                        <Clock className="w-6 h-6 text-gray-400" />
                      </div>
                      <p className="text-sm text-gray-500 font-medium">No sessions</p>
                      <p className="text-xs text-gray-400 mt-1">No work recorded</p>
                    </div>
                  ) : (
                    daySessions.map((session) => (
                      <Card
                        key={session.id}
                        className="cursor-pointer hover:shadow-lg transition-all duration-200 border-l-4 hover:scale-[1.02] bg-white"
                        style={{
                          borderLeftColor: getStatusBorderColor(session.status)
                        }}
                        onClick={() => onSessionClick(session)}
                      >
                        <CardContent className="p-4 space-y-3">
                          {/* Header with status and time */}
                          <div className="flex items-center justify-between">
                            <Badge 
                              className={`${getStatusColor(session.status)} text-xs font-medium`}
                            >
                              {session.status}
                            </Badge>
                            <div className="flex items-center gap-1 text-xs text-gray-500 bg-gray-50 px-2 py-1 rounded-md">
                              <Timer className="w-3 h-3" />
                              <span className="font-medium">{formatTime(session.clockIn)}</span>
                            </div>
                          </div>
                          
                          {/* Duration info */}
                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="text-xs text-gray-500">Total Duration</span>
                              <span className="text-sm font-semibold text-gray-900">
                                {formatDuration(session.totalMinutes)}
                              </span>
                            </div>
                            
                            {session.idleMinutes > 0 && (
                              <div className="flex items-center justify-between">
                                <span className="text-xs text-gray-500">Idle Time</span>
                                <span className="text-sm text-amber-600 font-medium">
                                  {formatDuration(session.idleMinutes)}
                                </span>
                              </div>
                            )}
                          </div>
                          
                          {/* Activity indicators */}
                          <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                            <div className="flex items-center gap-3">
                              {session.screenshots.length > 0 && (
                                <div className="flex items-center gap-1">
                                  <Camera className="w-3 h-3 text-blue-500" />
                                  <span className="text-xs text-gray-600 font-medium">
                                    {session.screenshots.length}
                                  </span>
                                </div>
                              )}
                              
                              {session.lessHoursComment && (
                                <div className="flex items-center gap-1">
                                  <MessageSquare className="w-3 h-3 text-green-500" />
                                  <span className="text-xs text-gray-600">Note</span>
                                </div>
                              )}
                            </div>
                            
                            {/* Active time indicator */}
                            <div className="flex items-center gap-1">
                              <div className={`w-2 h-2 rounded-full ${
                                session.totalMinutes > 0 && ((session.totalMinutes - session.idleMinutes) / session.totalMinutes) > 0.8
                                  ? 'bg-green-500' 
                                  : ((session.totalMinutes - session.idleMinutes) / session.totalMinutes) > 0.6
                                  ? 'bg-yellow-500'
                                  : 'bg-red-500'
                              }`} />
                              <span className="text-xs text-gray-500 font-medium">
                                Active: {formatDuration(session.totalMinutes - session.idleMinutes)}
                              </span>
                            </div>
                          </div>
                          
                          {/* Comment preview */}
                          {session.lessHoursComment && (
                            <div className="pt-2 border-t border-gray-100">
                              <p className="text-xs text-gray-600 line-clamp-2 italic bg-gray-50 p-2 rounded">
                                "{session.lessHoursComment.length > 60 
                                  ? session.lessHoursComment.substring(0, 60) + '...' 
                                  : session.lessHoursComment}"
                              </p>
                            </div>
                          )}

                          {/* Clock out time if available */}
                          {session.clockOut && (
                            <div className="pt-2 border-t border-gray-100">
                              <div className="flex items-center justify-between text-xs text-gray-500">
                                <span>Clock Out:</span>
                                <span className="font-medium">{formatTime(session.clockOut)}</span>
                              </div>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}