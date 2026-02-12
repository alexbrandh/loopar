"use client";

import * as React from "react";
import Cropper from "react-easy-crop";
import { Button } from "@/components/ui/button";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Crop, RotateCw, ZoomIn, Download, Check } from "lucide-react";

export async function getCroppedImg(imageSrc: string, pixelCrop: CroppedAreaPixels): Promise<Blob> {
  const image = new Image();
  image.src = imageSrc;
  await new Promise((resolve) => (image.onload = resolve));

  const canvas = document.createElement("canvas");
  canvas.width = pixelCrop.width;
  canvas.height = pixelCrop.height;
  const ctx = canvas.getContext("2d");

  ctx!.drawImage(
    image,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    pixelCrop.width,
    pixelCrop.height
  );

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) {
        resolve(blob);
      } else {
        reject(new Error('Failed to create blob'));
      }
    }, "image/png");
  });
}

interface CroppedAreaPixels {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface ImageCropperProps {
  onCropComplete?: (croppedBlob: Blob, croppedUrl: string) => void;
  onCancel?: () => void;
  initialImage?: string;
  minWidth?: number;
  minHeight?: number;
  title?: string;
  description?: string;
}

const ASPECT_RATIOS = [
  { label: "Polaroid", value: "polaroid", aspect: 1256.51 / 1984.25 },
  { label: "16:9 Horizontal", value: "16/9", aspect: 16 / 9 },
  { label: "16:9 Vertical", value: "9/16", aspect: 9 / 16 },
  { label: "4:5 Horizontal", value: "5/4", aspect: 5 / 4 },
  { label: "4:5 Vertical", value: "4/5", aspect: 4 / 5 },
  { label: "1:1 Cuadrado", value: "1/1", aspect: 1 },
  { label: "Libre", value: "free", aspect: undefined },
];

export default function ImageCropper({
  onCropComplete,
  onCancel,
  initialImage,
  minWidth = 800,
  minHeight = 800,
  title = "Recortar Imagen",
  description = "Selecciona el área de la imagen que deseas usar"
}: ImageCropperProps) {
  const [imageSrc, setImageSrc] = React.useState<string | null>(initialImage || null);
  const [crop, setCrop] = React.useState({ x: 0, y: 0 });
  const [zoom, setZoom] = React.useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = React.useState<CroppedAreaPixels | null>(null);
  const [selectedRatio, setSelectedRatio] = React.useState("polaroid");
  const [aspect, setAspect] = React.useState<number | undefined>(1256.51 / 1984.25);
  const [croppedImage, setCroppedImage] = React.useState<string | null>(null);
  const [isProcessing, setIsProcessing] = React.useState(false);

  const onCropCompleteCallback = React.useCallback((_: unknown, croppedAreaPixels: CroppedAreaPixels) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const reader = new FileReader();
      reader.readAsDataURL(e.target.files[0]);
      reader.onload = () => {
        setImageSrc(reader.result as string);
        setCroppedImage(null);
        setCrop({ x: 0, y: 0 });
        setZoom(1);
      };
    }
  };

  const handleAspectChange = (value: string) => {
    setSelectedRatio(value);
    const ratioConfig = ASPECT_RATIOS.find(r => r.value === value);
    setAspect(ratioConfig?.aspect);
  };

  const handleCrop = async () => {
    if (!imageSrc || !croppedAreaPixels) return;
    
    setIsProcessing(true);
    try {
      const croppedBlob = await getCroppedImg(imageSrc, croppedAreaPixels);
      const croppedUrl = URL.createObjectURL(croppedBlob);
      setCroppedImage(croppedUrl);
      
      if (onCropComplete) {
        onCropComplete(croppedBlob, croppedUrl);
      }
    } catch (error) {
      console.error('Error cropping image:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleConfirm = async () => {
    if (!imageSrc || !croppedAreaPixels) return;
    
    setIsProcessing(true);
    try {
      const croppedBlob = await getCroppedImg(imageSrc, croppedAreaPixels);
      const croppedUrl = URL.createObjectURL(croppedBlob);
      
      if (onCropComplete) {
        onCropComplete(croppedBlob, croppedUrl);
      }
    } catch (error) {
      console.error('Error cropping image:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReset = () => {
    setCroppedImage(null);
    setCrop({ x: 0, y: 0 });
    setZoom(1);
  };

  const handleDownload = () => {
    if (!croppedImage) return;
    const link = document.createElement('a');
    link.href = croppedImage;
    link.download = 'imagen-recortada.png';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <Card className="w-full max-w-2xl mx-auto flex flex-col max-h-[calc(100dvh-2rem)] sm:max-h-none">
      <CardHeader className="pb-2 sm:pb-4 shrink-0">
        <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
          <Crop className="h-5 w-5" />
          {title}
        </CardTitle>
        {description && (
          <p className="text-xs sm:text-sm text-muted-foreground">{description}</p>
        )}
      </CardHeader>
      <CardContent className="flex flex-col gap-3 sm:gap-4 overflow-y-auto flex-1 min-h-0">
        {!imageSrc && (
          <div className="space-y-2">
            <Label htmlFor="image-upload">Seleccionar imagen</Label>
            <Input 
              id="image-upload"
              type="file" 
              accept="image/*" 
              onChange={handleFileChange}
              className="cursor-pointer"
            />
            <p className="text-xs text-muted-foreground">
              Resolución mínima recomendada: {minWidth}x{minHeight}px
            </p>
          </div>
        )}

        {imageSrc && !croppedImage && (
          <>
            <div className="relative w-full h-[220px] sm:h-[350px] bg-gray-100 rounded-lg overflow-hidden shrink-0">
              <Cropper
                image={imageSrc}
                crop={crop}
                zoom={zoom}
                aspect={aspect}
                onCropChange={setCrop}
                onZoomChange={setZoom}
                onCropComplete={onCropCompleteCallback}
              />
            </div>

            <div className="space-y-3 sm:space-y-4">
              <div className="flex items-center gap-3">
                <Label className="min-w-[80px] sm:min-w-[100px] flex items-center gap-2 text-xs sm:text-sm">
                  <ZoomIn className="h-4 w-4" />
                  Zoom:
                </Label>
                <Slider
                  value={[zoom]}
                  onValueChange={(v) => setZoom(v[0])}
                  min={1}
                  max={3}
                  step={0.01}
                  className="flex-1"
                />
                <span className="text-xs sm:text-sm text-muted-foreground w-10 sm:w-12 text-right">
                  {zoom.toFixed(1)}x
                </span>
              </div>

              <div className="flex items-center gap-3">
                <Label className="min-w-[80px] sm:min-w-[100px] flex items-center gap-2 text-xs sm:text-sm">
                  <RotateCw className="h-4 w-4" />
                  Proporción:
                </Label>
                <Select value={selectedRatio} onValueChange={handleAspectChange}>
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="Seleccionar proporción" />
                  </SelectTrigger>
                  <SelectContent className="z-200">
                    {ASPECT_RATIOS.map((ratio) => (
                      <SelectItem key={ratio.value} value={ratio.value}>
                        {ratio.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex gap-2 pt-1 sm:pt-2 sticky bottom-0 bg-card pb-1">
                {onCancel && (
                  <Button 
                    type="button"
                    variant="outline" 
                    onClick={onCancel}
                    className="flex-1"
                    size="sm"
                  >
                    Cancelar
                  </Button>
                )}
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setImageSrc(null);
                    setCroppedImage(null);
                  }}
                  className="flex-1"
                  size="sm"
                >
                  Cambiar imagen
                </Button>
                <Button 
                  type="button"
                  onClick={handleConfirm} 
                  disabled={isProcessing}
                  className="flex-1"
                  size="sm"
                >
                  {isProcessing ? (
                    "Procesando..."
                  ) : (
                    <>
                      <Check className="mr-1.5 h-4 w-4" />
                      Confirmar
                    </>
                  )}
                </Button>
              </div>
            </div>
          </>
        )}

        {croppedImage && (
          <div className="flex flex-col gap-4">
            <div className="text-center">
              <h4 className="font-medium mb-2">Vista previa del recorte:</h4>
              <img 
                src={croppedImage} 
                alt="Imagen recortada" 
                className="max-w-full max-h-[300px] mx-auto rounded-lg border shadow-sm object-contain" 
              />
            </div>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={handleReset}
                className="flex-1"
              >
                Recortar de nuevo
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={handleDownload}
                className="flex-1"
              >
                <Download className="mr-2 h-4 w-4" />
                Descargar
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export { ImageCropper };
