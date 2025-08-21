'use client';

import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  Camera, 
  Upload, 
  Video, 
  Smartphone, 
  Share2, 
  QrCode, 
  Eye, 
  CheckCircle, 
  HelpCircle,
  ArrowRight,
  Play
} from 'lucide-react';
import Link from 'next/link';

export default function HelpPage() {
  const steps = [
    {
      icon: <Upload className="h-8 w-8 text-blue-600" />,
      title: "1. Sube tu Imagen Objetivo",
      description: "Selecciona una imagen con buen contraste y detalles únicos. Evita superficies brillantes o muy lisas.",
      tips: [
        "Usa imágenes con alta resolución (mínimo 1024x768)",
        "Prefiere imágenes con texturas y patrones únicos",
        "Evita imágenes muy oscuras o con mucho brillo"
      ]
    },
    {
      icon: <Video className="h-8 w-8 text-green-600" />,
      title: "2. Añade tu Video AR",
      description: "Sube el video que aparecerá flotando sobre tu imagen cuando sea detectada por la cámara.",
      tips: [
        "Mantén el video corto (máximo 60 segundos)",
        "Usa alta calidad para mejor experiencia",
        "Formatos soportados: MP4, WebM, MOV"
      ]
    },
    {
      icon: <CheckCircle className="h-8 w-8 text-purple-600" />,
      title: "3. Procesamiento AR",
      description: "Nuestro sistema genera automáticamente los descriptores NFT necesarios para el seguimiento AR.",
      tips: [
        "El procesamiento puede tomar 2-5 minutos",
        "Recibirás notificación cuando esté listo",
        "Si hay errores, revisa la calidad de tu imagen"
      ]
    },
    {
      icon: <Share2 className="h-8 w-8 text-orange-600" />,
      title: "4. Comparte tu Postal",
      description: "Una vez procesada, comparte tu postal AR con códigos QR o enlaces directos.",
      tips: [
        "Genera códigos QR para fácil acceso móvil",
        "Comparte enlaces directos en redes sociales",
        "Las postales son públicas por defecto"
      ]
    }
  ];

  const faqs = [
    {
      question: "¿Qué dispositivos son compatibles?",
      answer: "Loopar funciona en cualquier dispositivo con cámara y navegador web moderno. Recomendamos usar smartphones para la mejor experiencia AR."
    },
    {
      question: "¿Por qué mi imagen no funciona bien para AR?",
      answer: "Las mejores imágenes para AR tienen buen contraste, detalles únicos y texturas variadas. Evita imágenes muy lisas, brillantes o con patrones repetitivos."
    },
    {
      question: "¿Cuánto tiempo toma el procesamiento?",
      answer: "El procesamiento típicamente toma entre 2-5 minutos, dependiendo de la complejidad de la imagen y la carga del servidor."
    },
    {
      question: "¿Puedo editar mi postal después de crearla?",
      answer: "Actualmente no es posible editar postales existentes. Puedes eliminar la postal y crear una nueva con los cambios deseados."
    },
    {
      question: "¿Las postales tienen límite de visualizaciones?",
      answer: "No, las postales pueden ser vistas ilimitadas veces. Puedes ver estadísticas básicas en tu dashboard."
    }
  ];

  return (
    <MainLayout>
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Centro de Ayuda</h1>
          <p className="text-xl text-gray-600 mb-6">
            Aprende a crear experiencias AR increíbles con Loopar
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/dashboard/new">
              <Button size="lg">
                <Camera className="mr-2 h-5 w-5" />
                Crear Mi Primera Postal
              </Button>
            </Link>
            <Link href="/dashboard">
              <Button size="lg" variant="outline">
                <Eye className="mr-2 h-5 w-5" />
                Ver Mis Postales
              </Button>
            </Link>
          </div>
        </div>

        {/* Quick Start Guide */}
        <Card className="mb-12">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Play className="h-6 w-6 text-blue-600" />
              Guía Rápida de Inicio
            </CardTitle>
            <CardDescription>
              Sigue estos pasos para crear tu primera postal AR en minutos
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-8">
              {steps.map((step, index) => (
                <div key={index} className="flex gap-4">
                  <div className="flex-shrink-0">
                    <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center">
                      {step.icon}
                    </div>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">{step.title}</h3>
                    <p className="text-gray-600 mb-3">{step.description}</p>
                    <div className="space-y-1">
                      {step.tips.map((tip, tipIndex) => (
                        <div key={tipIndex} className="flex items-start gap-2 text-sm text-gray-500">
                          <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                          <span>{tip}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  {index < steps.length - 1 && (
                    <div className="flex-shrink-0 flex items-center">
                      <ArrowRight className="h-5 w-5 text-gray-400" />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Features Overview */}
        <div className="grid md:grid-cols-2 gap-6 mb-12">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Smartphone className="h-5 w-5 text-blue-600" />
                Experiencia AR Móvil
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 mb-4">
                Tus postales funcionan en cualquier smartphone con cámara. Los usuarios solo necesitan abrir el enlace en su navegador.
              </p>
              <div className="space-y-2">
                <Badge variant="outline">Sin Apps Requeridas</Badge>
                <Badge variant="outline">Compatible con iOS/Android</Badge>
                <Badge variant="outline">Funciona en Navegadores</Badge>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <QrCode className="h-5 w-5 text-green-600" />
                Compartir Fácil
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 mb-4">
                Genera códigos QR automáticamente y comparte enlaces directos en redes sociales o mensajería.
              </p>
              <div className="space-y-2">
                <Badge variant="outline">Códigos QR Automáticos</Badge>
                <Badge variant="outline">Enlaces Directos</Badge>
                <Badge variant="outline">Compartir en Redes</Badge>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* FAQ Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <HelpCircle className="h-6 w-6 text-purple-600" />
              Preguntas Frecuentes
            </CardTitle>
            <CardDescription>
              Respuestas a las dudas más comunes sobre Loopar
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {faqs.map((faq, index) => (
                <div key={index}>
                  <h3 className="font-semibold text-gray-900 mb-2">{faq.question}</h3>
                  <p className="text-gray-600">{faq.answer}</p>
                  {index < faqs.length - 1 && <Separator className="mt-6" />}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Call to Action */}
        <div className="text-center mt-12 p-8 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">¿Listo para comenzar?</h2>
          <p className="text-gray-600 mb-6">
            Crea tu primera postal AR y comparte experiencias mágicas que cobran vida
          </p>
          <Link href="/dashboard/new">
            <Button size="lg">
              <Camera className="mr-2 h-5 w-5" />
              Crear Postal AR Ahora
            </Button>
          </Link>
        </div>
      </div>
    </MainLayout>
  );
}