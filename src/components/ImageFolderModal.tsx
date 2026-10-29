import React, { useState } from 'react';
import { imageService } from '../services/imageService';
import {
  FolderSync,
  FolderOpen,
  Image as ImageIcon,
  CheckCircle2,
  HardDrive,
  Trash2,
  X,
  Upload,
  Info,
} from 'lucide-react';

interface ImageFolderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImagesUpdated: () => void;
}

export const ImageFolderModal: React.FC<ImageFolderModalProps> = ({
  isOpen,
  onClose,
  onImagesUpdated,
}) => {
  const [successCount, setSuccessCount] = useState<number | null>(null);

  if (!isOpen) return null;

  const loadedFilenames = imageService.getLoadedFilenames();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const count = imageService.registerMultipleFiles(e.target.files);
      setSuccessCount(count);
      onImagesUpdated();
      setTimeout(() => setSuccessCount(null), 4000);
    }
  };

  const handleClear = () => {
    imageService.clearLoaded();
    onImagesUpdated();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-stone-900 border border-stone-800 text-stone-100 rounded-2xl max-w-xl w-full shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        
        {/* Header */}
        <div className="p-4 bg-stone-950 border-b border-stone-800 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <FolderSync className="w-5 h-5 text-amber-400" />
            <div>
              <h3 className="font-black text-sm text-stone-100">Vincular Carpeta de Imágenes ('img\')</h3>
              <p className="text-[11px] text-stone-400">Carga fotos locales para que coincidan con el campo 'Imagen' de Platos</p>
            </div>
          </div>
          <button onClick={onClose} className="text-stone-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4 overflow-y-auto text-xs">
          
          {/* Target directory notice */}
          <div className="p-3.5 bg-stone-950 border border-stone-800 rounded-xl space-y-2">
            <div className="flex items-center space-x-2 text-stone-300 font-bold">
              <HardDrive className="w-4 h-4 text-amber-400" />
              <span>Directorio Local de Fotos:</span>
            </div>
            <code className="block bg-stone-900 px-3 py-1.5 rounded-lg text-amber-300 font-mono text-[11px] break-all border border-stone-800">
              C:\Users\Admin\Desktop\Trabajos\Gemini AI\POS\img\
            </code>
            <p className="text-[11px] text-stone-400 leading-relaxed">
              En la tabla <strong className="text-stone-200">Platos</strong> se almacena solo el nombre del archivo (ejemplo: <span className="text-amber-300 font-mono">imagen.jpg</span>). Al seleccionar las imágenes de su carpeta, el sistema las vincula automáticamente por su nombre de archivo.
            </p>
          </div>

          {/* Success toast */}
          {successCount !== null && (
            <div className="p-3 bg-emerald-950/60 border border-emerald-500/40 rounded-xl text-emerald-300 flex items-center space-x-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>¡Se vincularon exitosamente {successCount} imágenes locales!</span>
            </div>
          )}

          {/* Selector Button */}
          <div className="p-4 bg-stone-950 border border-stone-800 rounded-xl flex flex-col sm:flex-row items-center justify-between gap-3">
            <div>
              <p className="font-bold text-stone-200">Seleccionar fotos de la carpeta img</p>
              <p className="text-[11px] text-stone-400">Puede seleccionar una o múltiples fotos a la vez (Ctrl + A)</p>
            </div>

            <label className="w-full sm:w-auto px-4 py-2.5 bg-amber-500 hover:bg-amber-400 text-stone-950 font-black rounded-xl cursor-pointer text-center flex items-center justify-center space-x-2 shadow-lg shadow-amber-500/20 transition-all">
              <FolderOpen className="w-4 h-4" />
              <span>Examinar Fotos</span>
              <input
                type="file"
                multiple
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
              />
            </label>
          </div>

          {/* Sync to Server Action for QR Clients */}
          <div className="p-3 bg-gradient-to-r from-amber-950/40 via-stone-950 to-stone-950 border border-amber-500/30 rounded-xl flex items-center justify-between">
            <div>
              <p className="font-bold text-amber-300 text-xs">Sincronizar Fotos con el Menú QR</p>
              <p className="text-[11px] text-stone-400">Publica las imágenes en el servidor para que los comensales las vean en su celular</p>
            </div>
            <button
              type="button"
              onClick={async () => {
                await imageService.syncStoredImagesToServer();
                setSuccessCount(loadedFilenames.length);
                setTimeout(() => setSuccessCount(null), 4000);
              }}
              className="px-3.5 py-1.5 bg-amber-500 hover:bg-amber-400 text-stone-950 font-black rounded-lg text-xs transition-colors shrink-0 shadow-sm"
            >
              Publicar Fotos
            </button>
          </div>

          {/* Currently loaded images list */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-stone-300">
                Imágenes Vinculadas ({loadedFilenames.length})
              </span>
              {loadedFilenames.length > 0 && (
                <button
                  type="button"
                  onClick={handleClear}
                  className="text-[11px] text-stone-400 hover:text-red-400 flex items-center space-x-1"
                >
                  <Trash2 className="w-3 h-3" />
                  <span>Desvincular todas</span>
                </button>
              )}
            </div>

            {loadedFilenames.length === 0 ? (
              <div className="p-6 bg-stone-950 rounded-xl border border-stone-800 text-center text-stone-500 space-y-1">
                <ImageIcon className="w-8 h-8 mx-auto text-stone-600 mb-2" />
                <p className="font-medium text-stone-400">Aún no hay fotos vinculadas desde tu carpeta</p>
                <p className="text-[11px]">
                  Mientras tanto, el POS mostrará fotos de alta resolución gastronómicas por defecto para cada plato.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 max-h-48 overflow-y-auto p-1">
                {loadedFilenames.map((fname) => {
                  const url = imageService.getImageUrl(fname);
                  return (
                    <div
                      key={fname}
                      className="p-1.5 bg-stone-950 border border-stone-800 rounded-lg flex items-center space-x-2"
                    >
                      <img
                        src={url}
                        alt={fname}
                        className="w-8 h-8 rounded object-cover bg-stone-900 shrink-0"
                      />
                      <span className="font-mono text-[10px] text-stone-300 truncate" title={fname}>
                        {fname}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

        </div>

        {/* Footer */}
        <div className="p-3 bg-stone-950 border-t border-stone-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-stone-800 hover:bg-stone-700 text-stone-200 font-semibold rounded-xl text-xs"
          >
            Listo
          </button>
        </div>

      </div>
    </div>
  );
};
