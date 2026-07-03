import React, { useState } from 'react';
import { Upload, Image as ImageIcon, Trash2, FileImage, HelpCircle } from 'lucide-react';
import { DriveFile } from '../types';

interface LocalUploadProps {
  files: DriveFile[];
  onAddFiles: (newFiles: DriveFile[]) => void;
  onRemoveFile: (id: string) => void;
  onClearAll: () => void;
  isProcessing: boolean;
}

export default function LocalUpload({
  files,
  onAddFiles,
  onRemoveFile,
  onClearAll,
  isProcessing
}: LocalUploadProps) {
  const [isDragActive, setIsDragActive] = useState(false);

  const processFiles = (fileList: FileList) => {
    const validFiles = Array.from(fileList).filter(file => file.type.startsWith('image/'));
    if (validFiles.length === 0) return;

    const newFilesPromises = validFiles.map(file => {
      return new Promise<DriveFile>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64Data = reader.result as string;
          resolve({
            id: 'local_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
            name: file.name,
            mimeType: file.type,
            thumbnailLink: base64Data, // local base64/blob URL for preview
            webContentLink: '',
            // We can store the base64Data on the object itself for API payload
            confidence: null,
            matchedProfileId: null,
            matchedProfileName: null,
            ...({ base64Data } as any) // cast to any to carry base64Data
          });
        };
        reader.readAsDataURL(file);
      });
    });

    Promise.all(newFilesPromises).then(results => {
      onAddFiles(results);
    });
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setIsDragActive(true);
    } else if (e.type === 'dragleave') {
      setIsDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFiles(e.dataTransfer.files);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processFiles(e.target.files);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs flex flex-col gap-6" id="local-upload-section">
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
            <Upload className="w-5 h-5 text-blue-600" />
            Upload de Fotos Locais
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Envie as fotos que deseja organizar e reconhecer rostos sem precisar do Google Drive.
          </p>
        </div>
        {files.length > 0 && !isProcessing && (
          <button
            onClick={onClearAll}
            className="text-xs font-semibold text-red-600 hover:text-red-700 hover:bg-red-50 px-2.5 py-1.5 rounded-lg transition-all"
          >
            Limpar Todas
          </button>
        )}
      </div>

      {/* Drag & Drop Area */}
      <div
        onDragEnter={handleDrag}
        onDragOver={handleDrag}
        onDragLeave={handleDrag}
        onDrop={handleDrop}
        className={`border-2 border-dashed rounded-2xl p-8 text-center transition-all flex flex-col items-center justify-center gap-3 cursor-pointer relative ${
          isDragActive
            ? 'border-blue-500 bg-blue-50/40 scale-[0.99]'
            : 'border-slate-200 hover:border-slate-300 bg-slate-50/50 hover:bg-slate-50'
        }`}
      >
        <input
          type="file"
          multiple
          accept="image/*"
          disabled={isProcessing}
          onChange={handleFileInput}
          className="absolute inset-0 opacity-0 cursor-pointer"
        />
        <div className="p-3 bg-blue-50 text-blue-600 rounded-full">
          <Upload className="w-6 h-6" />
        </div>
        <div>
          <p className="text-sm font-semibold text-slate-700">Arrastar e soltar fotos aqui</p>
          <p className="text-xs text-slate-400 mt-1">ou clique para selecionar do computador</p>
        </div>
        <span className="text-[10px] text-slate-400 font-medium">Aceita JPG, PNG e WEBP</span>
      </div>

      {/* File List / Info */}
      {files.length > 0 && (
        <div className="space-y-3">
          <div className="flex justify-between items-center text-xs text-slate-500">
            <span className="font-medium">Fotos carregadas na fila: <strong>{files.length}</strong></span>
          </div>

          <div className="max-h-[220px] overflow-y-auto border border-slate-100 rounded-xl divide-y divide-slate-100">
            {files.map((file) => (
              <div key={file.id} className="flex items-center gap-3 p-2.5 hover:bg-slate-50 transition-colors">
                <div className="w-10 h-10 rounded-lg overflow-hidden bg-slate-100 shrink-0 border border-slate-200">
                  <img
                    src={file.thumbnailLink}
                    alt={file.name}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="grow min-w-0">
                  <p className="text-xs font-semibold text-slate-700 truncate">{file.name}</p>
                  <p className="text-[9px] text-slate-400 font-mono">
                    Size: {(file.thumbnailLink ? Math.round((file.thumbnailLink.length * 3) / 4 / 1024) : 0)} KB
                  </p>
                </div>
                {!isProcessing && (
                  <button
                    onClick={() => onRemoveFile(file.id)}
                    className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
