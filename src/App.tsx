import React, { useState, useEffect } from 'react';
import CryptoJS from 'crypto-js';
import { PINScreen } from './components/PINScreen';
import { Dashboard } from './components/Dashboard';
import { DecreeEditor } from './components/DecreeEditor';
import type { Decree } from './components/DecreeEditor';
import { DecreePreview } from './components/DecreePreview';

// GitHub Sync Helpers
const getGitHubFileSHA = async (config: { user: string; repo: string; token: string; path: string }) => {
  const url = `https://api.github.com/repos/${config.user}/${config.repo}/contents/${config.path}`;
  try {
    const res = await fetch(url, {
      headers: {
        Authorization: `token ${config.token}`,
        Accept: 'application/vnd.github.v3+json',
      },
    });
    if (res.ok) {
      const data = await res.json();
      return data.sha;
    }
  } catch (e) {
    console.warn("Error getting GitHub SHA:", e);
  }
  return null;
};

export const App: React.FC = () => {
  // Authentication & Security States
  const [storedHash, setStoredHash] = useState<string | null>(() => localStorage.getItem('decretos_nip_hash'));
  const [isLocked, setIsLocked] = useState<boolean>(true);
  const [activePIN, setActivePIN] = useState<string>('');
  
  // Data States
  const [decrees, setDecrees] = useState<Decree[]>([]);

  // Theme State & Sync Effect
  const [activeTheme, setActiveTheme] = useState<string>(() => localStorage.getItem('decretos_theme') || 'quantum');

  useEffect(() => {
    document.documentElement.className = `theme-${activeTheme}`;
    localStorage.setItem('decretos_theme', activeTheme);
  }, [activeTheme]);

  // GitHub Configurations
  const [gitHubConfig, setGitHubConfig] = useState<{
    user: string;
    repo: string;
    token: string;
    path: string;
  } | null>(() => {
    const saved = localStorage.getItem('decretos_github_config');
    return saved ? JSON.parse(saved) : null;
  });
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(() => localStorage.getItem('decretos_last_sync'));

  // Modals & Panels toggles
  const [isEditorOpen, setIsEditorOpen] = useState<boolean>(false);
  const [editingDecree, setEditingDecree] = useState<Decree | null>(null);
  const [previewingDecree, setPreviewingDecree] = useState<Decree | null>(null);

  // Core Sync Action
  const syncToGitHub = async (currentDecrees: Decree[], pin: string, config: typeof gitHubConfig) => {
    if (!config || !pin) return;
    setIsSyncing(true);
    
    try {
      const url = `https://api.github.com/repos/${config.user}/${config.repo}/contents/${config.path}`;
      const encrypted = CryptoJS.AES.encrypt(JSON.stringify(currentDecrees), pin).toString();
      const contentBase64 = btoa(unescape(encodeURIComponent(encrypted))); // Handles emojis & special chars safely

      const sha = await getGitHubFileSHA(config);

      const payload: any = {
        message: 'Manifestación: actualización de decretos (cifrado)',
        content: contentBase64,
      };
      if (sha) payload.sha = sha;

      const res = await fetch(url, {
        method: 'PUT',
        headers: {
          Authorization: `token ${config.token}`,
          Accept: 'application/vnd.github.v3+json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.message || 'Error al actualizar repositorio.');
      }

      const syncTime = new Date().toISOString();
      setLastSyncTime(syncTime);
      localStorage.setItem('decretos_last_sync', syncTime);
    } catch (e: any) {
      console.error("GitHub Sync Error:", e);
      throw e;
    } finally {
      setIsSyncing(false);
    }
  };

  const pullFromGitHub = async (pin: string, config: typeof gitHubConfig): Promise<Decree[]> => {
    if (!config || !pin) return [];
    
    const url = `https://api.github.com/repos/${config.user}/${config.repo}/contents/${config.path}`;
    const res = await fetch(url, {
      headers: {
        Authorization: `token ${config.token}`,
        Accept: 'application/vnd.github.v3+json',
      },
    });

    if (!res.ok) {
      if (res.status === 404) {
        return []; // File not created yet
      }
      throw new Error('Error al conectar con el repositorio.');
    }

    const data = await res.json();
    const contentClean = data.content.replace(/\s/g, '');
    const encryptedString = decodeURIComponent(escape(atob(contentClean)));

    const bytes = CryptoJS.AES.decrypt(encryptedString, pin);
    const decryptedText = bytes.toString(CryptoJS.enc.Utf8);
    if (!decryptedText) {
      throw new Error('NIP incorrecto o archivo dañado en el repositorio.');
    }
    return JSON.parse(decryptedText);
  };

  // Lockscreen callback handling
  const handleUnlock = async (_decryptedData?: any, pin?: string) => {
    const activePinValue = pin || activePIN;
    if (pin) setActivePIN(pin);

    // Check if we have temporary github recovery payload from NIP screen
    const tempSync = (window as any).__tempGitHubSync;
    if (tempSync) {
      try {
        const encryptedPayload = tempSync.encryptedPayload;
        const bytes = CryptoJS.AES.decrypt(encryptedPayload, activePinValue);
        const decryptedText = bytes.toString(CryptoJS.enc.Utf8);
        if (!decryptedText) throw new Error();

        const pulledDecrees = JSON.parse(decryptedText);
        setDecrees(pulledDecrees);

        // Success: store credentials, hash, and payload locally
        const newHash = CryptoJS.SHA256(activePinValue).toString();
        localStorage.setItem('decretos_nip_hash', newHash);
        setStoredHash(newHash);

        const config = {
          user: tempSync.user,
          repo: tempSync.repo,
          token: tempSync.token,
          path: tempSync.path
        };
        localStorage.setItem('decretos_github_config', JSON.stringify(config));
        setGitHubConfig(config);

        // Store encrypted payload locally
        const encryptedLocal = CryptoJS.AES.encrypt(JSON.stringify(pulledDecrees), activePinValue).toString();
        localStorage.setItem('decretos_payload', encryptedLocal);

        const syncTime = new Date().toISOString();
        setLastSyncTime(syncTime);
        localStorage.setItem('decretos_last_sync', syncTime);

        setIsLocked(false);
        delete (window as any).__tempGitHubSync;
        return;
      } catch (e) {
        // Intercept failed decryption
        alert('No se pudo desencriptar los datos de GitHub con ese NIP. Revisa el NIP ingresado.');
        setActivePIN('');
        delete (window as any).__tempGitHubSync;
        window.location.reload(); // reset state
        return;
      }
    }

    // Standard unlock logic:
    // Load local encrypted decrees
    const localPayload = localStorage.getItem('decretos_payload');
    let loadedDecrees: Decree[] = [];
    if (localPayload) {
      try {
        const bytes = CryptoJS.AES.decrypt(localPayload, activePinValue);
        const decryptedText = bytes.toString(CryptoJS.enc.Utf8);
        if (decryptedText) {
          loadedDecrees = JSON.parse(decryptedText);
        }
      } catch (e) {
        console.warn("Could not decrypt local data.", e);
      }
    }

    // If GitHub sync is configured, pull latest and merge
    if (gitHubConfig) {
      try {
        const remoteDecrees = await pullFromGitHub(activePinValue, gitHubConfig);
        if (remoteDecrees && remoteDecrees.length > 0) {
          loadedDecrees = remoteDecrees; // Remote has priority for multi-device sync
          // Update local encrypted storage
          const newEncrypted = CryptoJS.AES.encrypt(JSON.stringify(loadedDecrees), activePinValue).toString();
          localStorage.setItem('decretos_payload', newEncrypted);
        }
      } catch (err: any) {
        console.warn("GitHub pull on login failed, using local offline data:", err.message);
      }
    }

    setDecrees(loadedDecrees);
    setIsLocked(false);
  };

  // Decree Actions: Save
  const handleSaveDecree = async (decree: Decree) => {
    let updated: Decree[];
    const exists = decrees.some(d => d.id === decree.id);
    
    if (exists) {
      updated = decrees.map(d => d.id === decree.id ? decree : d);
    } else {
      updated = [decree, ...decrees];
    }
    
    setDecrees(updated);
    setIsEditorOpen(false);
    setEditingDecree(null);

    // Save locally
    const encrypted = CryptoJS.AES.encrypt(JSON.stringify(updated), activePIN).toString();
    localStorage.setItem('decretos_payload', encrypted);

    // Sync to GitHub if configured
    if (gitHubConfig) {
      try {
        await syncToGitHub(updated, activePIN, gitHubConfig);
      } catch (e) {
        console.warn("Automatic GitHub Sync failed. Will sync next time you edit or click Sync.");
      }
    }
  };

  // Decree Actions: Delete
  const handleDeleteDecree = async (id: string) => {
    const updated = decrees.filter(d => d.id !== id);
    setDecrees(updated);

    // Save locally
    const encrypted = CryptoJS.AES.encrypt(JSON.stringify(updated), activePIN).toString();
    localStorage.setItem('decretos_payload', encrypted);

    // Sync to GitHub if configured
    if (gitHubConfig) {
      try {
        await syncToGitHub(updated, activePIN, gitHubConfig);
      } catch (e) {
        console.warn("Automatic GitHub Sync failed.");
      }
    }
  };



  // Re-encrypt with new PIN handler
  const handleUpdatePINAndData = (newPIN: string, newHash: string) => {
    localStorage.setItem('decretos_nip_hash', newHash);
    setStoredHash(newHash);
    setActivePIN(newPIN);

    // Re-encrypt data
    const encrypted = CryptoJS.AES.encrypt(JSON.stringify(decrees), newPIN).toString();
    localStorage.setItem('decretos_payload', encrypted);

    // Sync encrypted database to GitHub with the new PIN key
    if (gitHubConfig) {
      syncToGitHub(decrees, newPIN, gitHubConfig).catch(e => {
        console.warn("Failed to push re-encrypted backup to GitHub:", e);
      });
    }
  };

  // Save GitHub credentials from dashboard settings
  const handleSaveGitHubConfig = (config: typeof gitHubConfig) => {
    localStorage.setItem('decretos_github_config', JSON.stringify(config));
    setGitHubConfig(config);
  };

  // Manual Trigger Sync from dashboard
  const handleManualSync = async () => {
    if (!gitHubConfig) return;
    // Pull and merge first
    try {
      const remoteDecrees = await pullFromGitHub(activePIN, gitHubConfig);
      let merged = [...decrees];
      
      // Basic merge: add remote decrees that aren't local
      if (remoteDecrees && remoteDecrees.length > 0) {
        const localIds = new Set(decrees.map(d => d.id));
        const newFromRemote = remoteDecrees.filter(rd => !localIds.has(rd.id));
        merged = [...merged, ...newFromRemote];
        setDecrees(merged);
      }
      
      // Push final merged set back to GitHub
      await syncToGitHub(merged, activePIN, gitHubConfig);
      
      // Update local storage
      const encrypted = CryptoJS.AES.encrypt(JSON.stringify(merged), activePIN).toString();
      localStorage.setItem('decretos_payload', encrypted);
    } catch (e) {
      console.error(e);
      throw e;
    }
  };

  // Clear data locally
  const handleClearData = () => {
    localStorage.removeItem('decretos_payload');
    localStorage.removeItem('decretos_nip_hash');
    localStorage.removeItem('decretos_github_config');
    localStorage.removeItem('decretos_last_sync');
    setDecrees([]);
    setStoredHash(null);
    setGitHubConfig(null);
    setLastSyncTime(null);
    setActivePIN('');
    setIsLocked(true);
  };

  // Backup Import
  const handleImportBackup = (imported: Decree[]) => {
    setDecrees(imported);
    const encrypted = CryptoJS.AES.encrypt(JSON.stringify(imported), activePIN).toString();
    localStorage.setItem('decretos_payload', encrypted);

    if (gitHubConfig) {
      syncToGitHub(imported, activePIN, gitHubConfig).catch(_e => console.warn("GitHub backup upload failed."));
    }
  };

  return (
    <>
      {/* Background aurora gradients */}
      <div className="aurora-container">
        <div className="aurora-light aurora-light-1" />
        <div className="aurora-light aurora-light-2" />
        <div className="aurora-light aurora-light-3" />
      </div>

      {/* Primary Routing / View Toggle */}
      {isLocked ? (
        <PINScreen
          onUnlock={handleUnlock}
          storedHash={storedHash}
          onSetHash={(hash) => {
            localStorage.setItem('decretos_nip_hash', hash);
            setStoredHash(hash);
          }}
        />
      ) : (
        <Dashboard
          decrees={decrees}
          onAddClick={() => {
            setEditingDecree(null);
            setIsEditorOpen(true);
          }}
          onEditClick={(decree) => {
            setEditingDecree(decree);
            setIsEditorOpen(true);
          }}
          onDeleteClick={handleDeleteDecree}
          onPreviewClick={(decree) => setPreviewingDecree(decree)}
          onLock={() => {
            setActivePIN('');
            setIsLocked(true);
          }}
          gitHubConfig={gitHubConfig}
          onSaveGitHubConfig={handleSaveGitHubConfig}
          isSyncing={isSyncing}
          onTriggerSync={handleManualSync}
          lastSyncTime={lastSyncTime}
          onResetPIN={(hash) => {
            // Retrieve latest pin value inserted inside Dashboard settings
            // We can read it from a temporary global or direct binding
            const rawNewPin = (window as any).__tempNewPIN;
            if (rawNewPin) {
              handleUpdatePINAndData(rawNewPin, hash);
              delete (window as any).__tempNewPIN;
            } else {
              localStorage.setItem('decretos_nip_hash', hash);
              setStoredHash(hash);
            }
          }}
          onClearData={handleClearData}
          onImportBackup={handleImportBackup}
          activeTheme={activeTheme}
          onChangeTheme={setActiveTheme}
        />
      )}

      {/* Editor Modal */}
      {isEditorOpen && (
        <DecreeEditor
          decree={editingDecree}
          onSave={handleSaveDecree}
          onClose={() => {
            setIsEditorOpen(false);
            setEditingDecree(null);
          }}
        />
      )}

      {/* Meditation Fullscreen Viewer */}
      {previewingDecree && (
        <DecreePreview
          decree={previewingDecree}
          onClose={() => setPreviewingDecree(null)}
        />
      )}
    </>
  );
};

export default App;
