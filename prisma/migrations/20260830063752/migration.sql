-- AlterTable
ALTER TABLE "NotificationPreference" ADD COLUMN     "adminAlerts" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "memberNotifications" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "paymentNotifications" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "userJoinNotification" BOOLEAN NOT NULL DEFAULT true;
