import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { SharePostcardView } from '@/components/SharePostcardView';
import { Postcard } from '@/types/database';

interface SharePageProps {
  params: {
    postcardId: string;
  };
}

export async function generateMetadata({ params }: SharePageProps): Promise<Metadata> {
  const supabase = createClient();
  
  try {
    const { data: postcard } = await supabase
      .from('postcards')
      .select('title, image_url')
      .eq('id', params.postcardId)
      .single();

    if (!postcard) {
      return {
        title: 'Postcard no encontrada - Loopar',
        description: 'La postcard que buscas no existe o ha sido eliminada.'
      };
    }

    return {
      title: `${postcard.title} - Loopar AR`,
      description: `Mira esta increíble postcard en realidad aumentada: ${postcard.title}`,
      openGraph: {
        title: `${postcard.title} - Loopar AR`,
        description: `Experimenta esta postcard en realidad aumentada`,
        images: postcard.image_url ? [postcard.image_url] : [],
        type: 'website',
      },
      twitter: {
        card: 'summary_large_image',
        title: `${postcard.title} - Loopar AR`,
        description: `Experimenta esta postcard en realidad aumentada`,
        images: postcard.image_url ? [postcard.image_url] : [],
      },
    };
  } catch (error) {
    console.error('Error generando metadata:', error);
    return {
      title: 'Postcard - Loopar',
      description: 'Experimenta postcards en realidad aumentada'
    };
  }
}

export default async function SharePage({ params }: SharePageProps) {
  const supabase = createClient();
  
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
      .eq('id', params.postcardId)
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