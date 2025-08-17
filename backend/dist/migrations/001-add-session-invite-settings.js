"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.up = up;
exports.down = down;
const mongoose_1 = __importDefault(require("mongoose"));
const Session_1 = require("../models/Session");
/**
 * Migration: Add invitation settings to existing sessions
 * This migration adds the inviteSettings field to all existing sessions
 */
async function up() {
    console.log('Running migration: Add session invite settings');
    try {
        // Update all existing sessions to add default invite settings
        const result = await Session_1.Session.updateMany({ inviteSettings: { $exists: false } }, {
            $set: {
                inviteSettings: {
                    isEnabled: true,
                    currentUses: 0,
                    allowAnonymous: false,
                    requireApproval: false
                }
            }
        });
        console.log(`Updated ${result.modifiedCount} sessions with invite settings`);
    }
    catch (error) {
        console.error('Migration failed:', error);
        throw error;
    }
}
/**
 * Rollback migration: Remove invitation settings from sessions
 */
async function down() {
    console.log('Rolling back migration: Remove session invite settings');
    try {
        // Remove inviteSettings field from all sessions
        const result = await Session_1.Session.updateMany({}, {
            $unset: {
                inviteSettings: 1
            }
        });
        console.log(`Removed invite settings from ${result.modifiedCount} sessions`);
    }
    catch (error) {
        console.error('Migration rollback failed:', error);
        throw error;
    }
}
/**
 * Run migration if called directly
 */
if (require.main === module) {
    const runMigration = async () => {
        try {
            // Connect to database
            const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/yosakoi-evaluation';
            await mongoose_1.default.connect(mongoUri);
            console.log('Connected to database');
            // Run migration
            await up();
            console.log('Migration completed successfully');
        }
        catch (error) {
            console.error('Migration failed:', error);
            process.exit(1);
        }
        finally {
            await mongoose_1.default.disconnect();
        }
    };
    runMigration();
}
//# sourceMappingURL=001-add-session-invite-settings.js.map