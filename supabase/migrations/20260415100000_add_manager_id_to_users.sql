-- Add manager_id column to users table for direct manager tracking
ALTER TABLE users ADD COLUMN manager_id uuid REFERENCES users(id) ON DELETE SET NULL;

-- Index for efficient "who reports to X" queries
CREATE INDEX idx_users_manager_id ON users(manager_id);

COMMENT ON COLUMN users.manager_id IS 'Direct manager of this user (nullable, self-referential)';
