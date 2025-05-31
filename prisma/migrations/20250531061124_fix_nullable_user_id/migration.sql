-- This is an empty migration.

-- Make user_id nullable in creator_whitelist table
-- SQLite doesn't support ALTER COLUMN, so we need to recreate the table

-- Create a new table with the correct schema
CREATE TABLE "creator_whitelist_new" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "user_id" TEXT,
    "username" TEXT NOT NULL,
    "added_by" TEXT NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "creator_whitelist_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "creator_whitelist_added_by_fkey" FOREIGN KEY ("added_by") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- Copy data from old table to new table
INSERT INTO "creator_whitelist_new" ("id", "user_id", "username", "added_by", "created_at")
SELECT "id", "user_id", "username", "added_by", "created_at" FROM "creator_whitelist";

-- Drop old table
DROP TABLE "creator_whitelist";

-- Rename new table to original name
ALTER TABLE "creator_whitelist_new" RENAME TO "creator_whitelist";

-- Recreate indexes
CREATE UNIQUE INDEX "creator_whitelist_user_id_key" ON "creator_whitelist"("user_id");
CREATE UNIQUE INDEX "creator_whitelist_username_key" ON "creator_whitelist"("username");