-- CreateEnum
CREATE TYPE "RevokeReason" AS ENUM ('ROTATED', 'LOGOUT', 'REUSE_DETECTED');

-- AlterTable
ALTER TABLE "refresh_tokens" ADD COLUMN     "revokedReason" "RevokeReason";
