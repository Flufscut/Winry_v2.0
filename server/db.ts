/**
 * FILE: db.ts
 * PURPOSE: Main database export that switches between PostgreSQL and SQLite
 * DEPENDENCIES: ./db-local.ts, ./db-production.ts
 * LAST_UPDATED: December 15, 2024
 * 
 * REF: Main database export that switches between SQLite and PostgreSQL
 * REF: Uses PostgreSQL in production, SQLite in development
 * REF: CRITICAL - Never import SQLite modules in production to prevent conflicts
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

/**
 * REF: Universal database connection function
 * Returns configured database instance based on environment
 * Uses PostgreSQL in production, SQLite in development
 * CRITICAL: Never imports SQLite modules in production
 */
export async function getDatabase() {
  if (usePostgreSQL) {
    console.log('🔄 Loading PostgreSQL production database...');
    const { db } = await import('./db-production.js');
    console.log('✅ PostgreSQL production database loaded');
    return db;
  } else {
    // REF: CRITICAL - Only import SQLite in development environment
    if (process.env.NODE_ENV === 'production') {
      throw new Error('FATAL: Cannot load SQLite in production environment');
    }
    
    console.log('🔄 Loading SQLite development database...');
    const { db } = await import('./db-local.js');
    console.log('✅ SQLite development database loaded');
    return db;
  }
}

/**
 * REF: Universal database pool connection function
 * Returns configured database pool based on environment
 * Uses PostgreSQL pool in production, SQLite instance in development
 * CRITICAL: Never imports SQLite modules in production
 */
export async function getDatabasePool() {
  if (usePostgreSQL) {
    console.log('🔄 Loading PostgreSQL production pool...');
    const { sql } = await import('./db-production.js');
    console.log('✅ PostgreSQL production pool loaded');
    return sql;
  } else {
    // REF: CRITICAL - Only import SQLite pool in development environment
    if (process.env.NODE_ENV === 'production') {
      throw new Error('FATAL: Cannot load SQLite pool in production environment');
    }
    
    console.log('🔄 Loading SQLite development pool...');
    const { pool } = await import('./db-local.js');
    console.log('✅ SQLite development pool loaded');
    return pool;
  }
}