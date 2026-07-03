import React, { useState, useEffect } from 'react';
import { LogIn, LogOut, User, Sparkles, FolderOpen, Smile, RefreshCw, Layers, UploadCloud } from 'lucide-react';
import { initAuth, googleSignIn, logout } from './auth';
import { Profile, DriveFolder, DriveFile, ProcessLog } from './types';
import ProfileCreator from './components/ProfileCreator';
import DriveConfig from './components/DriveConfig';
import FolderOrganizer from './components/FolderOrganizer';
import GalleryView from './components/GalleryView';
import LocalUpload from './components/LocalUpload';

export default function App() {
  // Mode state
  const [mode, setMode] = useState<'local' | 'drive'>('local');

  // Auth state
  const [user, setUser] = useState<any>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // App States
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [connectedFolder, setConnectedFolder] = useState<DriveFolder | null>(null);
  const [isConnectingFolder, setIsConnectingFolder] = useState(false);
  const [folderError, setFolderError] = useState('');

  const [files, setFiles] = useState<DriveFile[]>([]);
  const [logs, setLogs] = useState<ProcessLog[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [matchStats, setMatchStats] = useState<Record<string, number>>({});

  // Helper: Append logs
  const addLog = (message: string, type: 'info' | 'success' | 'warning' | 'error' = 'info') => {
    setLogs(prev => [
      {
        id: 'log_' + Date.now() + '_' + Math.random(),
        timestamp: new Date().toLocaleTimeString('pt-BR'),
        message,
        type
      },
      ...prev
    ]);
  };

  // Load registered reference profiles on mount
  useEffect(() => {
    const stored = localStorage.getItem('drive_face_profiles');
    if (stored) {
      try {
        setProfiles(JSON.parse(stored));
      } catch (e) {
        console.error('Error loading profiles:', e);
      }
    }
    addLog('Organizador de Fotos carregado. Crie perfis e conecte seu Drive.', 'info');
  }, []);

  // Listen for Google Auth State
  useEffect(() => {
    const unsubscribe = initAuth(
      (authUser, token) => {
        setUser(authUser);
        setAccessToken(token);
        addLog(`Autenticado com sucesso como ${authUser.displayName || authUser.email}.`, 'success');
      },
      () => {
        setUser(null);
        setAccessToken(null);
      }
    );
    return () => unsubscribe();
  }, []);

  // Login handler
  const handleLogin = async () => {
    setIsLoggingIn(true);
    try {
      const result = await googleSignIn();
      if (result) {
        setUser(result.user);
        setAccessToken(result.accessToken);
        addLog(`Sessão iniciada como ${result.user.displayName || result.user.email}.`, 'success');
      }
    } catch (err: any) {
      console.error(err);
      addLog(`Erro ao autenticar: ${err.message}`, 'error');
    } finally {
      setIsLoggingIn(false);
    }
  };

  // Logout handler
  const handleLogout = async () => {
    try {
      await logout();
      setUser(null);
      setAccessToken(null);
      setConnectedFolder(null);
      setFiles([]);
      setMatchStats({});
      addLog('Sessão encerrada com sucesso.', 'info');
    } catch (err: any) {
      console.error(err);
    }
  };

  // Profile lifecycle
  const handleAddProfile = (newProfile: Profile) => {
    const updated = [...profiles, newProfile];
    setProfiles(updated);
    localStorage.setItem('drive_face_profiles', JSON.stringify(updated));
    addLog(`Perfil de referência para "${newProfile.name}" adicionado.`, 'success');
  };

  const handleDeleteProfile = (id: string) => {
    const deletedProfile = profiles.find(p => p.id === id);
    const updated = profiles.filter(p => p.id !== id);
    setProfiles(updated);
    localStorage.setItem('drive_face_profiles', JSON.stringify(updated));
    addLog(`Perfil de "${deletedProfile?.name || 'Referência'}" removido.`, 'info');
  };

  // Fetch initial files lists
  const fetchFolderImages = async (folderId: string) => {
    try {
      const res = await fetch('/api/drive/list-images', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ folderId, accessToken })
      });

      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setFiles(data.files);
          addLog(`Encontradas ${data.files.length} fotos prontas para processamento.`, 'info');
        } else {
          addLog(`Falha ao carregar fotos da pasta: ${data.error}`, 'warning');
        }
      } else {
        const errText = await res.text();
        addLog(`Falha ao carregar fotos da pasta: ${errText}`, 'warning');
      }
    } catch (err: any) {
      console.error('Error fetching images:', err);
      addLog('Aviso: Não foi possível listar fotos da pasta conectada.', 'warning');
    }
  };

  // Connect Google Drive Folder Handler
  const handleConnectFolder = async (folderUrlOrId: string) => {
    setIsConnectingFolder(true);
    setFolderError('');
    addLog(`Conectando à pasta do Google Drive...`, 'info');
    try {
      const res = await fetch('/api/drive/folder-info', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ folderUrlOrId, accessToken })
      });

      let errorMsg = 'Falha ao buscar detalhes da pasta.';
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          const folder = data.folder;
          setConnectedFolder(folder);
          addLog(`Pasta "${folder.name}" conectada com sucesso!`, 'success');
          // Download file list
          await fetchFolderImages(folder.id);
          return;
        } else {
          errorMsg = data.error || errorMsg;
        }
      } else {
        try {
          const contentType = res.headers.get('content-type');
          if (contentType && contentType.includes('application/json')) {
            const errData = await res.json();
            errorMsg = errData.error || errorMsg;
          } else {
            const errText = await res.text();
            errorMsg = errText.substring(0, 200) || errorMsg;
          }
        } catch {}
      }
      throw new Error(errorMsg);
    } catch (err: any) {
      console.error(err);
      setFolderError(err.message);
      addLog(`Erro ao conectar pasta: ${err.message}`, 'error');
    } finally {
      setIsConnectingFolder(false);
    }
  };

  // Execute facial recognition & Drive organization
  const handleStartOrganization = async (options: { limit: number | string; autoOrganizeInDrive: boolean }) => {
    if (mode === 'drive' && (!connectedFolder || !accessToken)) return;
    if (mode === 'local' && files.length === 0) return;

    setIsProcessing(true);
    setLogs([]); // Clear logs for clean display
    setMatchStats({}); // Reset statistics

    addLog('Iniciando processamento com Inteligência Artificial...', 'info');
    if (mode === 'drive') {
      addLog(`Parâmetros: Limite de ${options.limit} arquivos | Organização física: ${options.autoOrganizeInDrive ? 'Sim' : 'Não'}`, 'info');
    } else {
      addLog(`Parâmetros: Modo Upload Direto | Analisando ${files.length} fotos carregadas`, 'info');
    }

    try {
      const endpoint = mode === 'drive' ? '/api/drive/organize' : '/api/local/organize';
      const payload = mode === 'drive' ? {
        folderId: connectedFolder?.id,
        accessToken,
        profiles,
        limit: options.limit,
        autoOrganizeInDrive: options.autoOrganizeInDrive
      } : {
        profiles,
        files: files.map(f => ({
          id: f.id,
          name: f.name,
          mimeType: f.mimeType,
          base64Data: (f as any).base64Data
        }))
      };

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      let errorMsg = 'Ocorreu um erro ao processar a organização.';
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          const results = data.results || [];

          // Create a fresh list of files to update match stats
          const updatedFiles = [...files];
          const stats: Record<string, number> = {};

          results.forEach((r: any) => {
            const fileIdx = updatedFiles.findIndex(f => f.id === r.fileId);

            if (r.status === 'matched') {
              const name = r.matchedProfileName || 'Identificado';
              stats[name] = (stats[name] || 0) + 1;

              if (fileIdx !== -1) {
                updatedFiles[fileIdx] = {
                  ...updatedFiles[fileIdx],
                  matchedProfileId: r.matchedProfileId,
                  matchedProfileName: name,
                  confidence: r.confidence
                };
              }

              const moveMsg = (mode === 'drive' && options.autoOrganizeInDrive) ? ` e movida para o álbum "Álbum - ${name}"` : '';
              addLog(`Foto "${r.fileName}" correspondida com ${name} (${Math.round(r.confidence * 100)}% de confiança)${moveMsg}.`, 'success');
            } else if (r.status === 'unmatched') {
              if (fileIdx !== -1) {
                updatedFiles[fileIdx] = {
                  ...updatedFiles[fileIdx],
                  matchedProfileId: null,
                  matchedProfileName: null,
                  confidence: null
                };
              }
              addLog(`Foto "${r.fileName}" analisada: nenhum rosto coincidente de alta confiança.`, 'info');
            } else {
              addLog(`Aviso na foto "${r.fileName}": ${r.error || 'Erro desconhecido'}`, 'warning');
            }
          });

          setFiles(updatedFiles);
          setMatchStats(stats);
          addLog(`Análise Facial concluída com sucesso! Total de fotos analisadas: ${results.length}.`, 'success');
          return;
        } else {
          errorMsg = data.error || errorMsg;
        }
      } else {
        try {
          const contentType = res.headers.get('content-type');
          if (contentType && contentType.includes('application/json')) {
            const errData = await res.json();
            errorMsg = errData.error || errorMsg;
          } else {
            const errText = await res.text();
            errorMsg = errText.substring(0, 200) || errorMsg;
          }
        } catch {}
      }
      throw new Error(errorMsg);
    } catch (err: any) {
      console.error(err);
      addLog(`Erro crítico durante a organização: ${err.message}`, 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col font-sans">
      {/* Top Header navbar */}
      <header className="bg-white border-b border-slate-200 px-6 py-4 sticky top-0 z-50 shadow-xs">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="bg-blue-600 text-white p-2.5 rounded-2xl flex items-center justify-center shadow-xs shadow-blue-200">
              <Sparkles className="w-5.5 h-5.5 fill-white" />
            </div>
            <div>
              <h1 className="text-base font-bold tracking-tight text-slate-800 leading-none">
                Organizador Facial do Google Drive
              </h1>
              <p className="text-[11px] text-slate-400 font-medium mt-1">
                Classificação Inteligente por Reconhecimento de Rosto
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {user ? (
              <div className="flex items-center gap-3 bg-slate-50 border border-slate-200 p-1.5 pl-3 rounded-full">
                <div className="hidden sm:block text-right">
                  <p className="text-xs font-semibold text-slate-700 leading-none">
                    {user.displayName || 'Usuário Google'}
                  </p>
                  <p className="text-[10px] text-slate-400 mt-0.5 font-mono truncate max-w-[120px]">
                    {user.email}
                  </p>
                </div>
                {user.photoURL ? (
                  <img
                    src={user.photoURL}
                    alt={user.displayName}
                    referrerPolicy="no-referrer"
                    className="w-8 h-8 rounded-full border border-white shadow-xs"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs">
                    <User className="w-4 h-4" />
                  </div>
                )}
                <button
                  onClick={handleLogout}
                  title="Sair"
                  className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-full transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                onClick={handleLogin}
                disabled={isLoggingIn}
                className="gsi-material-button text-xs font-semibold transition-transform active:scale-95 flex items-center gap-2 cursor-pointer shadow-2xs"
              >
                <div className="gsi-material-button-state"></div>
                <div className="gsi-material-button-content-wrapper">
                  <div className="gsi-material-button-icon">
                    <svg version="1.1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" style={{ display: 'block' }}>
                      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"></path>
                      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"></path>
                      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"></path>
                      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"></path>
                      <path fill="none" d="M0 0h48v48H0z"></path>
                    </svg>
                  </div>
                  <span className="gsi-material-button-contents">Entrar com o Google</span>
                </div>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Container Content */}
      <main className="grow max-w-7xl mx-auto w-full px-6 py-8 flex flex-col gap-8">
        {/* Welcome Section */}
        <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 flex flex-col sm:flex-row items-center justify-between gap-6 shadow-xs relative overflow-hidden">
          <div className="space-y-2 relative z-10 text-center sm:text-left">
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-800">
              Organize suas fotos por rosto automaticamente
            </h2>
            <p className="text-slate-500 text-xs sm:text-sm max-w-xl font-medium">
              {mode === 'local' 
                ? "Cadastre as selfies de referência das pessoas, envie um lote de fotos locais por upload direto, e deixe a inteligência artificial do Gemini identificar e separar as fotos de cada um instantaneamente."
                : "Conecte uma pasta do Google Drive, cadastre as selfies de referência das pessoas, e deixe a inteligência artificial do Gemini encontrar e separar as fotos de cada um física e visualmente."}
            </p>
          </div>
          <div className="flex gap-4 items-center bg-slate-50 border border-slate-200 px-5 py-4 rounded-2xl shrink-0">
            <div className="text-center">
              <span className="block text-2xl font-black text-blue-600">{profiles.length}</span>
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Perfis</span>
            </div>
            <div className="w-px h-8 bg-slate-200" />
            <div className="text-center">
              <span className="block text-2xl font-black text-blue-600">{files.length}</span>
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Fotos</span>
            </div>
          </div>
        </div>

        {/* Mode Switcher */}
        <div className="flex justify-center sm:justify-start">
          <div className="flex bg-slate-100 p-1.5 rounded-2xl border border-slate-200/60 shadow-inner">
            <button
              onClick={() => {
                setMode('local');
                setFiles([]);
                setLogs([]);
                setMatchStats({});
                addLog('Modo de Upload Direto ativo. Não necessita de conta Google.', 'info');
              }}
              className={`px-5 py-2.5 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center gap-2 ${
                mode === 'local'
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <UploadCloud className="w-4 h-4" />
              Upload Direto (Sem Conta Google)
            </button>
            <button
              onClick={() => {
                setMode('drive');
                setFiles([]);
                setLogs([]);
                setMatchStats({});
                addLog('Modo Google Drive ativo. Requer login com sua conta Google.', 'info');
              }}
              className={`px-5 py-2.5 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center gap-2 ${
                mode === 'drive'
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <FolderOpen className="w-4 h-4" />
              Google Drive (Com Login)
            </button>
          </div>
        </div>

        {/* Setup Config Cards Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Column 1: Profile Reference selfies */}
          <div className="lg:col-span-1">
            <ProfileCreator
              onAddProfile={handleAddProfile}
              profiles={profiles}
              onDeleteProfile={handleDeleteProfile}
              user={user}
            />
          </div>

          {/* Column 2: Drive Link & Execution */}
          <div className="lg:col-span-2 flex flex-col gap-8">
            {mode === 'drive' ? (
              <DriveConfig
                accessToken={accessToken}
                onConnectFolder={handleConnectFolder}
                connectedFolder={connectedFolder}
                isLoading={isConnectingFolder}
                error={folderError}
              />
            ) : (
              <LocalUpload
                files={files}
                onAddFiles={(newFiles) => {
                  setFiles(prev => [...prev, ...newFiles]);
                  addLog(`Carregadas mais ${newFiles.length} fotos na fila local.`, 'success');
                }}
                onRemoveFile={(id) => {
                  const filename = files.find(f => f.id === id)?.name || 'foto';
                  setFiles(prev => prev.filter(f => f.id !== id));
                  addLog(`Foto "${filename}" removida da fila.`, 'info');
                }}
                onClearAll={() => {
                  setFiles([]);
                  addLog('Fila de fotos local limpa.', 'info');
                }}
                isProcessing={isProcessing}
              />
            )}

            <FolderOrganizer
              connectedFolder={connectedFolder}
              profiles={profiles}
              logs={logs}
              onStartOrganization={handleStartOrganization}
              isProcessing={isProcessing}
              matchStats={matchStats}
              mode={mode}
              localFilesCount={files.length}
            />
          </div>
        </div>

        {/* Gallery View Section */}
        <GalleryView
          profiles={profiles}
          files={files}
          user={user}
          mode={mode}
        />
      </main>

      {/* Footer credits and information */}
      <footer className="bg-white border-t border-slate-200 py-6 px-6 text-center text-xs text-slate-400">
        <div className="max-w-7xl mx-auto">
          <p>© {new Date().getFullYear()} Organizador Facial Inteligente. Integrado de forma segura com Google Drive & Gemini AI.</p>
        </div>
      </footer>
    </div>
  );
}
