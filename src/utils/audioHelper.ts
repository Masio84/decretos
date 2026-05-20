// Web Audio API Synthesizer Helper for tactile UI sounds and ambient meditation hum
class AudioHelper {
  private ctx: AudioContext | null = null;
  private meditationNodes: {
    leftOsc: OscillatorNode;
    rightOsc: OscillatorNode;
    noiseSource: AudioBufferSourceNode;
    gain: GainNode;
  } | null = null;

  init() {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  playTap() {
    try {
      this.init();
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      
      osc.type = 'sine';
      osc.frequency.setValueAtTime(580, this.ctx.currentTime); // Soft tap tone
      
      gain.gain.setValueAtTime(0.04, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + 0.08);
      
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      
      osc.start();
      osc.stop(this.ctx.currentTime + 0.08);
    } catch (e) {
      console.warn("Audio Context not allowed or supported yet.", e);
    }
  }

  playError() {
    try {
      this.init();
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(130, this.ctx.currentTime);
      osc.frequency.linearRampToValueAtTime(70, this.ctx.currentTime + 0.25);
      
      gain.gain.setValueAtTime(0.08, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + 0.25);
      
      // Filter high frequencies from sawtooth to make it warmer/muffled
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(400, this.ctx.currentTime);
      
      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.ctx.destination);
      
      osc.start();
      osc.stop(this.ctx.currentTime + 0.25);
    } catch (e) {
      console.warn("Audio Context error", e);
    }
  }

  playUnlock() {
    try {
      this.init();
      if (!this.ctx) return;
      const now = this.ctx.currentTime;
      
      const playNote = (freq: number, start: number, duration: number) => {
        if (!this.ctx) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        
        osc.type = 'triangle'; // Warm, flute-like tone
        osc.frequency.setValueAtTime(freq, start);
        
        gain.gain.setValueAtTime(0, start);
        gain.gain.linearRampToValueAtTime(0.06, start + 0.04);
        gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
        
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        
        osc.start(start);
        osc.stop(start + duration);
      };

      // Beautiful major 9th sweep for visual unlock/save feedback
      playNote(261.63, now, 0.5);        // C4
      playNote(329.63, now + 0.06, 0.5); // E4
      playNote(392.00, now + 0.12, 0.5); // G4
      playNote(493.88, now + 0.18, 0.6); // B4
      playNote(523.25, now + 0.24, 0.8); // C5
    } catch (e) {
      console.warn("Audio Context error", e);
    }
  }

  startMeditationAmbient() {
    try {
      this.init();
      if (!this.ctx) return;
      if (this.meditationNodes) return; // Already running
      
      const now = this.ctx.currentTime;
      
      // 1. Binaural Beat oscillators (Left vs Right ear slightly offset to trigger relaxation)
      const leftOsc = this.ctx.createOscillator();
      const rightOsc = this.ctx.createOscillator();
      
      const leftGain = this.ctx.createGain();
      const rightGain = this.ctx.createGain();
      
      const masterGain = this.ctx.createGain();
      
      const merger = this.ctx.createChannelMerger(2);
      
      leftOsc.type = 'sine';
      leftOsc.frequency.setValueAtTime(136.1, now); // 136.1Hz - Ohm meditation frequency
      
      rightOsc.type = 'sine';
      rightOsc.frequency.setValueAtTime(138.1, now); // 2Hz Delta wave binaural offset
      
      leftGain.gain.setValueAtTime(0.04, now);
      rightGain.gain.setValueAtTime(0.04, now);
      
      leftOsc.connect(leftGain);
      rightOsc.connect(rightGain);
      
      leftGain.connect(merger, 0, 0); // connect to Left channel
      rightGain.connect(merger, 0, 1); // connect to Right channel
      
      // 2. Synthesize Brown Noise for water/wind soundscape
      const bufferSize = 2 * this.ctx.sampleRate;
      const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const output = noiseBuffer.getChannelData(0);
      
      let lastOut = 0.0;
      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        // Brown noise formula
        output[i] = (lastOut + (0.02 * white)) / 1.02;
        lastOut = output[i];
        output[i] *= 3.5;
      }
      
      const noiseSource = this.ctx.createBufferSource();
      noiseSource.buffer = noiseBuffer;
      noiseSource.loop = true;
      
      const noiseFilter = this.ctx.createBiquadFilter();
      noiseFilter.type = 'lowpass';
      noiseFilter.frequency.setValueAtTime(280, now); // Very soft rumbling frequencies
      
      const noiseGain = this.ctx.createGain();
      noiseGain.gain.setValueAtTime(0.025, now); // Quiet background rumble
      
      noiseSource.connect(noiseFilter);
      noiseFilter.connect(noiseGain);
      noiseGain.connect(masterGain);
      
      merger.connect(masterGain);
      
      // Fade in master volume
      masterGain.gain.setValueAtTime(0, now);
      masterGain.gain.linearRampToValueAtTime(0.8, now + 3.0); // Fade in over 3 seconds
      
      masterGain.connect(this.ctx.destination);
      
      leftOsc.start(now);
      rightOsc.start(now);
      noiseSource.start(now);
      
      this.meditationNodes = {
        leftOsc,
        rightOsc,
        noiseSource,
        gain: masterGain
      };
    } catch (e) {
      console.warn("Failed to play meditation ambient noise", e);
    }
  }

  stopMeditationAmbient() {
    if (!this.ctx || !this.meditationNodes) return;
    
    try {
      const now = this.ctx.currentTime;
      const nodes = this.meditationNodes;
      
      // Fade out master volume
      nodes.gain.gain.cancelScheduledValues(now);
      nodes.gain.gain.setValueAtTime(nodes.gain.gain.value, now);
      nodes.gain.gain.exponentialRampToValueAtTime(0.0001, now + 1.8); // Fade out over 1.8s
      
      setTimeout(() => {
        try {
          nodes.leftOsc.stop();
          nodes.rightOsc.stop();
          nodes.noiseSource.stop();
          
          nodes.leftOsc.disconnect();
          nodes.rightOsc.disconnect();
          nodes.noiseSource.disconnect();
          nodes.gain.disconnect();
        } catch (e) {
          // Already stopped/disconnected
        }
      }, 2000);
      
      this.meditationNodes = null;
    } catch (e) {
      console.warn("Error stopping meditation audio", e);
      this.meditationNodes = null;
    }
  }
}

export const audioHelper = new AudioHelper();
export default audioHelper;
