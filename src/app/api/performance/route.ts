import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const url = searchParams.get('url');

    if (!url) {
      return NextResponse.json({ error: 'url parameter is required' }, { status: 400 });
    }

    // Standardize URL protocol
    let targetUrl = url;
    if (!/^https?:\/\//i.test(targetUrl)) {
      targetUrl = 'http://' + targetUrl;
    }

    const host = new URL(targetUrl).hostname;

    // Check if the URL is local (localhost, 127.0.0.1, or .local domains)
    // PageSpeed Insights is an external Google service and cannot reach local servers.
    if (
      host === 'localhost' || 
      host === '127.0.0.1' || 
      host.endsWith('.local') ||
      host.startsWith('192.168.') ||
      host.startsWith('10.')
    ) {
      return NextResponse.json({
        mobile: 94,
        desktop: 98,
        simulated: true,
        message: "Simulated score served because localhost is not accessible by public Google PageSpeed servers."
      });
    }

    // Call PageSpeed API in parallel for both Mobile and Desktop
    // We use the public API endpoint. Google allows moderate usage without an API key.
    const [mobileRes, desktopRes] = await Promise.all([
      fetch(`https://pagespeedonline.googleapis.com/pagespeedonline/v5/runPagespeed?url=${encodeURIComponent(targetUrl)}&strategy=mobile`),
      fetch(`https://pagespeedonline.googleapis.com/pagespeedonline/v5/runPagespeed?url=${encodeURIComponent(targetUrl)}&strategy=desktop`)
    ]);

    if (!mobileRes.ok || !desktopRes.ok) {
      const mobileErr = !mobileRes.ok ? await mobileRes.text() : '';
      const desktopErr = !desktopRes.ok ? await desktopRes.text() : '';
      console.error('PageSpeed API Error response:', { mobileErr, desktopErr });
      return NextResponse.json({ 
        error: 'Google PageSpeed API request failed',
        details: { mobileErr, desktopErr } 
      }, { status: 502 });
    }

    const [mobileData, desktopData] = await Promise.all([
      mobileRes.json(),
      desktopRes.json()
    ]);

    // PageSpeed performance scores are returned as decimals (e.g. 0.94). We multiply by 100 and round.
    const mobileScore = Math.round((mobileData.lighthouseResult?.categories?.performance?.score || 0) * 100);
    const desktopScore = Math.round((desktopData.lighthouseResult?.categories?.performance?.score || 0) * 100);

    return NextResponse.json({
      mobile: mobileScore,
      desktop: desktopScore,
      simulated: false
    });
  } catch (error: any) {
    console.error('Performance Audit Error:', error);
    return NextResponse.json({ error: 'Internal server error', details: error.message }, { status: 500 });
  }
}
