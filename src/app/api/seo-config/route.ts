import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

// GET /api/seo-config?siteId=...&path=...
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const siteId = searchParams.get('siteId');
    const path = searchParams.get('path') || '/';

    if (!siteId) {
      return NextResponse.json({ error: 'siteId is required' }, { status: 400 });
    }

    // Fetch site config
    const seoConfig = await prisma.seoConfig.findUnique({
      where: {
        siteId_path: {
          siteId,
          path,
        },
      },
    });

    // Fetch site-wide tracker scripts
    const trackerConfig = await prisma.trackerConfig.findUnique({
      where: { siteId },
    });

    // If no page-specific config exists, fallback to home page config
    let finalConfig = seoConfig;
    if (!finalConfig && path !== '/') {
      finalConfig = await prisma.seoConfig.findUnique({
        where: {
          siteId_path: {
            siteId,
            path: '/',
          },
        },
      });
    }

    const responseData = {
      title: finalConfig?.title || 'Welcome',
      description: finalConfig?.description || '',
      canonicalUrl: finalConfig?.canonicalUrl || '',
      robots: finalConfig?.robots || 'index, follow',
      ogTitle: finalConfig?.ogTitle || finalConfig?.title || '',
      ogDescription: finalConfig?.ogDescription || finalConfig?.description || '',
      ogImage: finalConfig?.ogImage || '',
      ogType: finalConfig?.ogType || 'website',
      twitterCard: finalConfig?.twitterCard || 'summary_large_image',
      twitterTitle: finalConfig?.twitterTitle || finalConfig?.title || '',
      twitterDescription: finalConfig?.twitterDescription || finalConfig?.description || '',
      twitterImage: finalConfig?.twitterImage || '',
      schemaMarkup: finalConfig?.schemaMarkup || null,
      tracker: trackerConfig ? {
        googleAnalyticsId: trackerConfig.googleAnalyticsId,
        metaPixelId: trackerConfig.metaPixelId,
        searchConsoleTag: trackerConfig.searchConsoleTag,
        headerScripts: trackerConfig.headerScripts,
        footerScripts: trackerConfig.footerScripts,
      } : null,
    };

    return NextResponse.json(responseData);
  } catch (error: any) {
    console.error('Error fetching SEO config:', error);
    return NextResponse.json({ error: 'Internal server error', details: error.message }, { status: 500 });
  }
}

// POST /api/seo-config
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      siteId,
      path,
      title,
      description,
      canonicalUrl,
      robots,
      ogTitle,
      ogDescription,
      ogImage,
      ogType,
      twitterCard,
      twitterTitle,
      twitterDescription,
      twitterImage,
      schemaMarkup,
    } = body;

    if (!siteId || !path || !title) {
      return NextResponse.json({ error: 'siteId, path, and title are required' }, { status: 400 });
    }

    const updatedConfig = await prisma.seoConfig.upsert({
      where: {
        siteId_path: {
          siteId,
          path,
        },
      },
      update: {
        title,
        description,
        canonicalUrl,
        robots: robots || 'index, follow',
        ogTitle,
        ogDescription,
        ogImage,
        ogType: ogType || 'website',
        twitterCard: twitterCard || 'summary_large_image',
        twitterTitle,
        twitterDescription,
        twitterImage,
        schemaMarkup,
      },
      create: {
        siteId,
        path,
        title,
        description,
        canonicalUrl,
        robots: robots || 'index, follow',
        ogTitle,
        ogDescription,
        ogImage,
        ogType: ogType || 'website',
        twitterCard: twitterCard || 'summary_large_image',
        twitterTitle,
        twitterDescription,
        twitterImage,
        schemaMarkup,
      },
    });

    return NextResponse.json(updatedConfig);
  } catch (error: any) {
    console.error('Error saving SEO config:', error);
    return NextResponse.json({ error: 'Internal server error', details: error.message }, { status: 500 });
  }
}
