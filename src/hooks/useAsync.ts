import { useState, useCallback, useRef, useEffect } from 'react';

export interface AsyncState<T> {
  data: T | null;
  error: Error | null;
  loading: boolean;
  isIdle: boolean;
  isLoading: boolean;
  isError: boolean;
  isSuccess: boolean;
}

export interface UseAsyncOptions {
  /**
   * If true, the async function will be called immediately on mount
   */
  immediate?: boolean;
  /**
   * Called when the async function succeeds
   */
  onSuccess?: <T>(data: T) => void;
  /**
   * Called when the async function fails
   */
  onError?: (error: Error) => void;
}

/**
 * Hook for handling async operations with loading states
 * @param asyncFunction - The async function to execute
 * @param options - Configuration options
 * @returns State and control functions
 */
export function useAsync<T = any, P extends any[] = any[]>(
  asyncFunction: (...args: P) => Promise<T>,
  options: UseAsyncOptions = {}
): {
  execute: (...args: P) => Promise<T | null>;
  reset: () => void;
  setData: (data: T) => void;
  setError: (error: Error) => void;
} & AsyncState<T> {
  const [state, setState] = useState<AsyncState<T>>({
    data: null,
    error: null,
    loading: false,
    isIdle: true,
    isLoading: false,
    isError: false,
    isSuccess: false,
  });

  const isMountedRef = useRef(true);
  const { immediate = false, onSuccess, onError } = options;

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const execute = useCallback(
    async (...args: P): Promise<T | null> => {
      setState({
        data: null,
        error: null,
        loading: true,
        isIdle: false,
        isLoading: true,
        isError: false,
        isSuccess: false,
      });

      try {
        const result = await asyncFunction(...args);
        
        if (isMountedRef.current) {
          setState({
            data: result,
            error: null,
            loading: false,
            isIdle: false,
            isLoading: false,
            isError: false,
            isSuccess: true,
          });
          
          if (onSuccess) {
            onSuccess(result);
          }
        }
        
        return result;
      } catch (error) {
        const errorObject = error instanceof Error ? error : new Error(String(error));
        
        if (isMountedRef.current) {
          setState({
            data: null,
            error: errorObject,
            loading: false,
            isIdle: false,
            isLoading: false,
            isError: true,
            isSuccess: false,
          });
          
          if (onError) {
            onError(errorObject);
          }
        }
        
        return null;
      }
    },
    [asyncFunction, onSuccess, onError]
  );

  const reset = useCallback(() => {
    setState({
      data: null,
      error: null,
      loading: false,
      isIdle: true,
      isLoading: false,
      isError: false,
      isSuccess: false,
    });
  }, []);

  const setData = useCallback((data: T) => {
    setState({
      data,
      error: null,
      loading: false,
      isIdle: false,
      isLoading: false,
      isError: false,
      isSuccess: true,
    });
  }, []);

  const setError = useCallback((error: Error) => {
    setState({
      data: null,
      error,
      loading: false,
      isIdle: false,
      isLoading: false,
      isError: true,
      isSuccess: false,
    });
  }, []);

  useEffect(() => {
    if (immediate) {
      void execute(...([] as unknown as P));
    }
  }, [immediate]); // Only run on mount if immediate is true

  return {
    ...state,
    execute,
    reset,
    setData,
    setError,
  };
}

/**
 * Type-safe version of useAsync for functions with no parameters
 */
export function useAsyncFn<T>(
  asyncFunction: () => Promise<T>,
  options?: UseAsyncOptions
) {
  return useAsync<T, []>(asyncFunction, options);
}