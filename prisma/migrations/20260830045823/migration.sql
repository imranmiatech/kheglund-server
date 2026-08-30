-- AlterTable
ALTER TABLE "Announcement" ADD COLUMN     "coverImagePath" TEXT,
ADD COLUMN     "isBlog" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "isPinned" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "shareWithAnyone" BOOLEAN NOT NULL DEFAULT false;
