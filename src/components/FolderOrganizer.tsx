import React, { useState } from 'react';
import { Play, Terminal, CheckCircle2, AlertTriangle, AlertCircle, RefreshCw } from 'lucide-react';
import { Profile, DriveFolder, ProcessLog } from '../types';

interface FolderOrganizerProps {
  connectedFolder: DriveFolder | null;
  profiles: Profile[];
  logs: ProcessLog[];
  onStartOrganization: (options: { limit: number | string; autoOrganizeInDrive: boolean }) => Promise<void>;
  isProcessing: boolean;
  matchStats: Record<string, number>;
  mode: 'local' | 'drive';
  localFilesCount: number;
}

export default function FolderOrganizer({
  connectedFolder,
  profiles,
  logs,
  onStartOrganization,
  isProcessing,
  matchStats,
  mode,
  localFilesCount
}: FolderOrganizerProps) {
  const [limit, setLimit] = useState<number | string>(15);
  const [autoOrganizeInDrive, setAutoOrganizeInDrive] = useState(true);

  const handleStart = () => {
    onStartOrganization({ limit, autoOrganizeInDrive });
  };

  const hasProfiles = profiles.length > 0;
  const hasPhotos = mode === 'local' ? localFilesCount > 0 : !!connectedFolder;
  const isReady = hasPhotos && hasProfiles && !isProcessing;

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs flex flex-col gap-6" id="folder-organizer-section">
      <div>
        <h2 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
          <Play className="w-5 h-5 text-blue-600" />
          {mode === 'local' ? "Análise por Reconhecimento Facial" : "Organizador & Reconhecimento Facial"}
        </h2>
        <p className="text-xs text-slate-500 mt-1">
          {mode === 'local' 
            ? "Inicie a análise das suas fotos locais para reconhecer os rostos com Inteligência Artificial do Gemini."
            : "Inicie o algoritmo de IA para verificar fotos do Google Drive e classificá-las em álbuns."}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-4">
          {mode === 'drive' ? (
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                Limite de Fotos a Analisar
              </label>
              <select
                value={limit}
                onChange={(e) => {
                  const val = e.target.value;
                  setLimit(val === 'all' ? 'all' : Number(val));
                }}
                disabled={isProcessing}
                className="w-full text-sm px-3 py-2.5 rounded-xl border border-slate-200 bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 transition-all text-slate-700"
              >
                <option value={5}>Análise Rápida (5 fotos)</option>
                <option value={10}>Padrão (10 fotos)</option>
                <option value={15}>Completo (15 fotos)</option>
                <option value={20}>Extenso (20 fotos)</option>
                <option value={30}>Max Demo (30 fotos)</option>
                <option value={50}>Lote Grande (50 fotos)</option>
                <option value="all">Sem Limite (Todas as fotos do Drive)</option>
              </select>
              <p className="text-[10px] text-slate-400 mt-1">
                * Limitar o número de fotos evita estourar limites de requisição de IA e otimiza o tempo.
              </p>
            </div>
          ) : (
            <div className="bg-slate-50/50 p-4 border border-slate-200 rounded-xl">
              <span className="text-xs font-bold text-slate-700 block">Modo Upload Direto Ativo</span>
              <p className="text-[11px] text-slate-500 mt-1">
                Todas as {localFilesCount} fotos carregadas serão processadas uma a uma com reconhecimento de rosto do Gemini.
              </p>
            </div>
          )}

          {mode === 'drive' && (
            <div className="flex items-start gap-2 pt-2">
              <input
                type="checkbox"
                id="autoOrganize"
                checked={autoOrganizeInDrive}
                onChange={(e) => setAutoOrganizeInDrive(e.target.checked)}
                disabled={isProcessing}
                className="mt-1 h-4 w-4 rounded-sm border-slate-300 text-blue-600 focus:ring-blue-500"
              />
              <label htmlFor="autoOrganize" className="text-xs text-slate-600 leading-tight">
                <span className="font-semibold block text-slate-700 mb-0.5">Criar Álbuns e Organizar no Drive</span>
                Se ativado, cria subpastas físicas no seu Google Drive (Ex: <em>"Álbum - Murilo"</em>) e move as fotos identificadas automaticamente.
              </label>
            </div>
          )}
        </div>

        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex flex-col justify-between">
          <div className="space-y-2 text-xs">
            <p className="font-semibold text-slate-700">Requisitos para execução:</p>
            {mode === 'drive' ? (
              <div className="flex items-center gap-2">
                <span className={`w-2.5 h-2.5 rounded-full ${connectedFolder ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                <span className={connectedFolder ? 'text-slate-700 font-medium' : 'text-slate-400'}>
                  Pasta conectada: {connectedFolder ? connectedFolder.name : 'Pendente'}
                </span>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <span className={`w-2.5 h-2.5 rounded-full ${localFilesCount > 0 ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                <span className={localFilesCount > 0 ? 'text-slate-700 font-medium' : 'text-slate-400'}>
                  Fotos carregadas: {localFilesCount} {localFilesCount > 0 ? '✓' : '(Mínimo 1)'}
                </span>
              </div>
            )}
            <div className="flex items-center gap-2">
              <span className={`w-2.5 h-2.5 rounded-full ${hasProfiles ? 'bg-emerald-500' : 'bg-slate-300'}`} />
              <span className={hasProfiles ? 'text-slate-700 font-medium' : 'text-slate-400'}>
                Perfis cadastrados: {profiles.length} {hasProfiles ? '✓' : '(Mínimo 1)'}
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={handleStart}
            disabled={!isReady}
            className="w-full mt-4 py-3 text-sm font-semibold text-white rounded-xl shadow-xs transition-all flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-200 disabled:text-slate-400"
          >
            {isProcessing ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                Processando IA Facial...
              </>
            ) : (
              <>
                <Play className="w-4 h-4 fill-white" />
                {mode === 'local' ? "Analisar Fotos" : "Iniciar Organização Automática"}
              </>
            )}
          </button>
        </div>
      </div>

      {/* Stats Summary after execution */}
      {Object.keys(matchStats).length > 0 && !isProcessing && (
        <div className="bg-blue-50/50 p-4 rounded-xl border border-blue-200">
          <h3 className="text-xs font-semibold text-blue-800 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-blue-600" />
            Resultados do Último Escaneamento
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {Object.entries(matchStats).map(([name, count]) => (
              <div key={name} className="bg-white p-2.5 rounded-lg border border-slate-200 flex justify-between items-center">
                <span className="text-xs font-semibold text-slate-700 truncate mr-2">{name}</span>
                <span className="bg-blue-100 text-blue-800 text-xs px-2 py-0.5 rounded-full font-bold">
                  {count} {count === 1 ? 'foto' : 'fotos'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Terminal logs view */}
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-semibold text-slate-600 flex items-center gap-1.5">
          <Terminal className="w-4 h-4 text-slate-500" />
          Terminal de Processamento (Logs em Tempo Real)
        </label>
        <div className="bg-slate-900 text-slate-200 font-mono text-[11px] p-4 rounded-xl h-[180px] overflow-y-auto space-y-1.5 shadow-inner">
          {logs.length === 0 ? (
            <p className="text-slate-500 italic">Nenhuma atividade registrada. O terminal exibirá o progresso quando você iniciar a organização.</p>
          ) : (
            logs.map((log) => {
              let color = 'text-slate-400';
              if (log.type === 'success') color = 'text-emerald-400';
              if (log.type === 'warning') color = 'text-amber-400';
              if (log.type === 'error') color = 'text-red-400';

              return (
                <div key={log.id} className="flex gap-2">
                  <span className="text-slate-500 shrink-0">[{log.timestamp}]</span>
                  <span className={`${color} leading-relaxed break-all`}>{log.message}</span>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
