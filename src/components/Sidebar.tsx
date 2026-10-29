import React from 'react';
import {
  ShoppingBag,
  ChefHat,
  ReceiptText,
  UtensilsCrossed,
  BarChart3,
  Database,
  FolderSync,
  Github,
  QrCode,
  Smartphone,
  MessageSquare,
  Volume2,
  Sparkles,
  User,
  LogIn,
  LogOut,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Flame,
  CheckCircle2,
  SlidersHorizontal,
  X,
  Package,
} from 'lucide-react';
import { NavTab } from './Navbar';
import { Usuario } from '../types';
import { BrandLogo } from './BrandLogo';

interface SidebarProps {
  currentTab: NavTab;
  onTabChange: (tab: NavTab) => void;
  isExpanded: boolean;
  onToggleExpanded: () => void;
  isMobileOpen: boolean;
  onCloseMobile: () => void;
  onOpenDbModal: () => void;
  onOpenGithubModal: () => void;
  onOpenImageModal: () => void;
  onOpenWhatsAppModal: () => void;
  onOpenAlertSettingsModal?: () => void;
  onOpenCustomerMenu?: () => void;
  onOpenQrModal?: () => void;
  onOpenLoginModal?: () => void;
  onShowSplash?: () => void;
  onLogout?: () => void;
  currentUser?: Usuario | null;
  cartCount: number;
  totalPlatosCount: number;
  activeComandasCount?: number;
  pendingWhatsAppCount?: number;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  onTabChange,
  isExpanded,
  onToggleExpanded,
  isMobileOpen,
  onCloseMobile,
  onOpenDbModal,
  onOpenGithubModal,
  onOpenImageModal,
  onOpenWhatsAppModal,
  onOpenAlertSettingsModal,
  onOpenCustomerMenu,
  onOpenQrModal,
  onOpenLoginModal,
  onShowSplash,
  onLogout,
  currentUser,
  cartCount,
  totalPlatosCount,
  activeComandasCount = 0,
  pendingWhatsAppCount = 0,
}) => {
  const handleNavClick = (tab: NavTab) => {
    onTabChange(tab);
    if (isMobileOpen) {
      onCloseMobile();
    }
  };

  const handleActionClick = (action: () => void) => {
    action();
    if (isMobileOpen) {
      onCloseMobile();
    }
  };

  return (
    <>
      {/* Mobile Backdrop Overlay */}
      {isMobileOpen && (
        <div
          onClick={onCloseMobile}
          className="fixed inset-0 z-40 bg-black/70 backdrop-blur-xs md:hidden animate-in fade-in duration-200"
        />
      )}

      {/* Main Sidebar Container */}
      <aside
        className={`fixed md:sticky top-0 left-0 z-50 md:z-20 h-screen bg-stone-900 border-r border-stone-800 flex flex-col transition-all duration-300 ease-in-out shadow-2xl select-none ${
          isExpanded ? 'w-64' : 'w-20'
        } ${isMobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}
      >
        {/* Sidebar Header / Brand Header in Expanded mode */}
        <div className="h-16 border-b border-stone-800 flex items-center justify-between px-3 sm:px-4 bg-stone-950/80 shrink-0">
          <div
            onClick={() => handleNavClick('pos')}
            className="flex items-center space-x-2.5 cursor-pointer overflow-hidden"
          >
            <BrandLogo className="w-9 h-9" />
            {isExpanded && (
              <div className="truncate">
                <span className="font-extrabold text-sm sm:text-base tracking-tight text-white block leading-tight">
                  TERRENO <span className="text-amber-400">BROASTER</span>
                </span>
                <span className="text-[10px] text-stone-400 block leading-tight">
                  POS & Menú Digital
                </span>
              </div>
            )}
          </div>

          {/* Mobile close button */}
          <button
            onClick={onCloseMobile}
            className="md:hidden text-stone-400 hover:text-white p-1 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Navigation Options and Suboptions */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden p-2.5 space-y-4 scrollbar-thin">
          
          {/* GRUPO 1: OPERACIONES POS */}
          <div className="space-y-1">
            {isExpanded && (
              <div className="px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-amber-400/90 flex items-center justify-between">
                <span>Operaciones POS</span>
              </div>
            )}

            {/* 1.1 Punto de Venta */}
            <button
              onClick={() => handleNavClick('pos')}
              title="Punto de Venta (Caja & Pedidos)"
              className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all group ${
                currentTab === 'pos'
                  ? 'bg-amber-500 text-stone-950 font-black shadow-md shadow-amber-500/20'
                  : 'text-stone-300 hover:text-white hover:bg-stone-800'
              }`}
            >
              <div className="relative shrink-0">
                <ShoppingBag className="w-5 h-5" />
                {cartCount > 0 && !isExpanded && (
                  <span className="absolute -top-1.5 -right-2 bg-amber-400 text-stone-950 text-[10px] font-black w-4 h-4 rounded-full flex items-center justify-center">
                    {cartCount}
                  </span>
                )}
              </div>
              {isExpanded && (
                <div className="flex-1 flex items-center justify-between overflow-hidden">
                  <span className="truncate">Punto de Venta</span>
                  {cartCount > 0 && (
                    <span className="ml-2 bg-stone-950 text-amber-400 font-mono font-black text-xs px-2 py-0.5 rounded-full">
                      {cartCount}
                    </span>
                  )}
                </div>
              )}
            </button>

            {/* 1.2 Comandas & Cocina */}
            <button
              onClick={() => handleNavClick('comandas')}
              title="Monitor de Cocina y Mesas"
              className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all group ${
                currentTab === 'comandas'
                  ? 'bg-amber-500 text-stone-950 font-black shadow-md shadow-amber-500/20'
                  : 'text-stone-300 hover:text-white hover:bg-stone-800'
              }`}
            >
              <div className="relative shrink-0">
                <ChefHat className="w-5 h-5" />
                {activeComandasCount > 0 && !isExpanded && (
                  <span className="absolute -top-1.5 -right-2 bg-amber-400 text-stone-950 text-[10px] font-black w-4 h-4 rounded-full flex items-center justify-center animate-pulse">
                    {activeComandasCount}
                  </span>
                )}
              </div>
              {isExpanded && (
                <div className="flex-1 flex items-center justify-between overflow-hidden">
                  <span className="truncate">Comandas & Mesas</span>
                  {activeComandasCount > 0 && (
                    <span className="ml-2 bg-amber-400/20 text-amber-300 border border-amber-400/40 font-mono font-black text-xs px-2 py-0.5 rounded-full animate-pulse">
                      {activeComandasCount} activas
                    </span>
                  )}
                </div>
              )}
            </button>

            {/* 1.3 Historial de Ventas */}
            <button
              onClick={() => handleNavClick('historial')}
              title="Historial de Ventas y Tickets"
              className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all group ${
                currentTab === 'historial'
                  ? 'bg-amber-500 text-stone-950 font-black shadow-md shadow-amber-500/20'
                  : 'text-stone-300 hover:text-white hover:bg-stone-800'
              }`}
            >
              <ReceiptText className="w-5 h-5 shrink-0" />
              {isExpanded && <span className="truncate">Historial Ventas</span>}
            </button>
          </div>

          <div className="border-t border-stone-800/80 my-1" />

          {/* GRUPO 2: MENÚ DIGITAL & CLIENTES */}
          <div className="space-y-1">
            {isExpanded && (
              <div className="px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-amber-400/90 flex items-center justify-between">
                <span>Menú & Clientes</span>
              </div>
            )}

            {/* 2.1 Platos */}
            <button
              onClick={() => handleNavClick('platos')}
              title="Catálogo y Gestión de Platos"
              className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all group ${
                currentTab === 'platos'
                  ? 'bg-amber-500 text-stone-950 font-black shadow-md shadow-amber-500/20'
                  : 'text-stone-300 hover:text-white hover:bg-stone-800'
              }`}
            >
              <UtensilsCrossed className="w-5 h-5 shrink-0" />
              {isExpanded && (
                <div className="flex-1 flex items-center justify-between overflow-hidden">
                  <span className="truncate">Gestión Platos</span>
                  <span className="text-xs px-2 py-0.5 rounded-md bg-stone-800 text-stone-400 font-mono">
                    {totalPlatosCount}
                  </span>
                </div>
              )}
            </button>

            {/* 2.2 Inventario & Escandallos */}
            <button
              onClick={() => handleNavClick('inventario')}
              title="Inventario de Insumos, Recetas (Food Cost), Proveedores y Kardex"
              className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all group ${
                currentTab === 'inventario'
                  ? 'bg-amber-500 text-stone-950 font-black shadow-md shadow-amber-500/20'
                  : 'text-stone-300 hover:text-white hover:bg-stone-800'
              }`}
            >
              <Package className="w-5 h-5 shrink-0" />
              {isExpanded && (
                <div className="flex-1 flex items-center justify-between overflow-hidden">
                  <span className="truncate">Inventario & Costos</span>
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                    Kardex
                  </span>
                </div>
              )}
            </button>

            {/* 2.2 Código QR de Mesas */}
            {onOpenQrModal && (
              <button
                onClick={() => handleActionClick(onOpenQrModal)}
                title="Generar, Imprimir o Compartir Código QR para Clientes"
                className="w-full flex items-center space-x-3 px-3 py-2.5 rounded-xl text-xs sm:text-sm font-semibold text-stone-300 hover:text-amber-400 hover:bg-stone-800 transition-all group"
              >
                <QrCode className="w-5 h-5 text-amber-400 shrink-0 group-hover:scale-110 transition-transform" />
                {isExpanded && (
                  <div className="flex-1 flex items-center justify-between overflow-hidden">
                    <span className="truncate">Código QR Mesas</span>
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                      QR
                    </span>
                  </div>
                )}
              </button>
            )}

            {/* 2.3 Menú Digital Online en Vivo */}
            {onOpenCustomerMenu && (
              <button
                onClick={() => handleActionClick(onOpenCustomerMenu)}
                title="Ver Aplicación del Menú Digital en vivo (Vista Cliente)"
                className="w-full flex items-center space-x-3 px-3 py-2.5 rounded-xl text-xs sm:text-sm font-semibold text-stone-300 hover:text-amber-400 hover:bg-stone-800 transition-all group"
              >
                <Smartphone className="w-5 h-5 text-amber-400 shrink-0 group-hover:scale-110 transition-transform" />
                {isExpanded && (
                  <div className="flex-1 flex items-center justify-between overflow-hidden">
                    <span className="truncate">Menú Digital App</span>
                    <ExternalLink className="w-3.5 h-3.5 text-stone-500 group-hover:text-amber-400" />
                  </div>
                )}
              </button>
            )}

            {/* 2.4 Vincular Carpeta Fotos */}
            <button
              onClick={() => handleActionClick(onOpenImageModal)}
              title="Vincular Carpeta de Imágenes Locales ('img\')"
              className="w-full flex items-center space-x-3 px-3 py-2.5 rounded-xl text-xs sm:text-sm font-semibold text-stone-300 hover:text-amber-400 hover:bg-stone-800 transition-all group"
            >
              <FolderSync className="w-5 h-5 text-amber-400 shrink-0 group-hover:scale-110 transition-transform" />
              {isExpanded && <span className="truncate">Carpeta Fotos ('img\')</span>}
            </button>
          </div>

          <div className="border-t border-stone-800/80 my-1" />

          {/* GRUPO 3: PEDIDOS WHATSAPP & ALERTAS */}
          <div className="space-y-1">
            {isExpanded && (
              <div className="px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-emerald-400/90 flex items-center justify-between">
                <span>WhatsApp & Avisos</span>
              </div>
            )}

            {/* 3.1 Pedidos WhatsApp */}
            <button
              onClick={() => handleActionClick(onOpenWhatsAppModal)}
              title="Bandeja de Pedidos WhatsApp del Restaurante"
              className="w-full flex items-center space-x-3 px-3 py-2.5 rounded-xl text-xs sm:text-sm font-semibold text-stone-300 hover:text-emerald-300 hover:bg-emerald-950/40 border border-transparent hover:border-emerald-500/30 transition-all group"
            >
              <div className="relative shrink-0">
                <MessageSquare className="w-5 h-5 text-emerald-400" />
                {pendingWhatsAppCount > 0 && !isExpanded && (
                  <span className="absolute -top-1.5 -right-2 bg-emerald-500 text-stone-950 text-[10px] font-black w-4 h-4 rounded-full flex items-center justify-center animate-pulse">
                    {pendingWhatsAppCount}
                  </span>
                )}
              </div>
              {isExpanded && (
                <div className="flex-1 flex items-center justify-between overflow-hidden">
                  <span className="truncate">Pedidos WhatsApp</span>
                  {pendingWhatsAppCount > 0 && (
                    <span className="ml-2 bg-emerald-500 text-stone-950 font-black text-xs px-2 py-0.5 rounded-full animate-pulse shadow-md">
                      {pendingWhatsAppCount}
                    </span>
                  )}
                </div>
              )}
            </button>

            {/* 3.2 Alertas & Sonido */}
            {onOpenAlertSettingsModal && (
              <button
                onClick={() => handleActionClick(onOpenAlertSettingsModal)}
                title="Configurar Volumen y Sonidos de Alerta"
                className="w-full flex items-center space-x-3 px-3 py-2.5 rounded-xl text-xs sm:text-sm font-semibold text-stone-300 hover:text-emerald-300 hover:bg-stone-800 transition-all group"
              >
                <Volume2 className="w-5 h-5 text-emerald-400 shrink-0 group-hover:scale-110 transition-transform" />
                {isExpanded && <span className="truncate">Alertas & Sonido</span>}
              </button>
            )}
          </div>

          <div className="border-t border-stone-800/80 my-1" />

          {/* GRUPO 4: ADMINISTRACIÓN & SISTEMA */}
          <div className="space-y-1">
            {isExpanded && (
              <div className="px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-stone-400 flex items-center justify-between">
                <span>Administración</span>
              </div>
            )}

            {/* 4.1 Base de Datos SQLite */}
            <button
              onClick={() => handleActionClick(onOpenDbModal)}
              title="Administrador de Base de Datos SQLite (TerrenoBroaster.db)"
              className="w-full flex items-center space-x-3 px-3 py-2.5 rounded-xl text-xs sm:text-sm font-semibold text-stone-300 hover:text-emerald-400 hover:bg-stone-800 transition-all group"
            >
              <Database className="w-5 h-5 text-emerald-400 shrink-0 group-hover:scale-110 transition-transform" />
              {isExpanded && (
                <div className="flex-1 flex items-center justify-between overflow-hidden">
                  <span className="truncate">SQLite .db</span>
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
                </div>
              )}
            </button>

            {/* 4.2 Dashboard & Analíticas */}
            <button
              onClick={() => handleNavClick('dashboard')}
              title="Dashboard y Estadísticas de Ventas"
              className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all group ${
                currentTab === 'dashboard'
                  ? 'bg-amber-500 text-stone-950 font-black shadow-md shadow-amber-500/20'
                  : 'text-stone-300 hover:text-white hover:bg-stone-800'
              }`}
            >
              <BarChart3 className="w-5 h-5 shrink-0" />
              {isExpanded && <span className="truncate">Dashboard</span>}
            </button>

            {/* 4.3 GitHub Respaldo */}
            <button
              onClick={() => handleActionClick(onOpenGithubModal)}
              title="Copia de Respaldo y Código en GitHub"
              className="w-full flex items-center space-x-3 px-3 py-2.5 rounded-xl text-xs sm:text-sm font-semibold text-stone-300 hover:text-white hover:bg-stone-800 transition-all group"
            >
              <Github className="w-5 h-5 text-stone-400 shrink-0 group-hover:scale-110 transition-transform" />
              {isExpanded && <span className="truncate">Respaldo GitHub</span>}
            </button>

            {/* 4.4 Pantalla Splash */}
            {onShowSplash && (
              <button
                onClick={() => handleActionClick(onShowSplash)}
                title="Mostrar Pantalla de Bienvenida (Splash)"
                className="w-full flex items-center space-x-3 px-3 py-2.5 rounded-xl text-xs sm:text-sm font-semibold text-stone-300 hover:text-amber-300 hover:bg-stone-800 transition-all group"
              >
                <Sparkles className="w-5 h-5 text-amber-400 shrink-0 group-hover:scale-110 transition-transform" />
                {isExpanded && <span className="truncate">Pantalla Splash</span>}
              </button>
            )}

            {/* 4.5 Usuario / Login */}
            {currentUser ? (
              <div className="pt-1">
                <button
                  type="button"
                  onClick={() => onOpenLoginModal && handleActionClick(onOpenLoginModal)}
                  title={`Usuario: ${currentUser.Username} (${currentUser.Role || 'Admin'})`}
                  className="w-full flex items-center space-x-3 px-3 py-2.5 rounded-xl text-xs font-semibold bg-stone-950 border border-stone-800 text-stone-300 hover:border-amber-500/40 transition-all group"
                >
                  <User className="w-5 h-5 text-amber-400 shrink-0" />
                  {isExpanded && (
                    <div className="flex-1 flex items-center justify-between overflow-hidden">
                      <div className="truncate text-left">
                        <span className="font-bold text-white block truncate">{currentUser.Username}</span>
                        <span className="text-[10px] text-amber-400 block">{currentUser.Role || 'Admin'}</span>
                      </div>
                      {onLogout && (
                        <span
                          onClick={(e) => {
                            e.stopPropagation();
                            onLogout();
                          }}
                          title="Cerrar Sesión"
                          className="p-1 rounded hover:bg-rose-950/60 text-stone-400 hover:text-rose-400 transition-colors"
                        >
                          <LogOut className="w-4 h-4" />
                        </span>
                      )}
                    </div>
                  )}
                </button>
              </div>
            ) : (
              onOpenLoginModal && (
                <button
                  type="button"
                  onClick={() => handleActionClick(onOpenLoginModal)}
                  title="Iniciar Sesión"
                  className="w-full flex items-center space-x-3 px-3 py-2.5 rounded-xl text-xs sm:text-sm font-bold bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 transition-all group"
                >
                  <LogIn className="w-5 h-5 text-amber-400 shrink-0" />
                  {isExpanded && <span className="truncate">Iniciar Sesión</span>}
                </button>
              )
            )}
          </div>
        </div>

        {/* Sidebar Footer: Retract/Expand Toggle Button */}
        <div className="p-3 border-t border-stone-800 bg-stone-950/90 shrink-0 flex items-center justify-between">
          <button
            type="button"
            onClick={onToggleExpanded}
            title={isExpanded ? 'Contraer menú lateral' : 'Expandir menú lateral'}
            className="w-full flex items-center justify-center space-x-2 py-2 px-3 rounded-xl bg-stone-800/80 hover:bg-stone-800 text-stone-300 hover:text-white border border-stone-700/60 transition-all text-xs font-semibold active:scale-95 cursor-pointer"
          >
            {isExpanded ? (
              <>
                <ChevronLeft className="w-4 h-4 text-amber-400 shrink-0" />
                <span className="truncate">Contraer Menú</span>
              </>
            ) : (
              <ChevronRight className="w-4 h-4 text-amber-400 shrink-0" />
            )}
          </button>
        </div>
      </aside>
    </>
  );
};
export default Sidebar;
