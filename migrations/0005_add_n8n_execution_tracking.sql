-- Migration: Add n8n execution tracking to prospects table
-- Purpose: Enable real-time monitoring of n8n workflow executions
-- Date: June 8, 2025

-- Add n8n execution tracking field
ALTER TABLE prospects ADD COLUMN n8nExecutionId TEXT;

-- Add index for faster queries on execution ID
CREATE INDEX IF NOT EXISTS idx_prospects_n8n_execution_id ON prospects(n8nExecutionId);

-- Add execution timestamps for better tracking
ALTER TABLE prospects ADD COLUMN n8nStartedAt TEXT;
ALTER TABLE prospects ADD COLUMN n8nCompletedAt TEXT;

-- Add indexes for timestamp queries
CREATE INDEX IF NOT EXISTS idx_prospects_n8n_started_at ON prospects(n8nStartedAt);
CREATE INDEX IF NOT EXISTS idx_prospects_n8n_completed_at ON prospects(n8nCompletedAt); 