import React, { useState, useEffect, useRef } from 'react';
import {
  Lock,
  User,
  KeyRound,
  Eye,
  EyeOff,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  UserPlus,
  LogIn,
  RefreshCw,
  X,
  Crown,
  Calculator,
  ChefHat,
  UtensilsCrossed,
} from 'lucide-react';
import { sqliteService } from '../db/sqliteService';
import { Usuario, UserRole } from '../types';

interface LoginModalProps {
  isOpen: boolean;
  onLoginSuccess: (user: Usuario) => void;
  onCancel?: () => void;
  canDismiss?: boolean;
}

interface AccountHint {
  username: string;
  role: UserRole;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  colorClass: string;
}

const DEFAULT_ACCOUNTS: AccountHint[] = [
  {
    username: 'admin',
    role: 'Administrador',
    label: 'Administrador',
    icon: Crown,
    colorClass: 'text-amber-400 border-amber-500/40 bg-amber-500/10',
  },
  {
    username: 'cajero',
    role: 'Cajero',
    label: 'Cajero',
    icon: Calculator,
    colorClass: 'text-emerald-400 border-emerald-500/40 bg-emerald-500/10',
  },
  {
    username: 'cocina',
    role: 'Cocinero',
    label: 'Cocina (KDS)',
    icon: ChefHat,
    colorClass: 'text-orange-400 border-orange-500/40 bg-orange-500/10',
  },
  {
    username: 'mesero',
    role: 'Mesero',
    label: 'Mesero',
    icon: UtensilsCrossed,
    colorClass: 'text-sky-400 border-sky-500/40 bg-sky-500/10',
  },
];

export const LoginModal: React.FC<LoginModalProps> = ({
  isOpen,
  onLoginSuccess,
  onCancel,
  canDismiss = true,
}) => {
  const [activeTab, setActiveTab] = useState<'login' | 'register'>('login');

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

  const passwordInputRef = useRef<HTMLInputElement>(null);

  // Available users list from SQLite
  const [registeredUsers, setRegisteredUsers] = useState<Usuario[]>([]);

  useEffect(() => {
    if (isOpen) {
      const users = sqliteService.getUsuarios();
      setRegisteredUsers(users);
      setErrorMessage(null);
      setSuccessMessage(null);
      setPassword('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Select an account hint: Fills the username and focuses password field (Password is REQUIRED!)
  const handleSelectAccountHint = (account: AccountHint) => {
    setUsername(account.username);
    setPassword('');
    setErrorMessage(null);
    setSuccessMessage(null);
    setTimeout(() => {
      passwordInputRef.current?.focus();
    }, 50);
  };

  // Handle Standard Login submission (STRICT: Password required & verified via SQLite)
  const handleCredentialsSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    const cleanUser = username.trim();
    const cleanPass = password.trim();

    if (!cleanUser) {
      setErrorMessage('Por favor ingrese su nombre de usuario.');
      return;
    }
    if (!cleanPass) {
      setErrorMessage('Por favor ingrese su contraseña para validar su identidad.');
      return;
    }

    setIsSubmitting(true);
    const result = sqliteService.validateUsuario(cleanUser, cleanPass);

    setTimeout(() => {
      setIsSubmitting(false);
      if (result.success && result.user) {
        setSuccessMessage(`¡Acceso verificado! Bienvenido ${result.user.Username} (${result.user.Role})`);
        setTimeout(() => {
          onLoginSuccess(result.user!);
        }, 350);
      } else {
        setErrorMessage(
          result.error || 'Credenciales incorrectas. Verifique su usuario y contraseña.'
        );
      }
    }, 250);
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
        setSuccessMessage(`¡Usuario "${result.user.Username}" guardado con éxito en TerrenoBroaster.db!`);
        setRegisteredUsers(sqliteService.getUsuarios());
        setTimeout(() => {
          onLoginSuccess(result.user!);
        }, 500);
      } else {
        setErrorMessage(result.error || 'No se pudo guardar el usuario en la base de datos.');
      }
    }, 300);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 select-none animate-in fade-in duration-200">
      <div className="bg-stone-900 border border-stone-800 rounded-3xl max-w-md w-full shadow-2xl overflow-hidden flex flex-col transition-all">
        
        {/* Header with Circular Logo and Title */}
        <div className="p-5 sm:p-6 bg-gradient-to-b from-stone-950 via-stone-900 to-stone-900 border-b border-stone-800 text-center relative">
          
          {canDismiss && onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="absolute top-4 right-4 p-2 rounded-xl text-stone-400 hover:text-stone-100 hover:bg-stone-800 transition-colors cursor-pointer"
              title="Cerrar ventana"
            >
              <X className="w-5 h-5" />
            </button>
          )}

          {/* Glowing Circular Restaurant Logo */}
          <div className="relative w-16 h-16 mx-auto mb-3 flex items-center justify-center">
            <div className="absolute inset-0 rounded-full bg-amber-500/20 blur-xl animate-pulse" />
            <div className="absolute -inset-0.5 rounded-full border border-amber-400/60 animate-[spin_8s_linear_infinite]" />
            <div className="w-14 h-14 rounded-full overflow-hidden border-2 border-amber-400 shadow-xl shadow-amber-500/25 bg-stone-950 p-0.5">
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
            Control de Acceso Seguro • Autenticación de Personal
          </p>

          {/* Navigation Tabs (Strict Login vs User Registration) */}
          <div className="mt-4 flex bg-stone-950 p-1 rounded-xl border border-stone-800 text-xs font-bold">
            <button
              type="button"
              onClick={() => {
                setActiveTab('login');
                setErrorMessage(null);
                setSuccessMessage(null);
              }}
              className={`flex-1 py-2 rounded-lg flex items-center justify-center space-x-1.5 transition-all cursor-pointer ${
                activeTab === 'login'
                  ? 'bg-amber-500 text-stone-950 shadow-sm'
                  : 'text-stone-400 hover:text-stone-100'
              }`}
            >
              <KeyRound className="w-3.5 h-3.5" />
              <span>Iniciar Sesión</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveTab('register');
                setErrorMessage(null);
                setSuccessMessage(null);
              }}
              className={`flex-1 py-2 rounded-lg flex items-center justify-center space-x-1.5 transition-all cursor-pointer ${
                activeTab === 'register'
                  ? 'bg-amber-500 text-stone-950 shadow-sm'
                  : 'text-stone-400 hover:text-stone-100'
              }`}
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>Registrar Empleado</span>
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

          {/* TAB 1: INICIAR SESIÓN CON USUARIO Y CONTRASEÑA */}
          {activeTab === 'login' && (
            <form onSubmit={handleCredentialsSubmit} className="space-y-4">
              
              {/* Account Quick Selectors (Fills username, user still MUST type password) */}
              <div className="space-y-1.5">
                <label className="block text-[11px] font-semibold text-stone-400">
                  Seleccionar cuenta o escribir usuario:
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {DEFAULT_ACCOUNTS.map((acc) => {
                    const Icon = acc.icon;
                    const isSelected = username.toLowerCase() === acc.username.toLowerCase();
                    return (
                      <button
                        key={acc.username}
                        type="button"
                        onClick={() => handleSelectAccountHint(acc)}
                        className={`p-2 rounded-xl border text-left flex items-center space-x-2 transition-all cursor-pointer text-xs ${
                          isSelected
                            ? 'border-amber-400 bg-amber-500/15 text-stone-100 font-bold'
                            : 'border-stone-800 bg-stone-950/60 hover:bg-stone-800 text-stone-300'
                        }`}
                      >
                        <div className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 ${acc.colorClass}`}>
                          <Icon className="w-3.5 h-3.5" />
                        </div>
                        <div className="truncate">
                          <span className="block truncate font-bold text-xs">{acc.label}</span>
                          <span className="block text-[10px] text-stone-500 font-mono">@{acc.username}</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Username Input */}
              <div>
                <label className="block text-xs font-bold text-stone-300 mb-1.5">
                  Usuario:
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

              {/* Password Input */}
              <div>
                <label className="block text-xs font-bold text-stone-300 mb-1.5">
                  Contraseña de Seguridad:
                </label>
                <div className="relative">
                  <KeyRound className="w-4 h-4 text-stone-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    ref={passwordInputRef}
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
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-500 hover:text-stone-300 p-1"
                    title={showPassword ? 'Ocultar contraseña' : 'Ver contraseña'}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <div className="mt-1 flex items-center justify-between text-[11px] text-stone-500">
                  <span>Claves por defecto: <code className="text-amber-400 font-mono">admin123</code>, <code className="text-amber-400 font-mono">cajero123</code></span>
                </div>
              </div>

              {/* Privileges Guide */}
              <div className="p-3 bg-stone-950 border border-stone-800 rounded-xl text-[11px] text-stone-400 space-y-1">
                <div className="font-bold text-stone-300 flex items-center space-x-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
                  <span>Áreas permitidas por rol:</span>
                </div>
                <div className="grid grid-cols-2 gap-1.5 pt-1 text-[10px]">
                  <div>• <strong>Administrador:</strong> Acceso Total</div>
                  <div>• <strong>Cajero:</strong> POS, Ventas, Cierre COP</div>
                  <div>• <strong>Cocinero:</strong> Monitor KDS Cocina</div>
                  <div>• <strong>Mesero:</strong> Pedidos en Mesas</div>
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-stone-950 font-black rounded-xl text-sm shadow-lg shadow-amber-500/20 transition-all flex items-center justify-center space-x-2 cursor-pointer disabled:opacity-50 active:scale-98"
              >
                {isSubmitting ? (
                  <RefreshCw className="w-4 h-4 animate-spin text-stone-950" />
                ) : (
                  <>
                    <Lock className="w-4 h-4" />
                    <span>Validar e Iniciar Sesión</span>
                  </>
                )}
              </button>
            </form>
          )}

          {/* TAB 2: REGISTRAR / CREAR USUARIOS */}
          {activeTab === 'register' && (
            <form onSubmit={handleRegisterSubmit} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-stone-300 mb-1">
                  Nombre de Usuario:
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-stone-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="ej: juan_cajero"
                    className="w-full pl-9 pr-3 py-2 bg-stone-950 border border-stone-800 rounded-xl text-stone-100 text-xs focus:outline-none focus:border-amber-500 font-medium"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-300 mb-1">
                  Rol y Privilegio Asignado:
                </label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value as UserRole)}
                  className="w-full px-3 py-2 bg-stone-950 border border-stone-800 rounded-xl text-stone-200 text-xs focus:outline-none focus:border-amber-500"
                >
                  <option value="Administrador">👑 Administrador (Acceso Total al Sistema)</option>
                  <option value="Cajero">💵 Cajero (POS, Ventas, WhatsApp, Cierre de Caja COP)</option>
                  <option value="Cocinero">👨‍🍳 Cocinero (Monitor KDS y Tiempos de Cocina)</option>
                  <option value="Mesero">🍽️ Mesero (Toma de Pedidos en Mesas y Carta)</option>
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
                    placeholder="Repita la clave"
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
                  <RefreshCw className="w-4 h-4 animate-spin text-stone-950" />
                ) : (
                  <>
                    <UserPlus className="w-4 h-4" />
                    <span>Guardar Usuario en SQLite</span>
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
            {registeredUsers.length} usuario{registeredUsers.length !== 1 ? 's' : ''} activo{registeredUsers.length !== 1 ? 's' : ''}
          </span>
        </div>

      </div>
    </div>
  );
};
export default LoginModal;
