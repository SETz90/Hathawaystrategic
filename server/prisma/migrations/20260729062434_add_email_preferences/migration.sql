-- AlterTable
ALTER TABLE "User" ADD COLUMN     "emailNotifyFiles" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "emailNotifyMessages" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "emailNotifyProjectCompleted" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "emailNotifyProjectUpdates" BOOLEAN NOT NULL DEFAULT true;
