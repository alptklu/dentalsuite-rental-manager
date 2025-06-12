#!/usr/bin/env node

import { migrateBooleanFields } from '../database/migrate-booleans.js';
import { pool } from '../database/init.js';

async function runMigration() {
  try {
    console.log('Running boolean data migration...');
    await migrateBooleanFields();
    console.log('Migration completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

runMigration(); 