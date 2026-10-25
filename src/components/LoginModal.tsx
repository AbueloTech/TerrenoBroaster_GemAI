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
} from 'lucide-react';
import { sqliteService } from '../db/sqliteService';
import { Usuario } from '../types';

interface LoginModalProps {
  isOpen: boolean;
  onLoginSuccess: (user: Usuario) => void;
  onCancel?: () => void;
}

export const LoginModal: React.FC<LoginModalProps> = ({
  isOpen,
  onLoginSuccess,
  onCancel,
}) => {
  // Check if system already has registered users
  const [hasRegisteredUsers, setHasRegisteredUsers] = useState<boolean>(false);
  // Default to register mode if no users exist yet, otherwise login mode
  const [mode, setMode] = useState<'login' | 'register'>('login');

  // Form states
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [role, setRole] = useState<'Administrador' | 'Cajero' | 'Supervisor'>('Administrador');

  // UI state
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Check existing users on mount
  useEffect(() => {
    const existing = sqliteService.getUsuarios();
    const hasUsers = existing.length > 0;
    setHasRegisteredUsers(hasUsers);
    if (!hasUsers) {
      setMode('register');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const passwordsMatch = password.length > 0 && password === confirmPassword;
  const passwordsDiffer = confirmPassword.length > 0 && password !== confirmPassword;

  // Handle Login submission
  const handleLoginSubmit = (e: React.FormEvent) => {
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
        setSuccessMessage(`¡Bienvenido de nuevo, ${result.user.Username}!`);
        setTimeout(() => {
          onLoginSuccess(result.user!);
        }, 500);
      } else {
        setErrorMessage(result.error || 'Credenciales inválidas. Verifique su usuario o contraseña.');
      }
    }, 300);
  };

  // Handle Register / Change credentials submission
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
      setErrorMessage('Las contraseñas no coinciden. Por favor confirme la misma contraseña en el segundo campo.');
      return;
    }

    setIsSubmitting(true);
    const result = sqliteService.createOrUpdateUsuario(cleanUser, cleanPass, role);

    setTimeout(() => {
      setIsSubmitting(false);
      if (result.success && result.user) {
        setSuccessMessage(`¡Usuario "${result.user.Username}" guardado exitosamente en TerrenoBroaster.db!`);
        setTimeout(() => {
          onLoginSuccess(result.user!);
        }, 700);
      } else {
        setErrorMessage(result.error || 'No se pudo guardar el usuario en la base de datos.');
      }
    }, 350);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 select-none">
      <div className="bg-stone-900 border border-stone-800 rounded-2xl max-w-md w-full shadow-2xl overflow-hidden flex flex-col transition-all">
        
        {/* Header with Restaurant Badge */}
        <div className="p-6 bg-gradient-to-b from-stone-950 to-stone-900 border-b border-stone-800 text-center relative">
          
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="absolute top-4 right-4 p-1.5 rounded-xl text-stone-400 hover:text-white hover:bg-stone-800 transition-colors"
              title="Cerrar ventana"
            >
              <X className="w-5 h-5" />
            </button>
          )}

          {/* Flame Icon Badge */}
          <div className="w-14 h-14 mx-auto mb-3 rounded-2xl bg-gradient-to-tr from-amber-600 via-orange-500 to-amber-400 flex items-center justify-center shadow-lg shadow-amber-500/25 border border-amber-300/30">
            <Flame className="w-8 h-8 text-stone-950 font-black animate-pulse" />
          </div>

          <h2 className="text-xl font-black text-white tracking-tight">
            TERRENO <span className="text-amber-400">BROASTER</span>
          </h2>
          <p className="text-xs text-stone-400 mt-0.5">
            Sistema POS • Control de Acceso y Seguridad
          </p>

          {/* Mode Switch Tabs */}
          <div className="mt-4 flex bg-stone-950 p-1 rounded-xl border border-stone-800 text-xs font-semibold">
            <button
              type="button"
              onClick={() => {
                setMode('login');
                setErrorMessage(null);
                setSuccessMessage(null);
              }}
              className={`flex-1 py-1.5 rounded-lg flex items-center justify-center space-x-1.5 transition-all ${
                mode === 'login'
                  ? 'bg-amber-500 text-stone-950 font-black shadow-sm'
                  : 'text-stone-400 hover:text-white'
              }`}
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Iniciar Sesión</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setMode('register');
                setErrorMessage(null);
                setSuccessMessage(null);
              }}
              className={`flex-1 py-1.5 rounded-lg flex items-center justify-center space-x-1.5 transition-all ${
                mode === 'register'
                  ? 'bg-amber-500 text-stone-950 font-black shadow-sm'
                  : 'text-stone-400 hover:text-white'
              }`}
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>Nuevo Usuario</span>
            </button>
          </div>
        </div>

        {/* Modal Form Content */}
        <div className="p-6 space-y-4">
          
          {/* Feedback Alerts */}
          {errorMessage && (
            <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl flex items-start space-x-2 text-xs text-red-300">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {successMessage && (
            <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl flex items-start space-x-2 text-xs text-emerald-300">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* Form */}
          {mode === 'login' ? (
            <form onSubmit={handleLoginSubmit} className="space-y-4">
              
              {/* Usuario */}
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
                    placeholder="ej: admin o cajero"
                    autoFocus
                    className="w-full pl-9 pr-3 py-2.5 bg-stone-950 border border-stone-800 rounded-xl text-stone-100 text-sm focus:outline-none focus:border-amber-500 placeholder-stone-600"
                  />
                </div>
              </div>

              {/* Contraseña */}
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
                    className="w-full pl-9 pr-10 py-2.5 bg-stone-950 border border-stone-800 rounded-xl text-stone-100 text-sm focus:outline-none focus:border-amber-500 placeholder-stone-600"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-white"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Login Button */}
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-stone-950 font-black rounded-xl text-sm shadow-lg shadow-amber-500/20 flex items-center justify-center space-x-2 transition-all disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Verificando...</span>
                  </>
                ) : (
                  <>
                    <LogIn className="w-4 h-4" />
                    <span>Abrir Sesión</span>
                  </>
                )}
              </button>

              {/* Link to create / reset */}
              <div className="pt-2 text-center">
                <button
                  type="button"
                  onClick={() => {
                    setMode('register');
                    setErrorMessage(null);
                  }}
                  className="text-xs text-amber-400 hover:underline inline-flex items-center space-x-1"
                >
                  <Sparkles className="w-3 h-3 mr-1" />
                  <span>¿Desea crear un nuevo usuario o cambiar contraseña duplicada?</span>
                </button>
              </div>

            </form>
          ) : (
            <form onSubmit={handleRegisterSubmit} className="space-y-3.5">
              
              <div className="p-3 bg-stone-950 border border-stone-800 rounded-xl text-[11px] text-stone-400">
                <p className="font-bold text-amber-400 flex items-center space-x-1 mb-1">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Configuración de Usuario Administrador / Operador</span>
                </p>
                <p>
                  Introduzca su nuevo usuario y confirme su contraseña duplicada para registrar el acceso seguro en <strong className="text-stone-300">TerrenoBroaster.db</strong>.
                </p>
              </div>

              {/* Nuevo Usuario */}
              <div>
                <label className="block text-xs font-bold text-stone-300 mb-1">
                  Nuevo Nombre de Usuario:
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-stone-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="ej: admin, cajero_principal"
                    autoFocus
                    className="w-full pl-9 pr-3 py-2 bg-stone-950 border border-stone-800 rounded-xl text-stone-100 text-sm focus:outline-none focus:border-amber-500 placeholder-stone-600"
                  />
                </div>
              </div>

              {/* Rol */}
              <div>
                <label className="block text-xs font-bold text-stone-300 mb-1">
                  Rol del Usuario:
                </label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value as any)}
                  className="w-full px-3 py-2 bg-stone-950 border border-stone-800 rounded-xl text-stone-100 text-xs focus:outline-none focus:border-amber-500"
                >
                  <option value="Administrador">Administrador (Acceso Total)</option>
                  <option value="Cajero">Cajero (Punto de Venta y Comandas)</option>
                  <option value="Supervisor">Supervisor</option>
                </select>
              </div>

              {/* Contraseña */}
              <div>
                <label className="block text-xs font-bold text-stone-300 mb-1">
                  Nueva Contraseña:
                </label>
                <div className="relative">
                  <KeyRound className="w-4 h-4 text-stone-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Mínimo 3 caracteres"
                    className="w-full pl-9 pr-10 py-2 bg-stone-950 border border-stone-800 rounded-xl text-stone-100 text-sm focus:outline-none focus:border-amber-500 placeholder-stone-600"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-white"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Contraseña Duplicada (Confirmación) */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-bold text-stone-300">
                    Confirmar Contraseña (Duplicada):
                  </label>
                  {passwordsMatch && (
                    <span className="text-[10px] text-emerald-400 flex items-center font-bold">
                      <CheckCircle2 className="w-3 h-3 mr-1" />
                      Coinciden
                    </span>
                  )}
                  {passwordsDiffer && (
                    <span className="text-[10px] text-rose-400 flex items-center font-bold">
                      <AlertCircle className="w-3 h-3 mr-1" />
                      No coinciden
                    </span>
                  )}
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 text-stone-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Repita la misma contraseña"
                    className={`w-full pl-9 pr-10 py-2 bg-stone-950 border rounded-xl text-stone-100 text-sm focus:outline-none transition-colors ${
                      passwordsMatch
                        ? 'border-emerald-500 focus:border-emerald-500'
                        : passwordsDiffer
                        ? 'border-rose-500 focus:border-rose-500'
                        : 'border-stone-800 focus:border-amber-500'
                    } placeholder-stone-600`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-white"
                  >
                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Register Button */}
              <button
                type="submit"
                disabled={isSubmitting || passwordsDiffer}
                className="w-full py-3 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-stone-950 font-black rounded-xl text-sm shadow-lg shadow-amber-500/20 flex items-center justify-center space-x-2 transition-all disabled:opacity-50 mt-2"
              >
                {isSubmitting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Guardando en SQLite...</span>
                  </>
                ) : (
                  <>
                    <UserPlus className="w-4 h-4" />
                    <span>Guardar Credenciales y Abrir Sesión</span>
                  </>
                )}
              </button>

              {hasRegisteredUsers && (
                <div className="pt-1 text-center">
                  <button
                    type="button"
                    onClick={() => {
                      setMode('login');
                      setErrorMessage(null);
                    }}
                    className="text-xs text-stone-400 hover:text-white"
                  >
                    ¿Ya tiene credenciales? <span className="text-amber-400 font-bold underline">Iniciar Sesión</span>
                  </button>
                </div>
              )}

            </form>
          )}

        </div>

        {/* Footer info */}
        <div className="p-3 bg-stone-950 border-t border-stone-800 flex items-center justify-between text-[11px] text-stone-500">
          <div className="flex items-center space-x-1.5">
            <Lock className="w-3.5 h-3.5 text-amber-500" />
            <span>Base de Datos Local SQLite</span>
          </div>
          <span>v2.0 • Broaster POS</span>
        </div>

      </div>
    </div>
  );
};
