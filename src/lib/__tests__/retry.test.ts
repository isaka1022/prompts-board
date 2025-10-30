import { withRetry, withAuthRetry, CircuitBreaker } from '../retry';

// Mock showToast to avoid Raycast API calls in tests
jest.mock('@raycast/api', () => ({
  showToast: jest.fn(),
  Toast: {
    Style: {
      Success: 'success',
      Failure: 'failure',
      Animated: 'animated',
    },
  },
}));

describe('withRetry', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should succeed on first attempt', async () => {
    const operation = jest.fn().mockResolvedValue('success');
    
    const result = await withRetry(operation, { showToasts: false });
    
    expect(result.success).toBe(true);
    expect(result.data).toBe('success');
    expect(result.attempts).toBe(1);
    expect(operation).toHaveBeenCalledTimes(1);
  });

  it('should retry on network errors', async () => {
    const operation = jest.fn()
      .mockRejectedValueOnce(new Error('Network timeout'))
      .mockResolvedValue('success');
    
    const result = await withRetry(operation, { 
      maxAttempts: 3,
      baseDelay: 10,
      showToasts: false 
    });
    
    expect(result.success).toBe(true);
    expect(result.data).toBe('success');
    expect(result.attempts).toBe(2);
    expect(operation).toHaveBeenCalledTimes(2);
  });

  it('should not retry on non-retryable errors', async () => {
    const operation = jest.fn().mockRejectedValue(new Error('Unauthorized'));
    
    const result = await withRetry(operation, { 
      maxAttempts: 3,
      showToasts: false,
      retryCondition: (error) => !error.message.includes('Unauthorized')
    });
    
    expect(result.success).toBe(false);
    expect(result.attempts).toBe(1);
    expect(operation).toHaveBeenCalledTimes(1);
  });

  it('should fail after max attempts', async () => {
    const operation = jest.fn().mockRejectedValue(new Error('Network error'));
    
    const result = await withRetry(operation, { 
      maxAttempts: 2,
      baseDelay: 10,
      showToasts: false 
    });
    
    expect(result.success).toBe(false);
    expect(result.attempts).toBe(2);
    expect(operation).toHaveBeenCalledTimes(2);
  });

  it('should call onRetry callback', async () => {
    const operation = jest.fn()
      .mockRejectedValueOnce(new Error('Network error'))
      .mockResolvedValue('success');
    
    const onRetry = jest.fn();
    
    await withRetry(operation, { 
      maxAttempts: 3,
      baseDelay: 10,
      showToasts: false,
      onRetry 
    });
    
    expect(onRetry).toHaveBeenCalledWith(1, expect.any(Error));
  });
});

describe('withAuthRetry', () => {
  it('should have fewer max attempts than regular retry', async () => {
    const operation = jest.fn().mockRejectedValue(new Error('Network error'));
    
    const result = await withAuthRetry(operation, { showToasts: false });
    
    // Should fail after 2 attempts (default for auth retry)
    expect(result.success).toBe(false);
    expect(result.attempts).toBe(2);
  });

  it('should not retry auth-specific errors', async () => {
    const operation = jest.fn().mockRejectedValue(new Error('Invalid token'));
    
    const result = await withAuthRetry(operation, { showToasts: false });
    
    expect(result.success).toBe(false);
    expect(result.attempts).toBe(1);
  });
});

describe('CircuitBreaker', () => {
  it('should allow operations when closed', async () => {
    const circuitBreaker = new CircuitBreaker(3, 1000);
    const operation = jest.fn().mockResolvedValue('success');
    
    const result = await circuitBreaker.execute(operation);
    
    expect(result).toBe('success');
    expect(circuitBreaker.getState()).toBe('CLOSED');
  });

  it('should open after failure threshold', async () => {
    const circuitBreaker = new CircuitBreaker(2, 1000);
    const operation = jest.fn().mockRejectedValue(new Error('Failure'));
    
    // First failure
    await expect(circuitBreaker.execute(operation)).rejects.toThrow('Failure');
    expect(circuitBreaker.getState()).toBe('CLOSED');
    
    // Second failure - should open circuit
    await expect(circuitBreaker.execute(operation)).rejects.toThrow('Failure');
    expect(circuitBreaker.getState()).toBe('OPEN');
    
    // Third attempt should be blocked
    await expect(circuitBreaker.execute(operation)).rejects.toThrow('Circuit breaker is OPEN');
  });

  it('should transition to half-open after timeout', async () => {
    const circuitBreaker = new CircuitBreaker(1, 50); // 50ms timeout
    const operation = jest.fn().mockRejectedValue(new Error('Failure'));
    
    // Trigger failure to open circuit
    await expect(circuitBreaker.execute(operation)).rejects.toThrow('Failure');
    expect(circuitBreaker.getState()).toBe('OPEN');
    
    // Wait for timeout
    await new Promise(resolve => setTimeout(resolve, 60));
    
    // Next operation should transition to half-open
    const successOperation = jest.fn().mockResolvedValue('success');
    const result = await circuitBreaker.execute(successOperation);
    
    expect(result).toBe('success');
    expect(circuitBreaker.getState()).toBe('CLOSED');
  });
});
