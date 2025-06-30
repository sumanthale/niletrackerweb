import React, { useState } from 'react';
import { TimeSession } from '../../types';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { Card, CardContent } from '../ui/Card';
import { Separator } from '../ui/Separator';
import { 
  Clock, 
  Camera, 
  MessageSquare, 
  CheckCircle, 
  XCircle,
  Eye,
  User,
  Calendar,
  Timer,
  AlertTriangle,
  Activity,
  Target,
  TrendingUp,
  BarChart3,
  FileText,
  Zap,
  PlayCircle,
  PauseCircle,
  X
} from 'lucide-react';
import { formatDuration, formatTime, formatDate, getStatusColor } from '../../lib/utils';
import toast from 'react-hot-toast';

interface SessionDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  session: TimeSession;
  onSessionUpdate: (sessionId: string, updates: Partial<TimeSession>) => Promise<void>;
}

export function SessionDetailsModal({ 
  isOpen, 
  onClose, 
  session, 
  onSessionUpdate 
}: SessionDetailsModalProps) {
  const [approving, setApproving] = useState(false);
  const [disapproving, setDisapproving] = useState(false);
  const [showDisapprovalForm, setShowDisapprovalForm] = useState(false);
  const [disapprovalReason, setDisapprovalReason] = useState('');
  const [selectedScreenshot, setSelectedScreenshot] = useState<string | null>(null);

  // Calculate productivity metrics based on 40-hour work week (8 hours per day)
  const calculateProductivityMetrics = () => {
    const expectedDailyMinutes = 8 * 60; // 8 hours = 480 minutes
    const activeMinutes = session.totalMinutes - session.idleMinutes;
    
    // Productivity percentage based on active time vs total time
    const sessionProductivity = session.totalMinutes > 0 ? Math.round((activeMinutes / session.totalMinutes) * 100) : 0;
    
    // Daily target achievement (how much of the 8-hour day was completed)
    const dailyTargetAchievement = Math.round((session.totalMinutes / expectedDailyMinutes) * 100);
    
    // Efficiency score (active time vs expected daily time)
    const efficiencyScore = Math.round((activeMinutes / expectedDailyMinutes) * 100);
    
    // Performance rating
    let performanceRating = 'Poor';
    let performanceColor = 'text-red-600 bg-red-50 border-red-200';
    
    if (sessionProductivity >= 90 && dailyTargetAchievement >= 80) {
      performanceRating = 'Excellent';
      performanceColor = 'text-green-600 bg-green-50 border-green-200';
    } else if (sessionProductivity >= 80 && dailyTargetAchievement >= 70) {
      performanceRating = 'Good';
      performanceColor = 'text-blue-600 bg-blue-50 border-blue-200';
    } else if (sessionProductivity >= 70 && dailyTargetAchievement >= 60) {
      performanceRating = 'Average';
      performanceColor = 'text-yellow-600 bg-yellow-50 border-yellow-200';
    } else if (sessionProductivity >= 60 || dailyTargetAchievement >= 50) {
      performanceRating = 'Below Average';
      performanceColor = 'text-orange-600 bg-orange-50 border-orange-200';
    }

    return {
      activeMinutes,
      sessionProductivity,
      dailyTargetAchievement,
      efficiencyScore,
      performanceRating,
      performanceColor,
      expectedDailyMinutes
    };
  };

  const handleApprove = async () => {
    setApproving(true);
    try {
      await onSessionUpdate(session.id, {
        status: 'approved',
        approvalStatus: 'approved',
        managerComment: null
      });

      toast.success('Session approved successfully');
      onClose();
    } catch (error) {
      console.error('Error approving session:', error);
      toast.error('Failed to approve session');
    } finally {
      setApproving(false);
    }
  };

  const handleDisapprove = async () => {
    if (!disapprovalReason.trim()) {
      toast.error('Please provide a reason for disapproval');
      return;
    }

    setDisapproving(true);
    try {
      await onSessionUpdate(session.id, {
        status: 'disapproved',
        approvalStatus: 'disapproved',
        managerComment: disapprovalReason
      });

      toast.success('Session disapproved');
      onClose();
    } catch (error) {
      console.error('Error disapproving session:', error);
      toast.error('Failed to disapprove session');
    } finally {
      setDisapproving(false);
      setShowDisapprovalForm(false);
      setDisapprovalReason('');
    }
  };

  const handleScreenshotClick = (url: string) => {
    setSelectedScreenshot(url);
  };

  const metrics = calculateProductivityMetrics();

  return (
    <>
      <Modal isOpen={isOpen} onClose={onClose} title="Session Details" size="xl">
        <div className="space-y-8">
          {/* Enhanced Session Header */}
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 border border-blue-200/50">
            <div className="absolute inset-0 bg-grid-pattern opacity-5"></div>
            <div className="relative p-8">
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
                <div className="flex items-center space-x-6">
                  <div className="relative">
                    <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg">
                      <User className="w-8 h-8 text-white" />
                    </div>
                    <div className="absolute -bottom-2 -right-2">
                      <Badge className={`${getStatusColor(session.status)} border-2 border-white shadow-sm`}>
                        {session.status}
                      </Badge>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-2xl font-bold text-gray-900">{session.userName || 'Unknown User'}</h3>
                    <p className="text-gray-600 flex items-center gap-2">
                      <User className="w-4 h-4" />
                      {session.userEmail || 'No email'}
                    </p>
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-gray-500" />
                      <span className="text-sm font-medium text-gray-700">{formatDate(session.date)}</span>
                    </div>
                  </div>
                </div>
                
                <div className="flex flex-col items-end space-y-3">
                  <Badge className={`${metrics.performanceColor} border text-lg px-4 py-2 font-semibold`}>
                    {metrics.performanceRating}
                  </Badge>
                  <div className="text-right">
                    <p className="text-sm text-gray-600">Session Productivity</p>
                    <p className="text-3xl font-bold text-gray-900">{metrics.sessionProductivity}%</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Enhanced Productivity Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card className="border-2 border-blue-200 bg-blue-50/50">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-blue-700">Total Duration</p>
                    <p className="text-2xl font-bold text-blue-900">{formatDuration(session.totalMinutes)}</p>
                    <p className="text-xs text-blue-600">
                      Target: {formatDuration(metrics.expectedDailyMinutes)}
                    </p>
                  </div>
                  <div className="p-3 bg-blue-100 rounded-xl">
                    <Clock className="w-6 h-6 text-blue-600" />
                  </div>
                </div>
                <div className="mt-4">
                  <div className="flex justify-between text-xs text-blue-700 mb-1">
                    <span>Daily Target</span>
                    <span>{metrics.dailyTargetAchievement}%</span>
                  </div>
                  <div className="w-full bg-blue-200 rounded-full h-2">
                    <div 
                      className="bg-blue-600 h-2 rounded-full transition-all duration-500"
                      style={{ width: `${Math.min(metrics.dailyTargetAchievement, 100)}%` }}
                    ></div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-2 border-green-200 bg-green-50/50">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-green-700">Active Time</p>
                    <p className="text-2xl font-bold text-green-900">{formatDuration(metrics.activeMinutes)}</p>
                    <p className="text-xs text-green-600">
                      {metrics.sessionProductivity}% of session
                    </p>
                  </div>
                  <div className="p-3 bg-green-100 rounded-xl">
                    <Zap className="w-6 h-6 text-green-600" />
                  </div>
                </div>
                <div className="mt-4">
                  <div className="flex justify-between text-xs text-green-700 mb-1">
                    <span>Efficiency</span>
                    <span>{metrics.efficiencyScore}%</span>
                  </div>
                  <div className="w-full bg-green-200 rounded-full h-2">
                    <div 
                      className="bg-green-600 h-2 rounded-full transition-all duration-500"
                      style={{ width: `${Math.min(metrics.efficiencyScore, 100)}%` }}
                    ></div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-2 border-orange-200 bg-orange-50/50">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-orange-700">Idle Time</p>
                    <p className="text-2xl font-bold text-orange-900">{formatDuration(session.idleMinutes)}</p>
                    <p className="text-xs text-orange-600">
                      {session.totalMinutes > 0 ? Math.round((session.idleMinutes / session.totalMinutes) * 100) : 0}% of session
                    </p>
                  </div>
                  <div className="p-3 bg-orange-100 rounded-xl">
                    <PauseCircle className="w-6 h-6 text-orange-600" />
                  </div>
                </div>
                <div className="mt-4">
                  <div className="flex justify-between text-xs text-orange-700 mb-1">
                    <span>Idle Rate</span>
                    <span>{session.totalMinutes > 0 ? Math.round((session.idleMinutes / session.totalMinutes) * 100) : 0}%</span>
                  </div>
                  <div className="w-full bg-orange-200 rounded-full h-2">
                    <div 
                      className="bg-orange-600 h-2 rounded-full transition-all duration-500"
                      style={{ width: `${session.totalMinutes > 0 ? Math.min((session.idleMinutes / session.totalMinutes) * 100, 100) : 0}%` }}
                    ></div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-2 border-purple-200 bg-purple-50/50">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-purple-700">Screenshots</p>
                    <p className="text-2xl font-bold text-purple-900">{session.screenshots.length}</p>
                    <p className="text-xs text-purple-600">
                      {session.totalMinutes > 0 ? Math.round(session.screenshots.length / (session.totalMinutes / 60)) : 0} per hour
                    </p>
                  </div>
                  <div className="p-3 bg-purple-100 rounded-xl">
                    <Camera className="w-6 h-6 text-purple-600" />
                  </div>
                </div>
                <div className="mt-4">
                  <div className="flex justify-between text-xs text-purple-700 mb-1">
                    <span>Coverage</span>
                    <span>{session.screenshots.length > 0 ? 'Good' : 'None'}</span>
                  </div>
                  <div className="w-full bg-purple-200 rounded-full h-2">
                    <div 
                      className="bg-purple-600 h-2 rounded-full transition-all duration-500"
                      style={{ width: `${Math.min((session.screenshots.length / Math.max(session.totalMinutes / 10, 1)) * 100, 100)}%` }}
                    ></div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Time Details */}
          <Card className="border-2">
            <CardContent className="p-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Timer className="w-5 h-5 text-blue-600" />
                </div>
                <h4 className="text-xl font-bold text-gray-900">Time Details</h4>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-6">
                  <div className="flex items-center justify-between p-4 bg-green-50 rounded-xl border border-green-200">
                    <div className="flex items-center gap-3">
                      <PlayCircle className="w-5 h-5 text-green-600" />
                      <span className="font-medium text-green-900">Clock In</span>
                    </div>
                    <span className="text-lg font-bold text-green-900">{formatTime(session.clockIn)}</span>
                  </div>

                  {session.clockOut && (
                    <div className="flex items-center justify-between p-4 bg-red-50 rounded-xl border border-red-200">
                      <div className="flex items-center gap-3">
                        <PauseCircle className="w-5 h-5 text-red-600" />
                        <span className="font-medium text-red-900">Clock Out</span>
                      </div>
                      <span className="text-lg font-bold text-red-900">{formatTime(session.clockOut)}</span>
                    </div>
                  )}
                </div>

                <div className="space-y-4">
                  <div className="p-4 bg-gray-50 rounded-xl">
                    <h5 className="font-semibold text-gray-900 mb-3">Performance Summary</h5>
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Daily Target Achievement:</span>
                        <span className="font-semibold">{metrics.dailyTargetAchievement}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Session Productivity:</span>
                        <span className="font-semibold">{metrics.sessionProductivity}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Efficiency Score:</span>
                        <span className="font-semibold">{metrics.efficiencyScore}%</span>
                      </div>
                      <Separator />
                      <div className="flex justify-between">
                        <span className="text-gray-600">Overall Rating:</span>
                        <Badge className={`${metrics.performanceColor} border`}>
                          {metrics.performanceRating}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Comments Section */}
          {(session.lessHoursComment || session.managerComment) && (
            <div className="space-y-6">
              {session.lessHoursComment && (
                <Card className="border-2 border-blue-200">
                  <CardContent className="p-6">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="p-2 bg-blue-100 rounded-lg">
                        <MessageSquare className="w-5 h-5 text-blue-600" />
                      </div>
                      <h4 className="text-lg font-bold text-gray-900">Employee Comment</h4>
                    </div>
                    <div className="bg-blue-50 rounded-xl p-4 border border-blue-200">
                      <p className="text-gray-800 leading-relaxed">{session.lessHoursComment}</p>
                    </div>
                  </CardContent>
                </Card>
              )}

              {session.managerComment && (
                <Card className="border-2 border-red-200">
                  <CardContent className="p-6">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="p-2 bg-red-100 rounded-lg">
                        <AlertTriangle className="w-5 h-5 text-red-600" />
                      </div>
                      <h4 className="text-lg font-bold text-gray-900">Manager Feedback</h4>
                    </div>
                    <div className="bg-red-50 rounded-xl p-4 border border-red-200">
                      <p className="text-red-800 leading-relaxed">{session.managerComment}</p>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          {/* Screenshots Gallery */}
          {session.screenshots.length > 0 && (
            <Card className="border-2">
              <CardContent className="p-8">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-purple-100 rounded-lg">
                      <Camera className="w-5 h-5 text-purple-600" />
                    </div>
                    <h4 className="text-xl font-bold text-gray-900">
                      Screenshots ({session.screenshots.length})
                    </h4>
                  </div>
                  <Badge variant="outline" className="gap-1">
                    <Activity className="w-3 h-3" />
                    {Math.round(session.screenshots.length / Math.max(session.totalMinutes / 60, 1))} per hour
                  </Badge>
                </div>
                
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
                  {session.screenshots.map((screenshot) => (
                    <div
                      key={screenshot.id}
                      className="relative group cursor-pointer transform transition-all duration-200 hover:scale-105"
                      onClick={() => handleScreenshotClick(screenshot.image)}
                    >
                      <div className="relative overflow-hidden rounded-xl border-2 border-gray-200 group-hover:border-blue-300 shadow-sm group-hover:shadow-lg">
                        <img
                          src={screenshot.image}
                          alt={`Screenshot at ${formatTime(screenshot.timestamp)}`}
                          className="w-full h-24 object-cover transition-all group-hover:brightness-110"
                        />
                        <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all flex items-center justify-center">
                          <Eye className="w-6 h-6 text-white opacity-0 group-hover:opacity-100 transition-all transform scale-75 group-hover:scale-100" />
                        </div>
                        <div className="absolute bottom-1 left-1 bg-black bg-opacity-75 text-white text-xs px-2 py-1 rounded-md">
                          {formatTime(screenshot.timestamp)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Enhanced Approval Actions */}
          {session.status === 'submitted' && (
            <Card className="border-2 border-gray-200 bg-gray-50/50">
              <CardContent className="p-8">
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-2 bg-gray-100 rounded-lg">
                    <FileText className="w-5 h-5 text-gray-600" />
                  </div>
                  <h4 className="text-xl font-bold text-gray-900">Review & Approval</h4>
                </div>

                {!showDisapprovalForm ? (
                  <div className="flex flex-col sm:flex-row justify-end gap-4">
                    <Button
                      variant="outline"
                      onClick={() => setShowDisapprovalForm(true)}
                      className="text-red-600 border-red-300 hover:bg-red-50 hover:border-red-400 transition-all duration-200 px-8 py-3"
                      size="lg"
                    >
                      <XCircle className="w-5 h-5 mr-2" />
                      Disapprove Session
                    </Button>
                    <Button
                      onClick={handleApprove}
                      disabled={approving}
                      className="bg-green-600 hover:bg-green-700 transition-all duration-200 px-8 py-3 shadow-lg hover:shadow-xl"
                      size="lg"
                    >
                      <CheckCircle className="w-5 h-5 mr-2" />
                      {approving ? 'Approving...' : 'Approve Session'}
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-6">
                    <div className="space-y-3">
                      <label className="block text-sm font-semibold text-gray-900">
                        Reason for Disapproval
                      </label>
                      <textarea
                        value={disapprovalReason}
                        onChange={(e) => setDisapprovalReason(e.target.value)}
                        className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl resize-none focus:border-red-400 focus:ring-2 focus:ring-red-100 transition-all"
                        rows={4}
                        placeholder="Please provide a detailed reason for disapproving this session..."
                      />
                    </div>
                    <div className="flex flex-col sm:flex-row justify-end gap-4">
                      <Button
                        variant="outline"
                        onClick={() => {
                          setShowDisapprovalForm(false);
                          setDisapprovalReason('');
                        }}
                        className="px-8 py-3"
                        size="lg"
                      >
                        Cancel
                      </Button>
                      <Button
                        onClick={handleDisapprove}
                        disabled={disapproving || !disapprovalReason.trim()}
                        variant="destructive"
                        className="px-8 py-3 shadow-lg hover:shadow-xl"
                        size="lg"
                      >
                        {disapproving ? 'Disapproving...' : 'Confirm Disapproval'}
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </Modal>

      {/* Enhanced Screenshot Lightbox */}
      {selectedScreenshot && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-95 p-4 backdrop-blur-sm"
          onClick={() => setSelectedScreenshot(null)}
        >
          <div className="relative max-w-6xl max-h-full">
            <img
              src={selectedScreenshot}
              alt="Screenshot"
              className="max-w-full max-h-full object-contain rounded-lg shadow-2xl"
            />
            <button
              onClick={() => setSelectedScreenshot(null)}
              className="absolute top-4 right-4 text-white bg-black bg-opacity-50 rounded-full p-3 hover:bg-opacity-75 transition-all transform hover:scale-110"
            >
              <X className="w-6 h-6" />
            </button>
            <div className="absolute bottom-4 left-4 bg-black bg-opacity-75 text-white px-4 py-2 rounded-lg">
              <p className="text-sm">Click anywhere to close</p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}