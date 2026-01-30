require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const { generateNFTDescriptors } = require('../src/lib/nft-generator');

// Configuración de Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Faltan variables de entorno de Supabase');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function regenerateNFTForPostcard() {
  // Usage: node scripts/regenerate-nft.js [postcard_id]
  // If no ID provided, defaults to the problematic postcard from logs
  const postcardId = process.argv[2] || '8e1c09ff-f545-4d32-a6f1-16ad52804451';
  
  console.log(`🔄 Regenerando NFT para postal: ${postcardId}`);
  console.log('='.repeat(50));

  try {
    // 1. Obtener información de la postal
    const { data: postcard, error: postcardError } = await supabase
      .from('postcards')
      .select('*')
      .eq('id', postcardId)
      .single();

    if (postcardError || !postcard) {
      console.error('❌ Error obteniendo postal:', postcardError?.message || 'No encontrada');
      return;
    }

    console.log('📋 Postal encontrada:');
    console.log(`- ID: ${postcard.id}`);
    console.log(`- Título: ${postcard.title}`);
    console.log(`- Estado: ${postcard.status}`);
    console.log(`- Imagen: ${postcard.image_path}`);
    console.log('');

    // 2. Verificar que existe la imagen en Storage
    const imagePath = postcard.image_path;
    const { data: imageExists, error: imageError } = await supabase.storage
      .from('postcard-images')
      .list(imagePath.split('/').slice(0, -1).join('/'));

    if (imageError) {
      console.error('❌ Error verificando imagen:', imageError.message);
      return;
    }

    const imageFile = imageExists?.find(file => 
      imagePath.endsWith(file.name)
    );

    if (!imageFile) {
      console.error('❌ Archivo de imagen no encontrado en Storage');
      return;
    }

    console.log('✅ Imagen encontrada en Storage');

    // 3. Descargar la imagen
    console.log('📥 Descargando imagen...');
    const { data: imageData, error: downloadError } = await supabase.storage
      .from('postcard-images')
      .download(imagePath);

    if (downloadError || !imageData) {
      console.error('❌ Error descargando imagen:', downloadError?.message);
      return;
    }

    console.log('✅ Imagen descargada correctamente');

    // 4. Generar descriptores NFT
    console.log('🎯 Generando descriptores NFT...');
    const imageBuffer = Buffer.from(await imageData.arrayBuffer());
    
    const nftResult = await generateNFTDescriptors(imageBuffer, {
      userId: postcard.user_id,
      postcardId: postcard.id
    });

    if (!nftResult.success) {
      console.error('❌ Error generando NFT:', nftResult.error);
      return;
    }

    console.log('✅ Descriptores NFT generados correctamente');
    console.log('📁 Archivos creados:');
    console.log(`- ${nftResult.files.iset}`);
    console.log(`- ${nftResult.files.fset}`);
    console.log(`- ${nftResult.files.fset3}`);

    //