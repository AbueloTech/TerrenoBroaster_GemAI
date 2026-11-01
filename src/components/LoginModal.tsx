import React, { useState, useEffect } from 'react';
import {
  Lock,
  User,
  KeyRound,
  Eye,
  EyeOff,
  ShieldCheck,
  Flame,
  CheckCircle2,
  AlertCircle,
  UserPlus,
  LogIn,
  Sparkles,
  RefreshCw,
  X,
  ChefHat,
  Calculator,
  UtensilsCrossed,
  ShieldAlert,
  ArrowRight,
  Crown,
  Layers,
} from 'lucide-react';
import { sqliteService } from '../db/sqliteService';
import { Usuario, UserRole } from '../types';

interface LoginModalProps {
  isOpen: boolean;
  onLoginSuccess: (user: Usuario) => void;
  onCancel?: () => void;
  canDismiss?: boolean;
}

interface QuickRolePreset {
  role: UserRole;
  username: string;
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  colorClass: string;
  bgClass: string;
  borderClass: string;
}

const QUICK_ROLES: QuickRolePreset[] = [
  {
    role: 'Administrador',
    username: 'admin',
    label: 'Administrador',
    description: 'Acceso Total: POS, Cocina, Platos, Inventario, Cierre Z y Base de Datos',
    icon: Crown,
    colorClass: 'text-amber-400',
    bgClass: 'bg-amber-950/40 hover:bg-amber-950/70',
    borderClass: 'border-amber-500/40 hover:border-amber-400',
  },
  {
    role: 'Cajero',
    username: 'cajero',
    label: 'Cajero',
    description: 'Punto de Venta (POS), Historial de Ventas, Cierre de Caja COP y WhatsApp',
    icon: Calculator,
    colorClass: 'text-emerald-400',
    bgClass: 'bg-emerald-950/40 hover:bg-emerald-950/70',
    borderClass: 'border-emerald-500/40 hover:border-emerald-400',
  },
  {
    role: 'Cocinero',
    username: 'cocina',
    label: 'Cocinero (KDS)',
    description: 'Monitor de Comandas en Cocina y control de tiempos de preparación',
    icon: ChefHat,
    colorClass: 'text-orange-400',
    bgClass: 'bg-orange-950/40 hover:bg-orange-950/70',
    borderClass: 'border-orange-500/40 hover:border-orange-400',
  },
  {
    role: 'Mesero',
    username: 'mesero',
    label: 'Mesero',
    description: 'Toma de pedidos en mesas (POS) y visualización de platos listos',
    icon: UtensilsCrossed,
    colorClass: 'text-sky-400',
    bgClass: 'bg-sky-950/40 hover:bg-sky-950/70',
    borderClass: 'border-sky-500/40 hover:border-sky-400',
  },
];

export const LoginModal: React.FC<LoginModalProps> = ({
  isOpen,
  onLoginSuccess,
  onCancel,
  canDismiss = true,
}) => {
  const [activeTab, setActiveTab] = useState<'quick' | 'credentials' | 'register'>('quick');

  // Form states
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [role, setRole] = useState<UserRole>('Administrador');

  // UI state
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Available users list for quick selection
  const [registeredUsers, setRegisteredUsers] = useState<Usuario[]>([]);

  useEffect(() => {
    if (isOpen) {
      const users = sqliteService.getUsuarios();
      setRegisteredUsers(users);
      setErrorMessage(null);
      setSuccessMessage(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Handle Quick Role Click (Sin Complicaciones)
  const handleQuickLogin = (preset: QuickRolePreset) => {
    setIsSubmitting(true);
    setErrorMessage(null);

    // Try finding registered user for this role or use preset credentials
    const pass = `${preset.username}123`;
    const result = sqliteService.validateUsuario(preset.username, pass);

    setTimeout(() => {
      setIsSubmitting(false);
      if (result.success && result.user) {
        setSuccessMessage(`¡Acceso concedido como ${result.user.Role}: ${result.user.Username}!`);
        setTimeout(() => {
          onLoginSuccess(result.user!);
        }, 350);
      } else {
        // Fallback create/login
        const fallbackUser: Usuario = {
          Id: Math.floor(Math.random() * 1000),
          Username: preset.username,
          Role: preset.role,
        };
        sqliteService.createOrUpdateUsuario(preset.username, pass, preset.role);
        setSuccessMessage(`¡Bienvenido! Entrando como ${preset.role}`);
        setTimeout(() => {
          onLoginSuccess(fallbackUser);
        }, 350);
      }
    }, 250);
  };

  // Handle Standard Login submission
  const handleCredentialsSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!username.trim() || !password.trim()) {
      setErrorMessage('Por favor ingrese su usuario y contraseña.');
      return;
    }

    setIsSubmitting(true);
    const result = sqliteService.validateUsuario(username, password);

    setTimeout(() => {
      setIsSubmitting(false);
      if (result.success && result.user) {
        setSuccessMessage(`¡Bienvenido de nuevo, ${result.user.Username} (${result.user.Role})!`);
        setTimeout(() => {
          onLoginSuccess(result.user!);
        }, 400);
      } else {
        setErrorMessage(result.error || 'Credenciales inválidas. Verifique su usuario o contraseña.');
      }
    }, 300);
  };

  // Handle Register / New User submission
  const handleRegisterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    const cleanUser = username.trim();
    const cleanPass = password.trim();
    const cleanConfirm = confirmPassword.trim();

    if (!cleanUser) {
      setErrorMessage('Debe especificar un nombre de usuario.');
      return;
    }
    if (cleanPass.length < 3) {
      setErrorMessage('La contraseña debe tener al menos 3 caracteres.');
      return;
    }
    if (cleanPass !== cleanConfirm) {
      setErrorMessage('Las contraseñas no coinciden. Por favor verifique ambos campos.');
      return;
    }

    setIsSubmitting(true);
    const result = sqliteService.createOrUpdateUsuario(cleanUser, cleanPass, role);

    setTimeout(() => {
      setIsSubmitting(false);
      if (result.success && result.user) {
        setSuccessMessage(`¡Usuario "${result.user.Username}" guardado en TerrenoBroaster.db!`);
        setRegisteredUsers(sqliteService.getUsuarios());
        setTimeout(() => {
          onLoginSuccess(result.user!);
        }, 500);
      } else {
        setErrorMessage(result.error || 'No se pudo guardar el usuario en la base de datos.');
      }
    }, 350);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 select-none animate-in fade-in duration-200">
      <div className="bg-stone-900 border border-stone-800 rounded-3xl max-w-lg w-full shadow-2xl overflow-hidden flex flex-col transition-all">
        
        {/* Header with Circular Logo and Title */}
        <div className="p-5 sm:p-6 bg-gradient-to-b from-stone-950 via-stone-900 to-stone-900 border-b border-stone-800 text-center relative">
          
          {canDismiss && onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="absolute top-4 right-4 p-2 rounded-xl text-stone-400 hover:text-white hover:bg-stone-800 transition-colors cursor-pointer"
              title="Cerrar ventana"
            >
              <X className="w-5 h-5" />
            </button>
          )}

          {/* Glowing Circular Restaurant Logo */}
          <div className="relative w-20 h-20 mx-auto mb-3 flex items-center justify-center">
            <div className="absolute inset-0 rounded-full bg-amber-500/20 blur-xl animate-pulse" />
            <div className="absolute -inset-0.5 rounded-full border border-amber-400/60 animate-[spin_8s_linear_infinite]" />
            <div className="w-18 h-18 rounded-full overflow-hidden border-2 border-amber-400 shadow-xl shadow-amber-500/25 bg-stone-950 p-0.5">
              <img
                src="/pollobroaster.jpg"
                alt="Logo Terreno Broaster"
                className="w-full h-full object-cover rounded-full"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.onerror = null;
                  target.src = '/api/images/pollobroaster.jpg';
                }}
              />
            </div>
          </div>

          <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
            TERRENO <span className="bg-gradient-to-r from-amber-400 to-orange-400 bg-clip-text text-transparent">BROASTER</span>
          </h2>
          <p className="text-xs text-stone-400 mt-0.5 font-medium">
            Control de Acceso • Sistema de Privilegios por Área
          </p>

          {/* Navigation Tabs */}
          <div className="mt-4 flex bg-stone-950 p-1 rounded-xl border border-stone-800 text-xs font-bold">
            <button
              type="button"
              onClick={() => {
                setActiveTab('quick');
                setErrorMessage(null);
                setSuccessMessage(null);
              }}
              className={`flex-1 py-1.5 rounded-lg flex items-center justify-center space-x-1.5 transition-all cursor-pointer ${
                activeTab === 'quick'
                  ? 'bg-amber-500 text-stone-950 shadow-sm'
                  : 'text-stone-400 hover:text-white'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Acceso Rápido</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveTab('credentials');
                setErrorMessage(null);
                setSuccessMessage(null);
              }}
              className={`flex-1 py-1.5 rounded-lg flex items-center justify-center space-x-1.5 transition-all cursor-pointer ${
                activeTab === 'credentials'
                  ? 'bg-amber-500 text-stone-950 shadow-sm'
                  : 'text-stone-400 hover:text-white'
              }`}
            >
              <KeyRound className="w-3.5 h-3.5" />
              <span>Con Contraseña</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveTab('register');
                setErrorMessage(null);
                setSuccessMessage(null);
              }}
              className={`flex-1 py-1.5 rounded-lg flex items-center justify-center space-x-1.5 transition-all cursor-pointer ${
                activeTab === 'register'
                  ? 'bg-amber-500 text-stone-950 shadow-sm'
                  : 'text-stone-400 hover:text-white'
              }`}
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>Nuevo Usuario</span>
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-5 sm:p-6 space-y-4 max-h-[70vh] overflow-y-auto">
          
          {/* Feedback Alerts */}
          {errorMessage && (
            <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl flex items-start space-x-2 text-xs text-red-300 animate-in fade-in">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {successMessage && (
            <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl flex items-start space-x-2 text-xs text-emerald-300 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* TAB 1: ACCESO RÁPIDO POR ROL (SIN COMPLICACIONES) */}
          {activeTab === 'quick' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs text-stone-400 px-1">
                <span className="font-semibold text-stone-300">Selecciona tu Rol para Ingresar:</span>
                <span className="text-[11px] text-amber-400">1 Clic • Sin Complicaciones</span>
              </div>

              <div className="space-y-2">
                {QUICK_ROLES.map((preset) => {
                  const Icon = preset.icon;
                  return (
                    <button
                      key={preset.role}
                      type="button"
                      disabled={isSubmitting}
                      onClick={() => handleQuickLogin(preset)}
                      className={`w-full p-3 rounded-2xl border text-left flex items-center justify-between transition-all active:scale-[0.99] cursor-pointer ${preset.bgClass} ${preset.borderClass}`}
                    >
                      <div className="flex items-center space-x-3">
                        <div className={`w-10 h-10 rounded-xl bg-stone-900 border border-stone-800 flex items-center justify-center shrink-0 ${preset.colorClass}`}>
                          <Icon className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="flex items-center space-x-2">
                            <span className="font-bold text-sm text-white">{preset.label}</span>
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-stone-900 text-stone-300 border border-stone-800 font-mono">
                              user: {preset.username}
                            </span>
                          </div>
                          <p className="text-[11px] text-stone-400 mt-0.5 leading-snug">
                            {preset.description}
                          </p>
                        </div>
                      </div>
                      <ArrowRight className="w-4 h-4 text-stone-500 group-hover:text-amber-400 shrink-0 ml-2" />
                    </button>
                  );
                })}
              </div>

              {/* Informative privilege summary */}
              <div className="mt-4 p-3 bg-stone-950/70 border border-stone-800 rounded-xl text-[11px] text-stone-400 space-y-1">
                <div className="font-bold text-stone-300 flex items-center space-x-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
                  <span>Mapa de Privilegios del Restaurante:</span>
                </div>
                <div className="grid grid-cols-2 gap-1.5 pt-1 text-[10px]">
                  <div>• <strong>Administrador:</strong> Todo el sistema</div>
                  <div>• <strong>Cajero:</strong> POS, Ventas, Cierre COP</div>
                  <div>• <strong>Cocinero:</strong> Comandas KDS Cocina</div>
                  <div>• <strong>Mesero:</strong> Pedidos en Mesas</div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: INICIO CON CREDENCIALES */}
          {activeTab === 'credentials' && (
            <form onSubmit={handleCredentialsSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-stone-300 mb-1.5">
                  Nombre de Usuario:
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-stone-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="ej: admin, cajero, cocina o mesero"
                    autoFocus
                    className="w-full pl-9 pr-3 py-2.5 bg-stone-950 border border-stone-800 rounded-xl text-stone-100 text-sm focus:outline-none focus:border-amber-500 placeholder-stone-600 font-medium"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-300 mb-1.5">
                  Contraseña:
                </label>
                <div className="relative">
                  <KeyRound className="w-4 h-4 text-stone-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-9 pr-10 py-2.5 bg-stone-950 border border-stone-800 rounded-xl text-stone-100 text-sm focus:outline-none focus:border-amber-500 placeholder-stone-600 font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-500 hover:text-stone-300"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <span className="text-[10px] text-stone-500 mt-1 block">
                  Contraseñas por defecto: <code className="text-amber-400">admin123</code>, <code className="text-amber-400">cajero123</code>, <code className="text-amber-400">cocina123</code>
                </span>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-stone-950 font-black rounded-xl text-sm shadow-lg shadow-amber-500/20 transition-all flex items-center justify-center space-x-2 cursor-pointer disabled:opacity-50"
              >
                {isSubmitting ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <LogIn className="w-4 h-4" />
                    <span>Iniciar Sesión</span>
                  </>
                )}
              </button>
            </form>
          )}

          {/* TAB 3: REGISTRAR / EDITAR USUARIOS */}
          {activeTab === 'register' && (
            <form onSubmit={handleRegisterSubmit} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-stone-300 mb-1">
                  Nombre de Usuario:
                </label>
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="ej: carlos_cajero"
                  className="w-full px-3 py-2 bg-stone-950 border border-stone-800 rounded-xl text-stone-100 text-xs focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-300 mb-1">
                  Rol y Nivel de Privilegios:
                </label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value as UserRole)}
                  className="w-full px-3 py-2 bg-stone-950 border border-stone-800 rounded-xl text-stone-200 text-xs focus:outline-none focus:border-amber-500"
                >
                  <option value="Administrador">Administrador (Acceso Total a todo el POS)</option>
                  <option value="Cajero">Cajero (POS, Ventas, Cierre de Caja COP)</option>
                  <option value="Cocinero">Cocinero (Monitor KDS de Cocina)</option>
                  <option value="Mesero">Mesero (Toma de Pedidos en Mesas)</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-bold text-stone-300 mb-1">
                    Contraseña:
                  </label>
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Mínimo 3 caracteres"
                    className="w-full px-3 py-2 bg-stone-950 border border-stone-800 rounded-xl text-stone-100 text-xs focus:outline-none focus:border-amber-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-stone-300 mb-1">
                    Confirmar Contraseña:
                  </label>
                  <input
                    type="password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Repita la contraseña"
                    className="w-full px-3 py-2 bg-stone-950 border border-stone-800 rounded-xl text-stone-100 text-xs focus:outline-none focus:border-amber-500 font-mono"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-2.5 bg-gradient-to-r from-emerald-600 to-green-500 hover:from-emerald-500 hover:to-green-400 text-stone-950 font-black rounded-xl text-xs shadow-lg shadow-emerald-500/20 transition-all flex items-center justify-center space-x-2 cursor-pointer disabled:opacity-50"
              >
                {isSubmitting ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <UserPlus className="w-4 h-4" />
                    <span>Guardar Usuario en Base de Datos</span>
                  </>
                )}
              </button>
            </form>
          )}

        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-stone-950 border-t border-stone-800 flex items-center justify-between text-[11px] text-stone-400">
          <div className="flex items-center space-x-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>Usuarios protegidos en <strong>TerrenoBroaster.db</strong></span>
          </div>
          <span className="font-mono text-stone-500">
            {registeredUsers.length} usuario{registeredUsers.length !== 1 ? 's' : ''} registrado{registeredUsers.length !== 1 ? 's' : ''}
          </span>
        </div>

      </div>
    </div>
  );
};
