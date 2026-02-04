"use client";

import { useState, useRef, DragEvent, ChangeEvent } from "react";
import { motion, AnimatePresence } from "framer-motion";
import clsx from "clsx";
import {
  UploadCloud,
  File as FileIcon,
  Trash2,
  Loader,
  CheckCircle,
  ImageIcon,
  Video,
} from "lucide-react";

interface FileUploadProps {
  accept?: string;
  maxSize?: number;
  onFileSelect: (file: File) => void;
  onFileRemove?: () => void;
  file?: {
    name: string;
    size: number;
    type: string;
    preview: string;
  } | null;
  isUploading?: boolean;
  uploadProgress?: number;
  title?: string;
  description?: string;
  supportedFormats?: string;
  disabled?: boolean;
  type?: "image" | "video";
}

export default function FileUpload({
  accept = "image/*",
  maxSize,
  onFileSelect,
  onFileRemove,
  file,
  isUploading = false,
  uploadProgress = 0,
  title = "Sube tu archivo",
  description,
  supportedFormats = "Soporta imágenes y videos",
  disabled = false,
  type = "image",
}: FileUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [localProgress, setLocalProgress] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  // Simulate upload progress for visual feedback
  const simulateProgress = () => {
    let progress = 0;
    const interval = setInterval(() => {
      progress += Math.random() * 25;
      setLocalProgress(Math.min(progress, 100));
      if (progress >= 100) {
        clearInterval(interval);
        if (navigator.vibrate) navigator.vibrate(100);
      }
    }, 200);
    return () => clearInterval(interval);
  };

  const handleFiles = (fileList: FileList) => {
    const selectedFile = fileList[0];
    if (!selectedFile) return;

    // Start progress animation
    setLocalProgress(0);
    simulateProgress();

    onFileSelect(selectedFile);
  };

  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (!disabled) {
      handleFiles(e.dataTransfer.files);
    }
  };

  const onDragOver = (e: DragEvent) => {
    e.preventDefault();
    if (!disabled) {
      setIsDragging(true);
    }
  };

  const onDragLeave = () => setIsDragging(false);

  const onSelect = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && !disabled) {
      handleFiles(e.target.files);
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (!bytes) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
  };

  const handleRemove = (e: React.MouseEvent) => {
    e.stopPropagation();
    setLocalProgress(0);
    onFileRemove?.();
  };

  const progress = isUploading ? uploadProgress : localProgress;
  const isComplete = progress >= 100 && !isUploading;

  // If file is uploaded, show success state
  if (file) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -20, scale: 0.95 }}
        transition={{ type: "spring", stiffness: 300, damping: 24 }}
        className="px-4 py-4 flex items-start gap-4 rounded-xl bg-secondary/50 border border-primary/10 shadow hover:shadow-md transition-all duration-200"
      >
        {/* Thumbnail */}
        <div className="relative shrink-0">
          {file.type.startsWith("image/") ? (
            <img
              src={file.preview}
              alt={file.name}
              className="w-16 h-16 md:w-20 md:h-20 rounded-lg object-cover border border-primary/20 shadow-sm"
            />
          ) : file.type.startsWith("video/") ? (
            <video
              src={file.preview}
              className="w-16 h-16 md:w-20 md:h-20 rounded-lg object-cover border border-primary/20 shadow-sm"
              controls={false}
              muted
              loop
              playsInline
              preload="metadata"
            />
          ) : (
            <FileIcon className="w-16 h-16 md:w-20 md:h-20 text-muted-foreground" />
          )}
          {isComplete && (
            <motion.div
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              className="absolute -right-2 -bottom-2 bg-background rounded-full shadow-sm"
            >
              <CheckCircle className="w-6 h-6 text-emerald-500" />
            </motion.div>
          )}
        </div>

        {/* File info & progress */}
        <div className="flex-1 min-w-0">
          <div className="flex flex-col gap-1 w-full">
            {/* Filename */}
            <div className="flex items-center gap-2 min-w-0">
              {type === "image" ? (
                <ImageIcon className="w-5 h-5 shrink-0 text-primary" />
              ) : (
                <Video className="w-5 h-5 shrink-0 text-primary" />
              )}
              <h4
                className="font-medium text-base md:text-lg truncate text-foreground"
                title={file.name}
              >
                {file.name}
              </h4>
            </div>

            {/* Details & remove/loading */}
            <div className="flex items-center justify-between gap-3 text-sm text-muted-foreground">
              <span className="text-xs md:text-sm">
                {formatFileSize(file.size)}
              </span>
              <span className="flex items-center gap-1.5">
                {isUploading ? (
                  <>
                    <span className="font-medium">{Math.round(progress)}%</span>
                    <Loader className="w-4 h-4 animate-spin text-primary" />
                  </>
                ) : (
                  <>
                    <span className="font-medium text-emerald-500">Listo</span>
                    {!disabled && (
                      <Trash2
                        className="w-4 h-4 cursor-pointer text-muted-foreground hover:text-destructive transition-colors duration-200"
                        onClick={handleRemove}
                        aria-label="Eliminar archivo"
                      />
                    )}
                  </>
                )}
              </span>
            </div>
          </div>

          {/* Progress bar */}
          {(isUploading || localProgress < 100) && (
            <div className="w-full h-2 bg-muted rounded-full overflow-hidden mt-3">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{
                  duration: 0.4,
                  type: "spring",
                  stiffness: 100,
                  ease: "easeOut",
                }}
                className={clsx(
                  "h-full rounded-full shadow-inner",
                  progress < 100 ? "bg-primary" : "bg-emerald-500"
                )}
              />
            </div>
          )}
        </div>
      </motion.div>
    );
  }

  // Drop zone when no file
  return (
    <motion.div
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      onClick={() => !disabled && inputRef.current?.click()}
      initial={false}
      animate={{
        borderColor: isDragging ? "hsl(var(--primary))" : "hsl(var(--border))",
        scale: isDragging ? 1.02 : 1,
      }}
      whileHover={!disabled ? { scale: 1.01 } : {}}
      transition={{ duration: 0.2 }}
      className={clsx(
        "relative rounded-2xl p-8 md:p-12 text-center cursor-pointer bg-secondary/50 border-2 border-dashed border-primary/20 shadow-sm hover:shadow-md backdrop-blur group transition-all",
        isDragging && "ring-4 ring-primary/30 border-primary",
        disabled && "opacity-50 cursor-not-allowed"
      )}
    >
      <div className="flex flex-col items-center gap-5">
        <motion.div
          animate={{ y: isDragging ? [-5, 0, -5] : 0 }}
          transition={{
            duration: 1.5,
            repeat: isDragging ? Infinity : 0,
            ease: "easeInOut",
          }}
          className="relative"
        >
          <motion.div
            animate={{
              opacity: isDragging ? [0.5, 1, 0.5] : 1,
              scale: isDragging ? [0.95, 1.05, 0.95] : 1,
            }}
            transition={{
              duration: 2,
              repeat: isDragging ? Infinity : 0,
              ease: "easeInOut",
            }}
            className="absolute -inset-4 bg-primary/10 rounded-full blur-md"
            style={{ display: isDragging ? "block" : "none" }}
          />
          {type === "image" ? (
            <ImageIcon
              className={clsx(
                "w-16 h-16 md:w-20 md:h-20 drop-shadow-sm transition-colors duration-300",
                isDragging
                  ? "text-primary"
                  : "text-muted-foreground group-hover:text-primary"
              )}
            />
          ) : (
            <Video
              className={clsx(
                "w-16 h-16 md:w-20 md:h-20 drop-shadow-sm transition-colors duration-300",
                isDragging
                  ? "text-primary"
                  : "text-muted-foreground group-hover:text-primary"
              )}
            />
          )}
        </motion.div>

        <div className="space-y-2">
          <h3 className="text-xl md:text-2xl font-semibold text-foreground">
            {isDragging ? "Suelta aquí" : title}
          </h3>
          <p className="text-muted-foreground md:text-lg max-w-md mx-auto">
            {isDragging ? (
              <span className="font-medium text-primary">
                Suelta para cargar
              </span>
            ) : (
              description || (
                <>
                  Arrastra y suelta aquí, o{" "}
                  <span className="text-primary font-medium">explora</span>
                </>
              )
            )}
          </p>
          <p className="text-sm text-muted-foreground">
            {supportedFormats}
            {maxSize && ` • Máx. ${formatFileSize(maxSize)}`}
          </p>
        </div>

        <input
          ref={inputRef}
          type="file"
          hidden
          onChange={onSelect}
          accept={accept}
          disabled={disabled}
        />
      </div>
    </motion.div>
  );
}
