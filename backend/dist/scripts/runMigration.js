"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
const config_1 = require("../config");
/**
 * Migration runner script
 * Usage: npm run migrate <migration-name> [up|down]
 */
const runMigration = async () => {
    const args = process.argv.slice(2);
    const migrationName = args[0];
    const direction = args[1] || 'up';
    if (!migrationName) {
        console.error('Usage: npm run migrate <migration-name> [up|down]');
        console.error('Example: npm run migrate 001-add-session-invite-settings up');
        process.exit(1);
    }
    if (!['up', 'down'].includes(direction)) {
        console.error('Direction must be "up" or "down"');
        process.exit(1);
    }
    try {
        // Connect to database
        console.log('Connecting to database...');
        await mongoose_1.default.connect(config_1.config.mongoUri);
        console.log('Connected to database');
        // Import and run migration
        const migrationPath = `../migrations/${migrationName}`;
        const migration = await Promise.resolve(`${migrationPath}`).then(s => __importStar(require(s)));
        if (!migration[direction]) {
            console.error(`Migration ${migrationName} does not have a ${direction} function`);
            process.exit(1);
        }
        console.log(`Running migration ${migrationName} (${direction})...`);
        await migration[direction]();
        console.log(`Migration ${migrationName} completed successfully`);
    }
    catch (error) {
        console.error('Migration failed:', error);
        process.exit(1);
    }
    finally {
        await mongoose_1.default.disconnect();
        console.log('Disconnected from database');
    }
};
runMigration();
//# sourceMappingURL=runMigration.js.map