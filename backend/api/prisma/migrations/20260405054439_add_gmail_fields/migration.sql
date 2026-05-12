-- AlterTable
ALTER TABLE "User" ADD COLUMN     "gmailAccessToken" TEXT,
ADD COLUMN     "gmailRefreshToken" TEXT,
ADD COLUMN     "gmailSyncedAt" TIMESTAMP(3),
ADD COLUMN     "gmailTokenExpiry" TIMESTAMP(3);
