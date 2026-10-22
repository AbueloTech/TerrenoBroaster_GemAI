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
  Armchair
} from 'lucide-react';

export type NavTab = 'pos' | 'comandas' | 'platos' | 'historial' | 'dashboard';

interface NavbarProps {
  currentTab: NavTab;
  onTabChange: (tab: NavTab) => void;
  onOpenDbModal: () => void;
  onOpenGithubModal: () => void;
  onOpenImageModal: () => void;
  cartCount: number;
  totalPlatosCount: number;
  activeComandasCount?: number;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentTab,
  onTabChange,
  onOpenDbModal,
  onOpenGithubModal,
  onOpenImageModal,
  cartCount,
  totalPlatosCount,
  activeComandasCount = 0,
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

          {/* Action Buttons: DB, Images, GitHub */}
          <div className="flex items-center space-x-2">
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
          <button
            onClick={() => onTabChange('dashboard')}
            className={`flex flex-col items-center py-1 px-1.5 ${currentTab === 'dashboard' ? 'text-amber-400 font-bold' : 'text-stone-400'}`}
          >
            <BarChart3 className="w-4 h-4 mb-0.5" />
            <span>Dashboard</span>
          </button>
        </div>
      </div>
    </header>
  );
};
