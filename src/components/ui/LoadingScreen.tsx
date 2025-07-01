import React from 'react';
import { Zap } from 'lucide-react';

export function LoadingScreen() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-25 via-white to-gray-50 flex items-center justify-center">
      <div className="text-center space-y-8 animate-fade-in">
        {/* Logo */}
        <div className="relative">
          <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-600 rounded-3xl flex items-center justify-center mx-auto shadow-strong">
            <Zap className="w-10 h-10 text-white" />
          </div>
          <div className="absolute inset-0 w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-600 rounded-3xl mx-auto animate-ping opacity-20"></div>
        </div>
        
        {/* Loading animation */}
        <div className="relative">
          <div className="w-16 h-16 mx-auto">
            <div className="absolute inset-0 border-4 border-gray-200 rounded-full"></div>
            <div className="absolute inset-0 border-4 border-transparent border-t-blue-500 rounded-full animate-spin"></div>
            <div className="absolute inset-2 border-4 border-transparent border-t-purple-500 rounded-full animate-spin" style={{ animationDirection: 'reverse', animationDuration: '1.5s' }}></div>
          </div>
        </div>
        
        {/* Loading text */}
        <div className="space-y-3">
          <h3 className="text-2xl font-bold text-foreground">Loading TimeTracker</h3>
          <p className="text-muted-foreground max-w-sm mx-auto leading-relaxed">
            Preparing your professional dashboard experience...
          </p>
        </div>
        
        {/* Progress indicators */}
        <div className="flex justify-center space-x-2">
          <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"></div>
          <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
          <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
          <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '0.3s' }}></div>
        </div>
      </div>
    </div>
  );
}