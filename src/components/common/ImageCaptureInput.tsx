import React, { useRef, useState } from 'react';
import { Camera, Image as ImageIcon, RefreshCw, Trash2, CheckCircle2, Maximize2, X } from 'lucide-react';
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
  const [fitMode, setFitMode] = useState<'contain' | 'cover'>('contain');
  const [showFullPreviewModal, setShowFullPreviewModal] = useState<boolean>(false);

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
        <label className="block text-xs font-bold text-slate-700 tracking-wide">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
        {previewUrl && (
          <span className="inline-flex items-center text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
            <CheckCircle2 className="w-3.5 h-3.5 mr-1 text-emerald-600" /> Foto Anexada
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
        <div className="space-y-2">
          <div className="relative group border border-slate-700 rounded-2xl overflow-hidden bg-slate-950 shadow-md">
            {/* Background Blur for crisp presentation without blank side bands */}
            <div
              className="absolute inset-0 bg-cover bg-center opacity-30 blur-md"
              style={{ backgroundImage: `url(${previewUrl})` }}
            />

            <div className="relative z-10 w-full h-52 flex items-center justify-center p-2">
              <img
                src={previewUrl}
                alt="Foto do Equipamento"
                className={`max-h-full max-w-full rounded-lg shadow-lg transition-all ${
                  fitMode === 'cover' ? 'w-full h-full object-cover' : 'object-contain'
                }`}
              />
            </div>

            {isUploading && (
              <div className="absolute inset-0 z-20 bg-slate-900/80 backdrop-blur-xs flex items-center justify-center text-white text-xs font-bold gap-2">
                <RefreshCw className="w-5 h-5 animate-spin text-red-400" />
                <span>Processando foto em alta qualidade...</span>
              </div>
            )}

            {/* Top Bar Actions */}
            <div className="absolute top-2 right-2 z-20 flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setFitMode((prev) => (prev === 'contain' ? 'cover' : 'contain'))}
                className="px-2.5 py-1 text-[11px] font-bold text-white bg-slate-900/80 hover:bg-slate-900 rounded-lg backdrop-blur-md border border-white/20 shadow-xs transition-colors cursor-pointer"
                title="Alternar Enquadramento"
              >
                {fitMode === 'contain' ? 'Sem Cortes' : 'Preencher'}
              </button>
              <button
                type="button"
                onClick={() => setShowFullPreviewModal(true)}
                className="p-1.5 text-white bg-slate-900/80 hover:bg-slate-900 rounded-lg backdrop-blur-md border border-white/20 shadow-xs transition-colors cursor-pointer"
                title="Ampliar Foto"
              >
                <Maximize2 className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Bottom Bar Controls */}
            <div className="absolute bottom-2 left-2 right-2 z-20 flex items-center justify-between gap-2">
              <span className="text-[10px] font-bold text-white/80 bg-slate-900/80 px-2 py-0.5 rounded-md backdrop-blur-xs border border-white/10">
                Foto do Equipamento
              </span>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => cameraInputRef.current?.click()}
                  className="inline-flex items-center gap-1 text-xs font-bold text-white bg-slate-800/90 hover:bg-slate-900 px-2.5 py-1 rounded-lg backdrop-blur-xs border border-white/20 shadow-md transition-colors cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5 text-slate-300" />
                  <span>Refazer</span>
                </button>
                <button
                  type="button"
                  onClick={handleRemoveImage}
                  className="inline-flex items-center gap-1 text-xs font-bold text-white bg-red-600/90 hover:bg-red-700 px-2.5 py-1 rounded-lg shadow-md transition-colors cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Excluir</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="border-2 border-dashed border-slate-300 rounded-2xl p-5 bg-slate-50/70 text-center hover:bg-slate-100/70 transition-colors">
          <p className="text-xs text-slate-600 font-medium mb-3">
            Tire uma foto clara e nítida do equipamento ou selecione um arquivo da galeria:
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              type="button"
              onClick={() => cameraInputRef.current?.click()}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-[#D32F2F] text-white font-bold text-xs uppercase tracking-wider rounded-xl hover:bg-red-800 shadow-xs transition-colors cursor-pointer"
            >
              <Camera className="w-4 h-4" />
              <span>Bater foto agora</span>
            </button>
            <button
              type="button"
              onClick={() => galleryInputRef.current?.click()}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-white text-slate-700 border border-slate-300 font-bold text-xs uppercase tracking-wider rounded-xl hover:bg-slate-50 shadow-xs transition-colors cursor-pointer"
            >
              <ImageIcon className="w-4 h-4 text-slate-500" />
              <span>Escolher da galeria</span>
            </button>
          </div>
        </div>
      )}

      {/* Lightbox / Full Size Modal */}
      {showFullPreviewModal && previewUrl && (
        <div className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4">
          <div className="relative max-w-4xl w-full max-h-[90vh] flex flex-col items-center">
            <button
              onClick={() => setShowFullPreviewModal(false)}
              className="absolute -top-10 right-0 p-2 text-white hover:text-red-400 transition-colors cursor-pointer"
            >
              <X className="w-6 h-6" />
            </button>
            <div className="w-full max-h-[80vh] flex items-center justify-center p-2 bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden shadow-2xl">
              <img
                src={previewUrl}
                alt="Foto Ampliada"
                className="max-w-full max-h-[75vh] object-contain rounded-lg"
              />
            </div>
            <p className="text-xs text-slate-400 mt-3 font-medium">Foto original do patrimônio</p>
          </div>
        </div>
      )}
    </div>
  );
};
