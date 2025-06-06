/**
 * FILE: migrate-data.ts
 * PURPOSE: Data migration script from SQLite (development) to PostgreSQL (production)
 * DEPENDENCIES: dotenv, better-sqlite3, @neondatabase/serverless
 * LAST_UPDATED: December 15, 2024
 * 
 * REF: Handles complete data migration from development SQLite to production PostgreSQL
 * REF: Uses direct SQL queries for reliability and simplicity
 * TODO: Add rollback mechanism and data validation
 * 
 * MAIN_FUNCTIONS:
 * - migrateData(): Main migration orchestrator
 * - migrateTables(): Migrates all tables using direct SQL
 */

import dotenv from 'dotenv';
import Database from 'better-sqlite3';
import { neon } from '@neondatabase/serverless';

// REF: Load environment variables for database connections
dotenv.config();

// REF: Validate required environment variables
if (!process.env.DATABASE_URL) {
  console.error('❌ DATABASE_URL environment variable is required for production migration');
  process.exit(1);
}

// REF: Database connections
const sqliteDb = new Database('local.db');
const sql = neon(process.env.DATABASE_URL);

/**
 * REF: Migration statistics tracking
 * PURPOSE: Track migration progress and results for reporting
 */
interface MigrationStats {
  [tableName: string]: { total: number; migrated: number; errors: number };
}

let migrationStats: MigrationStats = {};

/**
 * REF: Validates PostgreSQL connection and runs migrations
 * PURPOSE: Ensures PostgreSQL is ready for data migration
 * @returns {Promise<void>}
 */
async function setupPostgresql(): Promise<void> {
  console.log('🔍 Validating PostgreSQL connection...');
  
  try {
    // REF: Test connection
    const result = await sql`SELECT 1 as test`;
    if (result.length === 0 || result[0].test !== 1) {
      throw new Error('PostgreSQL connection test failed');
    }
    console.log('✅ PostgreSQL connection validated');
    
    // REF: Check if tables exist, if not create them
    console.log('📋 Checking PostgreSQL schema...');
    const tables = await sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `;
    
    if (tables.length === 0) {
      console.log('🚀 Running database migrations...');
      // REF: Read and execute migration file
      const fs = await import('fs');
      const migrationSql = fs.readFileSync('./migrations/0000_green_thanos.sql', 'utf8');
      
      // REF: Split by statement-breakpoint and execute each statement
      const statements = migrationSql.split('--> statement-breakpoint').filter(stmt => stmt.trim());
      
      for (const statement of statements) {
        const cleanStatement = statement.trim();
        if (cleanStatement) {
          await sql.transaction(async (tx) => {
            await tx.unsafe(cleanStatement);
          });
        }
      }
      console.log('✅ Database migrations completed');
    } else {
      console.log('✅ PostgreSQL schema already exists');
    }
    
  } catch (error) {
    console.error('❌ PostgreSQL setup failed:', error);
    throw error;
  }
}

/**
 * REF: Migrates a single table from SQLite to PostgreSQL
 * PURPOSE: Generic table migration with proper data transformation
 * @param tableName - Name of the table to migrate
 * @returns {Promise<void>}
 */
async function migrateTable(tableName: string): Promise<void> {
  console.log(`📊 Migrating table: ${tableName}`);
  
  try {
    // REF: Fetch all records from SQLite
    const records = sqliteDb.prepare(`SELECT * FROM ${tableName}`).all();
    migrationStats[tableName] = { total: records.length, migrated: 0, errors: 0 };
    
    console.log(`   Found ${records.length} records in ${tableName}`);
    
    if (records.length === 0) {
      console.log(`   ✅ No records to migrate for ${tableName}`);
      return;
    }
    
    // REF: Transform and insert records
    for (const record of records) {
      try {
        // REF: Transform SQLite record for PostgreSQL
        const transformedRecord = transformRecord(record, tableName);
        
        // REF: Build INSERT query dynamically
        const columns = Object.keys(transformedRecord);
        const placeholders = columns.map((_, index) => `$${index + 1}`).join(', ');
        const values = Object.values(transformedRecord);
        
        const insertQuery = `
          INSERT INTO ${tableName} (${columns.join(', ')}) 
          VALUES (${placeholders})
          ON CONFLICT DO NOTHING
        `;
        
        await sql(insertQuery, values);
        migrationStats[tableName].migrated++;
        
      } catch (error) {
        migrationStats[tableName].errors++;
        console.error(`   ❌ Failed to migrate record in ${tableName}:`, error);
      }
    }
    
    console.log(`   ✅ ${tableName}: ${migrationStats[tableName].migrated}/${migrationStats[tableName].total} migrated`);
    
  } catch (error) {
    console.error(`❌ Table migration failed for ${tableName}:`, error);
    throw error;
  }
}

/**
 * REF: Transforms SQLite record data for PostgreSQL compatibility
 * PURPOSE: Handles data type conversions and JSON parsing
 * @param record - SQLite record
 * @param tableName - Table name for specific transformations
 * @returns Transformed record for PostgreSQL
 */
function transformRecord(record: any, tableName: string): any {
  const transformed: any = {};
  
  for (const [key, value] of Object.entries(record)) {
    // REF: Handle boolean conversions (SQLite stores as 0/1, PostgreSQL needs true/false)
    if (key.includes('is_') || key.includes('_send') || key.includes('default')) {
      transformed[key] = value === 1 || value === true;
    }
    // REF: Handle JSON fields (SQLite stores as text, PostgreSQL expects objects)
    else if (key === 'research_results' || key === 'webhook_payload' || key === 'preferences' || key === 'sess') {
      if (value && typeof value === 'string') {
        try {
          transformed[key] = JSON.parse(value);
        } catch {
          transformed[key] = value; // Keep as string if parsing fails
        }
      } else {
        transformed[key] = value;
      }
    }
    // REF: Handle timestamp conversions
    else if (key.includes('_at') || key === 'expire') {
      if (value) {
        transformed[key] = new Date(value);
      } else {
        transformed[key] = null;
      }
    }
    // REF: Default: copy value as-is
    else {
      transformed[key] = value;
    }
  }
  
  return transformed;
}

/**
 * REF: Main migration orchestrator
 * PURPOSE: Coordinates the complete data migration process
 * @returns {Promise<void>}
 */
export async function migrateData(): Promise<void> {
  console.log('🚀 Starting data migration from SQLite to PostgreSQL...');
  console.log('='.repeat(60));
  
  try {
    // REF: Setup PostgreSQL
    await setupPostgresql();
    
    // REF: Migrate tables in dependency order
    const tablesToMigrate = [
      'users',           // Must be first (referenced by all other tables)
      'clients',         // Second (referenced by prospects, etc.)
      'prospects',       // After users and clients
      'csv_uploads',     // After users and clients
      'user_settings',   // After users and clients
      'replyio_accounts', // After users and clients
      'replyio_campaigns', // After replyio_accounts
      'sessions'         // Can be last (independent)
    ];
    
    for (const tableName of tablesToMigrate) {
      await migrateTable(tableName);
    }
    
    // REF: Generate migration report
    console.log('\n' + '='.repeat(60));
    console.log('📊 MIGRATION SUMMARY REPORT');
    console.log('='.repeat(60));
    
    const totalRecords = Object.values(migrationStats).reduce((sum, stat) => sum + stat.total, 0);
    const totalMigrated = Object.values(migrationStats).reduce((sum, stat) => sum + stat.migrated, 0);
    const totalErrors = Object.values(migrationStats).reduce((sum, stat) => sum + stat.errors, 0);
    
    console.log(`📈 Overall Results:`);
    console.log(`   Total Records: ${totalRecords}`);
    console.log(`   Successfully Migrated: ${totalMigrated}`);
    console.log(`   Errors: ${totalErrors}`);
    console.log(`   Success Rate: ${totalRecords > 0 ? ((totalMigrated / totalRecords) * 100).toFixed(2) : '0'}%`);
    
    console.log('\n📋 Detailed Results:');
    Object.entries(migrationStats).forEach(([table, stats]) => {
      const successRate = stats.total > 0 ? ((stats.migrated / stats.total) * 100).toFixed(1) : '0';
      console.log(`   ${table}: ${stats.migrated}/${stats.total} (${successRate}%) - ${stats.errors} errors`);
    });
    
    if (totalErrors === 0) {
      console.log('\n🎉 Migration completed successfully with no errors!');
    } else {
      console.log(`\n⚠️  Migration completed with ${totalErrors} errors. Review logs above for details.`);
    }
    
  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    throw error;
  } finally {
    // REF: Close SQLite connection
    sqliteDb.close();
  }
}

// REF: Run migration if called directly
if (require.main === module) {
  migrateData()
    .then(() => {
      console.log('✅ Data migration completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Data migration failed:', error);
      process.exit(1);
    });
} 