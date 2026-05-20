import React, { useState } from 'react';
import { 
  Plus, Search, SlidersHorizontal, Grid, List, Sparkles, 
  Settings, LogOut, Check, AlertCircle, RefreshCw, 
  Download, Upload, Shield, Trash2, Volume2, VolumeX, Eye
} from 'lucide-react';
import type { Decree } from './DecreeEditor';
import { DecreeCard } from './DecreeCard';
import audioHelper from '../utils/audioHelper';
import CryptoJS from 'crypto-js';

const GithubIcon = ({ size = 16, ...props }: React.SVGProps<SVGSVGElement> & { size?: number }) => (
  <svg viewBox="0 0 24 24" width={size} height={size} stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22" />
  </svg>
);

interface DashboardProps {
  decrees: Decree[];
  onAddClick: () => void;
  onEditClick: (decree: Decree) => void;
  onDeleteClick: (id: string) => void;
  onPreviewClick: (decree: Decree) => void;
  onLock: () => void;
  
  // GitHub Settings
  gitHubConfig: {
    user: string;
    repo: string;
    token: string;
    path: string;
  } | null;
  onSaveGitHubConfig: (config: any) => void;
  isSyncing: boolean;
  onTriggerSync: () => Promise<void>;
  lastSyncTime: string | null;
  
  // App Config Settings
  onResetPIN: (newHash: string) => void;
  onClearData: () => void;
  onImportBackup: (data: Decree[]) => void;
  activeTheme: string;
  onChangeTheme: (theme: string) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({
  decrees,
  onAddClick,
  onEditClick,
  onDeleteClick,
  onPreviewClick,
  onLock,
  gitHubConfig,
  onSaveGitHubConfig,
  isSyncing,
  onTriggerSync,
  lastSyncTime,
  onResetPIN,
  onClearData,
  onImportBackup,
  activeTheme,
  onChangeTheme
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Todos');
  const [sortBy, setSortBy] = useState<'date' | 'title' | 'category'>('date');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  
  // Settings view toggle
  const [showSettings, setShowSettings] = useState(false);
  const [showDailyPopup, setShowDailyPopup] = useState(false);
  const [dailyDecree, setDailyDecree] = useState<Decree | null>(null);

  // Settings forms
  const [ghUser, setGhUser] = useState(gitHubConfig?.user || '');
  const [ghRepo, setGhRepo] = useState(gitHubConfig?.repo || '');
  const [ghToken, setGhToken] = useState(gitHubConfig?.token || '');
  const [ghPath, setGhPath] = useState(gitHubConfig?.path || 'decretos.json');
  
  const [newPIN, setNewPIN] = useState('');
  const [confirmPIN, setConfirmPIN] = useState('');
  const [pinChangeMsg, setPinChangeMsg] = useState({ type: 'idle', message: '' });

  const [githubMsg, setGithubMsg] = useState({ type: 'idle', message: '' });
  const [isUiSoundsEnabled, setIsUiSoundsEnabled] = useState(true);

  // Categories list
  const allCategories = ['Todos', ...Array.from(new Set(decrees.map(d => d.category)))];

  // Sounds config toggle
  const toggleSounds = () => {
    const nextVal = !isUiSoundsEnabled;
    setIsUiSoundsEnabled(nextVal);
    (window as any).__muteUiSounds = !nextVal;
    audioHelper.playTap();
  };

  // Select "Decreto del Día" (Random)
  const triggerDailyDecree = () => {
    audioHelper.playTap();
    if (decrees.length === 0) {
      alert('Añade algunos decretos de vida primero.');
      return;
    }
    const randomIndex = Math.floor(Math.random() * decrees.length);
    setDailyDecree(decrees[randomIndex]);
    setShowDailyPopup(true);
  };

  // Change PIN handling
  const handlePINChange = (e: React.FormEvent) => {
    e.preventDefault();
    audioHelper.playTap();
    if (newPIN.length !== 4 || confirmPIN.length !== 4) {
      setPinChangeMsg({ type: 'error', message: 'El NIP debe tener exactamente 4 dígitos.' });
      return;
    }
    if (newPIN !== confirmPIN) {
      setPinChangeMsg({ type: 'error', message: 'Los NIPs no coinciden.' });
      return;
    }
    
    // Hash NIP
    const newHash = CryptoJS.SHA256(newPIN).toString();
    (window as any).__tempNewPIN = newPIN;
    onResetPIN(newHash);
    setPinChangeMsg({ type: 'success', message: '¡NIP actualizado correctamente!' });
    setNewPIN('');
    setConfirmPIN('');
    audioHelper.playUnlock();
    setTimeout(() => setPinChangeMsg({ type: 'idle', message: '' }), 3000);
  };

  // Save GitHub Config
  const handleSaveGitHub = async (e: React.FormEvent) => {
    e.preventDefault();
    audioHelper.playTap();
    if (!ghUser.trim() || !ghRepo.trim() || !ghToken.trim()) {
      setGithubMsg({ type: 'error', message: 'Llena todos los campos para sincronizar.' });
      return;
    }

    setGithubMsg({ type: 'loading', message: 'Guardando y probando sincronización...' });
    
    onSaveGitHubConfig({
      user: ghUser.trim(),
      repo: ghRepo.trim(),
      token: ghToken.trim(),
      path: ghPath.trim() || 'decretos.json'
    });

    // Sync trigger
    setTimeout(async () => {
      try {
        await onTriggerSync();
        setGithubMsg({ type: 'success', message: '¡GitHub conectado y sincronizado con éxito!' });
        audioHelper.playUnlock();
      } catch (err: any) {
        setGithubMsg({ type: 'error', message: `Conexión guardada con advertencia: ${err.message || 'Error de red'}` });
      }
    }, 200);
  };

  // Backup Export
  const handleExportBackup = () => {
    audioHelper.playTap();
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(decrees, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `decretos_vida_respaldo_${new Date().toISOString().split('T')[0]}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  // Backup Import
  const handleImportBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    audioHelper.playTap();
    const fileReader = new FileReader();
    if (e.target.files && e.target.files[0]) {
      fileReader.readAsText(e.target.files[0], "UTF-8");
      fileReader.onload = (event) => {
        try {
          const parsed = JSON.parse(event.target?.result as string);
          if (Array.isArray(parsed)) {
            onImportBackup(parsed);
            alert('¡Decretos importados con éxito!');
            audioHelper.playUnlock();
          } else {
            alert('El archivo no tiene el formato correcto.');
          }
        } catch (err) {
          alert('Error al leer el archivo. Asegúrate de que sea un JSON válido.');
        }
      };
    }
  };

  // Filter & Sort Logic
  const filteredDecrees = decrees
    .filter(d => {
      const matchSearch = d.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          d.content.toLowerCase().includes(searchQuery.toLowerCase());
      const matchCategory = selectedCategory === 'Todos' || d.category === selectedCategory;
      return matchSearch && matchCategory;
    })
    .sort((a, b) => {
      let comparison = 0;
      if (sortBy === 'date') {
        comparison = new Date(a.date).getTime() - new Date(b.date).getTime();
      } else if (sortBy === 'title') {
        comparison = a.title.localeCompare(b.title);
      } else {
        comparison = a.category.localeCompare(b.category);
      }
      return sortDirection === 'asc' ? comparison : -comparison;
    });

  return (
    <div style={{ maxWidth: '960px', width: '92%', margin: '0 auto', padding: '2rem 0', position: 'relative' }}>
      
      {/* Header Panel */}
      <header className="glass" style={{
        padding: '1.25rem 1.5rem',
        borderRadius: 'var(--radius-md)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '1.5rem'
      }}>
        <div>
          <h1 style={{
            fontFamily: 'var(--font-display)',
            fontSize: '1.5rem',
            fontWeight: '800',
            letterSpacing: '-0.02em',
            margin: 0,
            background: 'var(--energy-spirit)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}>
            <Sparkles size={22} style={{ color: 'var(--accent-purple)' }} />
            Decretos de Vida
          </h1>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
            Manifiesta tus intenciones diarias
          </p>
        </div>

        {/* Global Toolbar buttons */}
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button
            type="button"
            className="btn btn-secondary btn-icon-only"
            onClick={triggerDailyDecree}
            title="Decreto del Día"
          >
            <Sparkles size={18} style={{ color: '#eab308' }} />
          </button>

          <button
            type="button"
            className="btn btn-secondary btn-icon-only"
            onClick={() => { audioHelper.playTap(); setShowSettings(!showSettings); }}
            style={{
              background: showSettings ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.03)',
              borderColor: showSettings ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.06)'
            }}
            title="Ajustes y Sincronización"
          >
            <Settings size={18} />
          </button>

          <button
            type="button"
            className="btn btn-secondary btn-icon-only"
            onClick={() => { audioHelper.playError(); onLock(); }}
            title="Cerrar Sesión (Bloquear)"
            style={{ color: '#f43f5e', background: 'rgba(244, 63, 94, 0.05)', borderColor: 'rgba(244, 63, 94, 0.1)' }}
          >
            <LogOut size={18} />
          </button>
        </div>
      </header>

      {/* Main Settings Panel Drawer */}
      {showSettings && (
        <div className="glass" style={{
          padding: '1.5rem',
          borderRadius: 'var(--radius-md)',
          marginBottom: '1.5rem',
          animation: 'fade-in-up 0.25s ease-out',
          display: 'grid',
          gridTemplateColumns: '1fr',
          gap: '1.5rem',
          borderLeft: '4px solid var(--accent-purple)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-glass)', paddingBottom: '0.75rem' }}>
            <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.1rem', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Settings size={18} />
              Configuraciones y Respaldo
            </h3>
            <button type="button" className="btn btn-text" style={{ padding: 0 }} onClick={() => setShowSettings(false)}>
              Cerrar Ajustes
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem' }}>
            {/* GitHub Sync Form */}
            <div>
              <h4 style={{ fontSize: '0.9rem', fontWeight: '600', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <GithubIcon size={16} />
                Sincronización en GitHub
              </h4>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
                Sincroniza tus decretos de manera encriptada para verlos en tu Google Pixel 7.
              </p>

              <form onSubmit={handleSaveGitHub} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <input
                  type="text"
                  placeholder="Usuario GitHub"
                  className="input-glass"
                  style={{ padding: '0.5rem 0.75rem', fontSize: '0.85rem' }}
                  value={ghUser}
                  onChange={e => setGhUser(e.target.value)}
                />
                <input
                  type="text"
                  placeholder="Repositorio GitHub"
                  className="input-glass"
                  style={{ padding: '0.5rem 0.75rem', fontSize: '0.85rem' }}
                  value={ghRepo}
                  onChange={e => setGhRepo(e.target.value)}
                />
                <input
                  type="password"
                  placeholder="Personal Access Token (PAT)"
                  className="input-glass"
                  style={{ padding: '0.5rem 0.75rem', fontSize: '0.85rem' }}
                  value={ghToken}
                  onChange={e => setGhToken(e.target.value)}
                />
                <input
                  type="text"
                  placeholder="Ruta del archivo (decretos.json)"
                  className="input-glass"
                  style={{ padding: '0.5rem 0.75rem', fontSize: '0.85rem' }}
                  value={ghPath}
                  onChange={e => setGhPath(e.target.value)}
                />

                {githubMsg.type !== 'idle' && (
                  <div style={{
                    fontSize: '0.75rem',
                    padding: '0.5rem',
                    borderRadius: '8px',
                    background: githubMsg.type === 'error' ? 'rgba(244,63,94,0.1)' : 
                                githubMsg.type === 'success' ? 'rgba(16,185,129,0.1)' : 'rgba(255,255,255,0.05)',
                    color: githubMsg.type === 'error' ? '#fda4af' : 
                           githubMsg.type === 'success' ? '#a7f3d0' : 'var(--text-secondary)',
                    border: `1px solid ${
                      githubMsg.type === 'error' ? 'rgba(244,63,94,0.2)' : 
                      githubMsg.type === 'success' ? 'rgba(16,185,129,0.2)' : 'rgba(255,255,255,0.1)'
                    }`,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.35rem'
                  }}>
                    {githubMsg.type === 'loading' && <RefreshCw className="animate-spin" size={12} />}
                    {githubMsg.type === 'success' && <Check size={12} />}
                    {githubMsg.type === 'error' && <AlertCircle size={12} />}
                    <span>{githubMsg.message}</span>
                  </div>
                )}

                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  {gitHubConfig && (
                    <button
                      type="button"
                      disabled={isSyncing}
                      onClick={async () => {
                        audioHelper.playTap();
                        setGithubMsg({ type: 'loading', message: 'Sincronizando ahora...' });
                        try {
                          await onTriggerSync();
                          setGithubMsg({ type: 'success', message: 'Sincronización manual completa.' });
                          audioHelper.playUnlock();
                        } catch (e: any) {
                          setGithubMsg({ type: 'error', message: e.message || 'Error al sincronizar' });
                        }
                      }}
                      className="btn btn-secondary"
                      style={{ flex: 1, padding: '0.5rem', fontSize: '0.8rem', borderRadius: '10px' }}
                    >
                      <RefreshCw size={14} className={isSyncing ? 'animate-spin' : ''} />
                    </button>
                  )}
                  <button
                    type="submit"
                    className="btn btn-primary"
                    style={{ flex: 3, padding: '0.5rem', fontSize: '0.8rem', borderRadius: '10px' }}
                  >
                    Vincular GitHub
                  </button>
                </div>
                {lastSyncTime && (
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textAlign: 'right' }}>
                    Última sincronía: {new Date(lastSyncTime).toLocaleTimeString()}
                  </span>
                )}
              </form>
            </div>

            {/* Custom PIN Form & Audio Settings */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div>
                <h4 style={{ fontSize: '0.9rem', fontWeight: '600', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <Shield size={16} />
                  Modificar NIP
                </h4>
                <form onSubmit={handlePINChange} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                    <input
                      type="password"
                      maxLength={4}
                      placeholder="Nuevo NIP"
                      className="input-glass"
                      style={{ padding: '0.5rem 0.75rem', fontSize: '0.85rem' }}
                      value={newPIN}
                      onChange={e => setNewPIN(e.target.value.replace(/\D/g, ''))}
                    />
                    <input
                      type="password"
                      maxLength={4}
                      placeholder="Confirmar"
                      className="input-glass"
                      style={{ padding: '0.5rem 0.75rem', fontSize: '0.85rem' }}
                      value={confirmPIN}
                      onChange={e => setConfirmPIN(e.target.value.replace(/\D/g, ''))}
                    />
                  </div>

                  {pinChangeMsg.type !== 'idle' && (
                    <div style={{
                      fontSize: '0.75rem',
                      padding: '0.5rem',
                      borderRadius: '8px',
                      color: pinChangeMsg.type === 'error' ? '#fda4af' : '#a7f3d0',
                      background: pinChangeMsg.type === 'error' ? 'rgba(244,63,94,0.1)' : 'rgba(16,185,129,0.1)',
                      border: `1px solid ${pinChangeMsg.type === 'error' ? 'rgba(244,63,94,0.2)' : 'rgba(16,185,129,0.2)'}`,
                    }}>
                      {pinChangeMsg.message}
                    </div>
                  )}

                  <button type="submit" className="btn btn-secondary" style={{ padding: '0.5rem', fontSize: '0.8rem', borderRadius: '10px' }}>
                    Guardar Nuevo NIP
                  </button>
                </form>
              </div>

              {/* Preferences */}
              <div>
                <h4 style={{ fontSize: '0.9rem', fontWeight: '600', marginBottom: '0.5rem' }}>Preferencias</h4>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={toggleSounds}
                  style={{
                    width: '100%',
                    padding: '0.5rem 0.75rem',
                    fontSize: '0.8rem',
                    borderRadius: '10px',
                    justifyContent: 'flex-start',
                    gap: '0.5rem'
                  }}
                >
                  {isUiSoundsEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
                  <span>{isUiSoundsEnabled ? 'Sonidos de la Interfaz Activados' : 'Sonidos de la Interfaz Silenciados'}</span>
                </button>

                <div style={{ marginTop: '0.75rem' }}>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
                    Paleta de Colores Activa:
                  </span>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.35rem' }}>
                    {[
                      { id: 'quantum', name: 'Quantum Ocean', color: '#06b6d4' },
                      { id: 'stealth', name: 'Stealth Crimson', color: '#e11d48' },
                      { id: 'cyberpunk', name: 'Cyberpunk Volt', color: '#84cc16' },
                      { id: 'ember', name: 'Titanium Ember', color: '#f97316' },
                      { id: 'boreal', name: 'Boreal Forest', color: '#10b981' },
                    ].map(t => (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => {
                          audioHelper.playTap();
                          onChangeTheme(t.id);
                        }}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.35rem',
                          padding: '0.4rem 0.5rem',
                          fontSize: '0.7rem',
                          borderRadius: '8px',
                          border: activeTheme === t.id ? '1px solid var(--accent-purple)' : '1px solid rgba(255, 255, 255, 0.08)',
                          background: activeTheme === t.id ? 'rgba(255, 255, 255, 0.08)' : 'rgba(255, 255, 255, 0.02)',
                          color: activeTheme === t.id ? 'var(--text-primary)' : 'var(--text-secondary)',
                          cursor: 'pointer',
                          textAlign: 'left',
                          fontWeight: activeTheme === t.id ? '600' : '400',
                          transition: 'all 0.2s ease',
                          outline: 'none',
                          justifyContent: 'flex-start'
                        }}
                      >
                        <span style={{
                          width: '8px',
                          height: '8px',
                          borderRadius: '50%',
                          backgroundColor: t.color,
                          boxShadow: `0 0 6px ${t.color}`,
                          flexShrink: 0
                        }} />
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.name}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Backups & Purges */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <h4 style={{ fontSize: '0.9rem', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <Download size={16} />
                Gestión de Datos
              </h4>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                Exporta tus decretos en un archivo local o impórtalos de otro respaldo JSON.
              </p>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                <button
                  type="button"
                  onClick={handleExportBackup}
                  className="btn btn-secondary"
                  style={{ padding: '0.5rem', fontSize: '0.8rem', borderRadius: '10px', gap: '0.35rem' }}
                >
                  <Download size={14} /> Exportar
                </button>
                <label
                  className="btn btn-secondary"
                  style={{ padding: '0.5rem', fontSize: '0.8rem', borderRadius: '10px', gap: '0.35rem', cursor: 'pointer' }}
                >
                  <Upload size={14} /> Importar
                  <input
                    type="file"
                    accept=".json"
                    style={{ display: 'none' }}
                    onChange={handleImportBackup}
                  />
                </label>
              </div>

              <button
                type="button"
                onClick={() => {
                  audioHelper.playError();
                  if (confirm('ATENCIÓN: Esto borrará permanentemente todos tus decretos del almacenamiento local. Si no los tienes sincronizados con GitHub o respaldados, los perderás para siempre. ¿Deseas proceder?')) {
                    onClearData();
                    alert('Todos los datos locales han sido eliminados.');
                  }
                }}
                className="btn btn-secondary"
                style={{
                  padding: '0.5rem',
                  fontSize: '0.8rem',
                  borderRadius: '10px',
                  color: '#f43f5e',
                  borderColor: 'rgba(244,63,94,0.15)',
                  background: 'rgba(244, 63, 94, 0.05)',
                  marginTop: 'auto',
                  gap: '0.35rem'
                }}
              >
                <Trash2 size={14} /> Borrar Todo Localmente
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Quick Stats Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
        gap: '1rem',
        marginBottom: '2rem'
      }}>
        <div className="glass" style={{ padding: '1rem', borderRadius: 'var(--radius-md)', textAlign: 'center' }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontFamily: 'var(--font-display)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Total Decretos
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: '700', marginTop: '0.25rem', color: 'var(--text-primary)' }}>
            {decrees.length}
          </div>
        </div>
        
        {/* Quick Energy Distribution Counts */}
        <div className="glass" style={{ padding: '1rem', borderRadius: 'var(--radius-md)', display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '0.5rem', alignContent: 'center', gridColumn: 'span 2' }}>
          {(['love', 'prosperity', 'health', 'purpose', 'spirit'] as Decree['energy'][]).map(e => {
            const count = decrees.filter(d => d.energy === e).length;
            const colors = {
              love: '#f43f5e',
              prosperity: '#eab308',
              health: '#10b981',
              purpose: '#3b82f6',
              spirit: '#a855f7'
            };
            return (
              <div
                key={e}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  background: 'rgba(255,255,255,0.02)',
                  border: '1px solid rgba(255,255,255,0.06)',
                  borderRadius: '12px',
                  padding: '0.25rem 0.6rem',
                  fontSize: '0.75rem'
                }}
                title={e.toUpperCase()}
              >
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: colors[e], boxShadow: `0 0 8px ${colors[e]}` }} />
                <span style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>{count}</span>
              </div>
            );
          })}
        </div>

        <div className="glass" style={{ padding: '1rem', borderRadius: 'var(--radius-md)', textAlign: 'center', cursor: 'pointer' }} onClick={triggerDailyDecree}>
          <div style={{ fontSize: '0.75rem', color: '#eab308', fontFamily: 'var(--font-display)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.25rem' }}>
            <Sparkles size={12} /> Decreto Diario
          </div>
          <div style={{ fontSize: '0.9rem', fontWeight: '500', marginTop: '0.35rem', color: 'var(--text-secondary)' }}>
            Manifestar hoy
          </div>
        </div>
      </div>

      {/* Filters Toolbar */}
      <div className="glass" style={{
        padding: '1rem',
        borderRadius: 'var(--radius-md)',
        display: 'flex',
        flexDirection: 'column',
        gap: '1rem',
        marginBottom: '1.5rem'
      }}>
        {/* Search & Layout toggle */}
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <div style={{ position: 'relative', flex: 1 }}>
            <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input
              type="text"
              placeholder="Buscar por título o contenido de decretos..."
              className="input-glass"
              style={{ paddingLeft: '2.5rem' }}
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
          </div>

          <div style={{ display: 'flex', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-glass)', borderRadius: '12px', padding: '2px' }}>
            <button
              type="button"
              className="tab-btn"
              style={{ width: '40px', padding: '0.5rem', borderRadius: '10px', background: viewMode === 'grid' ? 'rgba(255,255,255,0.06)' : 'transparent', color: viewMode === 'grid' ? 'white' : 'var(--text-secondary)' }}
              onClick={() => { audioHelper.playTap(); setViewMode('grid'); }}
              title="Vista Rejilla"
            >
              <Grid size={16} />
            </button>
            <button
              type="button"
              className="tab-btn"
              style={{ width: '40px', padding: '0.5rem', borderRadius: '10px', background: viewMode === 'list' ? 'rgba(255,255,255,0.06)' : 'transparent', color: viewMode === 'list' ? 'white' : 'var(--text-secondary)' }}
              onClick={() => { audioHelper.playTap(); setViewMode('list'); }}
              title="Vista Lista"
            >
              <List size={16} />
            </button>
          </div>
        </div>

        {/* Categories scroll panel */}
        <div style={{
          display: 'flex',
          gap: '0.5rem',
          overflowX: 'auto',
          paddingBottom: '0.25rem',
          msOverflowStyle: 'none',
          scrollbarWidth: 'none'
        }}>
          {allCategories.map(cat => (
            <button
              key={cat}
              type="button"
              onClick={() => { audioHelper.playTap(); setSelectedCategory(cat); }}
              className="btn"
              style={{
                padding: '0.45rem 1rem',
                fontSize: '0.8rem',
                borderRadius: '9999px',
                background: selectedCategory === cat ? 'var(--energy-spirit)' : 'rgba(255,255,255,0.02)',
                borderColor: selectedCategory === cat ? 'transparent' : 'var(--border-glass)',
                borderWidth: '1px',
                borderStyle: 'solid',
                color: selectedCategory === cat ? 'white' : 'var(--text-secondary)',
                whiteSpace: 'nowrap',
                boxShadow: selectedCategory === cat ? '0 2px 10px 0 var(--energy-spirit-glow)' : 'none'
              }}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Sort configurations */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8rem', color: 'var(--text-secondary)', borderTop: '1px solid rgba(255,255,255,0.04)', paddingTop: '0.75rem', flexWrap: 'wrap', gap: '0.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <SlidersHorizontal size={14} style={{ color: 'var(--text-muted)' }} />
            <span>Ordenar por:</span>
            <button
              type="button"
              className="btn btn-text"
              style={{ padding: '0.25rem', fontSize: '0.8rem', color: sortBy === 'date' ? 'white' : 'var(--text-muted)' }}
              onClick={() => { audioHelper.playTap(); setSortBy('date'); }}
            >
              Fecha
            </button>
            <button
              type="button"
              className="btn btn-text"
              style={{ padding: '0.25rem', fontSize: '0.8rem', color: sortBy === 'title' ? 'white' : 'var(--text-muted)' }}
              onClick={() => { audioHelper.playTap(); setSortBy('title'); }}
            >
              Título
            </button>
            <button
              type="button"
              className="btn btn-text"
              style={{ padding: '0.25rem', fontSize: '0.8rem', color: sortBy === 'category' ? 'white' : 'var(--text-muted)' }}
              onClick={() => { audioHelper.playTap(); setSortBy('category'); }}
            >
              Categoría
            </button>
          </div>

          <div>
            <button
              type="button"
              className="btn btn-text"
              style={{ padding: '0.25rem', fontSize: '0.8rem', textTransform: 'uppercase' }}
              onClick={() => { audioHelper.playTap(); setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc'); }}
            >
              {sortDirection === 'asc' ? 'Ascendente ↑' : 'Descendente ↓'}
            </button>
          </div>
        </div>
      </div>

      {/* Main Grid or List View of Decrees */}
      {filteredDecrees.length > 0 ? (
        <div className={viewMode === 'grid' ? 'decrees-grid' : 'decrees-list'}>
          {filteredDecrees.map(decree => (
            <DecreeCard
              key={decree.id}
              decree={decree}
              onEdit={onEditClick}
              onDelete={onDeleteClick}
              onPreview={onPreviewClick}
            />
          ))}
        </div>
      ) : (
        <div className="glass" style={{
          padding: '4rem 2rem',
          borderRadius: 'var(--radius-lg)',
          textAlign: 'center',
          borderStyle: 'dashed'
        }}>
          <Sparkles size={36} style={{ color: 'var(--text-muted)', margin: '0 auto 1rem' }} />
          <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.2rem', color: 'var(--text-primary)', marginBottom: '0.5rem' }}>
            No hay decretos que mostrar
          </h3>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', maxWidth: '320px', margin: '0 auto 1.5rem' }}>
            {searchQuery || selectedCategory !== 'Todos' 
              ? 'Prueba modificando tus filtros o el término de búsqueda.'
              : 'Haz clic en el botón de abajo para registrar tu primer decreto místico para tu vida.'}
          </p>
          {(!searchQuery && selectedCategory === 'Todos') && (
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => { audioHelper.playTap(); onAddClick(); }}
            >
              <Plus size={16} /> Crear Primer Decreto
            </button>
          )}
        </div>
      )}

      {/* Mobile Floating Action Button (FAB) for Google Pixel 7 convenience */}
      <button
        type="button"
        className="btn btn-primary"
        onClick={() => { audioHelper.playTap(); onAddClick(); }}
        style={{
          position: 'fixed',
          bottom: '2rem',
          right: '2rem',
          width: '56px',
          height: '56px',
          borderRadius: '50%',
          boxShadow: '0 8px 24px 0 rgba(168, 85, 247, 0.45)',
          padding: 0,
          zIndex: 50
        }}
        title="Crear Nuevo Decreto"
      >
        <Plus size={24} />
      </button>

      {/* Decreto del Día Pop-Up Screen */}
      {showDailyPopup && dailyDecree && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100dvh',
          zIndex: 90,
          background: 'rgba(0,0,0,0.7)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backdropFilter: 'blur(10px)',
          padding: '1rem',
          animation: 'fade-in-up 0.3s ease-out'
        }}>
          <div className="glass" style={{
            maxWidth: '440px',
            width: '100%',
            padding: '2.5rem 1.5rem',
            borderRadius: 'var(--radius-lg)',
            textAlign: 'center',
            border: '2px solid var(--accent-purple)',
            boxShadow: '0 0 35px 2px var(--accent-purple-glow)',
            position: 'relative'
          }}>
            <div style={{
              width: '56px',
              height: '56px',
              borderRadius: '50%',
              background: 'rgba(234, 179, 8, 0.1)',
              border: '1px solid rgba(234, 179, 8, 0.3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 1.5rem'
            }}>
              <Sparkles size={24} style={{ color: '#eab308' }} />
            </div>

            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
              Tu Decreto para Hoy
            </span>

            <h3 style={{
              fontFamily: 'var(--font-display)',
              fontSize: '1.4rem',
              fontWeight: '700',
              margin: '0.5rem 0 1.25rem',
              color: 'white'
            }}>
              {dailyDecree.title}
            </h3>

            <p style={{
              fontFamily: 'var(--font-serif)',
              fontSize: '1.2rem',
              fontStyle: 'italic',
              lineHeight: '1.6',
              color: 'var(--text-primary)',
              background: 'rgba(255,255,255,0.02)',
              padding: '1rem',
              borderRadius: '12px',
              border: '1px solid var(--border-glass)',
              marginBottom: '2rem'
            }}>
              "{dailyDecree.content}"
            </p>

            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button
                type="button"
                className="btn btn-secondary"
                style={{ flex: 1 }}
                onClick={() => { audioHelper.playTap(); setShowDailyPopup(false); }}
              >
                Cerrar
              </button>
              <button
                type="button"
                className="btn btn-primary"
                style={{ flex: 2 }}
                onClick={() => {
                  audioHelper.playTap();
                  setShowDailyPopup(false);
                  onPreviewClick(dailyDecree);
                }}
              >
                <Eye size={16} /> Meditar Decreto
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
export default Dashboard;
