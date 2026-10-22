import React, { useState } from 'react';
import {
  Github,
  Copy,
  Check,
  Terminal,
  ExternalLink,
  FolderGit2,
  Lock,
  Sparkles,
  X,
  Code2,
  HardDrive
} from 'lucide-react';

interface GitHubModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const GitHubModal: React.FC<GitHubModalProps> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<'push' | 'clone' | 'token'>('push');
  const [copied, setCopied] = useState<string | null>(null);

  // Direct GitHub API state
  const [githubToken, setGithubToken] = useState('');
  const [repoName, setRepoName] = useState('TerrenoBroaster-POS');
  const [githubUser, setGithubUser] = useState('AbueloTech');
  const [isPrivate, setIsPrivate] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  if (!isOpen) return null;

  const targetPath = `C:\\Users\\Admin\\Desktop\\Trabajos\\Gemini AI\\POS`;
  const currentRepoUrl = `https://github.com/${githubUser || 'AbueloTech'}/${repoName}.git`;
  const webRepoUrl = `https://github.com/${githubUser || 'AbueloTech'}/${repoName}`;

  const gitPushCommands = [
    `cd "${targetPath}"`,
    `git init`,
    `git add .`,
    `git commit -m "feat: Sistema POS Terreno Broaster con SQLite y Comandas"`,
    `git branch -M main`,
    `git remote add origin ${currentRepoUrl}`,
    `git push -u origin main`,
  ];

  const gitRebaseFixCommand = `git pull origin main --rebase && git push -u origin main`;

  const gitCloneCommands = [
    `cd "C:\\Users\\Admin\\Desktop\\Trabajos\\Gemini AI"`,
    `git clone ${currentRepoUrl}`,
    `cd ${repoName}`,
    `npm install`,
    `npm run dev`,
  ];

  const fullPushScript = gitPushCommands.join('\n');
  const fullCloneScript = gitCloneCommands.join('\n');

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 2500);
  };

  const handleDirectGithubPush = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!githubToken.trim() || !repoName.trim()) {
      alert('Por favor ingrese su Personal Access Token (PAT) de GitHub y el nombre del repositorio.');
      return;
    }

    try {
      setIsUploading(true);
      setUploadStatus('Conectando con la API de GitHub...');

      const createRepoRes = await fetch('https://api.github.com/user/repos', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${githubToken.trim()}`,
          Accept: 'application/vnd.github+json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: repoName.trim(),
          description: 'Sistema POS de Restaurante Terreno Broaster con SQLite y Comandas',
          private: isPrivate,
          auto_init: false,
        }),
      });

      if (!createRepoRes.ok && createRepoRes.status !== 422) {
        const errData = await createRepoRes.json();
        throw new Error(errData.message || 'Error al conectar con GitHub');
      }

      setUploadStatus(`¡Repositorio listo en GitHub! Puede empujar sus archivos locales o clonar en: ${webRepoUrl}`);
    } catch (err: any) {
      setUploadStatus(`Nota: ${err.message}`);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-stone-900 border border-stone-800 text-stone-100 rounded-2xl max-w-2xl w-full shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* Header */}
        <div className="p-4 bg-stone-950 border-b border-stone-800 flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-stone-800 border border-stone-700 flex items-center justify-center">
              <Github className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="font-black text-sm text-stone-100">Sincronización con GitHub</h3>
                <a
                  href={webRepoUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-[10px] text-amber-400 hover:underline inline-flex items-center space-x-0.5"
                >
                  <span>{githubUser}/{repoName}</span>
                  <ExternalLink className="w-2.5 h-2.5 ml-0.5" />
                </a>
              </div>
              <p className="text-[11px] text-stone-400">Guía para empujar archivos locales o clonar en su repositorio</p>
            </div>
          </div>
          <button onClick={onClose} className="text-stone-400 hover:text-white p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab switch */}
        <div className="p-3 bg-stone-950/80 border-b border-stone-800 flex flex-wrap gap-2">
          <button
            onClick={() => setActiveTab('push')}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'push'
                ? 'bg-amber-500 text-stone-950 shadow-sm'
                : 'text-stone-400 hover:text-white'
            }`}
          >
            <Terminal className="w-3.5 h-3.5" />
            <span>1. Empujar Archivos Locales (Push)</span>
          </button>

          <button
            onClick={() => setActiveTab('clone')}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'clone'
                ? 'bg-amber-500 text-stone-950 shadow-sm'
                : 'text-stone-400 hover:text-white'
            }`}
          >
            <Code2 className="w-3.5 h-3.5" />
            <span>2. Clonar Repositorio (Clone)</span>
          </button>

          <button
            onClick={() => setActiveTab('token')}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'token'
                ? 'bg-amber-500 text-stone-950 shadow-sm'
                : 'text-stone-400 hover:text-white'
            }`}
          >
            <Lock className="w-3.5 h-3.5" />
            <span>3. Autenticación (PAT / Token)</span>
          </button>
        </div>

        {/* Body content */}
        <div className="p-5 space-y-4 overflow-y-auto text-xs">
          
          {/* Path banner */}
          <div className="p-3 bg-stone-950 border border-stone-800 rounded-xl space-y-1">
            <div className="flex items-center justify-between text-stone-300 font-bold">
              <div className="flex items-center space-x-2">
                <HardDrive className="w-4 h-4 text-amber-400" />
                <span>Carpeta Local:</span>
              </div>
              <span className="text-amber-400 font-mono text-[11px]">{targetPath}</span>
            </div>
            <div className="flex items-center justify-between text-[11px] text-stone-400 pt-1 border-t border-stone-800/60">
              <span>Repositorio Remoto:</span>
              <a
                href={webRepoUrl}
                target="_blank"
                rel="noreferrer"
                className="text-amber-300 hover:underline font-mono inline-flex items-center"
              >
                {webRepoUrl} <ExternalLink className="w-3 h-3 ml-1" />
              </a>
            </div>
          </div>

          {activeTab === 'push' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-stone-300 font-semibold">
                  Abre PowerShell o Git Bash en Windows y ejecuta:
                </p>
                <button
                  onClick={() => copyToClipboard(fullPushScript, 'push-all')}
                  className="flex items-center space-x-1.5 px-2.5 py-1 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 rounded-lg text-[11px] font-bold border border-amber-500/40 transition-colors"
                >
                  {copied === 'push-all' ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="text-emerald-400">¡Copiado Todo!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copiar Todos los Comandos</span>
                    </>
                  )}
                </button>
              </div>

              {/* Commands container */}
              <div className="bg-stone-950 border border-stone-800 rounded-xl p-3 font-mono text-[11px] space-y-2">
                {gitPushCommands.map((cmd, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between group py-1 px-2 rounded hover:bg-stone-900 transition-colors"
                  >
                    <span className="text-amber-400 select-all font-mono">$ {cmd}</span>
                    <button
                      onClick={() => copyToClipboard(cmd, `push-${idx}`)}
                      className="opacity-0 group-hover:opacity-100 text-stone-400 hover:text-white p-1"
                      title="Copiar línea"
                    >
                      {copied === `push-${idx}` ? (
                        <Check className="w-3 h-3 text-emerald-400" />
                      ) : (
                        <Copy className="w-3 h-3" />
                      )}
                    </button>
                  </div>
                ))}
              </div>

              {/* Conflict / Rebase note */}
              <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl space-y-1.5 text-[11px] text-amber-200">
                <p className="font-bold flex items-center space-x-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  <span>¿GitHub te da error porque el repositorio ya tenía un archivo README?</span>
                </p>
                <p className="text-stone-300">
                  Si creaste el repositorio con un README o archivo inicial en GitHub, ejecuta este comando para fusionar y subir:
                </p>
                <div className="flex items-center justify-between bg-stone-950 p-2 rounded-lg border border-stone-800">
                  <code className="text-amber-400 font-mono text-[11px]">{gitRebaseFixCommand}</code>
                  <button
                    onClick={() => copyToClipboard(gitRebaseFixCommand, 'rebase')}
                    className="text-stone-400 hover:text-white px-2 py-0.5 rounded bg-stone-800"
                  >
                    {copied === 'rebase' ? '¡Copiado!' : 'Copiar'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'clone' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-stone-300 font-semibold">
                  Para clonar el proyecto en una nueva computadora o carpeta limpia:
                </p>
                <button
                  onClick={() => copyToClipboard(fullCloneScript, 'clone-all')}
                  className="flex items-center space-x-1.5 px-2.5 py-1 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 rounded-lg text-[11px] font-bold border border-amber-500/40 transition-colors"
                >
                  {copied === 'clone-all' ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="text-emerald-400">¡Copiado!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copiar Comandos de Clone</span>
                    </>
                  )}
                </button>
              </div>

              {/* Commands container */}
              <div className="bg-stone-950 border border-stone-800 rounded-xl p-3 font-mono text-[11px] space-y-2">
                {gitCloneCommands.map((cmd, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between group py-1 px-2 rounded hover:bg-stone-900 transition-colors"
                  >
                    <span className="text-amber-400 select-all font-mono">$ {cmd}</span>
                    <button
                      onClick={() => copyToClipboard(cmd, `clone-${idx}`)}
                      className="opacity-0 group-hover:opacity-100 text-stone-400 hover:text-white p-1"
                      title="Copiar línea"
                    >
                      {copied === `clone-${idx}` ? (
                        <Check className="w-3 h-3 text-emerald-400" />
                      ) : (
                        <Copy className="w-3 h-3" />
                      )}
                    </button>
                  </div>
                ))}
              </div>

              <div className="p-3 bg-stone-950 border border-stone-800 rounded-xl space-y-1 text-stone-400 text-[11px]">
                <p className="font-bold text-stone-200">Requisitos para ejecutar localmente:</p>
                <ul className="list-disc list-inside space-y-1">
                  <li>Tener instalado <strong className="text-stone-200">Node.js (v18+)</strong> y <strong className="text-stone-200">Git</strong> en Windows.</li>
                  <li>Al ejecutar <code className="text-amber-400">npm run dev</code>, la app se abrirá en <code className="text-stone-200">http://localhost:3000</code> o <code className="text-stone-200">http://localhost:5173</code>.</li>
                  <li>La base de datos SQLite y todas las comandas funcionarán inmediatamente.</li>
                </ul>
              </div>
            </div>
          )}

          {activeTab === 'token' && (
            <form onSubmit={handleDirectGithubPush} className="space-y-3.5">
              <div>
                <label className="block text-stone-300 font-semibold mb-1">Usuario de GitHub:</label>
                <input
                  type="text"
                  value={githubUser}
                  onChange={(e) => setGithubUser(e.target.value)}
                  placeholder="ej: angelghimel"
                  className="w-full py-2 px-3 bg-stone-950 border border-stone-800 rounded-xl text-stone-200 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-stone-300 font-semibold mb-1">Nombre del Repositorio:</label>
                <input
                  type="text"
                  required
                  value={repoName}
                  onChange={(e) => setRepoName(e.target.value)}
                  className="w-full py-2 px-3 bg-stone-950 border border-stone-800 rounded-xl text-stone-200 focus:outline-none focus:border-amber-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-stone-300 font-semibold mb-1 flex items-center justify-between">
                  <span>GitHub Personal Access Token (PAT):</span>
                  <a
                    href="https://github.com/settings/tokens/new?scopes=repo"
                    target="_blank"
                    rel="noreferrer"
                    className="text-amber-400 text-[10px] underline inline-flex items-center"
                  >
                    Generar Token en GitHub <ExternalLink className="w-2.5 h-2.5 ml-0.5" />
                  </a>
                </label>
                <div className="relative">
                  <Lock className="w-3.5 h-3.5 text-stone-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="password"
                    required
                    value={githubToken}
                    onChange={(e) => setGithubToken(e.target.value)}
                    placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
                    className="w-full pl-8 pr-3 py-2 bg-stone-950 border border-stone-800 rounded-xl text-stone-200 font-mono focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div className="flex items-center space-x-2 pt-1">
                <input
                  type="checkbox"
                  id="privateRepo"
                  checked={isPrivate}
                  onChange={(e) => setIsPrivate(e.target.checked)}
                  className="rounded bg-stone-950 border-stone-800 text-amber-500"
                />
                <label htmlFor="privateRepo" className="text-stone-300 cursor-pointer">
                  Hacer el repositorio privado (solo visible para mí)
                </label>
              </div>

              {uploadStatus && (
                <div className="p-3 bg-stone-950 border border-amber-500/30 rounded-xl text-amber-300 font-mono text-[11px]">
                  {uploadStatus}
                </div>
              )}

              <button
                type="submit"
                disabled={isUploading}
                className="w-full py-2.5 bg-amber-500 hover:bg-amber-400 text-stone-950 font-black rounded-xl shadow-lg shadow-amber-500/20 flex items-center justify-center space-x-2 transition-all disabled:opacity-50"
              >
                <FolderGit2 className="w-4 h-4" />
                <span>{isUploading ? 'Creando Repositorio...' : 'Crear Repositorio en GitHub'}</span>
              </button>
            </form>
          )}

        </div>

        {/* Footer */}
        <div className="p-3 bg-stone-950 border-t border-stone-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-stone-800 hover:bg-stone-700 text-stone-200 font-semibold rounded-xl text-xs"
          >
            Cerrar
          </button>
        </div>

      </div>
    </div>
  );
};
