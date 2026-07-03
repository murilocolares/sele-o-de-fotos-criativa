import React, { useState } from 'react';
import { FolderOpen, Link2, CheckCircle2, AlertTriangle, HelpCircle } from 'lucide-react';
import { DriveFolder } from '../types';

interface DriveConfigProps {
  accessToken: string | null;
  onConnectFolder: (folderUrlOrId: string) => Promise<void>;
  connectedFolder: DriveFolder | null;
  isLoading: boolean;
  error: string;
}

export default function DriveConfig({
  accessToken,
  onConnectFolder,
  connectedFolder,
  isLoading,
  error
}: DriveConfigProps) {
  const [folderInput, setFolderInput] = useState('');
  const [showHelp, setShowHelp] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!folderInput.trim()) return;
    onConnectFolder(folderInput.trim());
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs flex flex-col gap-6" id="drive-config-section">
      <div>
        <h2 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
          <FolderOpen className="w-5 h-5 text-blue-600" />
          Conexão com Google Drive
        </h2>
        <p className="text-xs text-slate-500 mt-1">
          Insira o link da pasta principal que contém as fotos que você deseja organizar.
        </p>
      </div>

      {!accessToken ? (
        <div className="p-4 bg-amber-50 rounded-xl border border-amber-200 flex gap-3 text-sm text-amber-800">
          <AlertTriangle className="w-5 h-5 shrink-0 text-amber-600" />
          <div>
            <p className="font-semibold">Primeiro, faça login com o Google</p>
            <p className="text-xs text-amber-700 mt-1">
              Para acessar suas pastas e fotos do Google Drive, conecte sua conta Google no painel superior.
            </p>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="block text-xs font-semibold text-slate-600">
                Link da Pasta do Google Drive
              </label>
              <button
                type="button"
                onClick={() => setShowHelp(!showHelp)}
                className="text-xs text-blue-600 hover:text-blue-700 flex items-center gap-1 font-medium"
              >
                <HelpCircle className="w-3.5 h-3.5" />
                Como obter o link?
              </button>
            </div>

            {showHelp && (
              <div className="mb-3 p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-600 space-y-1.5 animate-fadeIn">
                <p className="font-semibold text-slate-700">Passo a passo para obter o link da pasta:</p>
                <ol className="list-decimal pl-4 space-y-1">
                  <li>Abra o <strong>Google Drive</strong> no seu computador ou celular.</li>
                  <li>Clique com o botão direito na pasta de fotos (ou toque nos três pontinhos).</li>
                  <li>Selecione <strong>Compartilhar</strong> e depois <strong>Copiar link</strong>.</li>
                  <li>Garanta que o link esteja como "Qualquer pessoa com o link" ou simplesmente utilize sua própria conta conectada!</li>
                </ol>
                <p className="text-[10px] text-slate-400 mt-1">
                  Exemplo de link: <code>https://drive.google.com/drive/folders/1A2B3C...</code>
                </p>
              </div>
            )}

            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Link2 className="h-5 h-5 text-slate-400" />
              </div>
              <input
                type="text"
                required
                value={folderInput}
                onChange={(e) => setFolderInput(e.target.value)}
                placeholder="Cole o link da pasta do Google Drive aqui..."
                className="w-full text-sm pl-10 pr-3 py-2.5 rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 transition-all placeholder:text-slate-400"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading || !folderInput.trim()}
            className="w-full py-2.5 text-sm font-semibold bg-blue-600 hover:bg-blue-700 disabled:bg-slate-100 disabled:text-slate-400 text-white rounded-xl shadow-xs transition-all flex items-center justify-center gap-2"
          >
            {isLoading ? "Conectando..." : "Conectar Pasta"}
          </button>
        </form>
      )}

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl">
          <p className="font-semibold">Erro ao conectar à pasta:</p>
          <p className="mt-0.5">{error}</p>
        </div>
      )}

      {connectedFolder && (
        <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-200 flex gap-3 text-sm text-emerald-800">
          <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-600 mt-0.5" />
          <div className="min-w-0">
            <p className="font-semibold">Pasta Conectada!</p>
            <p className="text-xs text-emerald-700 font-medium truncate mt-0.5">
              Nome: {connectedFolder.name}
            </p>
            <p className="text-[10px] text-emerald-600 font-mono truncate mt-0.5">
              ID: {connectedFolder.id}
            </p>
            {connectedFolder.webViewLink && (
              <a
                href={connectedFolder.webViewLink}
                target="_blank"
                rel="noreferrer"
                className="text-xs text-blue-700 hover:underline font-semibold flex items-center gap-1 mt-2"
              >
                Ver pasta no Google Drive
              </a>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
