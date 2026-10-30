/**
 * Web Audio API synthesized notification sounds for Terreno Broaster POS.
 * Generates rich, energetic chimes and alerts without requiring external audio files.
 */

export type AlertSoundType =
  | 'chime_double'
  | 'ding_dong'
  | 'digital_whatsapp'
  | 'kitchen_bell'
  | 'urgent_siren'
  | 'marimba_pop';

export interface SoundOption {
  id: AlertSoundType;
  name: string;
  description: string;
  tag: string;
}

export const AVAILABLE_ALERT_SOUNDS: SoundOption[] = [
  {
    id: 'chime_double',
    name: 'Campana de Restaurante (Doble Chime)',
    description: 'Sonido melódico tradicional de F5 a C6, claro y elegante.',
    tag: 'Clásico',
  },
  {
    id: 'ding_dong',
    name: 'Timbre de Mostrador (Ding-Dong)',
    description: 'Campana brillante de dos notas con resonancia prolongada.',
    tag: 'Recomendado',
  },
  {
    id: 'digital_whatsapp',
    name: 'Tono Digital WhatsApp (Triple Beep)',
    description: 'Secuencia moderna y rápida de tres notas de alta frecuencia.',
    tag: 'Tecnológico',
  },
  {
    id: 'kitchen_bell',
    name: 'Campanilla de Cocina (Servicio)',
    description: 'Tono agudo metálico de despacho de platos de 1250 Hz.',
    tag: 'Cocina',
  },
  {
    id: 'urgent_siren',
    name: 'Alerta Urgente (Atención Doble)',
    description: 'Doble pulsación oscilante para zonas ruidosas o atención inmediata.',
    tag: 'Máxima Atención',
  },
  {
    id: 'marimba_pop',
    name: 'Melodía Alegre Marimba',
    description: 'Acorde alegre y festivo de xilófono/marimba de 3 notas.',
    tag: 'Alegre',
  },
];

import { safeStorage } from './safeStorage';

export interface SoundSettings {
  soundType: AlertSoundType;
  volume: number; // 0 to 100
  enabled: boolean;
}

const STORAGE_KEY_TYPE = 'tb_whatsapp_sound_type';
const STORAGE_KEY_VOL = 'tb_whatsapp_sound_volume';
const STORAGE_KEY_ENABLED = 'tb_whatsapp_sound_enabled';

export function getSoundSettings(): SoundSettings {
  try {
    const soundType = (safeStorage.getItem(STORAGE_KEY_TYPE) as AlertSoundType) || 'ding_dong';
    const volumeRaw = safeStorage.getItem(STORAGE_KEY_VOL);
    const volume = volumeRaw !== null ? Math.min(100, Math.max(0, parseInt(volumeRaw, 10))) : 85;
    const enabledRaw = safeStorage.getItem(STORAGE_KEY_ENABLED);
    const enabled = enabledRaw !== null ? enabledRaw === 'true' : true;

    return { soundType, volume, enabled };
  } catch {
    return { soundType: 'ding_dong', volume: 85, enabled: true };
  }
}

export function saveSoundSettings(settings: Partial<SoundSettings>): SoundSettings {
  try {
    const current = getSoundSettings();
    const updated: SoundSettings = { ...current, ...settings };
    safeStorage.setItem(STORAGE_KEY_TYPE, updated.soundType);
    safeStorage.setItem(STORAGE_KEY_VOL, String(updated.volume));
    safeStorage.setItem(STORAGE_KEY_ENABLED, String(updated.enabled));
    return updated;
  } catch {
    return getSoundSettings();
  }
}

let sharedAudioContext: AudioContext | null = null;
let audioUnlocked = false;

export function getAudioContext(): AudioContext | null {
  try {
    if (!sharedAudioContext) {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioContextClass) {
        sharedAudioContext = new AudioContextClass();
      }
    }
    if (sharedAudioContext && sharedAudioContext.state === 'suspended') {
      sharedAudioContext.resume().catch(() => {});
    }
    return sharedAudioContext;
  } catch {
    return null;
  }
}

export function isAudioUnlocked(): boolean {
  if (!sharedAudioContext) return false;
  return sharedAudioContext.state === 'running';
}

/**
 * Call on any user gesture to satisfy browser autoplay policies
 */
export function unlockAudioContext(): boolean {
  try {
    const ctx = getAudioContext();
    if (ctx && ctx.state === 'suspended') {
      ctx.resume().then(() => {
        audioUnlocked = true;
      }).catch(() => {});
    } else if (ctx && ctx.state === 'running') {
      audioUnlocked = true;
    }
    return audioUnlocked;
  } catch {
    return false;
  }
}

// Auto-attach unlock listeners on common user interactions
if (typeof window !== 'undefined') {
  const handleInteraction = () => {
    unlockAudioContext();
  };
  window.addEventListener('pointerdown', handleInteraction, { once: true, passive: true });
  window.addEventListener('keydown', handleInteraction, { once: true, passive: true });
  window.addEventListener('touchstart', handleInteraction, { once: true, passive: true });
}

/**
 * Synthesizes a specific alert sound type with custom volume
 */
export function playAlertSound(typeOverride?: AlertSoundType, volumeOverride?: number) {
  const settings = getSoundSettings();
  if (!settings.enabled && volumeOverride === undefined && typeOverride === undefined) {
    return;
  }

  const volume = volumeOverride !== undefined ? volumeOverride : settings.volume;
  if (volume <= 0) return;

  const gainFactor = (volume / 100) * 0.7; // Master scale
  const soundType = typeOverride || settings.soundType;

  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;

  try {
    switch (soundType) {
      case 'ding_dong': {
        // First note: High E6 (1318.51 Hz)
        const osc1 = ctx.createOscillator();
        const g1 = ctx.createGain();
        osc1.type = 'sine';
        osc1.frequency.setValueAtTime(1318.51, now);
        g1.gain.setValueAtTime(0, now);
        g1.gain.linearRampToValueAtTime(gainFactor * 0.9, now + 0.02);
        g1.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
        osc1.connect(g1);
        g1.connect(ctx.destination);
        osc1.start(now);
        osc1.stop(now + 0.5);

        // Second note: Lower C6 (1046.50 Hz)
        const osc2 = ctx.createOscillator();
        const g2 = ctx.createGain();
        osc2.type = 'sine';
        osc2.frequency.setValueAtTime(1046.50, now + 0.22);
        g2.gain.setValueAtTime(0, now + 0.22);
        g2.gain.linearRampToValueAtTime(gainFactor * 1.0, now + 0.25);
        g2.gain.exponentialRampToValueAtTime(0.0005, now + 1.1);
        osc2.connect(g2);
        g2.connect(ctx.destination);
        osc2.start(now + 0.22);
        osc2.stop(now + 1.1);
        break;
      }

      case 'digital_whatsapp': {
        // Fast electronic triple beep: 880Hz -> 1174Hz -> 1396Hz
        const notes = [880, 1174, 1396];
        notes.forEach((freq, idx) => {
          const start = now + idx * 0.09;
          const osc = ctx.createOscillator();
          const g = ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, start);
          g.gain.setValueAtTime(0, start);
          g.gain.linearRampToValueAtTime(gainFactor * 0.8, start + 0.015);
          g.gain.exponentialRampToValueAtTime(0.001, start + 0.12);
          osc.connect(g);
          g.connect(ctx.destination);
          osc.start(start);
          osc.stop(start + 0.12);
        });
        break;
      }

      case 'kitchen_bell': {
        // High penetrating metallic service chime at 1250 Hz with 2500 Hz harmonic
        const osc = ctx.createOscillator();
        const g = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(1250, now);
        g.gain.setValueAtTime(0, now);
        g.gain.linearRampToValueAtTime(gainFactor * 0.9, now + 0.01);
        g.gain.exponentialRampToValueAtTime(0.0008, now + 0.85);
        osc.connect(g);
        g.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.85);

        // Harmonic shimmer
        const oscH = ctx.createOscillator();
        const gH = ctx.createGain();
        oscH.type = 'triangle';
        oscH.frequency.setValueAtTime(2500, now);
        gH.gain.setValueAtTime(0, now);
        gH.gain.linearRampToValueAtTime(gainFactor * 0.35, now + 0.02);
        gH.gain.exponentialRampToValueAtTime(0.0005, now + 0.5);
        oscH.connect(gH);
        gH.connect(ctx.destination);
        oscH.start(now);
        oscH.stop(now + 0.5);
        break;
      }

      case 'urgent_siren': {
        // Dual attention burst: 800Hz and 1200Hz
        const bursts = [
          { time: now, freq: 880 },
          { time: now + 0.14, freq: 1100 },
          { time: now + 0.32, freq: 880 },
          { time: now + 0.46, freq: 1100 },
        ];
        bursts.forEach((b) => {
          const osc = ctx.createOscillator();
          const g = ctx.createGain();
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(b.freq, b.time);
          g.gain.setValueAtTime(0, b.time);
          g.gain.linearRampToValueAtTime(gainFactor * 0.75, b.time + 0.02);
          g.gain.exponentialRampToValueAtTime(0.001, b.time + 0.12);
          osc.connect(g);
          g.connect(ctx.destination);
          osc.start(b.time);
          osc.stop(b.time + 0.12);
        });
        break;
      }

      case 'marimba_pop': {
        // C5 -> E5 -> G5 -> C6 happy chord
        const chords = [523.25, 659.25, 783.99, 1046.5];
        chords.forEach((freq, idx) => {
          const start = now + idx * 0.07;
          const osc = ctx.createOscillator();
          const g = ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, start);
          g.gain.setValueAtTime(0, start);
          g.gain.linearRampToValueAtTime(gainFactor * 0.7, start + 0.015);
          g.gain.exponentialRampToValueAtTime(0.0008, start + 0.3);
          osc.connect(g);
          g.connect(ctx.destination);
          osc.start(start);
          osc.stop(start + 0.3);
        });
        break;
      }

      case 'chime_double':
      default: {
        // Tone 1: high melodic chime (F5 - 698.46 Hz)
        const osc1 = ctx.createOscillator();
        const gain1 = ctx.createGain();
        osc1.type = 'sine';
        osc1.frequency.setValueAtTime(698.46, now);
        gain1.gain.setValueAtTime(0, now);
        gain1.gain.linearRampToValueAtTime(gainFactor * 0.8, now + 0.04);
        gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
        osc1.connect(gain1);
        gain1.connect(ctx.destination);
        osc1.start(now);
        osc1.stop(now + 0.35);

        // Tone 2: higher harmonic chime (C6 - 1046.50 Hz)
        const osc2 = ctx.createOscillator();
        const gain2 = ctx.createGain();
        osc2.type = 'sine';
        osc2.frequency.setValueAtTime(1046.50, now + 0.14);
        gain2.gain.setValueAtTime(0, now + 0.14);
        gain2.gain.linearRampToValueAtTime(gainFactor * 0.9, now + 0.18);
        gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.65);
        osc2.connect(gain2);
        gain2.connect(ctx.destination);
        osc2.start(now + 0.14);
        osc2.stop(now + 0.65);
        break;
      }
    }
  } catch (err) {
    console.warn('Audio alert could not play:', err);
  }
}

/**
 * Standard trigger when a WhatsApp order arrives
 */
export function playNotificationSound() {
  playAlertSound();
}

/**
 * Double alert trigger for incoming WhatsApp orders
 */
export function playWhatsAppIncomingAlert() {
  playAlertSound();
  setTimeout(() => {
    playAlertSound();
  }, 480);
}
