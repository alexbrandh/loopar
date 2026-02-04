import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { SharePostcardView } from '@/components/SharePostcardView';
import { Postcard } from '@/types/database';

interface SharePageProps {
  params: Promise<{
    postcardId: string;
  }>;
}

export async function generateMetadata({ params }: SharePageProps): Promise<Metadata> {
  const supabase = await createClient();
  const resolvedParams = await params;
  
  try {
    const { data: postcard } = await supabase
      .from('postcards')
      .select('title, image_url')
      .eq('id', resolvedParams.postcardId)
      .single();

    if (!postcard) {
      return {
        title: 'Postcard no encontrada - Regaliz',
        description: 'La postcard que buscas no existe o ha sido eliminada.'
      };
    }

    return {
      title: `${postcard.title} - Regaliz AR`,
      description: `Mira esta increíble postcard en realidad aumentada: ${postcard.title}`,
      openGraph: {
        title: `${postcard.title} - Regaliz AR`,
        description: `Experimenta esta postcard en realidad aumentada`,
        images: postcard.image_url ? [postcard.image_url] : [],
        type: 'website',
      },
      twitter: {
        card: 'summary_large_image',
        title: `${postcard.title} - Regaliz AR`,
        description: `Experimenta esta postcard en realidad aumentada`,
        images: postcard.image_url ? [postcard.image_url] : [],
      },
    };
  } catch (error) {
    console.error('Error generando metadata:', error);
    return {
      title: 'Postcard - Regaliz',
      description: 'Experimenta postcards en realidad aumentada'
    };
  }
}

export default async function SharePage({ params }: SharePageProps) {
  const supabase = await createClient();
  const resolvedParams = await params;
  
  try {
    // Obtener la postcard (solo las públicas o las que tienen processing_status = 'ready')
    const { data: postcard, error } = await supabase
      .from('postcards')
      .select(`
        id,
        title,
        image_url,
        video_url,
        nft_descriptors,
        processing_status,
        created_at,
        updated_at
      `)
      .eq('id', resolvedParams.postcardId)
      .eq('processing_status', 'ready')
      .single();

    if (error || !postcard) {
      console.error('Error obteniendo postcard:', error);
      notFound();
    }

    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
        <SharePostcardView postcard={postcard as Postcard} />
      </div>
    );
  } catch (error) {
    console.error('Error en página de compartir:', error);
    notFound();
  }
}