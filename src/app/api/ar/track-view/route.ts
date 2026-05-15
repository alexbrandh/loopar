import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { postcard_id } = body;

    if (!postcard_id) {
      return NextResponse.json(
        { success: false, error: 'postcard_id is required' },
        { status: 400 }
      );
    }

    const supabase = createServerClient();

    // Get user agent and IP
    const userAgent = request.headers.get('user-agent') || null;
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
      || request.headers.get('x-real-ip')
      || null;

    const { error } = await supabase
      .from('ar_views')
      .insert({
        postcard_id,
        user_agent: userAgent,
        ip_address: ip,
      });

    if (error) {
      console.error('Error tracking AR view:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to track view' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Track view error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
