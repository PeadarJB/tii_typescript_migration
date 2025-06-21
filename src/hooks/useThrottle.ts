// src/hooks/useThrottle.ts

import { useState, useEffect, useRef, useCallback } from 'react';

/**
 * Hook that throttles a value
 * @param value - The value to throttle
 * @param delay - The delay in milliseconds
 * @returns The throttled value
 */
export function useThrottle<T>(value: T, delay: number): T {
  const [throttledValue, setThrottledValue] = useState<T>(value);
  const lastRun = useRef(Date.now());

  useEffect(() => {
    const handler = setTimeout(() => {
      if (Date.now() - lastRun.current >= delay) {
        setThrottledValue(value);
        lastRun.current = Date.now();
      }
    }, delay - (Date.now() - lastRun.current));

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return throttledValue;
}

/**
 * Hook that returns a throttled callback
 * @param callback - The callback to throttle
 * @param delay - The delay in milliseconds
 * @returns A throttled version of the callback
 */
export function useThrottledCallback<T extends (...args: any[]) => any>(
  callback: T,
  delay: number
): (...args: Parameters<T>) => void {
  const lastRun = useRef(Date.now());
  const timeout = useRef<NodeJS.Timeout | null>(null);
  const callbackRef = useRef(callback);

  // Update callback ref when callback changes
  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  const throttledCallback = useCallback((...args: Parameters<T>) => {
    const timeSinceLastRun = Date.now() - lastRun.current;
    const runCallback = () => {
      lastRun.current = Date.now();
      callbackRef.current(...args);
    };

    if (timeSinceLastRun >= delay) {
      // If enough time has passed, run immediately
      runCallback();
    } else {
      // Otherwise, schedule to run after the remaining delay
      if (timeout.current) {
        clearTimeout(timeout.current);
      }
      
      timeout.current = setTimeout(() => {
        runCallback();
      }, delay - timeSinceLastRun);
    }
  }, [delay]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timeout.current) {
        clearTimeout(timeout.current);
      }
    };
  }, []);

  return throttledCallback;
}