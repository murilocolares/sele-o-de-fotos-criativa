import React, { useState, useEffect } from 'react';
import { Image as ImageIcon, ExternalLink, UserCheck, Eye, Sparkles } from 'lucide-react';
import { Profile, DriveFile } from '../types';

interface GalleryViewProps {
  profiles: Profile[];
  files: DriveFile[];
  user: any;
  mode: 'local' | 'drive';
}

export default function GalleryView({ profiles, files, user, mode }: GalleryViewProps) {
  // Find the profile that matches the Google user if logged in
  const googleClientProfile = user
    ? profiles.find(p => p.name.toLowerCase().trim() === user.displayName?.toLowerCase().trim() || p.name.toLowerCase().trim() === user.email?.toLowerCase().trim())
    : null;

  // Selected profile to filter by. Defaults to Google client profile if available, otherwise "all" or first profile
  const [selectedProfileId, setSelectedProfileId] = useState<string>('all');

  // Sync selectedProfileId when googleClientProfile loads
  useEffect(() => {
    if (googleClientProfile) {
      setSelectedProfileId(googleClientProfile.id);
    }
  }, [googleClientProfile]);

  // Filter files based on selected profile
  const displayedFiles = selectedProfileId === 'all'
    ? files
    : files.filter(file => file.matchedProfileId === selectedProfileId);

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs flex flex-col gap-6" id="gallery-view-section">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
        <div>
          <h2 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
            <ImageIcon className="w-5 h-5 text-blue-600" />
            Galeria de Fotos Analisadas
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            {mode === 'local' 
              ? "Visualize as fotos enviadas localmente e veja quem foi identificado pela IA do Gemini."
              : "Visualize as fotos do seu Google Drive organizadas por reconhecimento facial."}
          </p>
        </div>

        {/* Profile Filter Selector */}
        {profiles.length > 0 && (
          <div className="flex items-center gap-2 self-start sm:self-auto">
            <span className="text-xs text-slate-500 font-semibold flex items-center gap-1 shrink-0">
              <Eye className="w-4 h-4 text-slate-400" />
              Filtrar por Rosto:
            </span>
            <select
              value={selectedProfileId}
              onChange={(e) => setSelectedProfileId(e.target.value)}
              className="text-xs font-semibold px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 focus:outline-hidden focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 text-slate-700 cursor-pointer"
            >
              <option value="all">Mostrar Todas ({files.length})</option>
              {profiles.map(profile => {
                const count = files.filter(f => f.matchedProfileId === profile.id).length;
                return (
                  <option key={profile.id} value={profile.id}>
                    👤 {profile.name} ({count})
                  </option>
                );
              })}
            </select>
          </div>
        )}
      </div>

      {files.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-slate-400 gap-2 bg-slate-50/50 border border-dashed border-slate-200 rounded-2xl">
          <ImageIcon className="w-12 h-12 text-slate-300 stroke-[1.5]" />
          <p className="text-sm font-semibold text-slate-700">Nenhuma foto adicionada ou analisada ainda</p>
          <p className="text-xs text-slate-500 max-w-md text-center">
            {mode === 'local'
              ? "Crie perfis de referência, envie fotos na seção 'Upload de Fotos Locais' e clique em 'Analisar Fotos' para começar."
              : "Conecte sua pasta do Google Drive, cadastre os perfis de referência e clique em 'Iniciar Organização'."}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Active Filter Message */}
          <div className="flex items-center gap-3 bg-blue-50/50 border border-blue-100 p-3.5 rounded-xl text-blue-800 text-xs">
            <UserCheck className="w-5 h-5 text-blue-600 shrink-0" />
            <div className="grow">
              <p className="font-semibold">
                Filtro Ativo: {selectedProfileId === 'all' ? 'Mostrando todas as fotos' : `Apenas fotos de "${profiles.find(p => p.id === selectedProfileId)?.name}"`}
              </p>
              <p className="text-blue-700/90 mt-0.5">
                Total exibido: <strong>{displayedFiles.length}</strong> de <strong>{files.length}</strong> fotos carregadas.
              </p>
            </div>
          </div>

          {displayedFiles.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-slate-400 gap-2 bg-slate-50/50 border border-slate-100 rounded-xl">
              <Sparkles className="w-10 h-10 text-slate-300 stroke-[1.5]" />
              <p className="text-sm font-medium">Nenhum rosto identificado para este perfil</p>
              <p className="text-xs text-slate-500">
                A IA do Gemini não encontrou correspondência com este perfil nas fotos analisadas.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {displayedFiles.map((file) => {
                const matchPercent = file.confidence ? Math.round(file.confidence * 100) : null;
                const matchedProfile = file.matchedProfileId 
                  ? profiles.find(p => p.id === file.matchedProfileId)
                  : null;

                return (
                  <div
                    key={file.id}
                    className="bg-slate-50 rounded-xl border border-slate-200 overflow-hidden flex flex-col group relative hover:shadow-xs transition-all"
                  >
                    {/* Image display */}
                    <div className="aspect-square bg-slate-200 overflow-hidden relative">
                      {file.thumbnailLink ? (
                        <img
                          src={file.thumbnailLink}
                          alt={file.name}
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-slate-400">
                          <ImageIcon className="w-8 h-8" />
                        </div>
                      )}

                      {/* Match Confidence Badge */}
                      {matchedProfile && (
                        <div className="absolute bottom-2 left-2 right-2 bg-emerald-600/95 backdrop-blur-xs text-white px-2 py-1.5 rounded-lg text-[10px] font-bold flex flex-col gap-0.5 shadow-xs">
                          <div className="flex items-center gap-1">
                            <UserCheck className="w-3.5 h-3.5 shrink-0 text-emerald-200" />
                            <span className="truncate">{matchedProfile.name}</span>
                          </div>
                          {matchPercent && (
                            <span className="text-[9px] text-emerald-100 font-mono">
                              Confiança: {matchPercent}%
                            </span>
                          )}
                        </div>
                      )}

                      {/* Open in Drive quick button if drive file */}
                      {file.webContentLink && (
                        <a
                          href={file.webContentLink}
                          target="_blank"
                          rel="noreferrer"
                          className="absolute top-2 right-2 p-1.5 bg-slate-950/70 hover:bg-slate-950 text-white rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                          title="Visualizar no Google Drive"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      )}
                    </div>

                    {/* Details */}
                    <div className="p-2.5 flex flex-col justify-between grow">
                      <p className="text-xs font-semibold text-slate-700 truncate" title={file.name}>
                        {file.name}
                      </p>
                      <p className="text-[9px] text-slate-400 font-mono mt-0.5 truncate">
                        ID: {file.id}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
