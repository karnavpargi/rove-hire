/**
 * Login page — email/password form with client-side validation,
 * rate limit countdown, and redirect on success.
 *
 * Validates: Requirements 1.2, 1.3, 1.4, 1.5, 1.6, 1.7
 */

'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { validateEmail, validatePassword } from '@rove-hire/shared';
import { useAuth } from '@/hooks/use-auth';
import { useSessionStore } from '@/stores/session-store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from '@/components/ui/card';
import { AlertCircle, Loader2, Clock } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const { login, isAuthenticated, isLoading: authLoading } = useAuth();
  const isInitialized = useSessionStore((s) => s.isInitialized);

  // Form state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [generalError, setGeneralError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Rate limit countdown
  const [retryAfter, setRetryAfter] = useState<number>(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Redirect if already authenticated
  useEffect(() => {
    if (isInitialized && isAuthenticated) {
      router.push('/');
    }
  }, [isInitialized, isAuthenticated, router]);

  // Rate limit countdown timer
  useEffect(() => {
    if (retryAfter > 0) {
      timerRef.current = setInterval(() => {
        setRetryAfter((prev) => {
          if (prev <= 1) {
            if (timerRef.current) clearInterval(timerRef.current);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [retryAfter]);

  // Client-side validation on blur
  const validateEmailField = useCallback(() => {
    if (!email) {
      setEmailError('Email is required');
      return false;
    }
    const result = validateEmail(email);
    if (!result.valid) {
      setEmailError(result.error || 'Invalid email');
      return false;
    }
    setEmailError('');
    return true;
  }, [email]);

  const validatePasswordField = useCallback(() => {
    if (!password) {
      setPasswordError('Password is required');
      return false;
    }
    const result = validatePassword(password);
    if (!result.valid) {
      setPasswordError(result.error || 'Invalid password');
      return false;
    }
    setPasswordError('');
    return true;
  }, [password]);

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setGeneralError('');

    // Validate both fields before submission
    const emailValid = validateEmailField();
    const passwordValid = validatePasswordField();

    if (!emailValid || !passwordValid) return;

    // Don't allow submission during rate limit
    if (retryAfter > 0) return;

    setIsSubmitting(true);
    try {
      const result = await login(email, password);

      if (result.success) {
        // Redirect to dashboard
        router.push('/');
      } else if (result.error) {
        if (result.error.retryAfter) {
          setRetryAfter(result.error.retryAfter);
        }
        setGeneralError(result.error.message);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Show loading state while checking auth
  if (authLoading) {
    return (
      <div className="flex items-center justify-center py-12" role="status" aria-label="Checking authentication">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Don't render form if already authenticated (will redirect)
  if (isAuthenticated) return null;

  return (
    <Card>
      <CardHeader className="text-center">
        <CardTitle className="text-2xl">Sign in to ROVE Hire</CardTitle>
        <CardDescription>Enter your credentials to access the recruitment dashboard</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} noValidate aria-label="Login form">
          <div className="flex flex-col gap-4">
            {/* General error / rate limit message */}
            {generalError && (
              <div
                role="alert"
                aria-live="assertive"
                className="flex items-center gap-2 rounded-md bg-destructive/10 px-3 py-2.5 text-sm text-destructive"
              >
                {retryAfter > 0 ? (
                  <Clock className="size-4 shrink-0" aria-hidden="true" />
                ) : (
                  <AlertCircle className="size-4 shrink-0" aria-hidden="true" />
                )}
                <span>
                  {generalError}
                  {retryAfter > 0 && (
                    <span className="ml-1 font-medium">
                      Retry in {retryAfter}s
                    </span>
                  )}
                </span>
              </div>
            )}

            {/* Email field */}
            <div className="flex flex-col gap-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@rove.com"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (emailError) setEmailError('');
                  if (generalError) setGeneralError('');
                }}
                onBlur={validateEmailField}
                aria-invalid={!!emailError}
                aria-describedby={emailError ? 'email-error' : undefined}
                autoComplete="email"
                disabled={isSubmitting}
              />
              {emailError && (
                <p id="email-error" className="text-xs text-destructive" role="alert">
                  {emailError}
                </p>
              )}
            </div>

            {/* Password field */}
            <div className="flex flex-col gap-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (passwordError) setPasswordError('');
                  if (generalError) setGeneralError('');
                }}
                onBlur={validatePasswordField}
                aria-invalid={!!passwordError}
                aria-describedby={passwordError ? 'password-error' : undefined}
                autoComplete="current-password"
                disabled={isSubmitting}
              />
              {passwordError && (
                <p id="password-error" className="text-xs text-destructive" role="alert">
                  {passwordError}
                </p>
              )}
            </div>

            {/* Submit button */}
            <Button
              type="submit"
              className="w-full"
              disabled={isSubmitting || retryAfter > 0}
              aria-disabled={isSubmitting || retryAfter > 0}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                  Signing in…
                </>
              ) : retryAfter > 0 ? (
                <>
                  <Clock className="size-4" aria-hidden="true" />
                  Wait {retryAfter}s
                </>
              ) : (
                'Sign in'
              )}
            </Button>
          </div>
        </form>
      </CardContent>
      <CardFooter className="justify-center">
        <p className="text-xs text-muted-foreground">
          Internal access only. Contact IT for credentials.
        </p>
      </CardFooter>
    </Card>
  );
}
