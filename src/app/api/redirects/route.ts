import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

// GET /api/redirects?siteId=...
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const siteId = searchParams.get('siteId');

    if (!siteId) {
      return NextResponse.json({ error: 'siteId is required' }, { status: 400 });
    }

    const redirects = await prisma.redirect.findMany({
      where: { siteId },
    });

    return NextResponse.json(redirects);
  } catch (error: any) {
    console.error('Error fetching redirects:', error);
    return NextResponse.json({ error: 'Internal server error', details: error.message }, { status: 500 });
  }
}

// POST /api/redirects
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { siteId, sourcePath, destinationPath, statusCode } = body;

    if (!siteId || !sourcePath || !destinationPath) {
      return NextResponse.json({ error: 'siteId, sourcePath, and destinationPath are required' }, { status: 400 });
    }

    const redirect = await prisma.redirect.upsert({
      where: {
        siteId_sourcePath: {
          siteId,
          sourcePath,
        },
      },
      update: {
        destinationPath,
        statusCode: statusCode || 301,
      },
      create: {
        siteId,
        sourcePath,
        destinationPath,
        statusCode: statusCode || 301,
      },
    });

    return NextResponse.json(redirect);
  } catch (error: any) {
    console.error('Error saving redirect rule:', error);
    return NextResponse.json({ error: 'Internal server error', details: error.message }, { status: 500 });
  }
}

// DELETE /api/redirects?id=...
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'id parameter is required' }, { status: 400 });
    }

    await prisma.redirect.delete({
      where: { id },
    });

    return NextResponse.json({ message: 'Redirect rule deleted' });
  } catch (error: any) {
    console.error('Error deleting redirect rule:', error);
    return NextResponse.json({ error: 'Internal server error', details: error.message }, { status: 500 });
  }
}
