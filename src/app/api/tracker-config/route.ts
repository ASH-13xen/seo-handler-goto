import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

// GET /api/tracker-config?siteId=...
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const siteId = searchParams.get('siteId');

    if (!siteId) {
      return NextResponse.json({ error: 'siteId is required' }, { status: 400 });
    }

    const config = await prisma.trackerConfig.findUnique({
      where: { siteId },
    });

    if (!config) {
      return NextResponse.json({ message: 'No tracking configuration found' }, { status: 404 });
    }

    return NextResponse.json(config);
  } catch (error: any) {
    console.error('Error fetching tracker config:', error);
    return NextResponse.json({ error: 'Internal server error', details: error.message }, { status: 500 });
  }
}

// POST /api/tracker-config
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      siteId,
      googleAnalyticsId,
      metaPixelId,
      searchConsoleTag,
      headerScripts,
      footerScripts,
    } = body;

    if (!siteId) {
      return NextResponse.json({ error: 'siteId is required' }, { status: 400 });
    }

    const config = await prisma.trackerConfig.upsert({
      where: { siteId },
      update: {
        googleAnalyticsId,
        metaPixelId,
        searchConsoleTag,
        headerScripts,
        footerScripts,
      },
      create: {
        siteId,
        googleAnalyticsId,
        metaPixelId,
        searchConsoleTag,
        headerScripts,
        footerScripts,
      },
    });

    return NextResponse.json(config);
  } catch (error: any) {
    console.error('Error saving tracker config:', error);
    return NextResponse.json({ error: 'Internal server error', details: error.message }, { status: 500 });
  }
}
