/**
 * FILE: db.ts
 * PURPOSE: Environment-aware database configuration
 * DEPENDENCIES: ./db-local.ts, ./db-production.ts
 * LAST_UPDATED: December 15, 2024
 * 
 * REF: Main database export that switches between SQLite and PostgreSQL
 * REF: Uses PostgreSQL in production, SQLite in development
 */

// REF: Environment detection for database selection
const nodeEnv = process.env.NODE_ENV || 'development';
const hasPostgresUrl = !!process.env.DATABASE_URL;
const usePostgreSQL = hasPostgresUrl && nodeEnv === 'production';

console.log(`🗄️  Database Selection (db.ts):`);
console.log(`   NODE_ENV: ${nodeEnv}`);
console.log(`   DATABASE_URL present: ${hasPostgresUrl}`);
console.log(`   Using: ${usePostgreSQL ? 'PostgreSQL (Production)' : 'SQLite (Development)'}`);

// REF: Cache for database instances
let dbInstance: any = null;
let poolInstance: any = null;

/**
 * REF: Initialize and return the appropriate database instance
 * PURPOSE: Dynamically loads the correct database based on environment
 */
async function initializeDatabase() {
  if (dbInstance && poolInstance) {
    return { db: dbInstance, pool: poolInstance };
  }

  if (usePostgreSQL) {
    // REF: Use PostgreSQL for production
    console.log('🔄 Loading PostgreSQL production database...');
    const prodDb = await import('./db-production.js');
    dbInstance = prodDb.db;
    poolInstance = prodDb.sql; // Note: PostgreSQL uses 'sql' not 'pool'
    console.log('✅ PostgreSQL production database loaded');
  } else {
    // REF: Use SQLite for development
    console.log('🔄 Loading SQLite development database...');
    const localDb = await import('./db-local.js');
    dbInstance = localDb.db;
    poolInstance = localDb.pool;
    console.log('✅ SQLite development database loaded');
  }

  return { db: dbInstance, pool: poolInstance };
}

// REF: Initialize database immediately
const dbPromise = initializeDatabase();

// REF: Export database instances (will be resolved when imported)
export const db = dbPromise.then(result => result.db);
export const pool = dbPromise.then(result => result.pool);

// REF: Export synchronous getter functions for compatibility
export async function getDatabase() {
  const result = await dbPromise;
  return result.db;
}

export async function getPool() {
  const result = await dbPromise;
  return result.pool;
}