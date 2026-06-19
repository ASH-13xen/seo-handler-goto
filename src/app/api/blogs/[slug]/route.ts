import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

// GET /api/blogs/[slug]?siteId=...
export async function GET(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const { searchParams } = new URL(request.url);
    const siteId = searchParams.get('siteId');
    const slug = (await params).slug;

    if (!siteId) {
      return NextResponse.json({ error: 'siteId is required' }, { status: 400 });
    }

    const blog = await prisma.blog.findUnique({
      where: {
        siteId_slug: {
          siteId,
          slug,
        },
      },
    });

    if (!blog) {
      return NextResponse.json({ error: 'Blog post not found' }, { status: 404 });
    }

    return NextResponse.json(blog);
  } catch (error: any) {
    console.error('Error fetching blog details:', error);
    return NextResponse.json({ error: 'Internal server error', details: error.message }, { status: 500 });
  }
}

// PUT /api/blogs/[slug]
export async function PUT(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const body = await request.json();
    const siteId = body.siteId;
    const oldSlug = (await params).slug;

    const {
      title,
      slug: newSlug,
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

    if (!siteId) {
      return NextResponse.json({ error: 'siteId is required in the body' }, { status: 400 });
    }

    if (content !== undefined && (!content || !content.trim())) {
      return NextResponse.json({ error: 'content cannot be empty' }, { status: 400 });
    }

    // Check that blog exists
    const blog = await prisma.blog.findUnique({
      where: {
        siteId_slug: {
          siteId,
          slug: oldSlug,
        },
      },
    });

    if (!blog) {
      return NextResponse.json({ error: 'Blog post not found' }, { status: 404 });
    }

    // If changing slug, check collision
    if (newSlug && newSlug !== oldSlug) {
      const collision = await prisma.blog.findUnique({
        where: {
          siteId_slug: {
            siteId,
            slug: newSlug,
          },
        },
      });

      if (collision) {
        return NextResponse.json({ error: 'A blog post with this new slug already exists' }, { status: 400 });
      }
    }

    const updatedBlog = await prisma.blog.update({
      where: {
        siteId_slug: {
          siteId,
          slug: oldSlug,
        },
      },
      data: {
        title,
        slug: newSlug || oldSlug,
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
      },
    });

    return NextResponse.json(updatedBlog);
  } catch (error: any) {
    console.error('Error updating blog:', error);
    return NextResponse.json({ error: 'Internal server error', details: error.message }, { status: 500 });
  }
}

// DELETE /api/blogs/[slug]?siteId=...
export async function DELETE(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const { searchParams } = new URL(request.url);
    const siteId = searchParams.get('siteId');
    const slug = (await params).slug;

    if (!siteId) {
      return NextResponse.json({ error: 'siteId is required' }, { status: 400 });
    }

    const blog = await prisma.blog.findUnique({
      where: {
        siteId_slug: {
          siteId,
          slug,
        },
      },
    });

    if (!blog) {
      return NextResponse.json({ error: 'Blog post not found' }, { status: 404 });
    }

    await prisma.blog.delete({
      where: {
        siteId_slug: {
          siteId,
          slug,
        },
      },
    });

    return NextResponse.json({ message: 'Blog post deleted successfully' });
  } catch (error: any) {
    console.error('Error deleting blog:', error);
    return NextResponse.json({ error: 'Internal server error', details: error.message }, { status: 500 });
  }
}
