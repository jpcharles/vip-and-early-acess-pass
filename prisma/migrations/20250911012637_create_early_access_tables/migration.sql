-- CreateEnum
CREATE TYPE "public"."AccessType" AS ENUM ('PASSWORD', 'SECRET_LINK', 'EMAIL_SIGNUP', 'PASSWORD_OR_SIGNUP');

-- CreateTable
CREATE TABLE "public"."Session" (
    "id" TEXT NOT NULL,
    "shop" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "isOnline" BOOLEAN NOT NULL DEFAULT false,
    "scope" TEXT,
    "expires" TIMESTAMP(3),
    "accessToken" TEXT NOT NULL,
    "userId" BIGINT,
    "firstName" TEXT,
    "lastName" TEXT,
    "email" TEXT,
    "accountOwner" BOOLEAN NOT NULL DEFAULT false,
    "locale" TEXT,
    "collaborator" BOOLEAN,
    "emailVerified" BOOLEAN DEFAULT false,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."early_access_campaigns" (
    "id" TEXT NOT NULL,
    "shop" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "accessType" "public"."AccessType" NOT NULL DEFAULT 'PASSWORD',
    "password" TEXT,
    "secretLink" TEXT,
    "productIds" TEXT[],
    "collectionIds" TEXT[],
    "klaviyoListId" TEXT,
    "omnisendListId" TEXT,
    "autoTagEnabled" BOOLEAN NOT NULL DEFAULT true,
    "tagName" TEXT NOT NULL DEFAULT 'VIP Early Access',
    "customMessage" TEXT,
    "redirectUrl" TEXT,
    "expiresAt" TIMESTAMP(3),

    CONSTRAINT "early_access_campaigns_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."early_access_signups" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "firstName" TEXT,
    "lastName" TEXT,
    "phone" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "klaviyoSynced" BOOLEAN NOT NULL DEFAULT false,
    "omnisendSynced" BOOLEAN NOT NULL DEFAULT false,
    "syncError" TEXT,
    "lastSyncAttempt" TIMESTAMP(3),

    CONSTRAINT "early_access_signups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."gated_pages" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "shop" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "metaTitle" TEXT,
    "metaDescription" TEXT,
    "ogImage" TEXT,

    CONSTRAINT "gated_pages_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "early_access_campaigns_secretLink_key" ON "public"."early_access_campaigns"("secretLink");

-- CreateIndex
CREATE UNIQUE INDEX "early_access_signups_campaignId_email_key" ON "public"."early_access_signups"("campaignId", "email");

-- CreateIndex
CREATE UNIQUE INDEX "gated_pages_slug_key" ON "public"."gated_pages"("slug");

-- AddForeignKey
ALTER TABLE "public"."early_access_signups" ADD CONSTRAINT "early_access_signups_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "public"."early_access_campaigns"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."gated_pages" ADD CONSTRAINT "gated_pages_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "public"."early_access_campaigns"("id") ON DELETE CASCADE ON UPDATE CASCADE;
