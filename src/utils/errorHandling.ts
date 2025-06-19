import { message, notification } from 'antd';
import { NetworkError } from '@/types';
import { AppError } from '@/types';
import { ValidationError } from '@/types';

/**
 * Error severity levels
 */
export enum ErrorSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

/**
 * Error handler configuration
 */
interface ErrorHandlerConfig {
  showNotification?: boolean;
  showMessage?: boolean;
  logToConsole?: boolean;
  logToService?: boolean;
  severity?: ErrorSeverity;
}

/**
 * Global error handler for the application
 */
export class ErrorHandler {
  private static errorLog: Error[] = [];
  private static readonly MAX_ERROR_LOG_SIZE = 100;

  /**
   * Handle an error with appropriate user feedback and logging
   * @param error - The error to handle
   * @param config - Configuration for error handling
   */
  public static handle(
    error: unknown,
    config: ErrorHandlerConfig = {}
  ): void {
    const {
      showNotification = false,
      showMessage = true,
      logToConsole = true,
      logToService = false,
      severity = ErrorSeverity.MEDIUM
    } = config;

    // Convert to Error object if needed
    const errorObj = this.normalizeError(error);
    
    // Log error
    this.logError(errorObj, { logToConsole, logToService });
    
    // Show user feedback
    if (showNotification) {
      this.showNotification(errorObj, severity);
    } else if (showMessage) {
      this.showMessage(errorObj, severity);
    }
  }

  /**
   * Normalize various error types to Error object
   */
  private static normalizeError(error: unknown): Error {
    if (error instanceof Error) {
      return error;
    }
    
    if (typeof error === 'string') {
      return new Error(error);
    }
    
    if (error && typeof error === 'object' && 'message' in error) {
      return new Error(String(error.message));
    }
    
    return new Error('An unknown error occurred');
  }

  /**
   * Log error to console and/or external service
   */
  private static logError(
    error: Error,
    options: { logToConsole: boolean; logToService: boolean }
  ): void {
    // Add to internal log
    this.errorLog.push(error);
    if (this.errorLog.length > this.MAX_ERROR_LOG_SIZE) {
      this.errorLog.shift();
    }
    
    // Console logging
    if (options.logToConsole) {
      console.error('[ErrorHandler]', error);
      
      if (error instanceof AppError && error.context) {
        console.error('Error Context:', error.context);
      }
    }
    
    // External service logging (e.g., Sentry, LogRocket)
    if (options.logToService && typeof window !== 'undefined') {
      // Implement external logging service integration here
      // Example: Sentry.captureException(error);
    }
  }

  /**
   * Show error message using Ant Design message
   */
  private static showMessage(error: Error, severity: ErrorSeverity): void {
    const duration = severity === ErrorSeverity.CRITICAL ? 0 : 4;
    
    switch (severity) {
      case ErrorSeverity.LOW:
        message.info(error.message, duration);
        break;
      case ErrorSeverity.MEDIUM:
        message.warning(error.message, duration);
        break;
      case ErrorSeverity.HIGH:
      case ErrorSeverity.CRITICAL:
        message.error(error.message, duration);
        break;
    }
  }

  /**
   * Show error notification using Ant Design notification
   */
  private static showNotification(error: Error, severity: ErrorSeverity): void {
    const type = this.getNotificationType(severity);
    const duration = severity === ErrorSeverity.CRITICAL ? 0 : 6;
    
    let description = error.message;
    
    if (error instanceof AppError) {
      if (error.code) {
        description += `\n\nError Code: ${error.code}`;
      }
    }
    
    notification[type]({
      message: 'Error',
      description,
      duration,
      placement: 'topRight'
    });
  }

  /**
   * Get notification type based on severity
   */
  private static getNotificationType(
    severity: ErrorSeverity
  ): 'info' | 'warning' | 'error' {
    switch (severity) {
      case ErrorSeverity.LOW:
        return 'info';
      case ErrorSeverity.MEDIUM:
        return 'warning';
      case ErrorSeverity.HIGH:
      case ErrorSeverity.CRITICAL:
        return 'error';
    }
  }

  /**
   * Get recent errors from the log
   */
  public static getErrorLog(limit?: number): Error[] {
    if (limit) {
      return this.errorLog.slice(-limit);
    }
    return [...this.errorLog];
  }

  /**
   * Clear error log
   */
  public static clearErrorLog(): void {
    this.errorLog = [];
  }
}

/**
 * Async error boundary wrapper
 * @param fn - Async function to wrap
 * @param config - Error handler configuration
 * @returns Wrapped function that handles errors
 */
export function withErrorHandling<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  config?: ErrorHandlerConfig
): T {
  return (async (...args: Parameters<T>) => {
    try {
      return await fn(...args);
    } catch (error) {
      ErrorHandler.handle(error, config);
      throw error; // Re-throw so calling code can handle if needed
    }
  }) as T;
}

/**
 * React error boundary error handler
 * Use this in componentDidCatch or ErrorBoundary
 */
export function handleReactError(
  error: Error,
  errorInfo: React.ErrorInfo
): void {
  ErrorHandler.handle(error, {
    showNotification: true,
    severity: ErrorSeverity.HIGH,
    logToConsole: true,
    logToService: true
  });
  
  console.error('React Error Boundary:', errorInfo);
}

/**
 * Create a user-friendly error message
 * @param error - The error to create a message for
 * @returns User-friendly error message
 */
export function getUserFriendlyErrorMessage(error: unknown): string {
  if (error instanceof ValidationError) {
    return `Validation Error: ${error.message}`;
  }
  
  if (error instanceof NetworkError) {
    return 'Network error occurred. Please check your connection and try again.';
  }
  
  if (error instanceof Error) {
    // Common error patterns
    if (error.message.includes('Network request failed')) {
      return 'Unable to connect to the server. Please try again later.';
    }
    
    if (error.message.includes('timeout')) {
      return 'The request took too long. Please try again.';
    }
    
    if (error.message.includes('not found')) {
      return 'The requested resource was not found.';
    }
    
    if (error.message.includes('unauthorized') || error.message.includes('401')) {
      return 'You are not authorized to perform this action.';
    }
    
    if (error.message.includes('forbidden') || error.message.includes('403')) {
      return 'Access to this resource is forbidden.';
    }
    
    // Default to the error message if it seems user-friendly
    if (error.message.length < 100 && !error.message.includes('at ')) {
      return error.message;
    }
  }
  
  return 'An unexpected error occurred. Please try again.';
}

/**
 * Retry an async operation with exponential backoff
 * @param fn - Function to retry
 * @param maxRetries - Maximum number of retries
 * @param baseDelay - Base delay in milliseconds
 * @returns Result of the function
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<T> {
  let lastError: Error | undefined;
  
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      
      if (i < maxRetries - 1) {
        const delay = baseDelay * Math.pow(2, i);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  throw lastError || new Error('Max retries exceeded');
}