import React from 'react';
import { Eye, Edit3, Trash2, Image as ImageIcon, Video as VideoIcon, Link as LinkIcon, Calendar } from 'lucide-react';
import type { Decree } from './DecreeEditor';
import audioHelper from '../utils/audioHelper';

interface DecreeCardProps {
  decree: Decree;
  onEdit: (decree: Decree) => void;
  onDelete: (id: string) => void;
  onPreview: (decree: Decree) => void;
}

export const DecreeCard: React.FC<DecreeCardProps> = ({ decree, onEdit, onDelete, onPreview }) => {
  const { title, category, content, imageUrl, videoUrl, linkUrl, energy, date } = decree;

  // Formatting date
  const formatDate = (isoString: string) => {
    try {
      const d = new Date(isoString);
      return d.toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' });
    } catch (e) {
      return 'Fecha indefinida';
    }
  };

  // Tracking mouse movement for premium hover glow effect
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const card = e.currentTarget;
    const rect = card.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    card.style.setProperty('--x', `${x}px`);
    card.style.setProperty('--y', `${y}px`);
  };

  const getEnergyGlowClass = (e: Decree['energy']) => {
    switch (e) {
      case 'love': return 'rgba(244, 63, 94, 0.15)';
      case 'prosperity': return 'rgba(234, 179, 8, 0.15)';
      case 'health': return 'rgba(16, 185, 129, 0.15)';
      case 'purpose': return 'rgba(59, 130, 246, 0.15)';
      case 'spirit': return 'rgba(168, 85, 247, 0.15)';
    }
  };

  const getEnergyGradient = (e: Decree['energy']) => {
    switch (e) {
      case 'love': return 'var(--energy-love)';
      case 'prosperity': return 'var(--energy-prosperity)';
      case 'health': return 'var(--energy-health)';
      case 'purpose': return 'var(--energy-purpose)';
      case 'spirit': return 'var(--energy-spirit)';
    }
  };

  const getBadgeClass = (e: Decree['energy']) => {
    switch (e) {
      case 'love': return 'badge-love';
      case 'prosperity': return 'badge-prosperity';
      case 'health': return 'badge-health';
      case 'purpose': return 'badge-purpose';
      case 'spirit': return 'badge-spirit';
    }
  };

  // Truncate decree content for card preview
  const getTruncatedContent = (text: string) => {
    if (text.length <= 110) return text;
    return text.substring(0, 110) + '...';
  };

  return (
    <div
      className="glass-card"
      onMouseMove={handleMouseMove}
      onClick={() => { audioHelper.playTap(); onPreview(decree); }}
      style={{
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        borderLeft: `3px solid transparent`,
        borderImage: `${getEnergyGradient(energy)} 1`,
        boxShadow: `0 4px 20px -2px ${getEnergyGlowClass(energy)}`,
      }}
    >
      <div>
        {/* Card Header (Category & Date) */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <span className={`badge-category ${getBadgeClass(energy)}`}>
            {category}
          </span>
          <span style={{
            fontSize: '0.8rem',
            color: 'var(--text-secondary)',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.25rem'
          }}>
            <Calendar size={12} />
            {formatDate(date)}
          </span>
        </div>

        {/* Banner image thumbnail */}
        {imageUrl && (
          <div style={{
            width: '100%',
            height: '110px',
            borderRadius: '8px',
            overflow: 'hidden',
            marginBottom: '1rem',
            border: '1px solid rgba(255,255,255,0.05)'
          }}>
            <img
              src={imageUrl}
              alt={title}
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              loading="lazy"
              onError={(e) => {
                // If image fails, hide it
                (e.target as HTMLElement).style.display = 'none';
              }}
            />
          </div>
        )}

        {/* Title */}
        <h3 style={{
          fontFamily: 'var(--font-display)',
          fontSize: '1.2rem',
          fontWeight: '600',
          lineHeight: '1.3',
          color: 'var(--text-primary)',
          marginBottom: '0.625rem'
        }}>
          {title}
        </h3>

        {/* Truncated Content */}
        <p style={{
          fontFamily: 'var(--font-serif)',
          fontSize: '0.95rem',
          fontStyle: 'italic',
          lineHeight: '1.5',
          color: 'var(--text-secondary)',
          marginBottom: '1.25rem'
        }}>
          "{getTruncatedContent(content)}"
        </p>
      </div>

      {/* Card Footer (Attachments & Actions) */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingTop: '0.875rem',
        borderTop: '1px solid rgba(255,255,255,0.04)',
        marginTop: 'auto'
      }}>
        {/* Attachment Icons */}
        <div style={{ display: 'flex', gap: '0.5rem', color: 'var(--text-muted)' }}>
          {imageUrl && <span title="Imagen adjunta"><ImageIcon size={14} style={{ color: 'rgba(255,255,255,0.3)' }} /></span>}
          {videoUrl && <span title="Video de YouTube"><VideoIcon size={14} style={{ color: 'rgba(255,255,255,0.3)' }} /></span>}
          {linkUrl && <span title="Enlace web"><LinkIcon size={14} style={{ color: 'rgba(255,255,255,0.3)' }} /></span>}
        </div>

        {/* Action buttons */}
        <div style={{ display: 'flex', gap: '0.25rem' }} onClick={e => e.stopPropagation()}>
          <button
            type="button"
            className="btn btn-text"
            style={{ padding: '0.5rem', color: 'var(--text-secondary)' }}
            onClick={() => { audioHelper.playTap(); onEdit(decree); }}
            title="Editar Decreto"
          >
            <Edit3 size={18} />
          </button>
          
          <button
            type="button"
            className="btn btn-text"
            style={{ padding: '0.5rem', color: '#fda4af' }}
            onClick={() => {
              if (confirm('¿Estás seguro de que deseas eliminar este decreto de vida?')) {
                audioHelper.playError();
                onDelete(decree.id);
              }
            }}
            title="Eliminar Decreto"
          >
            <Trash2 size={18} />
          </button>

          <button
            type="button"
            className="btn btn-text"
            style={{
              padding: '0.5rem',
              color: 'var(--accent-purple)',
              background: 'rgba(168, 85, 247, 0.15)',
              border: '1px solid rgba(168, 85, 247, 0.3)',
              borderRadius: '50%',
              marginLeft: '0.35rem',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
            onClick={() => { audioHelper.playTap(); onPreview(decree); }}
            title="Visualizar (Meditación)"
          >
            <Eye size={18} />
          </button>
        </div>
      </div>
    </div>
  );
};
export default DecreeCard;
