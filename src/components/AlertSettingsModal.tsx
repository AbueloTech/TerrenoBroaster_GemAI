import React, { useState, useEffect } from 'react';
import {
  Volume2,
  VolumeX,
  Volume1,
  Bell,
  Play,
  Check,
  X,
  Settings,
  Sparkles,
  Info,
  ShieldAlert,
  Radio,
} from 'lucide-react';
import {
  AlertSoundType,
  AVAILABLE_ALERT_SOUNDS,
  getSoundSettings,
  saveSoundSettings,
  playAlertSound,
  playWhatsAppIncomingAlert,
  unlockAudioContext,
  isAudioUnlocked,
} from '../utils/soundAlert';

interface AlertSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved?: () => void;
}

export const AlertSettingsModal: React.FC<AlertSettingsModalProps> = ({
  isOpen,
  onClose,
  onSaved,
}) => {
  const [selectedSound, setSelectedSound] = useState<AlertSoundType>('ding_dong');
  const [volume, setVolume] = useState<number>(85);
  const [enabled, setEnabled] = useState<boolean>(true);
  const [audioReady, setAudioReady] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      const s = getSoundSettings();
      setSelectedSound(s.soundType);
      setVolume(s.volume);
      setEnabled(s.enabled);
      setAudioReady(isAudioUnlocked());
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleTestSound = (soundId: AlertSoundType) => {
    unlockAudioContext();
    setAudioReady(true);
    playAlertSound(soundId, volume);
  };

  const handleTestFullAlert = () => {
    unlockAudioContext();
    setAudioReady(true);
    playAlertSound(selectedSound, volume);
    setTimeout(() => {
      playAlertSound(selectedSound, volume);
    }, 450);
    showToast('Reproduciendo alerta de prueba...');
  };

  const handleSave = () => {
    saveSoundSettings({
      soundType: selectedSound,
      volume,
      enabled,
    });
    showToast('¡Configuración de sonido guardada exitosamente!');
    if (onSaved) onSaved();
    setTimeout(() => {
      onClose();
    }, 600);
  };

  const handleActivateAudio = () => {
    unlockAudioContext();
    setAudioReady(true);
    playAlertSound(selectedSound, volume);
    showToast('¡Audio del navegador activado correctamente!');
  };

  const getVolumeIcon = () => {
    if (!enabled || volume === 0) return <VolumeX className="w-5 h-5 text-rose-400" />;
    if (volume < 50) return <Volume1 className="w-5 h-5 text-amber-400" />;
    return <Volume2 className="w-5 h-5 text-emerald-400" />;
  };

  return (
    <div className="fixed inset-0 z-70 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-stone-900 border border-stone-800 rounded-2xl w-full max-w-2xl max-h-[92vh] overflow-y-auto shadow-2xl flex flex-col">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-950/80 via-stone-900 to-stone-900 px-6 py-4 border-b border-stone-800 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-green-500 flex items-center justify-center shadow-lg shadow-emerald-600/30 text-stone-950 font-black">
              <Volume2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-black text-white tracking-wide flex items-center space-x-2">
                <span>Configuración de Alertas</span>
                <span className="text-emerald-400 text-xs px-2 py-0.5 rounded-full bg-emerald-950 border border-emerald-500/30 font-bold">
                  WhatsApp
                </span>
              </h3>
              <p className="text-xs text-stone-400">
                Personaliza el sonido, volumen y notificaciones para no perder ningún pedido
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-6">

          {/* Browser Audio Permission / Unlock Banner */}
          <div className="bg-stone-950 border border-stone-800 p-4 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center space-x-3">
              <div
                className={`w-9 h-9 rounded-lg flex items-center justify-center ${
                  audioReady
                    ? 'bg-emerald-950 border border-emerald-500/40 text-emerald-400'
                    : 'bg-amber-950 border border-amber-500/40 text-amber-400 animate-pulse'
                }`}
              >
                <Bell className="w-4 h-4" />
              </div>
              <div>
                <span className="text-xs font-bold text-white block">
                  {audioReady
                    ? 'Audio del Sistema Web Habilitado'
                    : 'Permiso de Audio del Navegador'}
                </span>
                <p className="text-[11px] text-stone-400">
                  {audioReady
                    ? 'Los navegadores reproducirán las alertas sonoras automáticamente.'
                    : 'Haz clic en el botón para asegurar que tu navegador no bloquee el sonido.'}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleActivateAudio}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center space-x-1.5 ${
                audioReady
                  ? 'bg-stone-800 hover:bg-stone-700 text-stone-200 border border-stone-700'
                  : 'bg-emerald-600 hover:bg-emerald-500 text-stone-950 shadow-md shadow-emerald-600/30'
              }`}
            >
              <span>{audioReady ? '🔊 Probar Audio' : '🔊 Activar Audio'}</span>
            </button>
          </div>

          {/* Master Enable / Disable Sound */}
          <div className="bg-stone-950/60 border border-stone-800 p-4 rounded-xl flex items-center justify-between">
            <div>
              <span className="text-sm font-bold text-white block">
                Reproducir Alerta Sonora al Recibir Pedido
              </span>
              <p className="text-xs text-stone-400">
                Emite un timbre sonoro en la PC cada vez que entra un pedido con estado "Pendiente"
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={enabled}
                onChange={(e) => setEnabled(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-stone-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-stone-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
            </label>
          </div>

          {/* Volume Slider Control */}
          <div className="bg-stone-950/60 border border-stone-800 p-4 rounded-xl space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                {getVolumeIcon()}
                <span className="text-sm font-bold text-white">Volumen de la Alarma</span>
              </div>
              <span className="text-sm font-mono font-bold text-emerald-400">
                {enabled ? `${volume}%` : 'Silenciado'}
              </span>
            </div>

            <input
              type="range"
              min={0}
              max={100}
              step={5}
              value={enabled ? volume : 0}
              disabled={!enabled}
              onChange={(e) => {
                const newVol = parseInt(e.target.value, 10);
                setVolume(newVol);
              }}
              onMouseUp={() => {
                if (enabled) playAlertSound(selectedSound, volume);
              }}
              onTouchEnd={() => {
                if (enabled) playAlertSound(selectedSound, volume);
              }}
              className="w-full h-2 bg-stone-800 rounded-lg appearance-none cursor-pointer accent-emerald-500 disabled:opacity-40"
            />

            {/* Quick volume preset chips */}
            <div className="flex items-center justify-between pt-1 text-xs">
              <span className="text-stone-500 text-[11px]">Nivel rápido:</span>
              <div className="flex items-center space-x-1.5">
                {[25, 50, 75, 100].map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => {
                      setVolume(preset);
                      if (enabled) playAlertSound(selectedSound, preset);
                    }}
                    disabled={!enabled}
                    className={`px-2 py-0.5 rounded text-[11px] font-mono font-semibold transition-colors ${
                      volume === preset && enabled
                        ? 'bg-emerald-600 text-stone-950'
                        : 'bg-stone-800 hover:bg-stone-700 text-stone-300'
                    }`}
                  >
                    {preset}%
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Sound Type Selection Grid */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold uppercase tracking-wider text-stone-400">
                Selecciona el Sonido de Notificación ({AVAILABLE_ALERT_SOUNDS.length} opciones)
              </label>
              <button
                type="button"
                onClick={handleTestFullAlert}
                className="text-xs text-amber-400 hover:text-amber-300 font-bold flex items-center space-x-1"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Probar Alerta Completa</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {AVAILABLE_ALERT_SOUNDS.map((sound) => {
                const isSelected = selectedSound === sound.id;
                return (
                  <div
                    key={sound.id}
                    onClick={() => setSelectedSound(sound.id)}
                    className={`p-3 rounded-xl border cursor-pointer transition-all flex flex-col justify-between space-y-2 ${
                      isSelected
                        ? 'bg-emerald-950/40 border-emerald-500 shadow-md shadow-emerald-950/30 ring-1 ring-emerald-500/40'
                        : 'bg-stone-950/60 border-stone-800 hover:border-stone-700'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center space-x-2">
                        <div
                          className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${
                            isSelected
                              ? 'border-emerald-500 bg-emerald-500 text-stone-950'
                              : 'border-stone-600 bg-stone-900'
                          }`}
                        >
                          {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                        </div>
                        <span className="text-xs font-bold text-white">
                          {sound.name}
                        </span>
                      </div>
                      <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-stone-800 text-amber-300">
                        {sound.tag}
                      </span>
                    </div>

                    <p className="text-[11px] text-stone-400 leading-tight pl-6">
                      {sound.description}
                    </p>

                    <div className="pt-1 flex justify-end">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedSound(sound.id);
                          handleTestSound(sound.id);
                        }}
                        className="flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-200 text-[11px] font-semibold border border-stone-700 transition-colors"
                      >
                        <Play className="w-3 h-3 text-emerald-400 fill-emerald-400" />
                        <span>Escuchar</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Visual Alert Info Box */}
          <div className="bg-stone-950/60 border border-stone-800 p-3 rounded-xl text-xs text-stone-400 flex items-start space-x-2.5">
            <Info className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="text-stone-300 font-semibold">
                Alerta Visual Permanente en Pantalla:
              </p>
              <p className="text-[11px]">
                Aunque tengas los altavoces de tu computadora apagados o con poco volumen, el sistema mostrará un <strong>aviso visual flotante y barra superior</strong> cada vez que exista un pedido pendiente de WhatsApp Web, garantizando que nunca se pase por alto ninguna venta.
              </p>
            </div>
          </div>

        </div>

        {/* Toast Alert Feedback */}
        {toastMessage && (
          <div className="bg-emerald-600 text-stone-950 font-bold px-4 py-2 text-xs flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Check className="w-4 h-4" />
              <span>{toastMessage}</span>
            </div>
            <button onClick={() => setToastMessage(null)} className="text-stone-950/70 hover:text-stone-950">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Footer Actions */}
        <div className="bg-stone-950 px-6 py-3.5 border-t border-stone-800 flex items-center justify-between">
          <button
            type="button"
            onClick={handleTestFullAlert}
            className="px-3.5 py-2 bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs font-semibold rounded-xl border border-stone-700 transition-colors flex items-center space-x-1.5"
          >
            <Play className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
            <span>Probar Sonido</span>
          </button>

          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-stone-800 hover:bg-stone-700 text-stone-300 text-xs font-semibold rounded-xl transition-colors"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-stone-950 text-xs font-black rounded-xl shadow-md shadow-emerald-600/30 transition-all active:scale-95 flex items-center space-x-1.5"
            >
              <Check className="w-4 h-4" />
              <span>Guardar Configuración</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
