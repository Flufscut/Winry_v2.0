# Winry.AI Production Deployment Guide

## 🚀 Overview

This guide provides step-by-step instructions for deploying Winry.AI to production with PostgreSQL database, including environment configuration, database migration, and security setup.

## 📋 Prerequisites

### Required Services
- **PostgreSQL Database** (Neon, Supabase, AWS RDS, or self-hosted)
- **Node.js Runtime** (v18+ recommended)
- **n8n Instance** for AI research workflows
- **Reply.io Account** (optional, for outreach integration)

### Development Environment
- Ensure your local development environment is working
- Have access to your current SQLite database (`local.db`)
- Backup your current data before migration

## 🔧 Step 1: Environment Configuration

### Required Environment Variables

Create a `.env` file in your production environment with the following variables:

```bash
# Database Configuration
DATABASE_URL=postgresql://username:password@hostname:5432/database_name?sslmode=require

# Security Configuration
SESSION_SECRET=your-secure-session-secret-minimum-32-characters
ENCRYPTION_KEY=your-32-character-encryption-key-here
JWT_SECRET=your-jwt-signing-secret-for-tokens

# External Services
N8N_WEBHOOK_URL=https://your-n8n-instance.app.n8n.cloud/webhook/your-webhook-id
CORS_ORIGINS=https://your-domain.com,https://app.your-domain.com

# Optional Configuration (with defaults)
NODE_ENV=production
PORT=5001
RATE_LIMIT_MAX=100
SESSION_MAX_AGE=86400000
LOG_LEVEL=info
ENABLE_METRICS=true
ENABLE_ERROR_TRACKING=true
WEBHOOK_TIMEOUT=300000
DB_POOL_SIZE=10
DB_CONNECTION_TIMEOUT=30000
REPLY_IO_BASE_URL=https://api.reply.io
```

### Environment Variable Details

| Variable | Description | Example |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string with SSL | `postgresql://user:pass@host:5432/db?sslmode=require` |
| `SESSION_SECRET` | Secret for session encryption (32+ chars) | `your-secure-session-secret-here` |
| `ENCRYPTION_KEY` | Key for data encryption (32 characters) | `abcdef1234567890abcdef1234567890` |
| `JWT_SECRET` | Secret for JWT token signing | `your-jwt-secret` |
| `N8N_WEBHOOK_URL` | n8n webhook endpoint for AI research | `https://n8n.example.com/webhook/abc123` |
| `CORS_ORIGINS` | Comma-separated allowed origins | `https://app.example.com,https://example.com` |

## 🗄️ Step 2: Database Setup

### Option A: Using Neon (Recommended)

1. **Create Neon Account**
   - Go to [neon.tech](https://neon.tech)
   - Create a new project
   - Copy the connection string

2. **Configure Database**
   ```bash
   # Your DATABASE_URL should look like:
   DATABASE_URL=postgresql://username:password@ep-xyz.us-east-1.neon.tech/dbname?sslmode=require
   ```

### Option B: Using Supabase

1. **Create Supabase Project**
   - Go to [supabase.com](https://supabase.com)
   - Create new project
   - Get PostgreSQL connection string from Settings > Database

2. **Configure Database**
   ```bash
   # Your DATABASE_URL should look like:
   DATABASE_URL=postgresql://postgres.xyz:password@aws-0-region.pooler.supabase.com:5432/postgres
   ```

### Option C: Self-Hosted PostgreSQL

1. **Install PostgreSQL**
   ```bash
   # Ubuntu/Debian
   sudo apt update
   sudo apt install postgresql postgresql-contrib
   
   # macOS
   brew install postgresql
   ```

2. **Create Database**
   ```bash
   sudo -u postgres createdb winryai_production
   sudo -u postgres createuser winryai_user
   sudo -u postgres psql -c "ALTER USER winryai_user WITH PASSWORD 'secure_password';"
   sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE winryai_production TO winryai_user;"
   ```

## 🔄 Step 3: Database Migration

### Automatic Migration (Recommended)

The application will automatically run migrations on startup when using PostgreSQL:

1. **Install Dependencies**
   ```bash
   npm install @neondatabase/serverless
   ```

2. **Run Application**
   ```bash
   NODE_ENV=production DATABASE_URL="your-postgres-url" npm start
   ```

The application will:
- Validate PostgreSQL connection
- Create all required tables and indexes
- Set up proper constraints and relationships

### Manual Migration (Alternative)

If you prefer manual migration:

1. **Generate Migration**
   ```bash
   DATABASE_URL="your-postgres-url" npx drizzle-kit generate
   ```

2. **Apply Migration**
   ```bash
   DATABASE_URL="your-postgres-url" npx drizzle-kit migrate
   ```

## 📊 Step 4: Data Migration (Optional)

If you have existing data in SQLite, you can migrate it to PostgreSQL:

1. **Backup Current Data**
   ```bash
   cp local.db local.db.backup
   ```

2. **Use Migration Script**
   ```bash
   # Note: Complex migration script available in scripts/migrate-data.ts
   # Requires manual setup due to data transformation complexity
   ```

3. **Verify Migration**
   - Check that all tables exist in PostgreSQL
   - Verify data integrity
   - Test application functionality

## 🚀 Step 5: Production Deployment

### Option A: Replit Deployment

1. **Import Project to Replit**
   - Upload your project to Replit
   - Set environment variables in Secrets tab
   - Run the application

2. **Configure Secrets**
   ```
   DATABASE_URL=your-postgresql-url
   SESSION_SECRET=your-session-secret
   ENCRYPTION_KEY=your-encryption-key
   JWT_SECRET=your-jwt-secret
   N8N_WEBHOOK_URL=your-n8n-webhook
   CORS_ORIGINS=your-allowed-origins
   ```

### Option B: VPS/Cloud Deployment

1. **Install Dependencies**
   ```bash
   npm install
   npm run build
   ```

2. **Start Production Server**
   ```bash
   NODE_ENV=production npm start
   ```

3. **Use Process Manager (Recommended)**
   ```bash
   # Install PM2
   npm install -g pm2
   
   # Start application
   pm2 start npm --name "winryai" -- start
   
   # Save PM2 config
   pm2 save
   pm2 startup
   ```

### Option C: Docker Deployment

1. **Create Dockerfile**
   ```dockerfile
   FROM node:18-alpine
   WORKDIR /app
   COPY package*.json ./
   RUN npm ci --only=production
   COPY . .
   RUN npm run build
   EXPOSE 5001
   CMD ["npm", "start"]
   ```

2. **Build and Run**
   ```bash
   docker build -t winryai .
   docker run -p 5001:5001 --env-file .env winryai
   ```

## 🔒 Step 6: Security Configuration

### SSL/HTTPS Setup

1. **Use Reverse Proxy (Nginx)**
   ```nginx
   server {
       listen 443 ssl;
       server_name your-domain.com;
       
       ssl_certificate /path/to/cert.pem;
       ssl_certificate_key /path/to/key.pem;
       
       location / {
           proxy_pass http://localhost:5001;
           proxy_set_header Host $host;
           proxy_set_header X-Real-IP $remote_addr;
       }
   }
   ```

2. **Use Cloud Load Balancer**
   - Configure SSL termination at load balancer
   - Forward traffic to application instances

### Firewall Configuration

```bash
# Allow only necessary ports
sudo ufw allow 22    # SSH
sudo ufw allow 80    # HTTP
sudo ufw allow 443   # HTTPS
sudo ufw enable
```

## 📈 Step 7: Monitoring and Logging

### Application Monitoring

1. **Health Check Endpoint**
   ```bash
   curl https://your-domain.com/api/health
   ```

2. **Database Health Check**
   ```bash
   curl https://your-domain.com/api/db-health
   ```

### Log Management

1. **Application Logs**
   ```bash
   # PM2 logs
   pm2 logs winryai
   
   # Docker logs
   docker logs container_name
   ```

2. **Database Monitoring**
   - Monitor connection pool usage
   - Track query performance
   - Set up alerts for downtime

## 🛠️ Step 8: Post-Deployment Verification

### Functional Testing

1. **Authentication System**
   - Test user login/logout
   - Verify session management

2. **Core Features**
   - Create test prospect
   - Upload CSV file
   - Verify n8n webhook integration
   - Test Reply.io integration (if configured)

3. **Multi-Tenant System**
   - Create multiple client workspaces
   - Verify data isolation
   - Test workspace switching

### Performance Testing

1. **Load Testing**
   ```bash
   # Use artillery or similar tool
   npm install -g artillery
   artillery quick --count 10 --num 50 https://your-domain.com/api/health
   ```

2. **Database Performance**
   - Monitor query execution times
   - Check connection pool usage
   - Verify index performance

## 🔧 Troubleshooting

### Common Issues

1. **Database Connection Errors**
   ```bash
   # Check connection string format
   # Verify SSL requirements
   # Test connection manually
   psql "postgresql://user:pass@host:5432/db?sslmode=require"
   ```

2. **Migration Failures**
   ```bash
   # Check table conflicts
   # Verify permissions
   # Review migration logs
   ```

3. **Authentication Issues**
   ```bash
   # Verify SESSION_SECRET is set
   # Check CORS configuration
   # Validate JWT_SECRET
   ```

### Support Contacts

- **Technical Issues**: Check logs and error messages
- **Database Issues**: Verify connection and permissions
- **Performance Issues**: Monitor resource usage

## 📝 Maintenance

### Regular Tasks

1. **Database Backups**
   ```bash
   # Automated backups (depends on provider)
   # Manual backup
   pg_dump "postgresql://user:pass@host:5432/db" > backup.sql
   ```

2. **Security Updates**
   ```bash
   npm audit
   npm update
   ```

3. **Log Rotation**
   ```bash
   # Configure logrotate
   # Monitor disk usage
   ```

### Scaling Considerations

1. **Horizontal Scaling**
   - Use load balancer
   - Deploy multiple instances
   - Share session store (Redis)

2. **Database Scaling**
   - Read replicas
   - Connection pooling
   - Query optimization

---

## 🎉 Deployment Complete!

Your Winry.AI application should now be running in production with:

- ✅ PostgreSQL database with proper schema
- ✅ Environment variables configured
- ✅ Security settings applied
- ✅ Monitoring and logging enabled
- ✅ All core features functional

For additional support or questions, refer to the application logs and monitoring dashboards. 