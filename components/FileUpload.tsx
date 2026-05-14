'use client';

import { useCallback, useState } from 'react';
import { useDropzone, FileRejection, DropEvent } from 'react-dropzone';
import { UploadCloud, X, FileImage, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import Image from 'next/image';

interface FileUploadProps {
  onFileSelect?: (file: File | null) => void;
  onFileDataReady?: (data: { base64: string; name: string; mimeType: string } | null) => void;
  existingUrl?: string;
  maxSizeMB?: number;
  label?: string;
  description?: string;
  className?: string;
}

export default function FileUpload({
  onFileSelect,
  onFileDataReady,
  existingUrl,
  maxSizeMB = 5,
  label = "Upload Photo",
  description = "JPG, PNG or WEBP (Max 5MB)",
  className,
}: FileUploadProps) {
  const [preview, setPreview] = useState<string | null>(existingUrl || null);
  const [error, setError] = useState<string | null>(null);

  const onDrop = useCallback((acceptedFiles: File[], fileRejections: FileRejection[]) => {
    setError(null);

    if (fileRejections.length > 0) {
      const rejection = fileRejections[0];
      if (rejection.errors[0].code === 'file-too-large') {
        setError(`File is too large. Max size is ${maxSizeMB}MB.`);
      } else {
        setError(rejection.errors[0].message);
      }
      return;
    }

    if (acceptedFiles.length > 0) {
      const file = acceptedFiles[0];
      onFileSelect?.(file);

      // Read as base64 for server action
      const reader = new FileReader();
      reader.onload = () => {
        const base64 = reader.result as string;
        setPreview(base64);
        onFileDataReady?.({ base64, name: file.name, mimeType: file.type });
      };
      reader.readAsDataURL(file);
    }
  }, [maxSizeMB, onFileSelect, onFileDataReady]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/jpeg': [],
      'image/png': [],
      'image/webp': [],
    },
    maxFiles: 1,
    maxSize: maxSizeMB * 1024 * 1024,
  });

  const clearFile = (e: React.MouseEvent) => {
    e.stopPropagation();
    setPreview(null);
    onFileSelect?.(null);
    onFileDataReady?.(null);
    setError(null);
  };


  return (
    <div className={cn("w-full", className)}>
      <label className="text-14 font-medium text-gray-700 mb-2 block">{label}</label>
      
      <div
        {...getRootProps()}
        className={cn(
          "relative flex flex-col items-center justify-center w-full min-h-[160px] border-2 border-dashed rounded-xl transition-all cursor-pointer group",
          isDragActive ? "border-blue-500 bg-blue-50/50" : "border-gray-200 hover:border-gray-300 bg-gray-50/30",
          preview ? "p-4" : "p-8",
          error && "border-red-300 bg-red-50/30"
        )}
      >
        <input {...getInputProps()} />

        {preview ? (
          <div className="relative w-full aspect-video md:aspect-square max-h-[240px] rounded-lg overflow-hidden border border-gray-100 shadow-sm group">
            <Image
              src={preview}
              alt="Preview"
              fill
              className="object-contain bg-white"
            />
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              <p className="text-white text-12 font-medium">Click or Drag to Change</p>
            </div>
            <button
              onClick={clearFile}
              className="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors z-10 shadow-md"
              title="Remove photo"
            >
              <X className="size-4" />
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-center text-center">
            <div className="p-3 bg-white rounded-full shadow-sm mb-3 border border-gray-100 group-hover:scale-110 transition-transform">
              <UploadCloud className="size-6 text-gray-400 group-hover:text-blue-500 transition-colors" />
            </div>
            <p className="text-14 font-semibold text-gray-900">
              {isDragActive ? "Drop the photo here" : "Click to upload or drag and drop"}
            </p>
            <p className="text-12 text-gray-500 mt-1">{description}</p>
          </div>
        )}

        {error && (
          <div className="absolute -bottom-8 left-0 flex items-center gap-1.5 text-red-600">
            <AlertCircle className="size-3.5" />
            <span className="text-12 font-medium">{error}</span>
          </div>
        )}
      </div>
    </div>
  );
}
