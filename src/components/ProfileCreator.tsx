import React, { useState, useRef, useEffect } from 'react';
import { Camera, Upload, Trash2, Smile, AlertCircle } from 'lucide-react';
import { Profile } from '../types';

interface ProfileCreatorProps {
  onAddProfile: (profile: Profile) => void;
  profiles: Profile[];
  onDeleteProfile: (id: string) => void;
  user: any;
}

export default function ProfileCreator({ onAddProfile, profiles, onDeleteProfile, user }: ProfileCreatorProps) {
  const [name, setName] = useState('');

  useEffect(() => {
    if (user?.displayName && !name) {
      setName(user.displayName);
    }
  }, [user]);
  const [photoBase64, setPhotoBase64] = useState('');
  const [photoUrl, setPhotoUrl] = useState('');
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState('');

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Handle local file upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = reader.result as string;
      setPhotoBase64(base64);
      setPhotoUrl(URL.createObjectURL(file));
    };
    reader.readAsDataURL(file);
  };

  // Start Webcam
  const startCamera = async () => {
    setCameraError('');
    setIsCameraActive(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: 480, height: 480 },
        audio: false
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
    } catch (err: any) {
      console.error('Camera access error:', err);
      setCameraError('Não foi possível acessar a câmera. Use o upload de arquivo ou conceda permissão de câmera.');
      setIsCameraActive(false);
    }
  };

  // Stop Webcam
  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setIsCameraActive(false);
  };

  // Capture Frame from video stream
  const capturePhoto = () => {
    if (!videoRef.current) return;

    const canvas = document.createElement('canvas');
    canvas.width = 480;
    canvas.height = 480;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      // Mirror if using front camera
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
      ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
      const base64 = canvas.toDataURL('image/jpeg', 0.85);
      setPhotoBase64(base64);
      setPhotoUrl(base64);
    }
    stopCamera();
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !photoBase64) return;

    const newProfile: Profile = {
      id: 'profile_' + Date.now(),
      name: name.trim(),
      photoBase64,
      photoUrl,
      createdAt: new Date().toISOString()
    };

    onAddProfile(newProfile);
    setName('');
    setPhotoBase64('');
    setPhotoUrl('');
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs flex flex-col gap-6" id="profile-creator-section">
      <div>
        <h2 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
          <Smile className="w-5 h-5 text-blue-600" />
          Perfis de Referência (Rostos)
        </h2>
        <p className="text-xs text-slate-500 mt-1">
          Tire uma selfie ou envie uma foto de rosto para identificar as pessoas nas fotos do Drive.
        </p>
      </div>

      <form onSubmit={handleSave} className="space-y-4">
        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1">
            Nome Completo
          </label>
          <input
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ex: Murilo Colares"
            className="w-full text-sm px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 transition-all placeholder:text-slate-400"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1">
            Foto de Referência (Selfie)
          </label>

          {isCameraActive ? (
            <div className="relative rounded-xl overflow-hidden bg-slate-900 border border-slate-200 aspect-square max-w-[320px] mx-auto flex flex-col items-center justify-center">
              <video
                ref={videoRef}
                playsInline
                muted
                className="w-full h-full object-cover scale-x-[-1]"
              />
              <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-3 px-4">
                <button
                  type="button"
                  onClick={capturePhoto}
                  className="px-4 py-2 text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-lg shadow-sm transition-colors"
                >
                  Capturar Foto
                </button>
                <button
                  type="button"
                  onClick={stopCamera}
                  className="px-4 py-2 text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg transition-colors"
                >
                  Cancelar
                </button>
              </div>
            </div>
          ) : photoUrl ? (
            <div className="relative rounded-xl overflow-hidden bg-slate-50 border border-slate-200 aspect-square max-w-[200px] mx-auto group">
              <img
                src={photoUrl}
                alt="Preview"
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover"
              />
              <button
                type="button"
                onClick={() => {
                  setPhotoBase64('');
                  setPhotoUrl('');
                }}
                className="absolute top-2 right-2 p-1.5 bg-red-600 text-white rounded-lg opacity-90 hover:opacity-100 transition-opacity shadow-xs"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-3 max-w-[320px] mx-auto">
              <button
                type="button"
                onClick={startCamera}
                className="flex items-center justify-center gap-2 px-4 py-3 bg-blue-50 hover:bg-blue-100 border border-dashed border-blue-200 text-blue-700 rounded-xl font-medium text-sm transition-all shadow-2xs"
              >
                <Camera className="w-5 h-5" />
                Tirar Selfie com a Câmera
              </button>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-slate-100" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-white px-2 text-slate-400">ou envie um arquivo</span>
                </div>
              </div>

              <label className="flex items-center justify-center gap-2 px-4 py-3 bg-slate-50 hover:bg-slate-100 border border-dashed border-slate-200 text-slate-600 rounded-xl font-medium text-sm cursor-pointer transition-all">
                <Upload className="w-5 h-5 text-slate-400" />
                Selecionar Foto do Celular
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>

              {/* Native Mobile camera helper */}
              <label className="md:hidden flex items-center justify-center gap-2 px-4 py-3 bg-emerald-50 hover:bg-emerald-100 border border-dashed border-emerald-200 text-emerald-700 rounded-xl font-medium text-sm cursor-pointer transition-all">
                <Camera className="w-5 h-5 text-emerald-600" />
                Tirar com Câmera do Celular
                <input
                  type="file"
                  accept="image/*"
                  capture="user"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>
            </div>
          )}

          {cameraError && (
            <div className="mt-3 flex items-start gap-1.5 text-xs text-amber-700 bg-amber-50 p-2.5 rounded-lg border border-amber-100">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{cameraError}</span>
            </div>
          )}
        </div>

        <button
          type="submit"
          disabled={!name.trim() || !photoBase64}
          className="w-full py-2.5 text-sm font-semibold bg-blue-600 hover:bg-blue-700 disabled:bg-slate-100 disabled:text-slate-400 text-white rounded-xl shadow-xs transition-all flex items-center justify-center gap-1.5"
        >
          <Smile className="w-4 h-4" />
          Salvar Perfil de Referência
        </button>
      </form>

      {/* Profiles list */}
      <div className="border-t border-slate-200 pt-5">
        <h3 className="text-xs font-semibold text-slate-600 uppercase tracking-wider mb-3">
          Perfis Cadastrados ({profiles.length})
        </h3>
        {profiles.length === 0 ? (
          <p className="text-xs text-slate-400 italic py-2 text-center">
            Nenhum perfil de referência criado. Adicione um perfil acima.
          </p>
        ) : (
          <div className="grid grid-cols-2 gap-3 max-h-[220px] overflow-y-auto pr-1">
            {profiles.map((profile) => (
              <div
                key={profile.id}
                className="flex items-center gap-2 p-2 rounded-xl bg-slate-50 border border-slate-200 group relative"
              >
                <div className="w-10 h-10 rounded-lg overflow-hidden shrink-0">
                  <img
                    src={profile.photoUrl}
                    alt={profile.name}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-slate-700 truncate">
                    {profile.name}
                  </p>
                  <p className="text-[10px] text-slate-400">
                    {new Date(profile.createdAt).toLocaleDateString('pt-BR')}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => onDeleteProfile(profile.id)}
                  className="absolute right-1 top-1 p-1 bg-white hover:bg-red-50 text-slate-400 hover:text-red-600 rounded-md shadow-xs opacity-0 group-hover:opacity-100 transition-opacity"
                  title="Excluir Perfil"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
