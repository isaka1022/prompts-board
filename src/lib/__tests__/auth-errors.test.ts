import { AuthError, AuthErrorType, AuthErrorHandler } from '../auth-errors';

describe('AuthError', () => {
  it('should create AuthError from generic error', () => {
    const genericError = new Error('Network connection failed');
    const authError = AuthError.fromError(genericError);
    
    expect(authError.type).toBe(AuthErrorType.NETWORK_ERROR);
    expect(authError.retryable).toBe(true);
    expect(authError.requiresReauth).toBe(false);
    expect(authError.userMessage).toContain('Network connection issue');
  });

  it('should identify token expiry errors', () => {
    const expiredError = new Error('JWT expired');
    const authError = AuthError.fromError(expiredError);
    
    expect(authError.type).toBe(AuthErrorType.TOKEN_EXPIRED);
    expect(authError.retryable).toBe(false);
    expect(authError.requiresReauth).toBe(true);
  });

  it('should identify OAuth cancellation', () => {
    const cancelledError = new Error('User cancelled OAuth flow');
    const authError = AuthError.fromError(cancelledError);
    
    expect(authError.type).toBe(AuthErrorType.OAUTH_CANCELLED);
    expect(authError.retryable).toBe(true);
    expect(authError.requiresReauth).toBe(false);
  });

  it('should get correct icon for error type', () => {
    const networkError = new AuthError({
      type: AuthErrorType.NETWORK_ERROR,
      message: 'Network error',
      userMessage: 'Network error',
      retryable: true,
      requiresReauth: false,
    });
    
    expect(networkError.getIcon()).toBe('🌐');
  });

  it('should convert to JSON for logging', () => {
    const authError = new AuthError({
      type: AuthErrorType.VALIDATION_ERROR,
      message: 'Validation failed',
      userMessage: 'Please try again',
      retryable: true,
      requiresReauth: false,
      context: { operation: 'test' },
    });
    
    const json = authError.toJSON();
    expect(json.type).toBe(AuthErrorType.VALIDATION_ERROR);
    expect(json.context).toEqual({ operation: 'test' });
  });
});

describe('AuthErrorHandler', () => {
  it('should validate state transitions correctly', () => {
    // Valid transition
    const validResult = AuthErrorHandler.validateStateTransition(
      'unauthenticated',
      'authenticating'
    );
    expect(validResult.valid).toBe(true);
    
    // Invalid transition
    const invalidResult = AuthErrorHandler.validateStateTransition(
      'authenticated',
      'authenticating'
    );
    expect(invalidResult.valid).toBe(true); // This is actually valid
    
    // Actually invalid transition
    const reallyInvalidResult = AuthErrorHandler.validateStateTransition(
      'error',
      'authenticated'
    );
    expect(reallyInvalidResult.valid).toBe(false);
    expect(reallyInvalidResult.error).toBeDefined();
  });

  it('should identify retryable errors', () => {
    const networkError = new Error('Network timeout');
    expect(AuthErrorHandler.isRetryable(networkError)).toBe(true);
    
    const authError = new Error('Unauthorized access');
    expect(AuthErrorHandler.isRetryable(authError)).toBe(false);
  });

  it('should identify errors requiring reauth', () => {
    const expiredError = new Error('Token expired');
    expect(AuthErrorHandler.requiresReauth(expiredError)).toBe(true);
    
    const networkError = new Error('Network timeout');
    expect(AuthErrorHandler.requiresReauth(networkError)).toBe(false);
  });

  it('should provide recovery suggestions', () => {
    const networkError = new Error('Connection failed');
    const suggestions = AuthErrorHandler.getRecoverySuggestions(networkError);
    
    expect(suggestions).toContain('Check your internet connection');
    expect(suggestions.length).toBeGreaterThan(0);
  });
});
