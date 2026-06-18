import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET() {
  try {
    const sites = await prisma.clientSite.findMany({
      include: {
        _count: {
          select: {
            seoConfigs: true,
            blogs: true,
            redirects: true,
            leads: true,
          },
        },
        trackerConfig: {
          select: {
            googleAnalyticsId: true,
            metaPixelId: true,
          },
        },
      },
    });

    const stats = sites.map((site) => ({
      id: site.id,
      name: site.name,
      baseUrl: site.baseUrl,
      counts: {
        seoConfigs: site._count.seoConfigs,
        blogs: site._count.blogs,
        redirects: site._count.redirects,
        leads: site._count.leads,
      },
      pixels: {
        ga4: !!site.trackerConfig?.googleAnalyticsId,
        meta: !!site.trackerConfig?.metaPixelId,
      },
    }));

    return NextResponse.json({ stats });
  } catch (error: any) {
    console.error('Error fetching dashboard stats:', error);
    return NextResponse.json({ error: 'Internal server error', details: error.message }, { status: 500 });
  }
}
