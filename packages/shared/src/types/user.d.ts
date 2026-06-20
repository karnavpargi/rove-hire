export interface User {
    id: string;
    email: string;
    name: string;
    createdAt: string;
}
export interface HrUserPayload {
    id: string;
    email: string;
    name: string;
}
export interface LoginResult {
    token: string;
    expiresAt: string;
    user: HrUserPayload;
}
