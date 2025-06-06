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

// REF: CRITICAL - Never load SQLite in production to prevent conflicts
if (nodeEnv === 'production' && !hasPostgresUrl) {
  throw new Error('FATAL: Production environment requires DATABASE_URL to be set');
}

// REF: Cache for database instances
let cachedDb: any = null;
let cachedPool: any = null;

/**
 * REF: Get database instance with environment-aware selection
 * PURPOSE: Returns appropriate database instance based on environment
 * @returns {Promise<any>} Database instance
 */
export async function getDatabase() {
  if (cachedDb) {
    return cachedDb;
  }

  if (usePostgreSQL) {
    // REF: Use PostgreSQL in production
    console.log('🔄 Loading PostgreSQL production database...');
    const { db } = await import('./db-production.js');
    cachedDb = db;
    console.log('✅ PostgreSQL production database loaded');
    return db;
  } else {
    // REF: ONLY load SQLite in development
    if (nodeEnv === 'production') {
      throw new Error('FATAL: Cannot load SQLite in production environment');
    }
    console.log('🔄 Loading SQLite development database...');
    const { db } = await import('./db-local.js');
    cachedDb = db;
    console.log('✅ SQLite development database loaded');
    return db;
  }
}

/**
 * REF: Get database pool with environment-aware selection
 * PURPOSE: Returns appropriate database pool based on environment
 * @returns {Promise<any>} Database pool instance
 */
export async function getDatabasePool() {
  if (cachedPool) {
    return cachedPool;
  }

  if (usePostgreSQL) {
    // REF: Use PostgreSQL pool in production
    const { sql } = await import('./db-production.js');
    cachedPool = sql;
    return sql;
  } else {
    // REF: ONLY load SQLite in development
    if (nodeEnv === 'production') {
      throw new Error('FATAL: Cannot load SQLite pool in production environment');
    }
    const { pool } = await import('./db-local.js');
    cachedPool = pool;
    return pool;
  }
}

// REF: Export async getters instead of top-level await
export { getDatabase, getDatabasePool };