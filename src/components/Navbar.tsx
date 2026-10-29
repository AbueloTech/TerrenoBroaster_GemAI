import React, { useState, useEffect } from 'react';
import { 
  Menu,
  QrCode,
  Flame,
  User,
  LogIn,
  LogOut,
  Clock,
  Database,
  MessageSquare,
  PanelLeftClose,
  PanelLeftOpen,
} from 'lucide-react';
import { Usuario } from '../types';
import { BrandLogo } from './BrandLogo';

export type NavTab = 'pos' | 'comandas' | 'platos' | 'inventario' | 'historial' | 'dashboard';

interface NavbarProps {
  currentTab: NavTab;
  onTabChange: (tab: NavTab) => void;
  onToggleSidebar: () => void;
  isSidebarExpanded?: boolean;
  onOpenQrModal?: () => void;
  onOpenWhatsAppModal?: () => void;
  onOpenLoginModal?: () => void;
  onLogout?: () => void;
  currentUser?: Usuario | null;
  pendingWhatsAppCount?: number;
  activeComandasCount?: number;
}

const TAB_TITLES: Record<NavTab, string> = {
  pos: 'Punto de Venta',
  comandas: 'Monitor de Cocina & Mesas',
  platos: 'Gestión de Platos',
  inventario: 'Inventario & Escandallos',
  historial: 'Historial de Ventas',
  dashboard: 'Dashboard & Estadísticas',
};

export const Navbar: React.FC<NavbarProps> = ({
  currentTab,
  onTabChange,
  onToggleSidebar,
  isSidebarExpanded = true,
  onOpenQrModal,
  onOpenWhatsAppModal,
  onOpenLoginModal,
  onLogout,
  currentUser,
  pendingWhatsAppCount = 0,
  activeComandasCount = 0,
}) => {
  const [timeStr, setTimeStr] = useState<string>('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTimeStr(
        now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <header className="bg-stone-900 border-b border-stone-800 text-white sticky top-0 z-30 shadow-md">
      <div className="w-full px-3 sm:px-5 lg:px-6">
        <div className="flex items-center justify-between h-16 gap-3">
          
          {/* Left: Sidebar Toggle Button & Brand */}
          <div className="flex items-center space-x-3 sm:space-x-4">
            {/* Sidebar Toggle Button */}
            <button
              onClick={onToggleSidebar}
              title={isSidebarExpanded ? 'Contraer Menú Lateral' : 'Expandir Menú Lateral'}
              className="p-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-amber-400 hover:text-white border border-stone-700 transition-all active:scale-95 cursor-pointer shadow-sm"
              aria-label="Alternar menú lateral"
            >
              {isSidebarExpanded ? (
                <PanelLeftClose className="w-5 h-5" />
              ) : (
                <PanelLeftOpen className="w-5 h-5" />
              )}
            </button>

            {/* Logo & Brand */}
            <div
              className="flex items-center space-x-2.5 cursor-pointer select-none"
              onClick={() => onTabChange('pos')}
            >
              <BrandLogo className="w-9 h-9 sm:w-10 sm:h-10" />
              <div className="hidden sm:block">
                <div className="flex items-center space-x-2">
                  <span className="font-extrabold text-base sm:text-lg tracking-tight text-white">
                    TERRENO <span className="text-amber-400">BROASTER</span>
                  </span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                    POS
                  </span>
                </div>
                <p className="text-[10px] text-stone-400 leading-none">
                  {TAB_TITLES[currentTab]}
                </p>
              </div>
            </div>
          </div>

          {/* Center: Current Section & Database Status Pill */}
          <div className="hidden lg:flex items-center space-x-3">
            <span className="text-xs font-bold text-stone-300 bg-stone-950 px-3 py-1.5 rounded-xl border border-stone-800">
              Vista: <strong className="text-amber-400 ml-1">{TAB_TITLES[currentTab]}</strong>
            </span>

            {/* Active Database Status Indicator */}
            <div className="flex items-center space-x-2 px-3 py-1 rounded-xl bg-emerald-950/60 border border-emerald-500/30 text-emerald-300 text-xs">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="font-semibold text-[11px]">TerrenoBroaster.db</span>
            </div>
          </div>

          {/* Right: Real-time Clock, Direct QR button, WhatsApp & User */}
          <div className="flex items-center space-x-2 sm:space-x-3">
            
            {/* Live Time Clock */}
            {timeStr && (
              <div className="hidden md:flex items-center space-x-1.5 px-3 py-1.5 bg-stone-950 rounded-xl border border-stone-800 text-stone-300 font-mono text-xs shadow-inner">
                <Clock className="w-3.5 h-3.5 text-amber-400" />
                <span>{timeStr}</span>
              </div>
            )}

            {/* Essential Action 1: QR Code Modal Button - Always 1 click away */}
            {onOpenQrModal && (
              <button
                onClick={onOpenQrModal}
                title="Generar, Imprimir o Compartir Código QR para Mesas"
                className="flex items-center space-x-1.5 px-3 py-2 bg-gradient-to-r from-amber-500 via-orange-500 to-amber-400 hover:from-amber-400 hover:to-orange-400 text-stone-950 font-black text-xs rounded-xl shadow-md shadow-amber-500/20 transition-all active:scale-95 cursor-pointer shrink-0"
              >
                <QrCode className="w-4 h-4 text-stone-950" />
                <span className="hidden sm:inline">Código QR</span>
              </button>
            )}

            {/* Essential Action 2: WhatsApp Orders with alert badge */}
            {onOpenWhatsAppModal && (
              <button
                onClick={onOpenWhatsAppModal}
                title="Pedidos WhatsApp del Restaurante"
                className="relative flex items-center space-x-1.5 px-3 py-2 bg-emerald-950/70 hover:bg-emerald-900/80 text-emerald-300 text-xs font-semibold rounded-xl border border-emerald-500/40 transition-all shadow-sm active:scale-95 shrink-0"
              >
                <MessageSquare className="w-4 h-4 text-emerald-400" />
                <span className="hidden sm:inline">WhatsApp</span>
                {pendingWhatsAppCount > 0 && (
                  <span className="flex items-center justify-center px-1.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-500 text-stone-950 animate-pulse shadow-md">
                    {pendingWhatsAppCount}
                  </span>
                )}
              </button>
            )}

            {/* Essential Action 3: User Profile & Session */}
            {currentUser ? (
              <div className="flex items-center space-x-1.5 pl-2 border-l border-stone-800">
                <button
                  type="button"
                  onClick={onOpenLoginModal}
                  title={`Usuario: ${currentUser.Username} (${currentUser.Role || 'Admin'})`}
                  className="flex items-center space-x-1.5 px-2.5 py-1.5 bg-stone-950 hover:bg-stone-800 rounded-xl border border-stone-800 text-xs transition-colors group cursor-pointer"
                >
                  <User className="w-3.5 h-3.5 text-amber-400 group-hover:scale-110 transition-transform" />
                  <span className="font-bold text-stone-200 hidden sm:inline">{currentUser.Username}</span>
                </button>
                {onLogout && (
                  <button
                    onClick={onLogout}
                    title="Cerrar Sesión"
                    className="p-2 rounded-xl bg-stone-800 hover:bg-rose-950/60 hover:text-rose-400 text-stone-400 border border-stone-700 transition-colors"
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                )}
              </div>
            ) : (
              onOpenLoginModal && (
                <div className="pl-1 border-l border-stone-800">
                  <button
                    type="button"
                    onClick={onOpenLoginModal}
                    title="Iniciar Sesión"
                    className="flex items-center space-x-1.5 px-3 py-2 bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs font-bold rounded-xl border border-stone-700 transition-all active:scale-95 cursor-pointer"
                  >
                    <LogIn className="w-3.5 h-3.5 text-amber-400" />
                    <span className="hidden sm:inline">Entrar</span>
                  </button>
                </div>
              )
            )}

          </div>

        </div>
      </div>
    </header>
  );
};
export default Navbar;
