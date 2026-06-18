import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

// GET /api/sitemap?siteId=...
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const siteId = searchParams.get('siteId');

    if (!siteId) {
      return NextResponse.json({ error: 'siteId is required' }, { status: 400 });
    }

    const site = await prisma.clientSite.findUnique({
      where: { id: siteId },
    });

    if (!site) {
      return NextResponse.json({ error: 'Site not found' }, { status: 404 });
    }

    const urls: Array<{ url: string; updatedAt: Date; changeFrequency?: string; priority?: number }> = [];

    // 1. Get static SEO routes (ignore wildcards or dynamic segments if necessary, but take explicit routes)
    const seoConfigs = await prisma.seoConfig.findMany({
      where: { siteId },
    });

    seoConfigs.forEach((config) => {
      // Don't duplicate home page if we add blogs later
      urls.push({
        url: `${site.baseUrl}${config.path}`,
        updatedAt: config.updatedAt,
        changeFrequency: config.path === '/' ? 'daily' : 'weekly',
        priority: config.path === '/' ? 1.0 : 0.6,
      });
    });

    // 2. Get published blogs
    const blogs = await prisma.blog.findMany({
      where: { siteId, published: true },
    });

    blogs.forEach((blog) => {
      urls.push({
        url: `${site.baseUrl}/blog/${blog.slug}`,
        updatedAt: blog.updatedAt,
        changeFrequency: 'weekly',
        priority: 0.8,
      });
    });

    return NextResponse.json({ urls });
  } catch (error: any) {
    console.error('Error generating sitemap lists:', error);
    return NextResponse.json({ error: 'Internal server error', details: error.message }, { status: 500 });
  }
}
