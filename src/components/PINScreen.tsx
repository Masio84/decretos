import React, { useState, useEffect } from 'react';
import CryptoJS from 'crypto-js';
import { Lock, Unlock, Check, AlertCircle, RefreshCw } from 'lucide-react';
import audioHelper from '../utils/audioHelper';

const GithubIcon = ({ size = 16, ...props }: React.SVGProps<SVGSVGElement> & { size?: number }) => (
  <svg viewBox="0 0 24 24" width={size} height={size} stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22" />
  </svg>
);

interface PINScreenProps {
  onUnlock: (decryptedData?: any, pin?: string) => void;
  storedHash: string | null;
  onSetHash: (hash: string) => void;
}

export const PINScreen: React.FC<PINScreenProps> = ({ onUnlock, storedHash, onSetHash }) => {
  const [nip, setNip] = useState<string>('');
  const [confirmNip, setConfirmNip] = useState<string>('');
  const [isFirstTime, setIsFirstTime] = useState<boolean>(!storedHash);
  const [setupStep, setSetupStep] = useState<1 | 2>(1); // 1: Enter, 2: Confirm
  const [isShaking, setIsShaking] = useState<boolean>(false);
  const [title, setTitle] = useState<string>('');
  const [subtitle, setSubtitle] = useState<string>('');
  
  // GitHub Recovery/Sync state on lock screen
  const [showGitHubSync, setShowGitHubSync] = useState<boolean>(false);
  const [ghUser, setGhUser] = useState<string>('');
  const [ghRepo, setGhRepo] = useState<string>('');
  const [ghToken, setGhToken] = useState<string>('');
  const [ghPath, setGhPath] = useState<string>('decretos.json');
  const [syncStatus, setSyncStatus] = useState<{ type: 'idle' | 'loading' | 'success' | 'error'; message: string }>({
    type: 'idle',
    message: '',
  });

  useEffect(() => {
    if (isFirstTime) {
      if (setupStep === 1) {
        setTitle('Crea tu NIP de Acceso');
        setSubtitle('Define un NIP de 4 dígitos para proteger tus decretos.');
      } else {
        setTitle('Confirma tu NIP');
        setSubtitle('Ingresa de nuevo los 4 dígitos para confirmar.');
      }
    } else {
      setTitle('Acceso Protegido');
      setSubtitle('Ingresa tu NIP de 4 dígitos para desbloquear tus decretos.');
    }
  }, [isFirstTime, setupStep]);

  // Handle number button click
  const handleNumberClick = (num: number) => {
    audioHelper.playTap();
    if (nip.length < 4) {
      setNip(prev => prev + num);
    }
  };

  // Handle backspace/delete
  const handleDelete = () => {
    audioHelper.playTap();
    setNip(prev => prev.slice(0, -1));
  };

  // Clear input
  const handleClear = () => {
    audioHelper.playTap();
    setNip('');
  };

  // Check PIN when it reaches 4 digits
  useEffect(() => {
    if (nip.length === 4) {
      const timer = setTimeout(() => {
        if (isFirstTime) {
          if (setupStep === 1) {
            setConfirmNip(nip);
            setNip('');
            setSetupStep(2);
          } else {
            if (nip === confirmNip) {
              // PIN match, hash and save
              const newHash = CryptoJS.SHA256(nip).toString();
              onSetHash(newHash);
              audioHelper.playUnlock();
              onUnlock(null, nip); // Unlock with empty initial decrees
            } else {
              // PIN mismatch
              triggerError('Los NIPs no coinciden. Intenta de nuevo.');
              setNip('');
              setSetupStep(1);
            }
          }
        } else {
          // Verify hash
          const enteredHash = CryptoJS.SHA256(nip).toString();
          if (enteredHash === storedHash) {
            audioHelper.playUnlock();
            onUnlock(undefined, nip);
          } else {
            triggerError('NIP incorrecto');
          }
        }
      }, 180);

      return () => clearTimeout(timer);
    }
  }, [nip]);

  const triggerError = (msg: string) => {
    audioHelper.playError();
    setIsShaking(true);
    setSubtitle(msg);
    setNip('');
    setTimeout(() => {
      setIsShaking(false);
      if (!isFirstTime) {
        setSubtitle('Ingresa tu NIP de 4 dígitos para desbloquear.');
      }
    }, 600);
  };

  // Pull encrypted data from GitHub to unlock on fresh devices (like Pixel 7)
  const handleGitHubSyncRecovery = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ghUser || !ghRepo || !ghToken) {
      setSyncStatus({ type: 'error', message: 'Por favor, llena todos los campos requeridos.' });
      return;
    }

    setSyncStatus({ type: 'loading', message: 'Buscando datos en tu repositorio...' });

    try {
      const url = `https://api.github.com/repos/${ghUser}/${ghRepo}/contents/${ghPath}`;
      const response = await fetch(url, {
        headers: {
          Authorization: `token ${ghToken}`,
          Accept: 'application/vnd.github.v3+json',
        },
      });

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('Archivo no encontrado. Asegúrate de que el nombre del repo y ruta sean correctos.');
        } else {
          throw new Error('Error al conectar con GitHub. Verifica tu token y usuario.');
        }
      }

      const data = await response.json();
      const contentBase64 = data.content.replace(/\s/g, '');
      const encryptedString = atob(contentBase64);

      // Now we have the encrypted string. We need the user to enter their PIN to decrypt it.
      // So we store these credentials in memory, toggle first time to false, and store the SHA-256
      // only once decryption is successful.
      setSyncStatus({
        type: 'success',
        message: '¡Datos descargados! Ahora ingresa el NIP con el que los cifraste para desbloquear.',
      });

      // Save credentials temporarily
      const tempCreds = {
        user: ghUser,
        repo: ghRepo,
        token: ghToken,
        path: ghPath,
        sha: data.sha,
        encryptedPayload: encryptedString
      };
      
      // We will intercept the next unlocking operation
      // To decrypt, we need to let PIN check try to decrypt
      // We overwrite onUnlock function behavior by passing the tempCreds
      setIsFirstTime(false);
      
      // Let's create an override function hook in window or state so App can catch it
      (window as any).__tempGitHubSync = tempCreds;

      setTimeout(() => {
        setShowGitHubSync(false);
      }, 1500);

    } catch (err: any) {
      setSyncStatus({ type: 'error', message: err.message || 'Error de red.' });
    }
  };

  return (
    <div className="glass" style={{
      margin: 'auto',
      maxWidth: '440px',
      width: '92%',
      padding: '2.5rem 1.5rem',
      borderRadius: 'var(--radius-lg)',
      textAlign: 'center',
      marginTop: '6dvh',
      marginBottom: '6dvh',
      boxShadow: 'var(--shadow-lg)'
    }}>
      <div className={`transition-transform duration-300 ${isShaking ? 'shake' : ''}`}>
        <div style={{
          width: '72px',
          height: '72px',
          borderRadius: '50%',
          background: isFirstTime ? 'rgba(168, 85, 247, 0.1)' : 'rgba(255, 255, 255, 0.03)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 1.5rem',
          border: '1px solid rgba(255, 255, 255, 0.08)'
        }}>
          {isFirstTime ? (
            <Unlock size={32} className="text-purple-400" style={{ color: 'var(--accent-purple)' }} />
          ) : (
            <Lock size={32} style={{ color: 'rgba(255, 255, 255, 0.7)' }} />
          )}
        </div>

        <h1 style={{
          fontFamily: 'var(--font-display)',
          fontSize: '1.75rem',
          fontWeight: '600',
          marginBottom: '0.5rem',
          letterSpacing: '-0.02em',
          color: 'var(--text-primary)'
        }}>{title}</h1>
        
        <p style={{
          fontSize: '0.95rem',
          color: isShaking ? '#f43f5e' : 'var(--text-secondary)',
          lineHeight: '1.4',
          marginBottom: '2rem',
          padding: '0 1rem'
        }}>{subtitle}</p>

        {/* NIP dots visual indicators */}
        <div className="nip-dots">
          {[0, 1, 2, 3].map(index => (
            <div
              key={index}
              className={`nip-dot ${nip.length > index ? 'active' : ''}`}
            />
          ))}
        </div>

        {/* Keypad Grid */}
        <div className="keypad-grid">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => (
            <button
              key={num}
              type="button"
              className="keypad-btn"
              onClick={() => handleNumberClick(num)}
            >
              {num}
            </button>
          ))}
          <button
            type="button"
            className="keypad-btn"
            style={{ fontSize: '0.95rem', fontWeight: '500' }}
            onClick={handleClear}
          >
            Limpiar
          </button>
          <button
            type="button"
            className="keypad-btn"
            onClick={() => handleNumberClick(0)}
          >
            0
          </button>
          <button
            type="button"
            className="keypad-btn"
            style={{ fontSize: '0.95rem', fontWeight: '500' }}
            onClick={handleDelete}
          >
            Borrar
          </button>
        </div>

        {!showGitHubSync ? (
          !isFirstTime && (
            <button
              type="button"
              className="btn btn-text"
              onClick={() => {
                setShowGitHubSync(true);
                audioHelper.playTap();
              }}
              style={{
                marginTop: '2rem',
                fontSize: '0.85rem',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}
            >
              <GithubIcon size={16} />
              ¿Sincronizar desde tu GitHub?
            </button>
          )
        ) : (
          <div className="glass" style={{
            marginTop: '2rem',
            padding: '1.25rem',
            borderRadius: 'var(--radius-md)',
            textAlign: 'left',
            background: 'rgba(0,0,0,0.3)',
            animation: 'fade-in-up 0.3s ease-out'
          }}>
            <h3 style={{
              fontFamily: 'var(--font-display)',
              fontSize: '1rem',
              fontWeight: '600',
              marginBottom: '0.75rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}>
              <GithubIcon size={18} />
              Configurar Sincronización GitHub
            </h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
              Descarga tu archivo encriptado desde GitHub e ingrésale el NIP original para desencriptarlo.
            </p>

            <form onSubmit={handleGitHubSyncRecovery} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div>
                <label className="label-glass" style={{ fontSize: '0.7rem' }}>Usuario GitHub</label>
                <input
                  type="text"
                  required
                  placeholder="ej. jorge-manifest"
                  className="input-glass"
                  style={{ padding: '0.5rem 0.75rem', fontSize: '0.9rem', borderRadius: '10px' }}
                  value={ghUser}
                  onChange={e => setGhUser(e.target.value)}
                />
              </div>

              <div>
                <label className="label-glass" style={{ fontSize: '0.7rem' }}>Repositorio de Decretos</label>
                <input
                  type="text"
                  required
                  placeholder="ej. mis-decretos"
                  className="input-glass"
                  style={{ padding: '0.5rem 0.75rem', fontSize: '0.9rem', borderRadius: '10px' }}
                  value={ghRepo}
                  onChange={e => setGhRepo(e.target.value)}
                />
              </div>

              <div>
                <label className="label-glass" style={{ fontSize: '0.7rem' }}>Personal Access Token (PAT)</label>
                <input
                  type="password"
                  required
                  placeholder="ghp_..."
                  className="input-glass"
                  style={{ padding: '0.5rem 0.75rem', fontSize: '0.9rem', borderRadius: '10px' }}
                  value={ghToken}
                  onChange={e => setGhToken(e.target.value)}
                />
              </div>

              <div>
                <label className="label-glass" style={{ fontSize: '0.7rem' }}>Ruta del Archivo (JSON)</label>
                <input
                  type="text"
                  placeholder="decretos.json"
                  className="input-glass"
                  style={{ padding: '0.5rem 0.75rem', fontSize: '0.9rem', borderRadius: '10px' }}
                  value={ghPath}
                  onChange={e => setGhPath(e.target.value)}
                />
              </div>

              {syncStatus.type !== 'idle' && (
                <div style={{
                  fontSize: '0.8rem',
                  padding: '0.5rem',
                  borderRadius: '6px',
                  background: syncStatus.type === 'error' ? 'rgba(244,63,94,0.1)' : 
                              syncStatus.type === 'success' ? 'rgba(16,185,129,0.1)' : 'rgba(255,255,255,0.05)',
                  color: syncStatus.type === 'error' ? '#fda4af' : 
                         syncStatus.type === 'success' ? '#a7f3d0' : 'var(--text-secondary)',
                  border: `1px solid ${
                    syncStatus.type === 'error' ? 'rgba(244,63,94,0.2)' : 
                    syncStatus.type === 'success' ? 'rgba(16,185,129,0.2)' : 'rgba(255,255,255,0.1)'
                  }`,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.35rem'
                }}>
                  {syncStatus.type === 'loading' && <RefreshCw className="animate-spin" size={14} />}
                  {syncStatus.type === 'success' && <Check size={14} />}
                  {syncStatus.type === 'error' && <AlertCircle size={14} />}
                  <span>{syncStatus.message}</span>
                </div>
              )}

              <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.25rem' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  style={{ flex: 1, padding: '0.5rem', fontSize: '0.85rem', borderRadius: '10px' }}
                  onClick={() => setShowGitHubSync(false)}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  style={{ flex: 2, padding: '0.5rem', fontSize: '0.85rem', borderRadius: '10px' }}
                  disabled={syncStatus.type === 'loading'}
                >
                  Sincronizar
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};
