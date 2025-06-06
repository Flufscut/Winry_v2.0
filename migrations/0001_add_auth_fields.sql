-- Add authentication fields to users table
ALTER TABLE "users" ADD COLUMN "password_hash" varchar;
ALTER TABLE "users" ADD COLUMN "oauth_provider" varchar;
ALTER TABLE "users" ADD COLUMN "oauth_id" varchar; 