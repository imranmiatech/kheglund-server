-- CreateTable
CREATE TABLE "SavedAnnouncement" (
    "userId" TEXT NOT NULL,
    "announcementId" TEXT NOT NULL,
    "savedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SavedAnnouncement_pkey" PRIMARY KEY ("userId", "announcementId")
);

-- AddForeignKey
ALTER TABLE "SavedAnnouncement" ADD CONSTRAINT "SavedAnnouncement_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SavedAnnouncement" ADD CONSTRAINT "SavedAnnouncement_announcementId_fkey" FOREIGN KEY ("announcementId") REFERENCES "Announcement"("id") ON DELETE CASCADE ON UPDATE CASCADE;
