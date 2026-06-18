import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

// GET /api/robots?siteId=...
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const siteId = searchParams.get('siteId');

    if (!siteId) {
      return NextResponse.json({ error: 'siteId is required' }, { status: 400 });
    }

    const rules = await prisma.robotsRule.findMany({
      where: { siteId },
    });

    return NextResponse.json({ rules });
  } catch (error: any) {
    console.error('Error fetching robots rules:', error);
    return NextResponse.json({ error: 'Internal server error', details: error.message }, { status: 500 });
  }
}

// POST /api/robots
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { siteId, userAgent, allowPaths, disallowPaths } = body;

    if (!siteId) {
      return NextResponse.json({ error: 'siteId is required' }, { status: 400 });
    }

    // Upsert / Create rule for user agent
    const existingRule = await prisma.robotsRule.findFirst({
      where: {
        siteId,
        userAgent: userAgent || '*',
      },
    });

    let rule;
    if (existingRule) {
      rule = await prisma.robotsRule.update({
        where: { id: existingRule.id },
        data: {
          allowPaths,
          disallowPaths,
        },
      });
    } else {
      rule = await prisma.robotsRule.create({
        data: {
          siteId,
          userAgent: userAgent || '*',
          allowPaths,
          disallowPaths,
        },
      });
    }

    return NextResponse.json(rule);
  } catch (error: any) {
    console.error('Error saving robots rules:', error);
    return NextResponse.json({ error: 'Internal server error', details: error.message }, { status: 500 });
  }
}
