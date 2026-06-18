import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

// GET /api/leads?siteId=...
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const siteId = searchParams.get('siteId');

    const where: any = {};
    if (siteId) {
      where.siteId = siteId;
    }

    const leads = await prisma.lead.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ leads });
  } catch (error: any) {
    console.error('Error fetching leads:', error);
    return NextResponse.json({ error: 'Internal server error', details: error.message }, { status: 500 });
  }
}

// POST /api/leads
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { siteId, formName, name, email, phone, message, metadata } = body;

    if (!siteId || !name || !email) {
      return NextResponse.json({ error: 'siteId, name, and email are required' }, { status: 400 });
    }

    // Check if site exists
    const site = await prisma.clientSite.findUnique({
      where: { id: siteId },
    });

    if (!site) {
      return NextResponse.json({ error: 'Invalid siteId, site not found' }, { status: 404 });
    }

    const lead = await prisma.lead.create({
      data: {
        siteId,
        formName: formName || 'Contact Form',
        name,
        email,
        phone,
        message,
        metadata: metadata ? JSON.stringify(metadata) : null,
      },
    });

    return NextResponse.json({ success: true, lead }, { status: 201 });
  } catch (error: any) {
    console.error('Error creating lead:', error);
    return NextResponse.json({ error: 'Internal server error', details: error.message }, { status: 500 });
  }
}
