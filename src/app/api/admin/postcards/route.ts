import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { clerkClient } from '@clerk/nextjs/server';
import type { Postcard } from '@/types/database';

const ADMIN_PASSWORD = '6239';

// Helper function to generate signed URL for storage files
async function getSignedUrl(bucket: string, path: string): Promise<string | null> {
  if (!path) return null;
  
  try {
    const supabase = createServerClient();
    
    // Extract just the path if it's a full URL
    let storagePath = path;
    if (path.includes(`/${bucket}/`)) {
      storagePath = path.split(`/${bucket}/`)[1]?.split('?')[0] || path;
    }
    // Remove query params if present
    storagePath = storagePath.split('?')[0];
    
    const { data, error } = await supabase.storage
      .from(bucket)
      .createSignedUrl(storagePath, 3600); // 1 hour expiry
    
    if (error || !data?.signedUrl) {
      console.error(`Error creating signed URL for ${bucket}/${storagePath}:`, error);
      return null;
    }
    
    return data.signedUrl;
  } catch (err) {
    console.error(`Exception creating signed URL for ${bucket}/${path}:`, err);
    return null;
  }
}

interface PostcardRow {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  image_url: string;
  video_url: string;
  processing_status: 'processing' | 'ready' | 'error' | 'needs_better_image';
  error_message: string | null;
  is_public: boolean;
  created_at: string;
  updated_at: string;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { password } = body;

    if (password !== ADMIN_PASSWORD) {
      return NextResponse.json(
        { success: false, error: 'Contraseña incorrecta' },
        { status: 401 }
      );
    }

    const supabase = createServerClient();

    // Fetch all postcards
    const { data, error } = await supabase
      .from('postcards')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching postcards:', error);
      return NextResponse.json(
        { success: false, error: 'Error al obtener las postales' },
        { status: 500 }
      );
    }

    const postcards = (data || []) as PostcardRow[];

    // Get unique user IDs
    const userIds = [...new Set(postcards.map(p => p.user_id))];

    // Fetch user details from Clerk
    const client = await clerkClient();
    const usersMap: Record<string, { email: string; firstName: string | null; lastName: string | null }> = {};

    for (const userId of userIds) {
      try {
        const user = await client.users.getUser(userId);
        usersMap[userId] = {
          email: user.emailAddresses[0]?.emailAddress || 'Sin correo',
          firstName: user.firstName,
          lastName: user.lastName,
        };
      } catch (err) {
        console.error(`Error fetching user ${userId}:`, err);
        usersMap[userId] = {
          email: 'Usuario no encontrado',
          firstName: null,
          lastName: null,
        };
      }
    }

    // Enrich postcards with user info and signed URLs
    const enrichedPostcards = await Promise.all(
      postcards.map(async (postcard) => {
        // Generate signed URLs for image and video
        const [signedImageUrl, signedVideoUrl] = await Promise.all([
          getSignedUrl('postcard-images', postcard.image_url),
          getSignedUrl('postcard-videos', postcard.video_url),
        ]);

        return {
          ...postcard,
          image_url: signedImageUrl || postcard.image_url,
          video_url: signedVideoUrl || postcard.video_url,
          user: usersMap[postcard.user_id] || {
            email: 'Desconocido',
            firstName: null,
            lastName: null,
          },
          arLink: `${(process.env.NEXT_PUBLIC_APP_URL || 'https://regaliz.vercel.app').trim()}/ar/${postcard.id}`.replace(/\s+/g, ''),
        };
      })
    );

    return NextResponse.json({
      success: true,
      data: {
        postcards: enrichedPostcards,
        stats: {
          total: enrichedPostcards.length,
          ready: enrichedPostcards.filter(p => p.processing_status === 'ready').length,
          processing: enrichedPostcards.filter(p => p.processing_status === 'processing').length,
          error: enrichedPostcards.filter(p => p.processing_status === 'error').length,
          needsBetterImage: enrichedPostcards.filter(p => p.processing_status === 'needs_better_image').length,
          uniqueUsers: userIds.length,
        },
      },
    });
  } catch (error) {
    console.error('Admin API error:', error);
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
