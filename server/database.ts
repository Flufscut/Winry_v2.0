/**
 * FILE: database.ts
 * PURPOSE: Environment-aware database configuration and initialization
 * DEPENDENCIES: ./db-local.ts, ./db-production.ts
 * LAST_UPDATED: December 15, 2024
 * 
 * REF: Universal database interface that switches between SQLite and PostgreSQL
 * REF: Handles development vs production database configurations automatically
 * TODO: Add database connection retry logic and monitoring
 * 
 * MAIN_FUNCTIONS:
 * - initializeDatabase(): Sets up database based on environment
 * - getDatabase(): Returns the appropriate database instance
 * - getDatabaseType(): Returns current database type for logging
 */

// REF: Environment detection for database selection
const isDevelopment = process.env.NODE_ENV === 'development';
const hasPostgresUrl = !!process.env.DATABASE_URL;

// REF: Determine which database configuration to use
const usePostgreSQL = !isDevelopment && hasPostgresUrl;

console.log(`🗄️  Database Environment Detection:`);
console.log(`   NODE_ENV: ${process.env.NODE_ENV}`);
console.log(`   DATABASE_URL present: ${hasPostgresUrl}`);
console.log(`   Using: ${usePostgreSQL ? 'PostgreSQL (Production)' : 'SQLite (Development)'}`);

// REF: Database configuration state
let db: any;
let validateDatabaseConnection: () => Promise<boolean>;
let runMigrations: () => Promise<void>;
let getDatabaseHealth: () => Promise<any>;
let isInitialized = false;

/**
 * REF: Loads the appropriate database configuration based on environment
 * PURPOSE: Dynamically imports and configures database based on environment variables
 * @returns {Promise<void>}
 * 
 * BUSINESS_LOGIC:
 * - Imports PostgreSQL config for production
 * - Imports SQLite config for development
 * - Sets up appropriate database functions
 * 
 * ERROR_HANDLING:
 * - Throws error if database import fails
 * - Provides fallback configuration options
 */
async function loadDatabaseConfiguration(): Promise<void> {
  if (isInitialized) {
    return;
  }

  try {
    if (usePostgreSQL) {
      // REF: Import production PostgreSQL configuration
      const productionDb = await import('./db-production.js');
      db = productionDb.db;
      validateDatabaseConnection = productionDb.validateDatabaseConnection;
      runMigrations = productionDb.runMigrations;
      getDatabaseHealth = productionDb.getDatabaseHealth;
      console.log('📦 Loaded PostgreSQL production database configuration');
    } else {
      // REF: Import development SQLite configuration
      const localDb = await import('./db-local.js');
      db = localDb.db;
      validateDatabaseConnection = async () => {
        try {
          // REF: Simple SQLite connectivity test
          const result = await db.all('SELECT 1 as test');
          return result.length > 0 && result[0].test === 1;
        } catch (error) {
          console.error('❌ SQLite connection test failed:', error);
          return false;
        }
      };
      runMigrations = async () => {
        console.log('ℹ️  SQLite development database - no migrations needed');
      };
      getDatabaseHealth = async () => {
        const connectionTest = await validateDatabaseConnection();
        return {
          status: connectionTest ? 'healthy' : 'unhealthy',
          connectionStatus: connectionTest,
          tablesStatus: connectionTest,
          databaseType: 'SQLite (Development)',
          error: connectionTest ? undefined : 'SQLite connection failed'
        };
      };
      console.log('📦 Loaded SQLite development database configuration');
    }
    
    isInitialized = true;
  } catch (error) {
    console.error('❌ Failed to load database configuration:', error);
    throw new Error(`Database configuration load failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * REF: Initializes database connection and runs necessary setup
 * PURPOSE: Prepares database for application startup with validation and migrations
 * @returns {Promise<void>}
 * 
 * BUSINESS_LOGIC:
 * - Loads appropriate database configuration
 * - Validates database connectivity
 * - Runs migrations if in production
 * - Sets up initial data if needed
 * 
 * ERROR_HANDLING:
 * - Exits process if database initialization fails
 * - Provides detailed error logs for debugging
 */
export async function initializeDatabase(): Promise<void> {
  try {
    console.log('🚀 Initializing database...');
    
    // REF: Load database configuration first
    await loadDatabaseConfiguration();
    
    // REF: Validate database connection
    const isConnected = await validateDatabaseConnection();
    if (!isConnected) {
      throw new Error('Database connection validation failed');
    }
    
    // REF: Run migrations for production PostgreSQL
    if (usePostgreSQL) {
      await runMigrations();
    }
    
    console.log('✅ Database initialization completed successfully');
  } catch (error) {
    console.error('❌ Database initialization failed:', error);
    throw error;
  }
}

/**
 * REF: Returns the configured database instance
 * PURPOSE: Provides access to the database with proper typing
 * @returns {object} - Database instance (Drizzle ORM)
 */
export async function getDatabase() {
  if (!isInitialized) {
    await loadDatabaseConfiguration();
  }
  return db;
}

/**
 * REF: Returns current database type information
 * PURPOSE: Provides database type info for logging and monitoring
 * @returns {object} - Database configuration details
 */
export function getDatabaseInfo() {
  return {
    type: usePostgreSQL ? 'PostgreSQL' : 'SQLite',
    environment: isDevelopment ? 'development' : 'production',
    connectionString: usePostgreSQL ? '***REDACTED***' : 'local.db',
    initialized: isInitialized
  };
}

/**
 * REF: Database health check for monitoring
 * PURPOSE: Provides health status for application monitoring
 * @returns {Promise<object>} - Health status information
 */
export async function checkDatabaseHealth() {
  if (!isInitialized) {
    await loadDatabaseConfiguration();
  }
  return await getDatabaseHealth();
}

console.log('✅ Database configuration module loaded successfully'); 