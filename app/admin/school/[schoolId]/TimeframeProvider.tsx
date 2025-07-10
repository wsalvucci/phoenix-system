"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useParams } from 'next/navigation';
import { useSchoolTimeframes } from '@/app/hooks/useAdminQueries';
import { AdminTimeframeData } from '@/types/domain';

interface TimeframeContextType {
  selectedTimeframeId: number | null;
  setSelectedTimeframeId: (id: number | null) => void;
  timeframes: AdminTimeframeData[];
  isLoading: boolean;
  error: any;
  activeTimeframe: AdminTimeframeData | null;
}

const TimeframeContext = createContext<TimeframeContextType | undefined>(undefined);

export function useTimeframe() {
  const context = useContext(TimeframeContext);
  if (context === undefined) {
    throw new Error('useTimeframe must be used within a TimeframeProvider');
  }
  return context;
}

interface TimeframeProviderProps {
  children: ReactNode;
}

export function TimeframeProvider({ children }: TimeframeProviderProps) {
  const params = useParams();
  const schoolId = parseInt(params.schoolId as string);
  
  const [selectedTimeframeId, setSelectedTimeframeId] = useState<number | null>(null);
  
  const { 
    data: timeframes = [], 
    isLoading, 
    error 
  } = useSchoolTimeframes(schoolId);

  // Find the active timeframe
  const activeTimeframe = timeframes.find(t => t.active) || null;

  // Set default selected timeframe to active timeframe on first load
  useEffect(() => {
    if (activeTimeframe && selectedTimeframeId === null) {
      setSelectedTimeframeId(activeTimeframe.id);
    }
  }, [activeTimeframe, selectedTimeframeId]);

  const value: TimeframeContextType = {
    selectedTimeframeId,
    setSelectedTimeframeId,
    timeframes,
    isLoading,
    error,
    activeTimeframe
  };

  return (
    <TimeframeContext.Provider value={value}>
      {children}
    </TimeframeContext.Provider>
  );
}

// Timeframe Dropdown Component
export function TimeframeDropdown() {
  const { 
    selectedTimeframeId, 
    setSelectedTimeframeId, 
    timeframes, 
    isLoading, 
    activeTimeframe 
  } = useTimeframe();

  if (isLoading) {
    return (
      <div className="flex items-center space-x-2">
        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-slate-700 dark:border-slate-300"></div>
        <span className="text-sm text-slate-700 dark:text-slate-300">Loading timeframes...</span>
      </div>
    );
  }

  if (timeframes.length === 0) {
    return (
      <div className="text-sm text-slate-700 dark:text-slate-300">
        No timeframes available
      </div>
    );
  }

  return (
    <div className="flex items-center space-x-3">
      <label htmlFor="timeframe-select" className="text-sm font-medium text-slate-700 dark:text-slate-300">
        Timeframe:
      </label>
      <select
        id="timeframe-select"
        value={selectedTimeframeId || ''}
        onChange={(e) => {
          const value = e.target.value;
          setSelectedTimeframeId(value === '' ? null : parseInt(value));
        }}
        className="px-4 py-2 bg-slate-200 dark:bg-slate-600 border border-slate-400 dark:border-slate-500 rounded-lg text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-slate-500 dark:focus:ring-slate-400 focus:border-transparent transition-colors"
      >
        {timeframes.map((timeframe) => (
          <option key={timeframe.id} value={timeframe.id}>
            {timeframe.name} {timeframe.active ? '(Active)' : ''}
          </option>
        ))}
      </select>
    </div>
  );
} 