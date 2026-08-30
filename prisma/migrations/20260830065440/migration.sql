-- CreateTable
CREATE TABLE "AdminPaymentInfo" (
    "id" TEXT NOT NULL,
    "label" TEXT,
    "methodType" TEXT NOT NULL DEFAULT 'BANK_ACCOUNT',
    "providerName" TEXT,
    "bankName" TEXT,
    "accountHolderName" TEXT NOT NULL,
    "cardNumber" TEXT,
    "cardLast4" TEXT,
    "expiryMonth" INTEGER,
    "expiryYear" INTEGER,
    "accountNumber" TEXT NOT NULL,
    "routingNumber" TEXT,
    "iban" TEXT,
    "branchName" TEXT,
    "stripeConnectedAccountId" TEXT,
    "instructions" TEXT,
    "isDefault" BOOLEAN NOT NULL DEFAULT true,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AdminPaymentInfo_pkey" PRIMARY KEY ("id")
);
