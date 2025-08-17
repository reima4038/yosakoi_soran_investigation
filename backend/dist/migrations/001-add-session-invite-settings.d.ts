/**
 * Migration: Add invitation settings to existing sessions
 * This migration adds the inviteSettings field to all existing sessions
 */
export declare function up(): Promise<void>;
/**
 * Rollback migration: Remove invitation settings from sessions
 */
export declare function down(): Promise<void>;
//# sourceMappingURL=001-add-session-invite-settings.d.ts.map