import React, { useState, useEffect } from 'react';
import { X, Image, Video, Link as LinkIcon, Save } from 'lucide-react';
import audioHelper from '../utils/audioHelper';

// Helper to parse YouTube URLs
const getYoutubeEmbedUrl = (url: string): string | null => {
  if (!url) return null;
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
  const match = url.match(regExp);
  if (match && match[2].length === 11) {
    return `https://www.youtube.com/embed/${match[2]}`;
  }
  return null;
};

// Types
export interface Decree {
  id: string;
  title: string;
  category: string;
  content: string;
  imageUrl?: string;
  videoUrl?: string;
  linkUrl?: string;
  energy: 'love' | 'prosperity' | 'health' | 'purpose' | 'spirit';
  date: string; // ISO String
}

interface DecreeEditorProps {
  decree?: Decree | null; // If null, we are in create mode
  onSave: (decree: Decree) => void;
  onClose: () => void;
}

const PRESET_CATEGORIES = ['Amor Propio', 'Abundancia', 'Salud & Vigor', 'Propósito de Vida', 'Paz Espiritual', 'Crecimiento Mental'];

export const DecreeEditor: React.FC<DecreeEditorProps> = ({ decree, onSave, onClose }) => {
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('Abundancia');
  const [customCategory, setCustomCategory] = useState('');
  const [isCustomCategory, setIsCustomCategory] = useState(false);
  const [content, setContent] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [linkUrl, setLinkUrl] = useState('');
  const [energy, setEnergy] = useState<Decree['energy']>('prosperity');
  const [date, setDate] = useState('');
  const [showMediaOptions, setShowMediaOptions] = useState(false);

  useEffect(() => {
    if (decree) {
      setTitle(decree.title);
      if (PRESET_CATEGORIES.includes(decree.category)) {
        setCategory(decree.category);
        setIsCustomCategory(false);
      } else {
        setCategory('Custom');
        setCustomCategory(decree.category);
        setIsCustomCategory(true);
      }
      setContent(decree.content);
      setImageUrl(decree.imageUrl || '');
      setVideoUrl(decree.videoUrl || '');
      setLinkUrl(decree.linkUrl || '');
      setEnergy(decree.energy);
      setDate(decree.date.split('T')[0]);
      if (decree.imageUrl || decree.videoUrl || decree.linkUrl) {
        setShowMediaOptions(true);
      }
    } else {
      // Default new decree state
      setTitle('');
      setCategory('Abundancia');
      setIsCustomCategory(false);
      setCustomCategory('');
      setContent('');
      setImageUrl('');
      setVideoUrl('');
      setLinkUrl('');
      setEnergy('prosperity');
      setDate(new Date().toISOString().split('T')[0]);
    }
  }, [decree]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    audioHelper.playUnlock(); // Play pleasant completion chord

    const finalCategory = isCustomCategory ? (customCategory.trim() || 'General') : category;

    const updatedDecree: Decree = {
      id: decree?.id || Math.random().toString(36).substr(2, 9),
      title: title.trim() || 'Decreto de Vida',
      category: finalCategory,
      content: content.trim(),
      imageUrl: imageUrl.trim() || undefined,
      videoUrl: videoUrl.trim() || undefined,
      linkUrl: linkUrl.trim() || undefined,
      energy,
      date: new Date(date).toISOString(),
    };

    onSave(updatedDecree);
  };

  const handleEnergySelect = (selectedEnergy: Decree['energy']) => {
    audioHelper.playTap();
    setEnergy(selectedEnergy);
  };

  const getEnergyColor = (e: Decree['energy']) => {
    switch (e) {
      case 'love': return 'var(--energy-love)';
      case 'prosperity': return 'var(--energy-prosperity)';
      case 'health': return 'var(--energy-health)';
      case 'purpose': return 'var(--energy-purpose)';
      case 'spirit': return 'var(--energy-spirit)';
    }
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100vw',
      height: '100dvh',
      zIndex: 80,
      background: 'rgba(0,0,0,0.6)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      backdropFilter: 'blur(8px)',
      padding: '1rem',
      animation: 'fade-in-up 0.25s ease-out'
    }}>
      <div className="glass" style={{
        width: '100%',
        maxWidth: '540px',
        maxHeight: '90dvh',
        overflowY: 'auto',
        borderRadius: 'var(--radius-lg)',
        boxShadow: 'var(--shadow-lg)',
        borderTop: `4px solid transparent`,
        borderImage: `${getEnergyColor(energy)} 1`,
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
      }}>
        {/* Header */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '1.25rem 1.5rem',
          borderBottom: '1px solid var(--border-glass)'
        }}>
          <h2 style={{
            fontFamily: 'var(--font-display)',
            fontSize: '1.25rem',
            fontWeight: '600',
            background: getEnergyColor(energy),
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent'
          }}>
            {decree ? 'Editar Decreto' : 'Crear Decreto'}
          </h2>
          <button
            type="button"
            className="btn btn-text"
            onClick={() => { audioHelper.playTap(); onClose(); }}
            style={{ padding: '0.25rem' }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {/* Energy Selectors */}
          <div>
            <label className="label-glass">Frecuencia Vibracional (Energía)</label>
            <div style={{ display: 'flex', gap: '0.875rem', marginTop: '0.5rem' }}>
              {(['love', 'prosperity', 'health', 'purpose', 'spirit'] as Decree['energy'][]).map(e => (
                <button
                  key={e}
                  type="button"
                  onClick={() => handleEnergySelect(e)}
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '50%',
                    background: getEnergyColor(e),
                    border: '2px solid transparent',
                    borderColor: energy === e ? 'white' : 'transparent',
                    boxShadow: energy === e ? `0 0 14px ${getEnergyColor(e)}` : 'none',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    transform: energy === e ? 'scale(1.15)' : 'scale(1)'
                  }}
                  title={e.toUpperCase()}
                />
              ))}
            </div>
          </div>

          {/* Title */}
          <div>
            <label htmlFor="decree-title" className="label-glass">Yo Decreto (Título)</label>
            <input
              id="decree-title"
              type="text"
              required
              placeholder="Escribe el nombre de tu decreto... ej. Abundancia Ilimitada"
              className="input-glass"
              value={title}
              onChange={e => setTitle(e.target.value)}
            />
          </div>

          {/* Category selection */}
          <div style={{ display: 'grid', gridTemplateColumns: isCustomCategory ? '1fr 1fr' : '1fr', gap: '1rem' }}>
            <div>
              <label htmlFor="decree-category" className="label-glass">Categoría</label>
              <select
                id="decree-category"
                className="input-glass"
                style={{ appearance: 'none', background: 'rgba(0,0,0,0.3) url("data:image/svg+xml;utf8,<svg fill=\'white\' height=\'24\' viewBox=\'0 0 24 24\' width=\'24\' xmlns=\'http://www.w3.org/2000/svg\'><path d=\'M7 10l5 5 5-5z\'/><path d=\'M0 0h24v24H0z\' fill=\'none\'/></svg>") no-repeat right 12px center' }}
                value={category}
                onChange={e => {
                  audioHelper.playTap();
                  if (e.target.value === 'Custom') {
                    setIsCustomCategory(true);
                  } else {
                    setIsCustomCategory(false);
                    setCategory(e.target.value);
                  }
                }}
              >
                {PRESET_CATEGORIES.map(cat => (
                  <option key={cat} value={cat} style={{ background: '#0a0b12' }}>{cat}</option>
                ))}
                <option value="Custom" style={{ background: '#0a0b12' }}>[ Otra Categoría ]</option>
              </select>
            </div>
            
            {isCustomCategory && (
              <div>
                <label htmlFor="custom-category" className="label-glass">Nombre de Categoría</label>
                <input
                  id="custom-category"
                  type="text"
                  required
                  placeholder="ej. Amor de Pareja"
                  className="input-glass"
                  value={customCategory}
                  onChange={e => setCustomCategory(e.target.value)}
                />
              </div>
            )}
          </div>

          {/* Date Picker */}
          <div>
            <label htmlFor="decree-date" className="label-glass">Fecha de Manifestación</label>
            <div style={{ position: 'relative' }}>
              <input
                id="decree-date"
                type="date"
                required
                className="input-glass"
                style={{ display: 'block' }}
                value={date}
                onChange={e => setDate(e.target.value)}
              />
            </div>
          </div>

          {/* Body Content */}
          <div>
            <label htmlFor="decree-content" className="label-glass">Manifiesta tu Decreto (Cuerpo)</label>
            <textarea
              id="decree-content"
              required
              rows={5}
              placeholder="Yo decreto y afirmo con plena consciencia que..."
              className="input-glass"
              style={{ resize: 'vertical', fontFamily: 'var(--font-serif)', fontSize: '1.05rem', lineHeight: '1.5' }}
              value={content}
              onChange={e => setContent(e.target.value)}
            />
          </div>

          {/* Media Attachments Button */}
          <div>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => { audioHelper.playTap(); setShowMediaOptions(!showMediaOptions); }}
              style={{
                width: '100%',
                fontSize: '0.85rem',
                justifyContent: 'center',
                background: 'rgba(255, 255, 255, 0.02)',
                borderStyle: 'dashed'
              }}
            >
              {showMediaOptions ? 'Ocultar Opciones de Multimedia' : 'Adjuntar Imagen, Video o Enlace'}
            </button>
          </div>

          {/* Media fields */}
          {showMediaOptions && (
            <div className="glass" style={{
              padding: '1rem',
              borderRadius: 'var(--radius-md)',
              background: 'rgba(0,0,0,0.2)',
              display: 'flex',
              flexDirection: 'column',
              gap: '1rem',
              animation: 'fade-in-up 0.2s ease-out'
            }}>
              <div>
                <label htmlFor="image-url" className="label-glass" style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.75rem' }}>
                  <Image size={14} /> URL de Imagen de Banner
                </label>
                <input
                  id="image-url"
                  type="url"
                  placeholder="https://images.unsplash.com/..."
                  className="input-glass"
                  style={{ padding: '0.5rem 0.75rem', fontSize: '0.85rem', borderRadius: '10px' }}
                  value={imageUrl}
                  onChange={e => setImageUrl(e.target.value)}
                />
              </div>

              <div>
                <label htmlFor="video-url" className="label-glass" style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.75rem' }}>
                  <Video size={14} /> URL de Video (YouTube)
                </label>
                <input
                  id="video-url"
                  type="url"
                  placeholder="https://www.youtube.com/watch?v=..."
                  className="input-glass"
                  style={{ padding: '0.5rem 0.75rem', fontSize: '0.85rem', borderRadius: '10px' }}
                  value={videoUrl}
                  onChange={e => setVideoUrl(e.target.value)}
                />
                {videoUrl && !getYoutubeEmbedUrl(videoUrl) && (
                  <span style={{ color: '#f43f5e', fontSize: '0.7rem', marginTop: '0.25rem', display: 'block' }}>
                    * El enlace no parece un link de YouTube válido.
                  </span>
                )}
              </div>

              <div>
                <label htmlFor="link-url" className="label-glass" style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.75rem' }}>
                  <LinkIcon size={14} /> URL de Enlace Web Relacionado
                </label>
                <input
                  id="link-url"
                  type="url"
                  placeholder="https://mi-afirmacion.com/..."
                  className="input-glass"
                  style={{ padding: '0.5rem 0.75rem', fontSize: '0.85rem', borderRadius: '10px' }}
                  value={linkUrl}
                  onChange={e => setLinkUrl(e.target.value)}
                />
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div style={{
            display: 'flex',
            gap: '1rem',
            marginTop: '0.5rem',
            borderTop: '1px solid var(--border-glass)',
            paddingTop: '1rem'
          }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => { audioHelper.playTap(); onClose(); }}
              style={{ flex: 1 }}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              style={{ flex: 2, background: getEnergyColor(energy), boxShadow: `0 4px 14px 0 ${getEnergyColor(energy)}80` }}
            >
              <Save size={18} />
              Guardar Decreto
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
