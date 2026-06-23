import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { wrapContentWithMargins, unwrapContentMargins } from '@/lib/marginWrapper';

// GET /api/blogs/[slug]?siteId=...&forEditing=true
//
// `content` is stored WRAPPED with the post's margin padding (see
// marginWrapper.ts) so public sites like gotolatest, which render it via
// dangerouslySetInnerHTML unmodified, pick up the margin automatically.
// The CMS editor must never see that wrapper, so it passes `forEditing=true`
// to get the plain, unwrapped HTML back instead. Do not drop this branch —
// it's the one thing keeping the two consumers of this endpoint from
// stepping on each other.
export async function GET(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const { searchParams } = new URL(request.url);
    const siteId = searchParams.get('siteId');
    const forEditing = searchParams.get('forEditing') === 'true';
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

    if (forEditing) {
      return NextResponse.json({ ...blog, content: unwrapContentMargins(blog.content) });
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
      marginLeft,
      marginRight,
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

    const effectiveMarginLeft = marginLeft ?? blog.marginLeft;
    const effectiveMarginRight = marginRight ?? blog.marginRight;
    const marginsChanged = marginLeft !== undefined || marginRight !== undefined;
    // Re-wrap if either the content or the margins changed, so a margin-only
    // edit still re-applies to the (possibly unchanged) existing content.
    const baseContent = content !== undefined ? content : unwrapContentMargins(blog.content);

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
        content:
          content !== undefined || marginsChanged
            ? wrapContentWithMargins(baseContent, effectiveMarginLeft, effectiveMarginRight)
            : undefined,
        summary,
        featuredImage,
        published,
        category,
        tags,
        template,
        seoTitle,
        seoDescription,
        seoOgImage,
        marginLeft: marginLeft ?? undefined,
        marginRight: marginRight ?? undefined,
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
