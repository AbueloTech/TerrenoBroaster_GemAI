import React from 'react';
import { 
  ShoppingBag, 
  UtensilsCrossed, 
  ReceiptText, 
  BarChart3, 
  Database, 
  FolderSync, 
  Github, 
  Flame,
  ChefHat,
  Armchair,
  User,
  LogOut,
  LogIn,
  Sparkles,
  MessageSquare,
  Volume2,
  Smartphone,
  QrCode,
} from 'lucide-react';
import { Usuario } from '../types';

export type NavTab = 'pos' | 'comandas' | 'platos' | 'historial' | 'dashboard';

interface NavbarProps {
  currentTab: NavTab;
  onTabChange: (tab: NavTab) => void;
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

export const Navbar: React.FC<NavbarProps> = ({
  currentTab,
  onTabChange,
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
  return (
    <header className="bg-stone-900 border-b border-stone-800 text-white sticky top-0 z-30 shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          
          {/* Logo & Brand */}
          <div className="flex items-center space-x-3 cursor-pointer" onClick={() => onTabChange('pos')}>
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-600 via-orange-500 to-amber-400 flex items-center justify-center shadow-lg shadow-amber-500/30">
              <Flame className="w-6 h-6 text-stone-950 font-black animate-pulse" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-extrabold text-lg sm:text-xl tracking-tight text-white">
                  TERRENO <span className="text-amber-400">BROASTER</span>
                </span>
                <span className="hidden md:inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  POS & Mesas
                </span>
              </div>
              <p className="text-[10px] text-stone-400 leading-none">TerrenoBroaster.db • Sistema de Restaurante</p>
            </div>
          </div>

          {/* Navigation Tabs */}
          <nav className="hidden md:flex items-center space-x-1 lg:space-x-1.5">
            {/* POS */}
            <button
              onClick={() => onTabChange('pos')}
              className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                currentTab === 'pos'
                  ? 'bg-amber-500 text-stone-950 font-bold shadow-sm'
                  : 'text-stone-300 hover:text-white hover:bg-stone-800'
              }`}
            >
              <ShoppingBag className="w-4 h-4" />
              <span>Punto de Venta</span>
              {cartCount > 0 && (
                <span className="ml-1 bg-stone-900 text-amber-400 font-bold text-xs px-2 py-0.5 rounded-full">
                  {cartCount}
                </span>
              )}
            </button>

            {/* COMANDAS & COCINA */}
            <button
              onClick={() => onTabChange('comandas')}
              className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                currentTab === 'comandas'
                  ? 'bg-amber-500 text-stone-950 font-bold shadow-sm'
                  : 'text-stone-300 hover:text-white hover:bg-stone-800'
              }`}
            >
              <ChefHat className="w-4 h-4" />
              <span>Comandas & Mesas</span>
              {activeComandasCount > 0 && (
                <span className="ml-1 bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold text-xs px-2 py-0.5 rounded-full animate-pulse">
                  {activeComandasCount}
                </span>
              )}
            </button>

            {/* PLATOS */}
            <button
              onClick={() => onTabChange('platos')}
              className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                currentTab === 'platos'
                  ? 'bg-amber-500 text-stone-950 font-bold shadow-sm'
                  : 'text-stone-300 hover:text-white hover:bg-stone-800'
              }`}
            >
              <UtensilsCrossed className="w-4 h-4" />
              <span>Platos</span>
              <span className="text-xs px-1.5 py-0.5 rounded bg-stone-800 text-stone-400">
                {totalPlatosCount}
              </span>
            </button>

            {/* HISTORIAL */}
            <button
              onClick={() => onTabChange('historial')}
              className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                currentTab === 'historial'
                  ? 'bg-amber-500 text-stone-950 font-bold shadow-sm'
                  : 'text-stone-300 hover:text-white hover:bg-stone-800'
              }`}
            >
              <ReceiptText className="w-4 h-4" />
              <span>Historial</span>
            </button>

            {/* DASHBOARD */}
            <button
              onClick={() => onTabChange('dashboard')}
              className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                currentTab === 'dashboard'
                  ? 'bg-amber-500 text-stone-950 font-bold shadow-sm'
                  : 'text-stone-300 hover:text-white hover:bg-stone-800'
              }`}
            >
              <BarChart3 className="w-4 h-4" />
              <span>Dashboard</span>
            </button>
          </nav>

          {/* Action Buttons: DB, Images, GitHub, Splash, User & Logout */}
          <div className="flex items-center space-x-2">
            <button
              onClick={onShowSplash}
              title="Ver pantalla de bienvenida (Splash)"
              className="flex items-center space-x-1.5 px-2.5 py-1.5 bg-stone-800 hover:bg-stone-700 text-amber-300 text-xs font-semibold rounded-lg border border-amber-500/30 transition-colors"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden xl:inline">Splash</span>
            </button>

            {/* Direct QR Code Modal Trigger - Highly visible */}
            {onOpenQrModal && (
              <button
                onClick={onOpenQrModal}
                title="Ver, descargar o imprimir Código QR del Menú Digital para mesas y clientes"
                className="flex items-center space-x-1.5 px-3 py-1.5 bg-gradient-to-r from-amber-500 via-orange-500 to-amber-400 hover:from-amber-400 hover:to-orange-300 text-stone-950 font-black text-xs rounded-xl shadow-md shadow-amber-500/30 transition-all active:scale-95"
              >
                <QrCode className="w-4 h-4 text-stone-950" />
                <span>Código QR</span>
              </button>
            )}

            {/* Customer Digital Menu Mobile View Preview */}
            {onOpenCustomerMenu && (
              <button
                onClick={onOpenCustomerMenu}
                title="Abrir Menú Digital Móvil con Carrito para Clientes"
                className="flex items-center space-x-1.5 px-2.5 py-1.5 bg-amber-600/20 hover:bg-amber-600/30 text-amber-300 text-xs font-semibold rounded-lg border border-amber-500/40 transition-colors"
              >
                <Smartphone className="w-3.5 h-3.5 text-amber-400" />
                <span className="hidden sm:inline">Menú Digital</span>
              </button>
            )}

            {/* WhatsApp Orders & Alert Button */}
            <button
              onClick={onOpenWhatsAppModal}
              title="Pedidos WhatsApp del Restaurante"
              className="relative flex items-center space-x-1.5 px-2.5 py-1.5 bg-emerald-950/70 hover:bg-emerald-900/80 text-emerald-300 text-xs font-semibold rounded-lg border border-emerald-500/40 transition-all shadow-sm active:scale-95"
            >
              <MessageSquare className="w-3.5 h-3.5 text-emerald-400" />
              <span className="hidden sm:inline">WhatsApp</span>
              {pendingWhatsAppCount > 0 && (
                <span className="flex items-center justify-center px-1.5 py-0.2 rounded-full text-[10px] font-black bg-emerald-500 text-stone-950 animate-pulse shadow-md">
                  {pendingWhatsAppCount}
                </span>
              )}
            </button>

            {/* Sound & Alert Settings Button */}
            {onOpenAlertSettingsModal && (
              <button
                onClick={onOpenAlertSettingsModal}
                title="Configurar Volumen y Sonidos de Alerta WhatsApp"
                className="flex items-center space-x-1 px-2.5 py-1.5 bg-stone-800 hover:bg-stone-700 text-stone-300 hover:text-emerald-400 text-xs font-semibold rounded-lg border border-stone-700 transition-colors"
              >
                <Volume2 className="w-3.5 h-3.5 text-emerald-400" />
                <span className="hidden xl:inline">Sonido</span>
              </button>
            )}

            <button
              onClick={onOpenImageModal}
              title="Vincular Carpeta de Imágenes (C:\...\img)"
              className="flex items-center space-x-1.5 px-2.5 py-1.5 bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs font-medium rounded-lg border border-stone-700 transition-colors"
            >
              <FolderSync className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden sm:inline">Carpeta img</span>
            </button>

            <button
              onClick={onOpenDbModal}
              title="Administrar SQLite TerrenoBroaster.db"
              className="flex items-center space-x-1.5 px-2.5 py-1.5 bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs font-medium rounded-lg border border-stone-700 transition-colors"
            >
              <Database className="w-3.5 h-3.5 text-emerald-400" />
              <span className="hidden sm:inline">SQLite .db</span>
            </button>

            <button
              onClick={onOpenGithubModal}
              title="Subir código a GitHub"
              className="flex items-center space-x-1.5 px-2.5 py-1.5 bg-amber-600/20 hover:bg-amber-600/30 text-amber-300 text-xs font-semibold rounded-lg border border-amber-500/40 transition-colors"
            >
              <Github className="w-3.5 h-3.5" />
              <span className="hidden lg:inline">GitHub</span>
            </button>

            {/* User Session & Login Entry */}
            {currentUser ? (
              <div className="flex items-center space-x-1 pl-1 border-l border-stone-800">
                <button
                  type="button"
                  onClick={onOpenLoginModal}
                  title="Gestionar credenciales o cambiar usuario (Login)"
                  className="hidden sm:flex items-center space-x-1.5 px-2.5 py-1.5 bg-stone-950 hover:bg-stone-800 rounded-lg border border-stone-800 text-xs transition-colors group cursor-pointer"
                >
                  <User className="w-3.5 h-3.5 text-amber-400 group-hover:scale-110 transition-transform" />
                  <span className="font-bold text-stone-200">{currentUser.Username}</span>
                  <span className="text-[10px] text-amber-300/80 bg-amber-500/10 px-1 py-0.2 rounded font-medium">
                    {currentUser.Role || 'Admin'}
                  </span>
                </button>
                {onLogout && (
                  <button
                    onClick={onLogout}
                    title="Cerrar Sesión"
                    className="p-1.5 rounded-lg bg-stone-800 hover:bg-rose-950/60 hover:text-rose-400 text-stone-400 border border-stone-700 transition-colors"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            ) : (
              <div className="pl-1 border-l border-stone-800">
                <button
                  type="button"
                  onClick={onOpenLoginModal}
                  title="Abrir ventana de Login / Iniciar Sesión"
                  className="flex items-center space-x-1.5 px-3 py-1.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-stone-950 font-black text-xs rounded-xl shadow-md shadow-amber-500/20 transition-all active:scale-95 cursor-pointer"
                >
                  <LogIn className="w-3.5 h-3.5" />
                  <span>Iniciar Sesión</span>
                </button>
              </div>
            )}
          </div>

        </div>

        {/* Mobile Navigation bar */}
        <div className="flex md:hidden items-center justify-around py-2 border-t border-stone-800 text-[11px]">
          <button
            onClick={() => onTabChange('pos')}
            className={`flex flex-col items-center py-1 px-1.5 ${currentTab === 'pos' ? 'text-amber-400 font-bold' : 'text-stone-400'}`}
          >
            <ShoppingBag className="w-4 h-4 mb-0.5" />
            <span>POS ({cartCount})</span>
          </button>
          <button
            onClick={() => onTabChange('comandas')}
            className={`flex flex-col items-center py-1 px-1.5 ${currentTab === 'comandas' ? 'text-amber-400 font-bold' : 'text-stone-400'}`}
          >
            <ChefHat className="w-4 h-4 mb-0.5" />
            <span>Cocina ({activeComandasCount})</span>
          </button>
          {onOpenQrModal && (
            <button
              onClick={onOpenQrModal}
              className="flex flex-col items-center py-1 px-1.5 text-amber-400 font-bold"
            >
              <QrCode className="w-4 h-4 mb-0.5 text-amber-400" />
              <span>Código QR</span>
            </button>
          )}
          <button
            onClick={onOpenWhatsAppModal}
            className="flex flex-col items-center py-1 px-1.5 text-emerald-400 relative"
          >
            <div className="relative">
              <MessageSquare className="w-4 h-4 mb-0.5" />
              {pendingWhatsAppCount > 0 && (
                <span className="absolute -top-1 -right-2 bg-emerald-500 text-stone-950 font-black text-[9px] w-3.5 h-3.5 rounded-full flex items-center justify-center animate-pulse">
                  {pendingWhatsAppCount}
                </span>
              )}
            </div>
            <span>WhatsApp</span>
          </button>
          <button
            onClick={() => onTabChange('platos')}
            className={`flex flex-col items-center py-1 px-1.5 ${currentTab === 'platos' ? 'text-amber-400 font-bold' : 'text-stone-400'}`}
          >
            <UtensilsCrossed className="w-4 h-4 mb-0.5" />
            <span>Platos</span>
          </button>
          <button
            onClick={() => onTabChange('historial')}
            className={`flex flex-col items-center py-1 px-1.5 ${currentTab === 'historial' ? 'text-amber-400 font-bold' : 'text-stone-400'}`}
          >
            <ReceiptText className="w-4 h-4 mb-0.5" />
            <span>Historial</span>
          </button>
          {onOpenLoginModal && (
            <button
              onClick={onOpenLoginModal}
              className="flex flex-col items-center py-1 px-1.5 text-amber-400 font-semibold"
            >
              <User className="w-4 h-4 mb-0.5" />
              <span>{currentUser ? currentUser.Username.substring(0, 7) : 'Login'}</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
