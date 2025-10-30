import { showToast, Toast } from "@raycast/api";

export interface RetryOptions {
  maxAttempts: number;
  baseDelay: number;
  maxDelay: number;
  backoffFactor: number;
  retryCondition?: (error: Error) => boolean;
  onRetry?: (attempt: number, error: Error) => void;
  showToasts?: boolean;
}

export interface RetryResult<T> {
  success: boolean;
  data?: T;
  error?: Error;
  attempts: number;
}

const DEFAULT_RETRY_OPTIONS: RetryOptions = {
  maxAttempts: 3,
  baseDelay: 1000,
  maxDelay: 10000,
  backoffFactor: 2,
  retryCondition: (error: Error) => {
    // Retry on network errors, timeouts, and server errors
    const message = error.message.toLowerCase();
    return (
      message.includes('network') ||
      message.includes('timeout') ||
      message.includes('fetch') ||
      message.includes('connection') ||
      message.includes('500') ||
      message.includes('502') ||
      message.includes('503') ||
      message.includes('504')
    );
  },
  showToasts: true,
};

/**
 * Retry function with exponential backoff
 */
export async function withRetry<T>(
  operation: () => Promise<T>,
  options: Partial<RetryOptions> = {}
): Promise<RetryResult<T>> {
  const config = { ...DEFAULT_RETRY_OPTIONS, ...options };
  let lastError: Error;
  let attempt = 0;

  while (attempt < config.maxAttempts) {
    attempt++;

    try {
      const result = await operation();
      
      if (attempt > 1 && config.showToasts) {
        await showToast({
          style: Toast.Style.Success,
          title: "Operation Successful",
          message: `Succeeded after ${attempt} attempt${attempt > 1 ? 's' : ''}`,
        });
      }

      return {
        success: true,
        data: result,
        attempts: attempt,
      };
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      
      // Check if we should retry this error
      if (!config.retryCondition || !config.retryCondition(lastError)) {
        return {
          success: false,
          error: lastError,
          attempts: attempt,
        };
      }

      // If this is the last attempt, don't retry
      if (attempt >= config.maxAttempts) {
        break;
      }

      // Call retry callback if provided
      if (config.onRetry) {
        config.onRetry(attempt, lastError);
      }

      // Show retry toast
      if (config.showToasts) {
        await showToast({
          style: Toast.Style.Animated,
          title: "Retrying...",
          message: `Attempt ${attempt + 1} of ${config.maxAttempts}`,
        });
      }

      // Calculate delay with exponential backoff
      const delay = Math.min(
        config.baseDelay * Math.pow(config.backoffFactor, attempt - 1),
        config.maxDelay
      );

      // Add jitter to prevent thundering herd
      const jitter = Math.random() * 0.1 * delay;
      const totalDelay = delay + jitter;

      await new Promise(resolve => setTimeout(resolve, totalDelay));
    }
  }

  // All attempts failed
  if (config.showToasts) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Operation Failed",
      message: `Failed after ${attempt} attempt${attempt > 1 ? 's' : ''}`,
    });
  }

  return {
    success: false,
    error: lastError!,
    attempts: attempt,
  };
}

/**
 * Specialized retry function for authentication operations
 */
export async function withAuthRetry<T>(
  operation: () => Promise<T>,
  options: Partial<RetryOptions> = {}
): Promise<RetryResult<T>> {
  const authRetryOptions: Partial<RetryOptions> = {
    maxAttempts: 2, // Fewer attempts for auth operations
    baseDelay: 2000, // Longer delay for auth
    retryCondition: (error: Error) => {
      const message = error.message.toLowerCase();
      // Only retry on network errors, not auth failures
      return (
        message.includes('network') ||
        message.includes('timeout') ||
        message.includes('fetch') ||
        message.includes('connection') ||
        message.includes('500') ||
        message.includes('502') ||
        message.includes('503') ||
        message.includes('504')
      ) && !(
        message.includes('unauthorized') ||
        message.includes('forbidden') ||
        message.includes('invalid') ||
        message.includes('expired')
      );
    },
    ...options,
  };

  return withRetry(operation, authRetryOptions);
}

/**
 * Retry wrapper for network requests
 */
export async function retryFetch(
  url: string,
  options: RequestInit = {},
  retryOptions: Partial<RetryOptions> = {}
): Promise<RetryResult<Response>> {
  return withRetry(async () => {
    const response = await fetch(url, options);
    
    // Throw error for non-2xx responses to trigger retry logic
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    return response;
  }, retryOptions);
}

/**
 * Circuit breaker pattern for preventing cascading failures
 */
export class CircuitBreaker {
  private failures = 0;
  private lastFailureTime = 0;
  private state: 'CLOSED' | 'OPEN' | 'HALF_OPEN' = 'CLOSED';

  constructor(
    private failureThreshold: number = 5,
    private recoveryTimeout: number = 60000 // 1 minute
  ) {}

  async execute<T>(operation: () => Promise<T>): Promise<T> {
    if (this.state === 'OPEN') {
      if (Date.now() - this.lastFailureTime > this.recoveryTimeout) {
        this.state = 'HALF_OPEN';
      } else {
        throw new Error('Circuit breaker is OPEN - operation not allowed');
      }
    }

    try {
      const result = await operation();
      
      if (this.state === 'HALF_OPEN') {
        this.reset();
      }
      
      return result;
    } catch (error) {
      this.recordFailure();
      throw error;
    }
  }

  private recordFailure(): void {
    this.failures++;
    this.lastFailureTime = Date.now();
    
    if (this.failures >= this.failureThreshold) {
      this.state = 'OPEN';
    }
  }

  private reset(): void {
    this.failures = 0;
    this.state = 'CLOSED';
    this.lastFailureTime = 0;
  }

  getState(): string {
    return this.state;
  }
}

/**
 * Global circuit breaker instance for auth operations
 */
export const authCircuitBreaker = new CircuitBreaker(3, 30000); // 3 failures, 30 second recovery
