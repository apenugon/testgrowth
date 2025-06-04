-- AlterTable
ALTER TABLE "users" ADD COLUMN     "auth_provider" TEXT NOT NULL DEFAULT 'whop',
ADD COLUMN     "email_verified" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "password" TEXT,
ALTER COLUMN "whop_user_id" DROP NOT NULL;
