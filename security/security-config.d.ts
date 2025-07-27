import { Application, Request } from 'express';

export interface SecurityLogger {
  logSecurityEvent(event: string, details: any, req?: Request): void;
}

export interface ValidateInput {
  email(email: string): boolean;
  password(password: string): boolean;
  youtubeUrl(url: string): boolean;
  sanitizeString(str: string): string;
}

export function securityMiddleware(app: Application): void;
export const securityLogger: SecurityLogger;
export const validateInput: ValidateInput;
export function generateCSRFToken(): string;
export function createRateLimit(windowMs: number, max: number, message: string): any;