import mongoose from 'mongoose';
import { config } from '../config';

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
    await mongoose.connect(config.mongoUri);
    console.log('Connected to database');

    // Import and run migration
    const migrationPath = `../migrations/${migrationName}`;
    const migration = await import(migrationPath);

    if (!migration[direction]) {
      console.error(`Migration ${migrationName} does not have a ${direction} function`);
      process.exit(1);
    }

    console.log(`Running migration ${migrationName} (${direction})...`);
    await migration[direction]();
    console.log(`Migration ${migrationName} completed successfully`);

  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from database');
  }
};

runMigration();