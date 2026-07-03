import React from 'react';
import { Image as ImageIcon, ExternalLink, UserCheck, AlertCircle } from 'lucide-react';
import { Profile, DriveFile } from '../types';

interface GalleryViewProps {
  profiles: Profile[];
  files: DriveFile[];
  user: any;
}

export default function GalleryView({ profiles, files, user }: GalleryViewProps) {
  // Find the profile of the logged-in client
  const clientProfile = user
    ? profiles.find(p => p.name.toLowerCase().trim() === user.displayName?.toLowerCase().trim() || p.name.toLowerCase().trim() === user.email?.toLowerCase().trim())
    : null;

  // Filter files to only show those matching the client's profile
  const clientFiles = clientProfile
    ? files.filter(file => file.matchedProfileId === clientProfile.id)
    : [];

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs flex flex-col gap-6" id="gallery-view-section">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
            <ImageIcon className="w-5 h-5 text-blue-600" />
            Minhas Fotos Identificadas (Rosto do Cliente)
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Visualização exclusiva das fotos que correspondem à selfie de referência do cliente (<strong>{user?.displayName || 'Usuário'}</strong>).
          </p>
        </div>
      </div>

      {!user ? (
        <div className="flex flex-col items-center justify-center py-10 text-slate-400 gap-2 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
          <AlertCircle className="w-10 h-10 text-amber-500" />
          <p className="text-sm font-semibold text-slate-700">Acesse sua conta para ver suas fotos</p>
          <p className="text-xs text-slate-400">Faça login com o Google para identificar seu rosto nas fotos.</p>
        </div>
      ) : !clientProfile ? (
        <div className="p-5 bg-blue-50/50 rounded-2xl border border-blue-100 flex flex-col sm:flex-row items-center gap-4 text-center sm:text-left">
          <div className="w-12 h-12 rounded-full overflow-hidden border border-blue-200 shrink-0">
            {user.photoURL ? (
              <img src={user.photoURL} alt={user.displayName} referrerPolicy="no-referrer" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold">
                {user.displayName?.charAt(0) || 'U'}
              </div>
            )}
          </div>
          <div className="grow space-y-1">
            <h4 className="text-sm font-bold text-slate-800">Crie seu Perfil de Referência</h4>
            <p className="text-xs text-slate-600">
              Para identificarmos suas fotos automaticamente, vá na seção <strong>Perfis de Referência</strong> e adicione uma foto com o nome exato do seu perfil do Google: <strong className="text-blue-700 font-semibold">"{user.displayName}"</strong>.
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center gap-3 bg-emerald-50/50 border border-emerald-100 p-3.5 rounded-xl text-emerald-800 text-xs">
            <UserCheck className="w-5 h-5 text-emerald-600 shrink-0" />
            <div>
              <p className="font-semibold">Filtro Ativo: Apenas fotos de {user.displayName}</p>
              <p className="text-emerald-700/90 mt-0.5">
                Total encontrado: <strong>{clientFiles.length}</strong> de <strong>{files.length}</strong> {files.length === 1 ? 'foto analisada' : 'fotos analisadas'} no Drive.
              </p>
            </div>
          </div>

          {clientFiles.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-slate-400 gap-2 bg-slate-50/50 border border-slate-200 rounded-xl">
              <ImageIcon className="w-12 h-12 text-slate-300 stroke-[1.5]" />
              <p className="text-sm font-medium">Nenhuma foto encontrada ainda</p>
              <p className="text-xs text-slate-500">
                Adicione as fotos na pasta conectada do Drive e inicie a organização automática para encontrar seu rosto.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {clientFiles.map((file) => {
                const matchPercent = file.confidence ? Math.round(file.confidence * 100) : null;

                return (
                  <div
                    key={file.id}
                    className="bg-slate-50 rounded-xl border border-slate-200 overflow-hidden flex flex-col group relative hover:shadow-xs transition-all"
                  >
                    {/* Image display */}
                    <div className="aspect-square bg-slate-200 overflow-hidden relative">
                      {file.thumbnailLink ? (
                        <img
                          src={file.thumbnailLink.replace(/=s\d+/, '=s400')} // Upgrade thumbnail size if possible
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
                      {matchPercent && (
                        <div className="absolute bottom-2 left-2 right-2 bg-emerald-600/95 backdrop-blur-xs text-white px-2 py-1 rounded-lg text-[10px] font-bold flex items-center gap-1 shadow-xs">
                          <UserCheck className="w-3.5 h-3.5 shrink-0 text-emerald-200" />
                          <span className="truncate">Seu rosto</span>
                          <span className="ml-auto text-[9px] bg-emerald-800 px-1 py-0.5 rounded-sm">{matchPercent}%</span>
                        </div>
                      )}

                      {/* Open in Drive quick button */}
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
