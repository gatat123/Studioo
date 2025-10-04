import Cookies from 'js-cookie';

/**
 * Cookie utility functions for consistent cookie management
 */

interface CookieOptions {
  expires?: number;
  path?: string;
  domain?: string;
  secure?: boolean;
  sameSite?: 'strict' | 'lax' | 'none';
}

/**
 * Get the appropriate domain for cookie setting
 */
export function getCookieDomain(): string | undefined {
  if (typeof window === 'undefined') return undefined;

  const hostname = window.location.hostname;

  // For Railway deployment, use the subdomain
  if (hostname.includes('railway.app')) {
    return `.${hostname.split('.').slice(-3).join('.')}`;
  }

  // For localhost, don't set domain
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return undefined;
  }

  // For other domains, use the hostname
  return hostname;
}

/**
 * Get default cookie options
 */
export function getDefaultCookieOptions(): CookieOptions {
  return {
    expires: 7, // 7 days
    path: '/',
    domain: getCookieDomain(),
    secure: typeof window !== 'undefined' && window.location.protocol === 'https:',
    sameSite: 'lax',
  };
}

/**
 * Set authentication token cookie
 */
export function setAuthToken(token: string): void {
  const options = getDefaultCookieOptions();
  Cookies.set('token', token, options);

  // Also set in localStorage as backup
  if (typeof window !== 'undefined') {
    localStorage.setItem('token', token);
  }
}

/**
 * Get authentication token
 */
export function getAuthToken(): string | undefined {
  // Prefer cookie
  let token = Cookies.get('token');

  // Fallback to localStorage
  if (!token && typeof window !== 'undefined') {
    token = localStorage.getItem('token') || undefined;
  }

  return token;
}

/**
 * Remove authentication token
 */
export function removeAuthToken(): void {
  const domain = getCookieDomain();

  // Remove with domain
  if (domain) {
    Cookies.remove('token', { domain, path: '/' });
  }

  // Remove without domain (for localhost)
  Cookies.remove('token', { path: '/' });

  // Also try without path
  Cookies.remove('token');

  // Remove from localStorage
  if (typeof window !== 'undefined') {
    localStorage.removeItem('token');
  }
}

/**
 * Check if authentication token exists
 */
export function hasAuthToken(): boolean {
  return !!getAuthToken();
}

/**
 * Decode JWT token without verification
 */
function decodeJWT(token: string): { exp?: number; [key: string]: unknown } | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;

    const payload = parts[1];
    const decoded = JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/')));
    return decoded;
  } catch {
    return null;
  }
}

/**
 * Check if authentication token is valid (not expired)
 * Returns false if token is missing, invalid, or expires within 5 minutes
 */
export function isAuthTokenValid(): boolean {
  const token = getAuthToken();
  if (!token) return false;

  const decoded = decodeJWT(token);
  if (!decoded || !decoded.exp) return false;

  // Check if token expires within 5 minutes (300 seconds)
  const expiresIn = decoded.exp - Math.floor(Date.now() / 1000);
  return expiresIn > 300;
}

/**
 * Set refresh token cookie
 */
export function setRefreshToken(token: string): void {
  const options = {
    ...getDefaultCookieOptions(),
    expires: 30, // 30 days for refresh token
  };
  Cookies.set('refreshToken', token, options);

  // Also set in localStorage as backup
  if (typeof window !== 'undefined') {
    localStorage.setItem('refreshToken', token);
  }
}

/**
 * Get refresh token
 */
export function getRefreshToken(): string | undefined {
  // Prefer cookie
  let token = Cookies.get('refreshToken');

  // Fallback to localStorage
  if (!token && typeof window !== 'undefined') {
    token = localStorage.getItem('refreshToken') || undefined;
  }

  return token;
}

/**
 * Remove refresh token
 */
export function removeRefreshToken(): void {
  const domain = getCookieDomain();

  // Remove with domain
  if (domain) {
    Cookies.remove('refreshToken', { domain, path: '/' });
  }

  // Remove without domain (for localhost)
  Cookies.remove('refreshToken', { path: '/' });

  // Also try without path
  Cookies.remove('refreshToken');

  // Remove from localStorage
  if (typeof window !== 'undefined') {
    localStorage.removeItem('refreshToken');
  }
}