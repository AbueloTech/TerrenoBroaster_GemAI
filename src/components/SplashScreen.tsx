import React, { useState, useEffect } from 'react';
import { Flame, ChefHat, Sparkles, Database, ArrowRight, ShieldCheck, Clock } from 'lucide-react';

interface SplashScreenProps {
  onFinish: () => void;
  defaultDurationSeconds?: number;
}

export const SplashScreen: React.FC<SplashScreenProps> = ({
  onFinish,
  defaultDurationSeconds = 30,
}) => {
  const [totalSeconds, setTotalSeconds] = useState(defaultDurationSeconds);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [isFinishing, setIsFinishing] = useState(false);

  // Dynamic progress calculation
  const progressPercent = Math.min(100, Math.round((elapsedSeconds / totalSeconds) * 100));
  const remainingSeconds = Math.max(0, totalSeconds - elapsedSeconds);

  // Dynamic status messages based on elapsed progress
  const getStatusMessage = (percent: number) => {
    if (percent < 15) return 'Iniciando motor relacional SQLite (TerrenoBroaster.db)...';
    if (percent < 35) return 'Cargando catálogo de combos broaster, piezas y bebidas...';
    if (percent < 55) return 'Sincronizando distribución de mesas (1 al 10, Barra y Terraza)...';
    if (percent < 75) return 'Conectando monitor de comandas y órdenes en cocina...';
    if (percent < 92) return 'Verificando seguridad de usuarios y módulo de caja...';
    return '¡Todo listo! Preparando acceso seguro al sistema...';
  };

  useEffect(() => {
    const interval = setInterval(() => {
      setElapsedSeconds((prev) => {
        const next = prev + 1;
        if (next >= totalSeconds) {
          clearInterval(interval);
          handleComplete();
          return totalSeconds;
        }
        return next;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [totalSeconds]);

  const handleComplete = () => {
    setIsFinishing(true);
    setTimeout(() => {
      onFinish();
    }, 600);
  };

  return (
    <div
      className={`fixed inset-0 z-50 flex flex-col items-center justify-between p-6 sm:p-10 select-none overflow-hidden transition-opacity duration-700 ${
        isFinishing ? 'opacity-0 scale-95 pointer-events-none' : 'opacity-100 scale-100'
      } bg-stone-950 text-white`}
    >
      {/* Background glowing effects */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-amber-600/15 via-stone-950/80 to-black pointer-events-none" />
      
      {/* Grid overlay */}
      <div 
        className="absolute inset-0 opacity-[0.03] pointer-events-none bg-[radial-gradient(#f59e0b_1px,transparent_1px)] [background-size:24px_24px]"
      />

      {/* Top Header / Brand pill */}
      <div className="relative z-10 w-full max-w-4xl flex items-center justify-between">
        <div className="flex items-center space-x-2.5 px-3.5 py-1.5 rounded-full bg-stone-900/80 border border-stone-800/80 backdrop-blur-md shadow-lg">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
          <span className="text-xs font-semibold text-stone-300 tracking-wide">
            TerrenoBroaster.db • Motor SQLite Activo
          </span>
        </div>

        {/* Speed toggle for testing */}
        <div className="flex items-center space-x-2">
          <div className="flex items-center space-x-1 bg-stone-900/90 border border-stone-800 rounded-lg p-1 text-[11px]">
            <Clock className="w-3 h-3 text-amber-400 ml-1.5" />
            <button
              onClick={() => {
                setTotalSeconds(30);
                setElapsedSeconds(0);
              }}
              className={`px-2 py-0.5 rounded font-medium transition-all ${
                totalSeconds === 30 ? 'bg-amber-500 text-stone-950 font-bold' : 'text-stone-400 hover:text-white'
              }`}
            >
              30s
            </button>
            <button
              onClick={() => {
                setTotalSeconds(10);
                setElapsedSeconds(0);
              }}
              className={`px-2 py-0.5 rounded font-medium transition-all ${
                totalSeconds === 10 ? 'bg-amber-500 text-stone-950 font-bold' : 'text-stone-400 hover:text-white'
              }`}
            >
              10s
            </button>
          </div>
        </div>
      </div>

      {/* Main Center Area: Luminous Circular Logo and Branding */}
      <div className="relative z-10 flex flex-col items-center justify-center my-auto text-center max-w-xl">
        
        {/* Luminous Multi-Ring Center Structure */}
        <div className="relative w-56 h-56 sm:w-64 sm:h-64 flex items-center justify-center mb-8">
          
          {/* Ambient Glow Aura */}
          <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-amber-600/30 via-orange-500/20 to-yellow-500/30 blur-2xl animate-pulse" />

          {/* Outer Orbital Ring 1 - Luminous rotating ring */}
          <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-amber-400 border-r-orange-500 border-b-amber-600 animate-[spin_3s_linear_infinite] opacity-90 shadow-[0_0_30px_rgba(245,158,11,0.4)]" />

          {/* Outer Orbital Ring 2 - Counter-rotating dashed neon ring */}
          <div className="absolute inset-2.5 rounded-full border border-dashed border-amber-300/40 animate-[spin_8s_linear_infinite_reverse]" />

          {/* Glowing particle dots on orbit */}
          <div className="absolute inset-0 animate-[spin_5s_linear_infinite]">
            <div className="w-3 h-3 rounded-full bg-amber-400 shadow-[0_0_12px_#f59e0b] -top-1.5 left-1/2 -translate-x-1/2 absolute" />
            <div className="w-2 h-2 rounded-full bg-orange-400 shadow-[0_0_8px_#f97316] -bottom-1 left-1/2 -translate-x-1/2 absolute" />
          </div>

          {/* Middle Ring with glowing pulse */}
          <div className="absolute inset-6 rounded-full bg-stone-900/90 border-2 border-amber-500/40 shadow-inner flex items-center justify-center backdrop-blur-xl">
            
            {/* Inner Ring Glow */}
            <div className="absolute inset-2 rounded-full border border-amber-500/20 bg-gradient-to-b from-stone-800/80 to-stone-950/90" />

            {/* Central Restaurant Logo Emblem */}
            <div className="relative z-10 flex flex-col items-center justify-center">
              <div className="relative">
                <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-br from-amber-500 via-orange-500 to-amber-600 flex items-center justify-center shadow-2xl shadow-amber-500/50 transform group-hover:scale-105 transition-transform">
                  <Flame className="w-10 h-10 sm:w-12 sm:h-12 text-stone-950 drop-shadow-md animate-bounce" />
                </div>
                {/* Chef Hat Accent Badge */}
                <div className="absolute -top-3 -right-3 w-8 h-8 rounded-full bg-stone-900 border-2 border-amber-400 flex items-center justify-center shadow-lg">
                  <ChefHat className="w-4 h-4 text-amber-400" />
                </div>
              </div>

              {/* Glowing label */}
              <div className="mt-2.5 flex items-center space-x-1">
                <Sparkles className="w-3 h-3 text-amber-400" />
                <span className="text-[10px] font-black uppercase tracking-widest text-amber-300">
                  EST. 2024
                </span>
                <Sparkles className="w-3 h-3 text-amber-400" />
              </div>
            </div>

          </div>
        </div>

        {/* Restaurant Name & Subtitle */}
        <div className="space-y-2">
          <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-white drop-shadow-md">
            TERRENO <span className="bg-gradient-to-r from-amber-400 via-orange-400 to-yellow-300 bg-clip-text text-transparent">BROASTER</span>
          </h1>
          <p className="text-xs sm:text-sm font-medium text-stone-400 tracking-wider uppercase">
            Sabor Broaster Crujiente • Calidad & Tradición
          </p>
          <div className="flex items-center justify-center space-x-2 pt-1 text-xs text-amber-400/90 font-semibold">
            <span>Punto de Venta</span>
            <span>•</span>
            <span>Control de Mesas</span>
            <span>•</span>
            <span>KDS Cocina</span>
          </div>
        </div>

      </div>

      {/* Bottom Area: Progress Bar, Status Message and Skip Button */}
      <div className="relative z-10 w-full max-w-xl flex flex-col items-center space-y-4">
        
        {/* Status text & percentage */}
        <div className="w-full flex items-center justify-between text-xs text-stone-400 px-1 font-mono">
          <span className="truncate pr-2 text-stone-300 flex items-center space-x-1.5">
            <span className="inline-block w-2 h-2 rounded-full bg-amber-400 animate-ping" />
            <span>{getStatusMessage(progressPercent)}</span>
          </span>
          <span className="font-bold text-amber-400 shrink-0">{progressPercent}%</span>
        </div>

        {/* Progress Bar Container */}
        <div className="w-full h-2.5 bg-stone-900/90 border border-stone-800 rounded-full overflow-hidden p-0.5 shadow-inner">
          <div
            className="h-full bg-gradient-to-r from-amber-500 via-orange-500 to-amber-300 rounded-full transition-all duration-300 ease-out shadow-[0_0_12px_rgba(245,158,11,0.6)]"
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        {/* Countdown & Skip Button */}
        <div className="w-full flex items-center justify-between pt-1">
          <div className="text-[11px] text-stone-500 flex items-center space-x-1">
            <Clock className="w-3.5 h-3.5 text-stone-400" />
            <span>Iniciando automáticamente en <strong className="text-amber-400">{remainingSeconds}s</strong></span>
          </div>

          <button
            onClick={handleComplete}
            className="group flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-stone-950 font-black rounded-xl text-xs shadow-lg shadow-amber-500/20 transition-all hover:scale-105 active:scale-95"
          >
            <span>Acceder Ahora</span>
            <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
          </button>
        </div>

        {/* Security seal */}
        <div className="flex items-center space-x-1.5 text-[10px] text-stone-500 pt-2">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
          <span>Sistema Seguro con Base de Datos SQLite Local • TerrenoBroaster.db</span>
        </div>

      </div>

    </div>
  );
};
