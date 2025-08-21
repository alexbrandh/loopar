import { SignInButton, SignedIn, SignedOut } from '@clerk/nextjs';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Camera, Sparkles, Share2, Zap } from 'lucide-react';
import { MainLayout } from '@/components/layout/MainLayout';
import Link from 'next/link';

export default function Home() {
  return (
    <MainLayout>
      <div className="bg-gradient-to-br from-blue-50 via-white to-cyan-50">

        {/* Hero Section */}
        <section className="container mx-auto px-4 py-20 text-center">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-5xl font-bold text-gray-900 mb-6">
              Dale Vida a tus{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-cyan-600">
                Fotos
              </span>
            </h2>
            <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
              Crea postales AR mágicas combinando tus fotos favoritas con videos. 
              Comparte recuerdos que cobran vida cuando se ven a través de una cámara.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <SignedOut>
                <SignInButton mode="modal">
                  <Button size="lg" className="text-lg px-8 py-3">
                    <Camera className="mr-2 h-5 w-5" />
                    Comenzar Gratis
                  </Button>
                </SignInButton>
              </SignedOut>
              <SignedIn>
                <Link href="/dashboard/new">
                  <Button size="lg" className="text-lg px-8 py-3">
                    <Camera className="mr-2 h-5 w-5" />
                    Crea tu Primera Postal
                  </Button>
                </Link>
              </SignedIn>
              <Button variant="outline" size="lg" className="text-lg px-8 py-3">
                <Sparkles className="mr-2 h-5 w-5" />
                Ver Demo
              </Button>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section id="features" className="container mx-auto px-4 py-20">
          <div className="text-center mb-16">
            <h3 className="text-3xl font-bold text-gray-900 mb-4">Cómo Funciona</h3>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Crea experiencias AR impresionantes en solo unos pocos pasos simples
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            <Card className="text-center border-0 shadow-lg">
              <CardHeader>
                <div className="mx-auto w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
                  <Camera className="h-6 w-6 text-blue-600" />
                </div>
                <CardTitle className="text-xl">Sube tu Contenido</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-base">
                  Elige una foto como objetivo AR y sube un video que se reproducirá cuando se escanee la foto.
                </CardDescription>
              </CardContent>
            </Card>

            <Card className="text-center border-0 shadow-lg">
              <CardHeader>
                <div className="mx-auto w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-4">
                  <Zap className="h-6 w-6 text-green-600" />
                </div>
                <CardTitle className="text-xl">Procesamiento IA</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-base">
                  Nuestra IA genera automáticamente marcadores de seguimiento AR desde tu foto para un reconocimiento perfecto.
                </CardDescription>
              </CardContent>
            </Card>

            <Card className="text-center border-0 shadow-lg">
              <CardHeader>
                <div className="mx-auto w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4">
                  <Share2 className="h-6 w-6 text-purple-600" />
                </div>
                <CardTitle className="text-xl">Comparte y Experimenta</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-base">
                  Comparte el enlace de tu postal AR. Cualquiera puede apuntar su cámara a la foto para ver tu video cobrar vida.
                </CardDescription>
              </CardContent>
            </Card>
          </div>
        </section>
      </div>
    </MainLayout>
  )
}