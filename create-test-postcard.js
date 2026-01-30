const { createClient } = require('@supabase/supabase-js');

// Configuración temporal para testing
const supabaseUrl = 'https://your-project.supabase.co'; // TODO: Reemplazar con URL real
const supabaseKey = 'your-service-role-key'; // TODO: Reemplazar con key real

const supabase = createClient(supabaseUrl, supabaseKey);

async function createTestPostcard() {
  try {
    console.log('🔧 Creando postal de prueba...');
    
    const testPostcard = {
      id: '550e8400-e29b-41d4-a716-446655440001',
      user_id: 'user_2abc123def456ghi789jkl',
      title: 'Postal AR de Prueba',
      description: 'Una postal de prueba para demostrar la funcionalidad de realidad aumentada',
      image_url: 'https://trae-api-us.mchost.guru/api/ide/v1/text_to_image?prompt=beautiful%20sunset%20landscape%20with%20mountains%20and%20lake%20high%20contrast%20detailed%20texture&image_size=square_hd',
      video_url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
      nft_descriptors: {
        descriptorUrl: "https://cdn.jsdelivr.net/gh/AR-js-org/AR.js@3.4.5/data/dataNFT/pinball",
        generated: true,
        timestamp: "2024-12-15T00:00:00Z",
        files: {
          iset: "https://cdn.jsdelivr.net/gh/AR-js-org/AR.js@3.4.5/data/dataNFT/pinball.iset",
          fset: "https://cdn.jsdelivr.net/gh/AR-js-org/AR.js@3.4.5/data/dataNFT/pinball.fset",
          fset3: "https://cdn.jsdelivr.net/gh/AR-js-org/AR.js@3.4.5/data/dataNFT/pinball.fset3"
        }
      },
      processing_status: 'ready',
      is_public: true
    };

    const { data, error } = await supabase
      .from('postcards')
      .upsert(testPostcard)
      .select();

    if (error) {
      console.error('❌ Error creando postal:', error);
      return;
    }

    console.log('✅ Postal de prueba creada exitosamente:', data);
    console.log('🔗 URL de prueba: http://localhost:3001/ar/550e8400-e29b-41d4-a716-446655440001');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.log('💡 Asegúrate de configurar las variables de entorno SUPABASE correctamente');
  }
}

// Ejecutar solo si se llama directamente
if (require.main === module) {
  createTestPostcard();
}

module.exports = { createTestPostcard };