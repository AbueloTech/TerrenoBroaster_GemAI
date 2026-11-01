import React, { useState, useEffect } from 'react';
import {
  ChefHat,
  Sparkles,
  Database,
  ArrowRight,
  ShieldCheck,
  Clock,
  Printer,
  Smartphone,
  UtensilsCrossed,
  Calculator,
  CheckCircle2,
  Cpu,
  Layers,
} from 'lucide-react';

interface SplashScreenProps {
  onFinish: () => void;
  defaultDurationSeconds?: number;
}

interface ProgramInstance {
  id: string;
  name: string;
  category: string;
  icon: React.ComponentType<{ className?: string }>;
  startPercent: number;
}

const PROGRAM_INSTANCES: ProgramInstance[] = [
  {
    id: 'sqlite',
    name: 'Motor SQLite',
    category: 'TerrenoBroaster.db',
    icon: Database,
    startPercent: 0,
  },
  {
    id: 'menu',
    name: 'Catálogo de Platos',
    category: 'Broaster & Recetas',
    icon: UtensilsCrossed,
    startPercent: 15,
  },
  {
    id: 'kds',
    name: 'KDS & Mesas',
    category: 'Comandas de Cocina',
    icon: ChefHat,
    startPercent: 30,
  },
  {
    id: 'whatsapp',
    name: 'Servidor WhatsApp',
    category: 'Pedidos & Delivery',
    icon: Smartphone,
    startPercent: 45,
  },
  {
    id: 'printer',
    name: 'Impresora Bluetooth',
    category: 'Tickets Térmicos',
    icon: Printer,
    startPercent: 60,
  },
  {
    id: 'caja',
    name: 'Arqueo & Caja',
    category: 'Pesos Colombianos (COP)',
    icon: Calculator,
    startPercent: 75,
  },
  {
    id: 'security',
    name: 'Control de Acceso',
    category: 'Roles & Privilegios',
    icon: ShieldCheck,
    startPercent: 88,
  },
];

export const SplashScreen: React.FC<SplashScreenProps> = ({
  onFinish,
  defaultDurationSeconds = 15, // 15 seconds max as requested
}) => {
  const [totalSeconds, setTotalSeconds] = useState<number>(defaultDurationSeconds);
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(0);
  const [isFinishing, setIsFinishing] = useState<boolean>(false);

  // Dynamic progress calculation
  const progressPercent = Math.min(100, Math.round((elapsedSeconds / totalSeconds) * 100));
  const remainingSeconds = Math.max(0, totalSeconds - elapsedSeconds);

  // Dynamic status messages based on elapsed progress
  const getStatusMessage = (percent: number) => {
    if (percent < 15) return 'Iniciando motor relacional SQLite (TerrenoBroaster.db)...';
    if (percent < 30) return 'Cargando catálogo broaster, combos y tablas de precios...';
    if (percent < 50) return 'Sincronizando monitor de comandas en cocina y mesas 1 al 10...';
    if (percent < 70) return 'Verificando servicio de pedidos WhatsApp y conexión Bluetooth...';
    if (percent < 88) return 'Calibrando módulo de arqueo de caja en Pesos Colombianos (COP)...';
    if (percent < 98) return 'Cargando sistema de autenticación y privilegios de usuario...';
    return '¡Sistema listo! Abriendo pantalla de inicio de sesión...';
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
    }, 500);
  };

  return (
    <div
      className={`fixed inset-0 z-50 flex flex-col items-center justify-between p-4 sm:p-8 select-none overflow-hidden transition-all duration-500 ${
        isFinishing ? 'opacity-0 scale-95 pointer-events-none' : 'opacity-100 scale-100'
      } bg-stone-950 text-white`}
    >
      {/* Background glowing effects & ambient light */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-amber-600/20 via-stone-950/90 to-black pointer-events-none" />
      
      {/* Subtle geometric dot grid pattern */}
      <div 
        className="absolute inset-0 opacity-[0.035] pointer-events-none bg-[radial-gradient(#f59e0b_1px,transparent_1px)] [background-size:24px_24px]"
      />

      {/* Top Header / App Branding bar */}
      <div className="relative z-10 w-full max-w-4xl flex items-center justify-between">
        <div className="flex items-center space-x-2.5 px-3.5 py-1.5 rounded-full bg-stone-900/80 border border-stone-800/80 backdrop-blur-md shadow-lg">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
          <span className="text-xs font-semibold text-stone-300 tracking-wide">
            Terreno Broaster POS • Sistema Operativo Local
          </span>
        </div>

        <div className="flex items-center space-x-2">
          {/* Quick timer indicator */}
          <div className="flex items-center space-x-1.5 bg-stone-900/90 border border-stone-800 px-3 py-1 rounded-xl text-xs text-stone-400 font-mono">
            <Clock className="w-3.5 h-3.5 text-amber-400" />
            <span>Inicio en <strong className="text-amber-400">{remainingSeconds}s</strong></span>
          </div>
        </div>
      </div>

      {/* Main Center Area: Luminous Rotating Rings & Circular Logo (pollobroaster.jpg) */}
      <div className="relative z-10 flex flex-col items-center justify-center my-auto text-center max-w-2xl px-2">
        
        {/* Luminous Multi-Ring Center Structure */}
        <div className="relative w-56 h-56 sm:w-64 sm:h-64 flex items-center justify-center mb-6">
          
          {/* Ambient Warm Glow Aura */}
          <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-amber-600/40 via-orange-500/30 to-yellow-500/30 blur-3xl animate-pulse" />

          {/* Outer Ring 1: Continuous clockwise spinning golden beam */}
          <div className="absolute -inset-1 rounded-full border-2 border-transparent border-t-amber-400 border-r-orange-500 border-b-amber-600 animate-[spin_4s_linear_infinite] opacity-90 shadow-[0_0_35px_rgba(245,158,11,0.5)]" />

          {/* Outer Ring 2: Counter-rotating dashed neon ring */}
          <div className="absolute inset-1.5 rounded-full border border-dashed border-amber-300/40 animate-[spin_10s_linear_infinite_reverse]" />

          {/* Glowing particle dots revolving on the orbit */}
          <div className="absolute inset-0 animate-[spin_6s_linear_infinite]">
            <div className="w-3.5 h-3.5 rounded-full bg-amber-300 shadow-[0_0_15px_#f59e0b] -top-1.5 left-1/2 -translate-x-1/2 absolute" />
            <div className="w-2.5 h-2.5 rounded-full bg-orange-400 shadow-[0_0_10px_#f97316] -bottom-1 left-1/2 -translate-x-1/2 absolute" />
          </div>

          {/* Inner Circular Emblem Container */}
          <div className="relative w-44 h-44 sm:w-48 sm:h-48 rounded-full bg-gradient-to-b from-stone-900 to-stone-950 border-2 border-amber-400/80 shadow-[inset_0_0_20px_rgba(245,158,11,0.3)] overflow-hidden flex items-center justify-center p-1.5">
            
            {/* The Logo: pollobroaster.jpg */}
            <div className="w-full h-full rounded-full overflow-hidden relative shadow-inner">
              <img
                src="/pollobroaster.jpg"
                alt="Pollo Broaster Logo"
                className="w-full h-full object-cover rounded-full transform transition-transform duration-700 hover:scale-105"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.onerror = null;
                  target.src = '/api/images/pollobroaster.jpg';
                }}
              />
              <div className="absolute inset-0 rounded-full ring-1 ring-inset ring-amber-500/30 pointer-events-none" />
            </div>

            {/* Chef Hat floating badge on top right */}
            <div className="absolute -top-1 -right-1 w-9 h-9 rounded-full bg-stone-900 border-2 border-amber-400 flex items-center justify-center shadow-lg shadow-amber-500/40">
              <ChefHat className="w-4 h-4 text-amber-400" />
            </div>

            {/* Small est. year pill at bottom */}
            <div className="absolute bottom-1 px-2.5 py-0.5 rounded-full bg-stone-950/90 border border-amber-500/50 flex items-center space-x-1 shadow-md">
              <Sparkles className="w-2.5 h-2.5 text-amber-400" />
              <span className="text-[9px] font-black tracking-widest text-amber-300">EST. 2024</span>
              <Sparkles className="w-2.5 h-2.5 text-amber-400" />
            </div>
          </div>
        </div>

        {/* Restaurant Title & Subtitle */}
        <div className="space-y-1.5">
          <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-white drop-shadow-md">
            TERRENO <span className="bg-gradient-to-r from-amber-400 via-orange-400 to-yellow-300 bg-clip-text text-transparent">BROASTER</span>
          </h1>
          <p className="text-xs sm:text-sm font-semibold text-stone-400 tracking-wider uppercase">
            El Auténtico Pollo Broaster Crujiente • Calidad & Tradición
          </p>
          <div className="flex items-center justify-center space-x-2 pt-0.5 text-xs text-amber-400/90 font-medium">
            <span>Punto de Venta</span>
            <span>•</span>
            <span>Control de Mesas</span>
            <span>•</span>
            <span>KDS Cocina</span>
            <span>•</span>
            <span>Cierre Z (COP)</span>
          </div>
        </div>

      </div>

      {/* Bottom Area: Desfile de Instancias del Programa + Progress Bar */}
      <div className="relative z-10 w-full max-w-4xl flex flex-col items-center space-y-4">
        
        {/* DESFILE DE INSTANCIAS DEL PROGRAMA (Animated System Instances Parade) */}
        <div className="w-full">
          <div className="flex items-center justify-between text-[11px] text-stone-400 font-semibold mb-2 px-1">
            <span className="flex items-center space-x-1.5 text-stone-300">
              <Layers className="w-3.5 h-3.5 text-amber-400" />
              <span>Desfile de Instancias del Sistema:</span>
            </span>
            <span className="font-mono text-amber-400">
              {PROGRAM_INSTANCES.filter((inst) => progressPercent >= inst.startPercent + 8).length} / {PROGRAM_INSTANCES.length} activas
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-1.5 sm:gap-2">
            {PROGRAM_INSTANCES.map((inst) => {
              const isReady = progressPercent >= inst.startPercent + 10;
              const isInitializing = progressPercent >= inst.startPercent && !isReady;
              const IconComp = inst.icon;

              return (
                <div
                  key={inst.id}
                  className={`p-2 rounded-xl border transition-all duration-300 flex flex-col items-center justify-center text-center ${
                    isReady
                      ? 'bg-emerald-950/40 border-emerald-500/40 text-stone-200 shadow-sm shadow-emerald-500/10'
                      : isInitializing
                      ? 'bg-amber-950/40 border-amber-500/60 text-amber-200 animate-pulse shadow-md shadow-amber-500/20'
                      : 'bg-stone-900/40 border-stone-800/60 text-stone-500 opacity-60'
                  }`}
                >
                  <div className="flex items-center space-x-1 mb-1">
                    <IconComp
                      className={`w-3.5 h-3.5 ${
                        isReady
                          ? 'text-emerald-400'
                          : isInitializing
                          ? 'text-amber-400 animate-spin'
                          : 'text-stone-500'
                      }`}
                    />
                    {isReady && <CheckCircle2 className="w-2.5 h-2.5 text-emerald-400" />}
                  </div>
                  <span className="text-[10px] font-bold truncate max-w-full leading-tight">
                    {inst.name}
                  </span>
                  <span className="text-[8px] text-stone-400 truncate max-w-full mt-0.5">
                    {isReady ? 'Listo ✓' : isInitializing ? 'Iniciando...' : 'En cola'}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

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

        {/* Countdown & Direct Entry Button */}
        <div className="w-full flex items-center justify-between pt-1">
          <div className="text-[11px] text-stone-500 flex items-center space-x-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>Base de datos SQLite local segura • <strong>TerrenoBroaster.db</strong></span>
          </div>

          <button
            onClick={handleComplete}
            className="group flex items-center space-x-2 px-5 py-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-stone-950 font-black rounded-xl text-xs shadow-lg shadow-amber-500/25 transition-all hover:scale-105 active:scale-95 cursor-pointer"
          >
            <span>Acceder Ahora</span>
            <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
          </button>
        </div>

      </div>

    </div>
  );
};
