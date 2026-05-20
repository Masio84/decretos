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
    <div
      className="med-shell"
      style={{ background: `radial-gradient(ellipse at 30% 40%, #0d0820 0%, #030304 70%)` }}
    >
      {/* Fixed particle canvas — always behind everything */}
      <canvas ref={canvasRef} className="meditation-canvas" />

      {/* Ambient energy glow */}
      <div style={{
        position: 'fixed', top: '35%', left: '30%',
        width: '500px', height: '500px',
        background: getEnergyGlowColor(energy),
        filter: 'blur(180px)', opacity: 0.25,
        pointerEvents: 'none', borderRadius: '50%', zIndex: 0
      }} />

      {/* ── TOP BAR (fixed) ── */}
      <div className="med-topbar">
        <span className="badge-category" style={{
          background: getEnergyGradient(energy),
          color: '#fff', fontWeight: 600,
          boxShadow: `0 4px 16px ${getEnergyGlowColor(energy)}`
        }}>
          {category}
        </span>

        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          {/* 432 Hz ambient toggle */}
          <button
            type="button"
            className="btn btn-secondary"
            onClick={toggleZenMusic}
            style={{
              padding: '0.55rem 1rem',
              borderRadius: '9999px',
              fontSize: '0.82rem',
              background: isZenMusicPlaying ? 'rgba(168,85,247,0.18)' : 'rgba(255,255,255,0.06)',
              borderColor: isZenMusicPlaying ? 'var(--accent-purple)' : 'rgba(255,255,255,0.1)',
              display: 'inline-flex', alignItems: 'center', gap: '0.45rem'
            }}
          >
            {isZenMusicPlaying ? <Volume2 size={15} /> : <VolumeX size={15} />}
            <span className="mobile-hide">{isZenMusicPlaying ? 'Frecuencia 432Hz' : 'Freq. Relajante'}</span>
          </button>

          {/* Video toggle */}
          {videoUrl && ytEmbedUrl && (
            <button
              type="button"
              className="btn btn-secondary btn-icon-only"
              onClick={() => { audioHelper.playTap(); setShowVideoEmbed(v => !v); }}
              style={{
                borderRadius: '50%',
                background: showVideoEmbed ? 'rgba(59,130,246,0.25)' : 'rgba(255,255,255,0.07)',
                borderColor: showVideoEmbed ? '#3b82f6' : 'rgba(255,255,255,0.15)'
              }}
              title="Ver Video"
            >
              <Video size={20} style={{ color: showVideoEmbed ? '#60a5fa' : 'white' }} />
            </button>
          )}

          {/* Close */}
          <button
            type="button"
            className="btn btn-secondary btn-icon-only"
            onClick={handleExit}
            style={{
              borderRadius: '50%',
              background: 'rgba(244,63,94,0.2)',
              borderColor: 'rgba(244,63,94,0.45)',
              color: '#ffa3b1',
              boxShadow: '0 0 14px rgba(244,63,94,0.25)'
            }}
            title="Salir"
          >
            <X size={22} />
          </button>
        </div>
      </div>

      {/* ── MAIN AREA ── */}
      <div className="med-main">

        {/* LEFT: scrollable decree text + media */}
        <div className="med-left">
          <p className="med-category-label">{category}</p>
          <h2 className="med-title">{title}</h2>
          <blockquote className="med-decree">"{content}"</blockquote>

          {/* Banner image */}
          {imageUrl && !showVideoEmbed && (
            <div style={{
              width: '100%', maxWidth: '480px',
              height: '200px', borderRadius: '16px',
              overflow: 'hidden',
              border: '1px solid rgba(255,255,255,0.08)',
              boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
              animation: 'fade-in-up 0.6s ease-out',
              flexShrink: 0
            }}>
              <img src={imageUrl} alt={title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            </div>
          )}

          {/* YouTube video */}
          {showVideoEmbed && ytEmbedUrl && (
            <div style={{
              width: '100%', maxWidth: '560px',
              borderRadius: '16px', overflow: 'hidden',
              border: '1px solid rgba(255,255,255,0.08)',
              boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
              animation: 'fade-in-up 0.4s ease-out',
              flexShrink: 0
            }}>
              <div className="video-container">
                <iframe
                  src={ytEmbedUrl}
                  title="Meditación Video"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              </div>
              <div style={{
                padding: '0.6rem 1rem', fontSize: '0.78rem',
                color: 'var(--text-secondary)',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                background: 'rgba(0,0,0,0.3)'
              }}>
                <span>Video de Acompañamiento</span>
                <button type="button" className="btn btn-text"
                  style={{ padding: 0, fontSize: '0.78rem', color: '#fda4af' }}
                  onClick={() => setShowVideoEmbed(false)}>
                  Cerrar
                </button>
              </div>
            </div>
          )}

          {/* Web link */}
          {linkUrl && (
            <a
              href={linkUrl} target="_blank" rel="noopener noreferrer"
              onClick={() => audioHelper.playTap()}
              className="btn btn-secondary"
              style={{
                padding: '0.65rem 1.25rem', fontSize: '0.85rem',
                borderRadius: '9999px', color: 'var(--text-primary)',
                textDecoration: 'none', background: 'rgba(255,255,255,0.05)',
                display: 'inline-flex', alignItems: 'center', gap: '0.45rem',
                width: 'fit-content', flexShrink: 0
              }}
            >
              <ExternalLink size={14} />
              Recurso de Manifestación
            </a>
          )}
        </div>

        {/* RIGHT: breathing guide panel (sticky on desktop) */}
        <div className="med-right">
          <div className="med-breathe-card">
            <p style={{
              fontSize: '0.7rem', fontWeight: 600, letterSpacing: '0.12em',
              textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '1.5rem'
            }}>Respiración 4×4</p>

            {showGuide ? (
              <>
                {/* Animated breathing circle */}
                <div
                  className="breathing-dot"
                  style={{
                    width: '110px', height: '110px',
                    border: '2px solid transparent', borderRadius: '50%',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontFamily: 'var(--font-display)',
                    fontSize: '1.8rem', fontWeight: '700', color: 'white',
                    ...getBreatheProgressCircleStyle()
                  }}
                >
                  {breatheSeconds}
                </div>

                <div style={{ textAlign: 'center', marginTop: '1.25rem' }}>
                  <div style={{
                    fontFamily: 'var(--font-display)',
                    fontSize: '1rem', fontWeight: '600', color: 'white',
                    letterSpacing: '0.04em'
                  }}>
                    {getBreatheLabel()}
                  </div>
                  <p style={{
                    fontSize: '0.72rem', color: 'var(--text-secondary)',
                    marginTop: '0.4rem', lineHeight: '1.5'
                  }}>
                    Inhala · Retén · Exhala · Retén
                  </p>
                </div>

                <button
                  type="button" className="btn btn-text"
                  onClick={() => { audioHelper.playTap(); setShowGuide(false); }}
                  style={{ fontSize: '0.75rem', opacity: 0.55, marginTop: '1.5rem' }}
                >
                  Ocultar guía
                </button>
              </>
            ) : (
              <button
                type="button" className="btn btn-secondary"
                onClick={() => { audioHelper.playTap(); setShowGuide(true); }}
                style={{
                  padding: '0.75rem 1.5rem', borderRadius: '9999px',
                  fontSize: '0.85rem', background: 'rgba(255,255,255,0.06)'
                }}
              >
                Activar Guía
              </button>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};
export default DecreePreview;
