-- CreateTable
CREATE TABLE "ClientSite" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "baseUrl" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "SeoConfig" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "siteId" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "canonicalUrl" TEXT,
    "robots" TEXT NOT NULL DEFAULT 'index, follow',
    "ogTitle" TEXT,
    "ogDescription" TEXT,
    "ogImage" TEXT,
    "ogType" TEXT NOT NULL DEFAULT 'website',
    "twitterCard" TEXT NOT NULL DEFAULT 'summary_large_image',
    "twitterTitle" TEXT,
    "twitterDescription" TEXT,
    "twitterImage" TEXT,
    "schemaMarkup" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "SeoConfig_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "ClientSite" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Blog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "siteId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "summary" TEXT,
    "featuredImage" TEXT,
    "published" BOOLEAN NOT NULL DEFAULT false,
    "category" TEXT,
    "tags" TEXT,
    "publishedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "seoTitle" TEXT,
    "seoDescription" TEXT,
    "seoOgImage" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Blog_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "ClientSite" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Redirect" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "siteId" TEXT NOT NULL,
    "sourcePath" TEXT NOT NULL,
    "destinationPath" TEXT NOT NULL,
    "statusCode" INTEGER NOT NULL DEFAULT 301,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Redirect_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "ClientSite" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "TrackerConfig" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "siteId" TEXT NOT NULL,
    "googleAnalyticsId" TEXT,
    "metaPixelId" TEXT,
    "searchConsoleTag" TEXT,
    "headerScripts" TEXT,
    "footerScripts" TEXT,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "TrackerConfig_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "ClientSite" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "RobotsRule" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "siteId" TEXT NOT NULL,
    "userAgent" TEXT NOT NULL DEFAULT '*',
    "allowPaths" TEXT,
    "disallowPaths" TEXT,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "RobotsRule_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "ClientSite" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Lead" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "siteId" TEXT NOT NULL,
    "formName" TEXT NOT NULL DEFAULT 'Contact Form',
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "message" TEXT,
    "metadata" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Lead_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "ClientSite" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "SeoConfig_siteId_path_key" ON "SeoConfig"("siteId", "path");

-- CreateIndex
CREATE UNIQUE INDEX "Blog_siteId_slug_key" ON "Blog"("siteId", "slug");

-- CreateIndex
CREATE UNIQUE INDEX "Redirect_siteId_sourcePath_key" ON "Redirect"("siteId", "sourcePath");

-- CreateIndex
CREATE UNIQUE INDEX "TrackerConfig_siteId_key" ON "TrackerConfig"("siteId");
