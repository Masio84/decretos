import React, { useEffect, useRef, useState } from 'react';
import { X, Volume2, VolumeX, ExternalLink, Video } from 'lucide-react';
import type { Decree } from './DecreeEditor';
import audioHelper from '../utils/audioHelper';

// Helper to parse YouTube URLs
const getYoutubeEmbedUrl = (url: string): string | null => {
  if (!url) return null;
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
  const match = url.match(regExp);
  if (match && match[2].length === 11) {
    return `https://www.youtube.com/embed/${match[2]}?autoplay=0&enablejsapi=1`;
  }
  return null;
};

interface DecreePreviewProps {
  decree: Decree;
  onClose: () => void;
}

export const DecreePreview: React.FC<DecreePreviewProps> = ({ decree, onClose }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isZenMusicPlaying, setIsZenMusicPlaying] = useState(false);
  const [breatheState, setBreatheState] = useState<'inhale' | 'hold1' | 'exhale' | 'hold2'>('inhale');
  const [breatheSeconds, setBreatheSeconds] = useState(4);
  const [showGuide, setShowGuide] = useState(true);
  const [showVideoEmbed, setShowVideoEmbed] = useState(false);

  const { title, category, content, imageUrl, videoUrl, linkUrl, energy } = decree;

  // 1. Particle Canvas Animation
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    // Track mouse coordinates for interactive mouse glow / particle drift
    const mouse = { x: -1000, y: -1000 };

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };

    const handleMouseMove = (e: MouseEvent) => {
      mouse.x = e.clientX;
      mouse.y = e.clientY;
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('mousemove', handleMouseMove);

    // Particle class
    class StarParticle {
      x: number;
      y: number;
      radius: number;
      speedY: number;
      driftX: number;
      opacity: number;
      maxOpacity: number;

      constructor() {
        this.x = Math.random() * width;
        this.y = Math.random() * height;
        this.radius = Math.random() * 1.5 + 0.5;
        this.speedY = -(Math.random() * 0.4 + 0.1);
        this.driftX = Math.random() * 0.2 - 0.1;
        this.maxOpacity = Math.random() * 0.5 + 0.2;
        this.opacity = Math.random() * this.maxOpacity;
      }

      update() {
        this.y += this.speedY;
        this.x += this.driftX;

        // If particle goes off-screen top, reset to bottom
        if (this.y < 0) {
          this.y = height;
          this.x = Math.random() * width;
          this.opacity = 0;
        }

        // Fade in
        if (this.opacity < this.maxOpacity) {
          this.opacity += 0.005;
        }

        // Interactive mouse gravity: particles slightly shift away from cursor
        const dx = this.x - mouse.x;
        const dy = this.y - mouse.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 120) {
          const force = (120 - dist) / 120;
          this.x += (dx / dist) * force * 1.5;
          this.y += (dy / dist) * force * 1.5;
        }
      }

      draw(c: CanvasRenderingContext2D) {
        c.beginPath();
        c.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        c.fillStyle = `rgba(255, 255, 255, ${this.opacity})`;
        c.fill();
      }
    }

    const starCount = Math.min(80, Math.floor((width * height) / 18000));
    const stars: StarParticle[] = [];
    for (let i = 0; i < starCount; i++) {
      stars.push(new StarParticle());
    }

    const render = () => {
      ctx.clearRect(0, 0, width, height);

      // Draw mouse radial glow
      if (mouse.x > -500) {
        const glowGrad = ctx.createRadialGradient(
          mouse.x, mouse.y, 0,
          mouse.x, mouse.y, 180
        );
        glowGrad.addColorStop(0, 'rgba(168, 85, 247, 0.06)');
        glowGrad.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = glowGrad;
        ctx.fillRect(0, 0, width, height);
      }

      // Draw all stars
      stars.forEach(star => {
        star.update();
        star.draw(ctx);
      });

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, []);

  // 2. Box Breathing Guide Loop
  // 4s Inhale -> 4s Hold -> 4s Exhale -> 4s Hold
  useEffect(() => {
    if (!showGuide) return;

    const interval = setInterval(() => {
      setBreatheSeconds(prev => {
        if (prev === 1) {
          // Switch state
          setBreatheState(curr => {
            switch (curr) {
              case 'inhale': return 'hold1';
              case 'hold1': return 'exhale';
              case 'exhale': return 'hold2';
              case 'hold2': return 'inhale';
            }
          });
          return 4; // Reset to 4 seconds
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [showGuide]);

  // Audio start/stop control
  const toggleZenMusic = () => {
    audioHelper.playTap();
    if (isZenMusicPlaying) {
      audioHelper.stopMeditationAmbient();
      setIsZenMusicPlaying(false);
    } else {
      audioHelper.startMeditationAmbient();
      setIsZenMusicPlaying(true);
    }
  };

  // Close screen & stop audio helper
  const handleExit = () => {
    audioHelper.playTap();
    audioHelper.stopMeditationAmbient();
    onClose();
  };

  const getBreatheLabel = () => {
    switch (breatheState) {
      case 'inhale': return 'Inhala Profundamente';
      case 'hold1': return 'Retén el Aire';
      case 'exhale': return 'Exhala con Calma';
      case 'hold2': return 'Retén en Vacío';
    }
  };

  const getBreatheProgressCircleStyle = () => {
    // Determine scaling size for the circle based on breathe state
    let scale = 1.0;
    if (breatheState === 'inhale') {
      // Growing from 1.0 to 1.6 depending on how close we are to 1s remaining
      scale = 1.0 + (4 - breatheSeconds) * 0.15;
    } else if (breatheState === 'hold1') {
      scale = 1.6;
    } else if (breatheState === 'exhale') {
      // Shrinking from 1.6 to 1.0
      scale = 1.6 - (4 - breatheSeconds) * 0.15;
    } else {
      scale = 1.0;
    }

    return {
      transform: `scale(${scale})`,
      transition: 'transform 1s linear',
      boxShadow: breatheState === 'inhale' || breatheState === 'hold1' ? 
        '0 0 35px 8px rgba(168, 85, 247, 0.45)' : '0 0 15px 1px rgba(255, 255, 255, 0.1)',
      background: breatheState === 'inhale' || breatheState === 'hold1' ? 
        'rgba(168, 85, 247, 0.15)' : 'rgba(255, 255, 255, 0.03)',
      borderColor: breatheState === 'inhale' || breatheState === 'hold1' ? 
        'var(--accent-purple)' : 'rgba(255, 255, 255, 0.2)'
    };
  };

  const getEnergyGlowColor = (e: Decree['energy']) => {
    switch (e) {
      case 'love': return 'rgba(244, 63, 94, 0.4)';
      case 'prosperity': return 'rgba(234, 179, 8, 0.4)';
      case 'health': return 'rgba(16, 185, 129, 0.4)';
      case 'purpose': return 'rgba(59, 130, 246, 0.4)';
      case 'spirit': return 'rgba(168, 85, 247, 0.4)';
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

  const ytEmbedUrl = getYoutubeEmbedUrl(videoUrl || '');

  return (
    <div className="meditation-overlay" style={{
      background: `radial-gradient(circle at center, #07070b 0%, #030304 100%)`
    }}>
      {/* Interactive canvas behind everything */}
      <canvas ref={canvasRef} className="meditation-canvas" />

      {/* Background neon dynamic lights */}
      <div style={{
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        width: '400px',
        height: '400px',
        background: getEnergyGlowColor(energy),
        filter: 'blur(160px)',
        opacity: 0.3,
        pointerEvents: 'none',
        borderRadius: '50%',
        zIndex: 0
      }} />

      {/* Top Bar Controls */}
      <div style={{
        position: 'relative',
        zIndex: 10,
        width: '100%',
        maxWidth: '960px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '0 0.5rem',
        flexShrink: 0
      }}>
        {/* Category Pill */}
        <span className="badge-category" style={{
          background: getEnergyGradient(energy),
          color: '#ffffff',
          fontWeight: 600,
          boxShadow: `0 4px 12px ${getEnergyGlowColor(energy)}`
        }}>
          {category}
        </span>

        {/* Ambient Settings */}
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={toggleZenMusic}
            style={{
              padding: '0.6rem 1rem',
              borderRadius: '9999px',
              fontSize: '0.85rem',
              background: isZenMusicPlaying ? 'rgba(168, 85, 247, 0.15)' : 'rgba(255, 255, 255, 0.05)',
              borderColor: isZenMusicPlaying ? 'var(--accent-purple)' : 'rgba(255, 255, 255, 0.08)',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}
          >
            {isZenMusicPlaying ? <Volume2 size={16} /> : <VolumeX size={16} />}
            <span>{isZenMusicPlaying ? 'Frecuencia 432Hz Activa' : 'Frecuencia Relajante'}</span>
          </button>

          {videoUrl && ytEmbedUrl && (
            <button
              type="button"
              className="btn btn-secondary btn-icon-only"
              onClick={() => { audioHelper.playTap(); setShowVideoEmbed(!showVideoEmbed); }}
              style={{
                borderRadius: '50%',
                background: showVideoEmbed ? 'rgba(59, 130, 246, 0.25)' : 'rgba(255, 255, 255, 0.08)',
                borderColor: showVideoEmbed ? '#3b82f6' : 'rgba(255, 255, 255, 0.18)'
              }}
              title="Ver Video Relacionado"
            >
              <Video size={22} style={{ color: showVideoEmbed ? '#60a5fa' : 'white' }} />
            </button>
          )}

          <button
            type="button"
            className="btn btn-secondary btn-icon-only"
            onClick={handleExit}
            style={{
              borderRadius: '50%',
              background: 'rgba(244, 63, 94, 0.22)',
              borderColor: 'rgba(244, 63, 94, 0.45)',
              color: '#ffa3b1',
              boxShadow: '0 0 12px rgba(244, 63, 94, 0.2)'
            }}
            title="Salir del Modo Meditación"
          >
            <X size={24} />
          </button>
        </div>
      </div>

      {/* Main Focus Content */}
      <div className="meditation-content" style={{ zIndex: 5, margin: 'auto 0', flexShrink: 0 }}>
        {/* Decree Banner image inside preview */}
        {imageUrl && !showVideoEmbed && (
          <div style={{
            maxWidth: '380px',
            width: '90%',
            height: '130px',
            borderRadius: '16px',
            overflow: 'hidden',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            boxShadow: 'var(--shadow-md)',
            animation: 'fade-in-up 0.5s ease-out'
          }}>
            <img src={imageUrl} alt={title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          </div>
        )}

        {/* Youtube Video Panel */}
        {showVideoEmbed && ytEmbedUrl && (
          <div className="glass" style={{
            maxWidth: '480px',
            width: '90vw',
            borderRadius: '16px',
            overflow: 'hidden',
            border: '1px solid rgba(255,255,255,0.08)',
            animation: 'fade-in-up 0.4s ease-out',
            boxShadow: 'var(--shadow-md)'
          }}>
            <div className="video-container">
              <iframe
                src={ytEmbedUrl}
                title="Reprodutor de Meditación"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
            <div style={{ padding: '0.5rem 1rem', fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>Música/Vídeo de Acompañamiento</span>
              <button
                type="button"
                className="btn btn-text"
                style={{ padding: 0, fontSize: '0.75rem', color: '#f43f5e' }}
                onClick={() => setShowVideoEmbed(false)}
              >
                Cerrar Video
              </button>
            </div>
          </div>
        )}

        <div className="meditation-title">{title}</div>
        
        {/* Main Text */}
        <h1 className="meditation-decree" style={{ color: 'white' }}>
          "{content}"
        </h1>

        {/* Related Web Link */}
        {linkUrl && (
          <a
            href={linkUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => audioHelper.playTap()}
            className="btn btn-secondary"
            style={{
              padding: '0.5rem 1rem',
              fontSize: '0.8rem',
              borderRadius: '9999px',
              color: 'var(--text-primary)',
              textDecoration: 'none',
              background: 'rgba(255, 255, 255, 0.03)',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.35rem'
            }}
          >
            <ExternalLink size={12} />
            Recurso de Manifestación
          </a>
        )}
      </div>

      {/* Bottom breathing widget or toggle */}
      <div style={{
        position: 'relative',
        zIndex: 10,
        width: '100%',
        maxWidth: '480px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '1.25rem',
        marginBottom: '2rem',
        flexShrink: 0
      }}>
        {showGuide ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem' }}>
            {/* Morphing circle */}
            <div
              className="breathing-dot"
              style={{
                width: '100px',
                height: '100px',
                border: '2px solid transparent',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontFamily: 'var(--font-display)',
                fontSize: '1.5rem',
                fontWeight: '600',
                color: 'white',
                ...getBreatheProgressCircleStyle()
              }}
            >
              {breatheSeconds}
            </div>

            <div style={{ textAlign: 'center' }}>
              <div style={{
                fontFamily: 'var(--font-display)',
                fontSize: '0.9rem',
                fontWeight: '500',
                color: 'white',
                letterSpacing: '0.05em'
              }}>
                {getBreatheLabel()}
              </div>
              <p style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                Respiración cuadrada (4x4) para centrar tu enfoque.
              </p>
            </div>

            <button
              type="button"
              className="btn btn-text"
              onClick={() => { audioHelper.playTap(); setShowGuide(false); }}
              style={{ fontSize: '0.75rem', opacity: 0.6 }}
            >
              Ocultar Guía de Respiración
            </button>
          </div>
        ) : (
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => { audioHelper.playTap(); setShowGuide(true); }}
            style={{
              padding: '0.5rem 1rem',
              borderRadius: '9999px',
              fontSize: '0.8rem',
              background: 'rgba(255, 255, 255, 0.03)'
            }}
          >
            Activar Guía de Respiración
          </button>
        )}
      </div>
    </div>
  );
};
export default DecreePreview;
