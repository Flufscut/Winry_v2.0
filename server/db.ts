/**
 * FILE: db.ts
 * PURPOSE: Main database export that switches between PostgreSQL and SQLite
 * DEPENDENCIES: ./db-local.ts, ./db-production.ts
 * LAST_UPDATED: December 15, 2024
 * 
 * REF: Main database export that switches between SQLite and PostgreSQL
 * REF: Uses PostgreSQL in production, SQLite in development
 * REF: CRITICAL - Never import SQLite modules in production to prevent conflicts
 * REF: Implements connection caching to prevent multiple instances
 * TODO: Add health checks for database connections
 */

console.log('🗄️  Database Selection (db.ts):');
console.log(`   NODE_ENV: ${process.env.NODE_ENV}`);
console.log(`   DATABASE_URL present: ${!!process.env.DATABASE_URL}`);

const usePostgreSQL = process.env.NODE_ENV === 'production' || !!process.env.DATABASE_URL;
console.log(`   Using: ${usePostgreSQL ? 'PostgreSQL (Production)' : 'SQLite (Development)'}`);

// REF: CRITICAL - Never load SQLite in production to prevent conflicts
if (process.env.NODE_ENV === 'production' && !usePostgreSQL) {
  throw new Error('FATAL: Cannot use SQLite in production environment');
}

// REF: Connection caching to prevent multiple instances
let cachedDatabase: any = null;
let cachedPool: any = null;
let isInitializing = false;

/**
 * REF: Universal database connection function with caching
 * Returns configured database instance based on environment
 * Uses PostgreSQL in production, SQLite in development
 * CRITICAL: Never imports SQLite modules in production
 * PERFORMANCE: Caches connection to prevent multiple instances
 */
export async function getDatabase() {
  // REF: Return cached instance if available
  if (cachedDatabase) {
    return cachedDatabase;
  }

  // REF: Prevent concurrent initialization
  if (isInitializing) {
    // Wait for initialization to complete
    while (isInitializing) {
      await new Promise(resolve => setTimeout(resolve, 10));
    }
    return cachedDatabase;
  }

  isInitializing = true;

  try {
    if (usePostgreSQL) {
      console.log('🔄 Loading PostgreSQL production database...');
      const { db } = await import('./db-production.js');
      cachedDatabase = db;
      console.log('✅ PostgreSQL production database loaded and cached');
      return cachedDatabase;
    } else {
      // REF: CRITICAL - Only import SQLite in development environment
      if (process.env.NODE_ENV === 'production') {
        throw new Error('FATAL: Cannot load SQLite in production environment');
      }
      
      console.log('🔄 Loading SQLite development database...');
      const { db } = await import('./db-local.js');
      cachedDatabase = db;
      console.log('✅ SQLite development database loaded and cached');
      return cachedDatabase;
    }
  } finally {
    isInitializing = false;
  }
}

/**
 * REF: Universal database pool connection function with caching
 * Returns configured database pool based on environment
 * Uses PostgreSQL pool in production, SQLite instance in development
 * CRITICAL: Never imports SQLite modules in production
 * PERFORMANCE: Caches pool to prevent multiple instances
 */
export async function getDatabasePool() {
  // REF: Return cached pool if available
  if (cachedPool) {
    return cachedPool;
  }

  if (usePostgreSQL) {
    console.log('🔄 Loading PostgreSQL production pool...');
    const { sql } = await import('./db-production.js');
    cachedPool = sql;
    console.log('✅ PostgreSQL production pool loaded and cached');
    return cachedPool;
  } else {
    // REF: CRITICAL - Only import SQLite pool in development environment
    if (process.env.NODE_ENV === 'production') {
      throw new Error('FATAL: Cannot load SQLite pool in production environment');
    }
    
    console.log('🔄 Loading SQLite development pool...');
    const { pool } = await import('./db-local.js');
    cachedPool = pool;
    console.log('✅ SQLite development pool loaded and cached');
    return cachedPool;
  }
}