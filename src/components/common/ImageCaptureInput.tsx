import React, { useRef, useState } from 'react';
import { Camera, Image as ImageIcon, RefreshCw, Trash2, CheckCircle2 } from 'lucide-react';
import { storage } from '../../lib/storage';

interface ImageCaptureInputProps {
  onImageCaptured: (url: string) => void;
  currentImageUrl?: string;
  label?: string;
  required?: boolean;
}

export const ImageCaptureInput: React.FC<ImageCaptureInputProps> = ({
  onImageCaptured,
  currentImageUrl,
  label = 'Foto do Equipamento / Local',
  required = false
}) => {
  const cameraInputRef = useRef<HTMLInputElement | null>(null);
  const galleryInputRef = useRef<HTMLInputElement | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>(currentImageUrl || '');
  const [isUploading, setIsUploading] = useState<boolean>(false);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      // Local instant preview
      const localUrl = URL.createObjectURL(file);
      setPreviewUrl(localUrl);

      // Upload to Supabase bucket or fallback to Data URL
      const uploadedUrl = await storage.uploadFile(file, 'anexos');
      setPreviewUrl(uploadedUrl);
      onImageCaptured(uploadedUrl);
    } catch (err) {
      console.error('Error processing captured image:', err);
    } finally {
      setIsUploading(false);
      // reset file input value
      e.target.value = '';
    }
  };

  const handleRemoveImage = () => {
    setPreviewUrl('');
    onImageCaptured('');
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="block text-xs font-bold text-gray-700 tracking-wide">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
        {previewUrl && (
          <span className="inline-flex items-center text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
            <CheckCircle2 className="w-3 h-3 mr-1" /> Foto Anexada
          </span>
        )}
      </div>

      {/* Hidden Native File Inputs */}
      <input
        type="file"
        ref={cameraInputRef}
        accept="image/*"
        capture="environment"
        onChange={handleFileChange}
        className="hidden"
      />
      <input
        type="file"
        ref={galleryInputRef}
        accept="image/*"
        onChange={handleFileChange}
        className="hidden"
      />

      {previewUrl ? (
        <div className="relative group border-2 border-slate-200 rounded-xl overflow-hidden bg-slate-900 shadow-md">
          <img
            src={previewUrl}
            alt="Preview"
            className="w-full h-48 object-cover group-hover:opacity-90 transition-opacity"
          />
          {isUploading && (
            <div className="absolute inset-0 bg-black/60 flex items-center justify-center text-white text-xs font-bold gap-2">
              <RefreshCw className="w-5 h-5 animate-spin text-red-400" />
              <span>Enviando foto...</span>
            </div>
          )}

          <div className="absolute bottom-2 right-2 flex items-center gap-2">
            <button
              type="button"
              onClick={() => cameraInputRef.current?.click()}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-white bg-black/70 hover:bg-black px-3 py-1.5 rounded-lg backdrop-blur-xs shadow-md transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Tirar novamente</span>
            </button>
            <button
              type="button"
              onClick={handleRemoveImage}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-white bg-red-600 hover:bg-red-700 px-3 py-1.5 rounded-lg shadow-md transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Remover</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="border-2 border-dashed border-gray-300 rounded-xl p-4 bg-gray-50 text-center hover:bg-gray-100/80 transition-colors">
          <p className="text-xs text-gray-500 font-medium mb-3">
            Capture uma foto em tempo real do dispositivo ou selecione um arquivo da galeria:
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              type="button"
              onClick={() => cameraInputRef.current?.click()}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-[#D32F2F] text-white font-bold text-xs uppercase tracking-wider rounded-xl hover:bg-red-800 shadow-xs transition-colors"
            >
              <Camera className="w-4 h-4" />
              <span>Bater foto na hora</span>
            </button>
            <button
              type="button"
              onClick={() => galleryInputRef.current?.click()}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-white text-gray-700 border border-gray-300 font-bold text-xs uppercase tracking-wider rounded-xl hover:bg-gray-50 shadow-xs transition-colors"
            >
              <ImageIcon className="w-4 h-4 text-gray-500" />
              <span>Escolher da galeria</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
