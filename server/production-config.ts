/**
 * FILE: production-config.ts
 * PURPOSE: Production deployment configuration and environment setup
 * DEPENDENCIES: dotenv
 * LAST_UPDATED: December 15, 2024
 * 
 * REF: Production environment configuration for Winry.AI deployment
 * REF: Handles PostgreSQL connection, security settings, and production optimizations
 * TODO: Add monitoring and alerting configuration
 * 
 * MAIN_FUNCTIONS:
 * - validateEnvironment(): Validates all required environment variables
 * - getProductionConfig(): Returns production configuration object
 * - initializeProduction(): Sets up production environment
 */

import dotenv from 'dotenv';

// REF: Load environment variables
dotenv.config();

/**
 * REF: Production environment configuration interface
 * PURPOSE: Type-safe configuration for production deployment
 */
export interface ProductionConfig {
  // Database configuration
  database: {
    url: string;
    ssl: boolean;
    poolSize: number;
    connectionTimeout: number;
  };
  
  // Server configuration
  server: {
    port: number;
    environment: string;
    corsOrigins: string[];
    sessionSecret: string;
    rateLimitMax: number;
  };
  
  // Security configuration
  security: {
    encryptionKey: string;
    jwtSecret: string;
    saltRounds: number;
    sessionMaxAge: number;
  };
  
  // External services
  services: {
    n8nWebhookUrl: string;
    replyIoBaseUrl: string;
    webhookTimeout: number;
  };
  
  // Monitoring and logging
  monitoring: {
    logLevel: string;
    enableMetrics: boolean;
    enableErrorTracking: boolean;
  };
}

/**
 * REF: Required environment variables for production
 * PURPOSE: Ensures all necessary configuration is provided
 */
const REQUIRED_ENV_VARS = [
  'DATABASE_URL',           // PostgreSQL connection string
  'SESSION_SECRET',         // Session encryption secret
  'ENCRYPTION_KEY',         // Data encryption key
  'JWT_SECRET',            // JWT signing secret
  'N8N_WEBHOOK_URL',       // n8n webhook endpoint
  'CORS_ORIGINS',          // Allowed CORS origins
] as const;

/**
 * REF: Optional environment variables with defaults
 * PURPOSE: Provides sensible defaults for optional configuration
 */
const DEFAULT_ENV_VALUES = {
  NODE_ENV: 'production',
  PORT: '5001',
  RATE_LIMIT_MAX: '100',
  SESSION_MAX_AGE: '86400000', // 24 hours
  SALT_ROUNDS: '12',
  LOG_LEVEL: 'info',
  ENABLE_METRICS: 'true',
  ENABLE_ERROR_TRACKING: 'true',
  WEBHOOK_TIMEOUT: '300000', // 5 minutes
  DB_POOL_SIZE: '10',
  DB_CONNECTION_TIMEOUT: '30000', // 30 seconds
  REPLY_IO_BASE_URL: 'https://api.reply.io'
} as const;

/**
 * REF: Validates that all required environment variables are present
 * PURPOSE: Prevents deployment with missing configuration
 * @returns {string[]} - Array of missing environment variables
 * 
 * BUSINESS_LOGIC:
 * - Checks each required environment variable
 * - Returns list of missing variables for error reporting
 * - Ensures production deployment safety
 * 
 * ERROR_HANDLING:
 * - Returns empty array if all variables are present
 * - Returns list of missing variables for detailed error reporting
 */
export function validateEnvironment(): string[] {
  const missingVars: string[] = [];
  
  for (const envVar of REQUIRED_ENV_VARS) {
    if (!process.env[envVar]) {
      missingVars.push(envVar);
    }
  }
  
  return missingVars;
}

/**
 * REF: Gets environment variable with fallback to default
 * PURPOSE: Provides type-safe environment variable access with defaults
 * @param key - Environment variable key
 * @param defaultValue - Default value if not set
 * @returns Environment variable value or default
 */
function getEnvVar(key: string, defaultValue: string): string {
  return process.env[key] || defaultValue;
}

/**
 * REF: Parses CORS origins from environment variable
 * PURPOSE: Handles comma-separated CORS origins configuration
 * @returns Array of allowed CORS origins
 */
function parseCorsOrigins(): string[] {
  const corsOrigins = process.env.CORS_ORIGINS || 'http://localhost:3000,http://localhost:5001';
  return corsOrigins.split(',').map(origin => origin.trim());
}

/**
 * REF: Creates production configuration object
 * PURPOSE: Centralizes all production configuration with type safety
 * @returns ProductionConfig object
 * 
 * BUSINESS_LOGIC:
 * - Validates environment variables first
 * - Constructs configuration object with defaults
 * - Provides type-safe access to all settings
 * 
 * ERROR_HANDLING:
 * - Throws error if required variables are missing
 * - Provides detailed error messages for debugging
 */
export function getProductionConfig(): ProductionConfig {
  // REF: Validate required environment variables
  const missingVars = validateEnvironment();
  if (missingVars.length > 0) {
    throw new Error(
      `Missing required environment variables for production: ${missingVars.join(', ')}\n` +
      'Please ensure all required environment variables are set before deploying to production.'
    );
  }
  
  return {
    database: {
      url: process.env.DATABASE_URL!,
      ssl: process.env.NODE_ENV === 'production',
      poolSize: parseInt(getEnvVar('DB_POOL_SIZE', DEFAULT_ENV_VALUES.DB_POOL_SIZE)),
      connectionTimeout: parseInt(getEnvVar('DB_CONNECTION_TIMEOUT', DEFAULT_ENV_VALUES.DB_CONNECTION_TIMEOUT))
    },
    
    server: {
      port: parseInt(getEnvVar('PORT', DEFAULT_ENV_VALUES.PORT)),
      environment: getEnvVar('NODE_ENV', DEFAULT_ENV_VALUES.NODE_ENV),
      corsOrigins: parseCorsOrigins(),
      sessionSecret: process.env.SESSION_SECRET!,
      rateLimitMax: parseInt(getEnvVar('RATE_LIMIT_MAX', DEFAULT_ENV_VALUES.RATE_LIMIT_MAX))
    },
    
    security: {
      encryptionKey: process.env.ENCRYPTION_KEY!,
      jwtSecret: process.env.JWT_SECRET!,
      saltRounds: parseInt(getEnvVar('SALT_ROUNDS', DEFAULT_ENV_VALUES.SALT_ROUNDS)),
      sessionMaxAge: parseInt(getEnvVar('SESSION_MAX_AGE', DEFAULT_ENV_VALUES.SESSION_MAX_AGE))
    },
    
    services: {
      n8nWebhookUrl: process.env.N8N_WEBHOOK_URL!,
      replyIoBaseUrl: getEnvVar('REPLY_IO_BASE_URL', DEFAULT_ENV_VALUES.REPLY_IO_BASE_URL),
      webhookTimeout: parseInt(getEnvVar('WEBHOOK_TIMEOUT', DEFAULT_ENV_VALUES.WEBHOOK_TIMEOUT))
    },
    
    monitoring: {
      logLevel: getEnvVar('LOG_LEVEL', DEFAULT_ENV_VALUES.LOG_LEVEL),
      enableMetrics: getEnvVar('ENABLE_METRICS', DEFAULT_ENV_VALUES.ENABLE_METRICS) === 'true',
      enableErrorTracking: getEnvVar('ENABLE_ERROR_TRACKING', DEFAULT_ENV_VALUES.ENABLE_ERROR_TRACKING) === 'true'
    }
  };
}

/**
 * REF: Initializes production environment with validation and logging
 * PURPOSE: Sets up production environment with proper validation and error handling
 * @returns Promise<ProductionConfig>
 * 
 * BUSINESS_LOGIC:
 * - Validates environment configuration
 * - Logs configuration summary (without secrets)
 * - Returns configuration for application use
 * 
 * ERROR_HANDLING:
 * - Throws detailed errors for missing configuration
 * - Provides configuration summary for debugging
 * - Masks sensitive values in logs
 */
export async function initializeProduction(): Promise<ProductionConfig> {
  console.log('🚀 Initializing production environment...');
  
  try {
    // REF: Get and validate production configuration
    const config = getProductionConfig();
    
    // REF: Log configuration summary (mask sensitive values)
    console.log('📋 Production Configuration Summary:');
    console.log(`   Environment: ${config.server.environment}`);
    console.log(`   Port: ${config.server.port}`);
    console.log(`   Database: PostgreSQL (${config.database.ssl ? 'SSL enabled' : 'SSL disabled'})`);
    console.log(`   CORS Origins: ${config.server.corsOrigins.length} configured`);
    console.log(`   Rate Limit: ${config.server.rateLimitMax} requests/window`);
    console.log(`   Session Max Age: ${config.security.sessionMaxAge / 1000}s`);
    console.log(`   Webhook Timeout: ${config.services.webhookTimeout / 1000}s`);
    console.log(`   Log Level: ${config.monitoring.logLevel}`);
    console.log(`   Metrics Enabled: ${config.monitoring.enableMetrics}`);
    console.log(`   Error Tracking: ${config.monitoring.enableErrorTracking}`);
    
    console.log('✅ Production environment initialized successfully');
    return config;
    
  } catch (error) {
    console.error('❌ Production environment initialization failed:', error);
    throw error;
  }
}

/**
 * REF: Environment variable checklist for deployment
 * PURPOSE: Provides deployment checklist for production environment
 */
export const DEPLOYMENT_CHECKLIST = {
  required: REQUIRED_ENV_VARS,
  optional: Object.keys(DEFAULT_ENV_VALUES),
  examples: {
    DATABASE_URL: 'postgresql://user:password@host:5432/database?sslmode=require',
    SESSION_SECRET: 'your-secure-session-secret-here',
    ENCRYPTION_KEY: 'your-32-character-encryption-key',
    JWT_SECRET: 'your-jwt-signing-secret',
    N8N_WEBHOOK_URL: 'https://your-n8n-instance.com/webhook/your-webhook-id',
    CORS_ORIGINS: 'https://your-domain.com,https://app.your-domain.com'
  }
} as const;

console.log('📦 Production configuration module loaded'); 