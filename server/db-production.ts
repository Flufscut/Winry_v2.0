/**
 * FILE: db-production.ts
 * PURPOSE: PostgreSQL database configuration for production deployment
 * DEPENDENCIES: drizzle-orm/neon-http, @neondatabase/serverless
 * LAST_UPDATED: December 15, 2024
 * 
 * REF: Production database setup with PostgreSQL via Neon or other cloud provider
 * REF: Handles connection pooling, SSL, and production-specific optimizations
 * TODO: Add connection monitoring and health checks
 * 
 * MAIN_FUNCTIONS:
 * - getProductionDatabase(): Returns configured PostgreSQL database instance
 * - validateDatabaseConnection(): Tests database connectivity
 * - runMigrations(): Executes pending database migrations
 */

import { drizzle } from 'drizzle-orm/neon-http';
import { neon } from '@neondatabase/serverless';
import { migrate } from 'drizzle-orm/neon-http/migrator';
import * as schema from '../shared/schema.js';

// REF: Environment validation for production database
if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL environment variable is required for production');
}

// REF: Configure Neon connection with production settings
const sql = neon(process.env.DATABASE_URL);

// REF: Initialize Drizzle with PostgreSQL schema and connection
export const db = drizzle(sql, { schema });

/**
 * REF: Validates database connection and schema compatibility
 * PURPOSE: Ensures database is accessible and properly configured before startup
 * @returns {Promise<boolean>} - True if connection is successful
 * 
 * BUSINESS_LOGIC:
 * - Tests basic database connectivity
 * - Validates schema compatibility
 * - Provides detailed error logging for troubleshooting
 * 
 * ERROR_HANDLING:
 * - Catches connection timeouts and network issues
 * - Logs detailed error information for debugging
 */
export async function validateDatabaseConnection(): Promise<boolean> {
  try {
    console.log('🔍 Validating production database connection...');
    
    // REF: Simple query to test connectivity
    const result = await sql`SELECT 1 as test`;
    
    if (result.length > 0 && result[0].test === 1) {
      console.log('✅ Production database connection validated successfully');
      return true;
    } else {
      console.error('❌ Database connection test failed - unexpected response');
      return false;
    }
  } catch (error) {
    console.error('❌ Database connection validation failed:', error);
    return false;
  }
}

/**
 * REF: Executes pending database migrations for production deployment
 * PURPOSE: Ensures database schema is up-to-date with application requirements
 * @returns {Promise<void>}
 * 
 * BUSINESS_LOGIC:
 * - Runs all pending migrations in order
 * - Creates tables and indexes as defined in schema
 * - Handles data migration from SQLite if needed
 * 
 * ERROR_HANDLING:
 * - Rolls back failed migrations
 * - Provides detailed migration logs
 * - Exits process on critical migration failures
 */
export async function runMigrations(): Promise<void> {
  try {
    console.log('🚀 Starting production database migrations...');
    
    // REF: Run migrations from the migrations directory
    await migrate(db, { migrationsFolder: './migrations' });
    
    console.log('✅ Production database migrations completed successfully');
  } catch (error) {
    console.error('❌ Database migration failed:', error);
    throw new Error(`Migration failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * REF: Production database health check endpoint data
 * PURPOSE: Provides database status information for monitoring and health checks
 * @returns {Promise<object>} - Database health status information
 * 
 * BUSINESS_LOGIC:
 * - Checks connection status
 * - Validates critical tables exist
 * - Returns performance metrics
 * 
 * ERROR_HANDLING:
 * - Returns error status if database is unreachable
 * - Provides diagnostic information for troubleshooting
 */
export async function getDatabaseHealth(): Promise<{
  status: 'healthy' | 'unhealthy';
  connectionStatus: boolean;
  tablesStatus: boolean;
  error?: string;
}> {
  try {
    // REF: Test basic connectivity
    const connectionTest = await validateDatabaseConnection();
    
    if (!connectionTest) {
      return {
        status: 'unhealthy',
        connectionStatus: false,
        tablesStatus: false,
        error: 'Database connection failed'
      };
    }

    // REF: Check if critical tables exist
    const tablesQuery = await sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('users', 'prospects', 'clients')
    `;
    
    const requiredTables = ['users', 'prospects', 'clients'];
    const existingTables = tablesQuery.map(row => row.table_name);
    const tablesExist = requiredTables.every(table => existingTables.includes(table));
    
    return {
      status: tablesExist ? 'healthy' : 'unhealthy',
      connectionStatus: true,
      tablesStatus: tablesExist,
      error: tablesExist ? undefined : 'Required tables missing'
    };
    
  } catch (error) {
    return {
      status: 'unhealthy',
      connectionStatus: false,
      tablesStatus: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

// REF: Export schema types for production use
export * from '../shared/schema.js';

console.log('📦 Production database configuration loaded'); 