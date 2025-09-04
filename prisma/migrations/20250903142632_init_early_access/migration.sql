-- CreateTable
CREATE TABLE "EarlyAccessCampaign" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "shop" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "secretKey" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "targetType" TEXT NOT NULL,
    "targetId" TEXT NOT NULL,
    "emailProvider" TEXT,
    "emailApiKey" TEXT,
    "emailListId" TEXT,
    "backgroundColor" TEXT NOT NULL DEFAULT '#ffffff',
    "textColor" TEXT NOT NULL DEFAULT '#000000',
    "buttonColor" TEXT NOT NULL DEFAULT '#007cba',
    "customMessage" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "EarlyAccessSignup" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "campaignId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "firstName" TEXT,
    "lastName" TEXT,
    "phone" TEXT,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "referrer" TEXT,
    "syncedToEmail" BOOLEAN NOT NULL DEFAULT false,
    "syncedAt" DATETIME,
    "emailProvider" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "EarlyAccessSignup_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "EarlyAccessCampaign" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "EmailIntegration" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "shop" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "apiKey" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "EarlyAccessCampaign_secretKey_key" ON "EarlyAccessCampaign"("secretKey");

-- CreateIndex
CREATE INDEX "EarlyAccessCampaign_shop_idx" ON "EarlyAccessCampaign"("shop");

-- CreateIndex
CREATE INDEX "EarlyAccessCampaign_secretKey_idx" ON "EarlyAccessCampaign"("secretKey");

-- CreateIndex
CREATE INDEX "EarlyAccessSignup_email_idx" ON "EarlyAccessSignup"("email");

-- CreateIndex
CREATE INDEX "EarlyAccessSignup_createdAt_idx" ON "EarlyAccessSignup"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "EarlyAccessSignup_campaignId_email_key" ON "EarlyAccessSignup"("campaignId", "email");

-- CreateIndex
CREATE UNIQUE INDEX "EmailIntegration_shop_key" ON "EmailIntegration"("shop");
