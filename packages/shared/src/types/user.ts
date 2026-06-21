/**
 * User/Auth types shared between frontend and backend.
 */

/** HR user data (safe to expose — no password) */
export interface User {
  id: string;
  email: string;
  name: string;
  createdAt: string;
}

/** Payload embedded in the JWT token */
export interface HrUserPayload {
  id: string;
  email: string;
  name: string;
}

/** Result of a login attempt */
export interface LoginResult {
  token: string;
  expiresAt: string;
  user: HrUserPayload;
}
