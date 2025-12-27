import React, { createContext, useState, useEffect, useCallback, useRef } from 'react';
import { User } from '../types';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
  showTimeoutModal: boolean;
  countdown: number;
  extendSession: () => void;
}

export const AuthContext = createContext<AuthContextType>({} as AuthContextType);

const SESSION_TIMEOUT = 10 * 60 * 1000; // 10 minutes
const TIMEOUT_WARNING = 1 * 60 * 1000; // 1 minute before timeout

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [showTimeoutModal, setShowTimeoutModal] = useState(false);
  const [countdown, setCountdown] = useState(TIMEOUT_WARNING / 1000);

  // FIX: Using `window.setTimeout` and `window.setInterval` to explicitly use the browser's timer types.
  // This resolves ambiguity with Node.js types for `setTimeout`/`setInterval` which can cause errors.
  // FIX: Explicitly use `number` for timer IDs to resolve type conflict with NodeJS.Timeout.
  const timeoutId = useRef<number | null>(null);
  const warningTimeoutId = useRef<number | null>(null);
  const countdownIntervalId = useRef<number | null>(null);

  const logout = useCallback(() => {
    setUser(null);
    setShowTimeoutModal(false);
    // FIX: Use window.clearTimeout and window.clearInterval to avoid ambiguity with Node.js timer types.
    if (timeoutId.current) window.clearTimeout(timeoutId.current);
    if (warningTimeoutId.current) window.clearTimeout(warningTimeoutId.current);
    if (countdownIntervalId.current) window.clearInterval(countdownIntervalId.current);
    // In a real app, also clear session from storage
  }, []);

  const resetSessionTimeout = useCallback(() => {
    setShowTimeoutModal(false);
    // FIX: Use window.clearTimeout and window.clearInterval to avoid ambiguity with Node.js timer types.
    if (timeoutId.current) window.clearTimeout(timeoutId.current);
    if (warningTimeoutId.current) window.clearTimeout(warningTimeoutId.current);
    if (countdownIntervalId.current) window.clearInterval(countdownIntervalId.current);

    // FIX: Explicitly call `window.setTimeout` and `window.setInterval` to ensure browser APIs are used, resolving type errors.
    warningTimeoutId.current = window.setTimeout(() => {
      setShowTimeoutModal(true);
      setCountdown(TIMEOUT_WARNING / 1000);
      countdownIntervalId.current = window.setInterval(() => {
        setCountdown(prev => (prev > 0 ? prev - 1 : 0));
      }, 1000);
    }, SESSION_TIMEOUT - TIMEOUT_WARNING);

    timeoutId.current = window.setTimeout(logout, SESSION_TIMEOUT);
  }, [logout]);

  const extendSession = () => {
    resetSessionTimeout();
  };

  const login = async (username: string, password: string): Promise<void> => {
    // Simulate LDAP authentication
    if ((username.toLowerCase() === 'admin' && password === 'admin') || (username.toLowerCase() === 'user' && password === 'user')) {
      const loggedInUser: User = {
        username,
        role: username.toLowerCase() === 'admin' ? 'Admin' : 'User',
      };
      setUser(loggedInUser);
      resetSessionTimeout();
    } else {
      throw new Error('Invalid username or password');
    }
  };

  useEffect(() => {
    const events = ['mousemove', 'keydown', 'mousedown', 'touchstart'];
    const handleActivity = () => {
      if (user) {
        resetSessionTimeout();
      }
    };

    events.forEach(event => window.addEventListener(event, handleActivity));

    return () => {
      events.forEach(event => window.removeEventListener(event, handleActivity));
      // FIX: Use window.clearTimeout and window.clearInterval to avoid ambiguity with Node.js timer types.
      if (timeoutId.current) window.clearTimeout(timeoutId.current);
      if (warningTimeoutId.current) window.clearTimeout(warningTimeoutId.current);
      if (countdownIntervalId.current) window.clearInterval(countdownIntervalId.current);
    };
  }, [user, resetSessionTimeout]);

  const isAuthenticated = !!user;

  return (
    <AuthContext.Provider value={{ user, isAuthenticated, login, logout, showTimeoutModal, countdown, extendSession }}>
      {children}
    </AuthContext.Provider>
  );
};