import { PrismaClient } from '@prisma/client';
import { PrismaLibSql } from '@prisma/adapter-libsql';
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';
import path from 'path';
import dotenv from 'dotenv';
dotenv.config();

function createPrismaClient() {
  const dbUrl = process.env.TURSO_DATABASE_URL || process.env.DATABASE_URL || 'file:./dev.db';

  if (dbUrl.startsWith('libsql://') || dbUrl.startsWith('https://') || dbUrl.startsWith('http://')) {
    const adapter = new PrismaLibSql({
      url: dbUrl,
      authToken: process.env.TURSO_AUTH_TOKEN,
    });
    return new PrismaClient({ adapter });
  } else {
    // Fallback to local SQLite file
    const localPath = dbUrl.startsWith('file:') ? dbUrl.substring(5) : dbUrl;
    const absolutePath = path.isAbsolute(localPath) ? localPath : path.join(process.cwd(), localPath);
    const adapter = new PrismaBetterSqlite3({ url: 'file:' + absolutePath });
    return new PrismaClient({ adapter });
  }
}
const prisma = createPrismaClient();

async function main() {
  console.log('🌱 Starting database seed...');

  // Define initial client sites
  const sites = [
    {
      id: 'gotolatest',
      name: 'GoToLatest',
      baseUrl: 'https://www.gotofriend.in',
    },
    {
      id: 'hehe',
      name: 'Raipur Podcast',
      baseUrl: 'https://raipurpodcast.in',
    },
    {
      id: 'sunnest',
      name: 'Sunnest',
      baseUrl: 'https://sunnest.com',
    },
  ];

  for (const site of sites) {
    // 1. Create or Update Client Site
    const clientSite = await prisma.clientSite.upsert({
      where: { id: site.id },
      update: { name: site.name, baseUrl: site.baseUrl },
      create: { id: site.id, name: site.name, baseUrl: site.baseUrl },
    });

    console.log(`✅ Seeded site: ${clientSite.name} (${clientSite.id})`);

    // 2. Create Default Homepage SEO Config
    await prisma.seoConfig.upsert({
      where: { siteId_path: { siteId: site.id, path: '/' } },
      update: {},
      create: {
        siteId: site.id,
        path: '/',
        title: `${site.name} - Official Website`,
        description: `Welcome to ${site.name}. Discover our latest content, updates, services, and digital marketing insights.`,
        canonicalUrl: site.baseUrl,
        robots: 'index, follow',
        ogTitle: `${site.name} - Home`,
        ogDescription: `Welcome to ${site.name}. Discover our latest content.`,
        ogType: 'website',
        twitterCard: 'summary_large_image',
        schemaMarkup: JSON.stringify({
          '@context': 'https://schema.org',
          '@type': 'Organization',
          'name': site.name,
          'url': site.baseUrl,
          'logo': `${site.baseUrl}/logo.png`,
        }, null, 2),
      },
    });

    // 3. Create Default Robots.txt Rules
    const existingRobots = await prisma.robotsRule.findFirst({
      where: { siteId: site.id }
    });
    if (!existingRobots) {
      await prisma.robotsRule.create({
        data: {
          siteId: site.id,
          userAgent: '*',
          allowPaths: '/',
          disallowPaths: '/admin,/api',
        },
      });
    }

    // 4. Create Default Tracker Config
    await prisma.trackerConfig.upsert({
      where: { siteId: site.id },
      update: {},
      create: {
        siteId: site.id,
        googleAnalyticsId: 'G-XXXXXXXXXX',
        metaPixelId: '1234567890',
        searchConsoleTag: `<meta name="google-site-verification" content="verification_token_${site.id}" />`,
        headerScripts: '<!-- Global Header Scripts -->',
        footerScripts: '<!-- Global Footer Scripts -->',
      },
    });

    // 5. Add a Demo Blog Post
    const demoBlogSlug = 'welcome-to-our-new-seo-journey';
    await prisma.blog.upsert({
      where: { siteId_slug: { siteId: site.id, slug: demoBlogSlug } },
      update: {},
      create: {
        siteId: site.id,
        title: 'Welcome to Our New SEO Journey!',
        slug: demoBlogSlug,
        summary: 'We are launching our centralized SEO control panel to supercharge our digital marketing results!',
        content: `<h2>Hello World!</h2><p>This is our first blog post served dynamically from our brand new central SEO Control Panel.</p><p>By managing SEO headers, social graph tags, schemas, and tracking pixels from one central place, we can execute highly cohesive SEO operations.</p>`,
        featuredImage: 'https://images.unsplash.com/photo-1432821596592-e2c18b78144f?w=800',
        published: true,
        category: 'Marketing',
        tags: 'SEO, Digital Marketing, Centralization',
        seoTitle: 'Welcome to Our New SEO Journey | SEO Blog',
        seoDescription: 'Discover how we are managing our digital marketing and search engine rankings dynamically.',
      },
    });

    // 6. Add a Demo Redirect Rule
    const sourceRedirect = '/old-home';
    await prisma.redirect.upsert({
      where: { siteId_sourcePath: { siteId: site.id, sourcePath: sourceRedirect } },
      update: {},
      create: {
        siteId: site.id,
        sourcePath: sourceRedirect,
        destinationPath: '/',
        statusCode: 301,
      },
    });
  }

  console.log('🎉 Database seeding complete!');
}

main()
  .catch((e) => {
    console.error('❌ Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
