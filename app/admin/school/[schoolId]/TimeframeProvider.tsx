"use client";

import { createContext, useContext, useEffect, useState } from 'react';
import { Timeframe } from '@/types/domain';

interface TimeframeContextType {
  timeframes: Timeframe[];
  selectedTimeframe: Timeframe | null;
  setSelectedTimeframe: (timeframe: Timeframe | null) => void;
  isLoading: boolean;
  error: string | null;
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
  children: React.ReactNode;
  schoolId: string;
}

export function TimeframeProvider({ children, schoolId }: TimeframeProviderProps) {
  const [timeframes, setTimeframes] = useState<Timeframe[]>([]);
  const [selectedTimeframe, setSelectedTimeframe] = useState<Timeframe | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchTimeframes = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        const response = await fetch(`/api/admin/schools/${schoolId}/timeframes`);
        if (!response.ok) {
          throw new Error('Failed to fetch timeframes');
        }
        
        const data = await response.json();
        setTimeframes(data.timeframes || []);
        
        // Set the first active timeframe as default, or the first one if none are active
        const activeTimeframe = data.timeframes?.find((tf: Timeframe) => tf.active) || data.timeframes?.[0] || null;
        setSelectedTimeframe(activeTimeframe);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setIsLoading(false);
      }
    };

    fetchTimeframes();
  }, [schoolId]);

  const value: TimeframeContextType = {
    timeframes,
    selectedTimeframe,
    setSelectedTimeframe,
    isLoading,
    error,
  };

  return (
    <TimeframeContext.Provider value={value}>
      {children}
    </TimeframeContext.Provider>
  );
} 