import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

// GET /api/blogs?siteId=...&category=...&limit=...&page=...&publishedOnly=...
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const siteId = searchParams.get('siteId');
    const category = searchParams.get('category');
    const limit = parseInt(searchParams.get('limit') || '10', 10);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const publishedOnly = searchParams.get('publishedOnly') !== 'false';

    if (!siteId) {
      return NextResponse.json({ error: 'siteId is required' }, { status: 400 });
    }

    const skip = (page - 1) * limit;

    const where: any = { siteId };
    if (category) {
      where.category = category;
    }
    if (publishedOnly) {
      where.published = true;
    }

    const [blogs, total] = await prisma.$transaction([
      prisma.blog.findMany({
        where,
        orderBy: { publishedAt: 'desc' },
        take: limit,
        skip: skip,
      }),
      prisma.blog.count({ where }),
    ]);

    return NextResponse.json({
      blogs,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error: any) {
    console.error('Error fetching blogs:', error);
    return NextResponse.json({ error: 'Internal server error', details: error.message }, { status: 500 });
  }
}

// POST /api/blogs
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      siteId,
      title,
      slug,
      content,
      summary,
      featuredImage,
      published,
      category,
      tags,
      template,
      seoTitle,
      seoDescription,
      seoOgImage,
    } = body;

    if (!siteId || !title || !slug) {
      return NextResponse.json({ error: 'siteId, title, and slug are required' }, { status: 400 });
    }

    // Check slug collision
    const existing = await prisma.blog.findUnique({
      where: {
        siteId_slug: {
          siteId,
          slug,
        },
      },
    });

    if (existing) {
      return NextResponse.json({ error: 'A blog post with this slug already exists for this site' }, { status: 400 });
    }

    const blog = await prisma.blog.create({
      data: {
        siteId,
        title,
        slug,
        content,
        summary,
        featuredImage,
        published: published ?? false,
        category,
        tags,
        template,
        seoTitle,
        seoDescription,
        seoOgImage,
        publishedAt: new Date(),
      },
    });

    return NextResponse.json(blog, { status: 201 });
  } catch (error: any) {
    console.error('Error creating blog:', error);
    return NextResponse.json({ error: 'Internal server error', details: error.message }, { status: 500 });
  }
}
