import React, { useState, useEffect } from 'react';
import { sqliteService } from '../db/sqliteService';
import { menuSyncService } from '../services/menuSyncService';
import {
  Database,
  Download,
  Upload,
  RefreshCw,
  Terminal,
  CheckCircle2,
  AlertCircle,
  X,
  HardDrive,
  Activity,
  Layers,
} from 'lucide-react';

interface DatabaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDbUpdated: () => void;
}

export const DatabaseModal: React.FC<DatabaseModalProps> = ({ isOpen, onClose, onDbUpdated }) => {
  const [customSql, setCustomSql] = useState('SELECT ID, Plato, Precio, Categoria, Imagen FROM Platos LIMIT 10;');
  const [queryResult, setQueryResult] = useState<any[] | null>(null);
  const [queryError, setQueryError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [dbStatus, setDbStatus] = useState(sqliteService.getConnectionStatus());

  useEffect(() => {
    if (isOpen) {
      setDbStatus(sqliteService.getConnectionStatus());
      setQueryError(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleDownloadDb = () => {
    try {
      sqliteService.downloadDatabaseFile('TerrenoBroaster.db');
      setSuccessMessage('Base de datos SQLite "TerrenoBroaster.db" exportada y descargada exitosamente.');
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch (e: any) {
      alert('Error exportando base de datos: ' + e.message);
    }
  };

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsProcessing(true);
      const platosCount = await sqliteService.importDatabase(file);
      // Immediately push real dishes to server
      const currentPlatos = sqliteService.getPlatos();
      const currentPhone = sqliteService.getWhatsAppPhone();
      await menuSyncService.pushMenuToServer(currentPlatos, currentPhone, true);

      setDbStatus(sqliteService.getConnectionStatus());
      setSuccessMessage(
        `¡Base de datos '${file.name}' sincronizada con éxito! Se cargaron ${platosCount} platos registrados y se actualizaron en el menú digital QR.`
      );
      onDbUpdated();
      setTimeout(() => setSuccessMessage(null), 5000);
    } catch (e: any) {
      alert('Error leyendo archivo SQLite: ' + e.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRunQuery = () => {
    setQueryError(null);
    setQueryResult(null);
    try {
      const results = sqliteService.runCustomQuery(customSql);
      setQueryResult(results);
      setDbStatus(sqliteService.getConnectionStatus());
    } catch (e: any) {
      setQueryError(e.message || 'Error al ejecutar consulta');
    }
  };

  const handleTestConnection = () => {
    setQueryError(null);
    try {
      const results = sqliteService.runCustomQuery('SELECT COUNT(*) as TotalPlatos FROM Platos;');
      setQueryResult(results);
      setDbStatus(sqliteService.getConnectionStatus());
      setSuccessMessage('¡Conexión verificada exitosamente con la base de datos!');
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch (e: any) {
      setQueryError(e.message);
    }
  };

  const handleReset = () => {
    if (window.confirm('¿Desea limpiar la base de datos local para importar un nuevo archivo TerrenoBroaster.db?')) {
      sqliteService.resetToDefaults();
      setDbStatus(sqliteService.getConnectionStatus());
      onDbUpdated();
      setSuccessMessage('Base de datos restablecida. Puede importar su archivo TerrenoBroaster.db.');
      setTimeout(() => setSuccessMessage(null), 4000);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-stone-900 border border-stone-800 text-stone-100 rounded-2xl max-w-2xl w-full shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Modal Header */}
        <div className="p-4 bg-stone-950 border-b border-stone-800 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Database className="w-5 h-5 text-emerald-400" />
            <div>
              <h3 className="font-black text-sm text-stone-100">Administrador SQLite: TerrenoBroaster.db</h3>
              <p className="text-[11px] text-stone-400">Motor SQLite 3 nativo con persistencia y ejecución SQL en tiempo real</p>
            </div>
          </div>
          <button onClick={onClose} className="text-stone-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content body */}
        <div className="p-5 space-y-4 overflow-y-auto text-xs">
          
          {/* Active Status Ribbon */}
          <div className="p-3 bg-stone-950 border border-emerald-500/30 rounded-xl flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse" />
              <div>
                <div className="flex items-center space-x-2">
                  <span className="font-bold text-stone-200">Estado de Base de Datos:</span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-950 text-emerald-300 border border-emerald-800/80">
                    Conectada y Activa
                  </span>
                </div>
                <p className="text-[11px] text-stone-400 mt-0.5">
                  Motor: <span className="text-stone-300 font-semibold">{dbStatus.engine}</span> •{' '}
                  <span className="text-amber-400 font-bold">{dbStatus.platosCount} platos</span> •{' '}
                  <span className="text-stone-300">{dbStatus.ventasCount} ventas</span> •{' '}
                  <span className="text-emerald-400 font-semibold">{dbStatus.pedidosWhatsAppCount || 0} pedidos WA</span>
                </p>
              </div>
            </div>

            <button
              onClick={handleTestConnection}
              className="px-3 py-1.5 bg-stone-800 hover:bg-stone-700 text-stone-200 rounded-lg text-xs font-semibold border border-stone-700 transition-colors flex items-center space-x-1"
            >
              <Activity className="w-3.5 h-3.5 text-emerald-400" />
              <span>Probar Conexión</span>
            </button>
          </div>

          {/* File location info card */}
          <div className="p-3 bg-stone-950 border border-stone-800 rounded-xl space-y-1.5">
            <div className="flex items-center space-x-2 text-stone-300 font-bold">
              <HardDrive className="w-4 h-4 text-amber-400" />
              <span>Ruta del archivo en su Computadora:</span>
            </div>
            <code className="block bg-stone-900 px-3 py-1.5 rounded-lg text-amber-300 font-mono text-[11px] break-all border border-stone-800">
              C:\Users\Admin\Desktop\Trabajos\Gemini AI\POS\TerrenoBroaster.db
            </code>
            <p className="text-[11px] text-stone-400">
              Seleccione el archivo existente en su disco para cargarlo o descargue los cambios cuando desee.
            </p>
          </div>

          {/* Success / notification banner */}
          {successMessage && (
            <div className="p-3 bg-emerald-950/60 border border-emerald-500/40 rounded-xl text-emerald-300 flex items-center space-x-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* Import / Export action cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            
            {/* Import box */}
            <div className="p-4 bg-stone-950 border border-stone-800 rounded-xl space-y-3 flex flex-col justify-between">
              <div>
                <h4 className="font-bold text-stone-200 text-xs flex items-center space-x-1.5">
                  <Upload className="w-4 h-4 text-amber-400" />
                  <span>Cargar TerrenoBroaster.db</span>
                </h4>
                <p className="text-[11px] text-stone-400 mt-1">
                  Abra el archivo <code className="text-stone-300">.db</code> de su disco para leer las tablas <code className="text-amber-300">Platos</code>, <code className="text-amber-300">Ventas</code> y <code className="text-amber-300">Detalles</code>.
                </p>
              </div>

              <label className="w-full py-2.5 px-3 bg-stone-800 hover:bg-stone-700 text-stone-100 rounded-xl font-bold text-center cursor-pointer border border-stone-700 flex items-center justify-center space-x-2 transition-colors">
                <Upload className="w-4 h-4 text-amber-400" />
                <span>{isProcessing ? 'Sincronizando archivo...' : 'Seleccionar Archivo .db'}</span>
                <input
                  type="file"
                  accept=".db,.sqlite,.sqlite3"
                  onChange={handleImportFile}
                  disabled={isProcessing}
                  className="hidden"
                />
              </label>
            </div>

            {/* Export box */}
            <div className="p-4 bg-stone-950 border border-stone-800 rounded-xl space-y-3 flex flex-col justify-between">
              <div>
                <h4 className="font-bold text-stone-200 text-xs flex items-center space-x-1.5">
                  <Download className="w-4 h-4 text-emerald-400" />
                  <span>Descargar TerrenoBroaster.db</span>
                </h4>
                <p className="text-[11px] text-stone-400 mt-1">
                  Guarda un archivo binario SQLite 3 válido para abrir en DB Browser for SQLite, DBeaver o en Python.
                </p>
              </div>

              <button
                type="button"
                onClick={handleDownloadDb}
                className="w-full py-2.5 px-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-black text-center flex items-center justify-center space-x-2 transition-colors shadow-lg shadow-emerald-600/20"
              >
                <Download className="w-4 h-4" />
                <span>Exportar y Guardar .db</span>
              </button>
            </div>

          </div>

          {/* Sincronización QR en Vivo */}
          <div className="p-3.5 bg-gradient-to-r from-amber-950/40 via-stone-950 to-stone-950 border border-amber-500/30 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h4 className="font-bold text-amber-300 text-xs flex items-center space-x-1.5">
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Menú de Clientes QR (Catálogo en Línea)</span>
              </h4>
              <p className="text-[11px] text-stone-400 mt-0.5">
                Publica los <strong className="text-white">{dbStatus.platosCount} platos</strong> de la tabla <code className="text-amber-300 font-mono">Platos</code> para que los clientes que escaneen el código QR vean exactamente estos productos.
              </p>
            </div>

            <div className="flex items-center space-x-2 shrink-0">
              <button
                type="button"
                onClick={async () => {
                  try {
                    setIsProcessing(true);
                    const currentPlatos = sqliteService.getPlatos();
                    const currentPhone = sqliteService.getWhatsAppPhone();
                    await menuSyncService.pushMenuToServer(currentPlatos, currentPhone, true);
                    setSuccessMessage(`¡Catálogo publicado! ${currentPlatos.length} platos sincronizados para los clientes QR.`);
                    setTimeout(() => setSuccessMessage(null), 5000);
                  } catch (err: any) {
                    alert('Error publicando menú: ' + err.message);
                  } finally {
                    setIsProcessing(false);
                  }
                }}
                disabled={isProcessing}
                className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-stone-950 rounded-lg text-xs font-black shadow-md shadow-amber-500/20 transition-all flex items-center space-x-1"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isProcessing ? 'animate-spin' : ''}`} />
                <span>Publicar Catálogo QR</span>
              </button>

              <button
                type="button"
                onClick={() => window.open('/cliente', '_blank')}
                className="px-3 py-1.5 bg-stone-800 hover:bg-stone-700 text-stone-200 rounded-lg text-xs font-semibold border border-stone-700 transition-colors"
                title="Abrir la app de clientes en una pestaña nueva"
              >
                <span>Ver App</span>
              </button>
            </div>
          </div>

          {/* SQL Console */}
          <div className="bg-stone-950 border border-stone-800 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-bold text-stone-200 flex items-center space-x-1.5">
                <Terminal className="w-4 h-4 text-amber-400" />
                <span>Consola SQL (Consultas en Vivo)</span>
              </span>
              <div className="flex flex-wrap gap-1">
                <button
                  type="button"
                  onClick={() => setCustomSql('SELECT ID, Plato, Precio, Categoria, Imagen FROM Platos;')}
                  className="px-2 py-0.5 rounded bg-stone-800 text-[10px] text-stone-300 hover:text-white"
                >
                  Platos
                </button>
                <button
                  type="button"
                  onClick={() => setCustomSql('SELECT VentasId, Fecha, NTicket, Cliente, Monto, FormaPago FROM Ventas ORDER BY VentasId DESC LIMIT 5;')}
                  className="px-2 py-0.5 rounded bg-stone-800 text-[10px] text-stone-300 hover:text-white"
                >
                  Ventas
                </button>
                <button
                  type="button"
                  onClick={() => setCustomSql('SELECT DetallesId, Fecha, NTicket, Plato, Precio, Cantidad, Importe FROM Detalles ORDER BY DetallesId DESC LIMIT 5;')}
                  className="px-2 py-0.5 rounded bg-stone-800 text-[10px] text-stone-300 hover:text-white"
                >
                  Detalles
                </button>
                <button
                  type="button"
                  onClick={() => setCustomSql('SELECT ComandaId, NTicket, Ubicacion, Estado, Monto, FormaPago FROM Comandas ORDER BY ComandaId DESC LIMIT 5;')}
                  className="px-2 py-0.5 rounded bg-amber-500/20 text-[10px] text-amber-300 hover:text-white"
                >
                  Comandas
                </button>
                <button
                  type="button"
                  onClick={() => setCustomSql('SELECT Id, Username, Role, FechaRegistro, UltimoAcceso FROM Usuarios;')}
                  className="px-2 py-0.5 rounded bg-emerald-500/20 text-[10px] text-emerald-300 hover:text-white"
                >
                  Usuarios
                </button>
                <button
                  type="button"
                  onClick={() => setCustomSql('SELECT Id, Fecha, NombreCliente, TelefonoCliente, TipoEntrega, Total, FormaPago, Estado, NTicket FROM PedidosWhatsApp;')}
                  className="px-2 py-0.5 rounded bg-green-500/20 text-[10px] text-green-300 hover:text-white"
                >
                  PedidosWA
                </button>
                <button
                  type="button"
                  onClick={() => setCustomSql('SELECT COUNT(*) as TotalPlatos FROM Platos;')}
                  className="px-2 py-0.5 rounded bg-stone-800 text-[10px] text-stone-300 hover:text-white"
                >
                  Count
                </button>
              </div>
            </div>

            <div className="flex space-x-2">
              <textarea
                value={customSql}
                onChange={(e) => setCustomSql(e.target.value)}
                rows={2}
                className="flex-1 bg-stone-900 border border-stone-800 rounded-lg p-2 font-mono text-[11px] text-amber-300 focus:outline-none focus:border-amber-500"
              />
              <button
                type="button"
                onClick={handleRunQuery}
                className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-stone-950 font-black rounded-lg transition-colors"
              >
                Ejecutar
              </button>
            </div>

            {queryError && (
              <div className="p-2 bg-red-950/60 border border-red-800 text-red-300 rounded text-[11px] flex items-center space-x-1.5">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                <span>{queryError}</span>
              </div>
            )}

            {queryResult && queryResult.length > 0 && (
              <div className="mt-2 max-h-48 overflow-y-auto border border-stone-800 rounded-lg">
                <table className="w-full text-left text-[11px]">
                  <thead className="bg-stone-900 text-stone-400 sticky top-0">
                    <tr>
                      {queryResult[0].columns.map((col: string, i: number) => (
                        <th key={i} className="py-1 px-2 border-b border-stone-800 font-mono">
                          {col}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-900 bg-stone-950 text-stone-300 font-mono">
                    {queryResult[0].values.map((row: any[], rIdx: number) => (
                      <tr key={rIdx}>
                        {row.map((cell: any, cIdx: number) => (
                          <td key={cIdx} className="py-1 px-2 whitespace-nowrap">
                            {String(cell ?? 'NULL')}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Reset factory button */}
          <div className="pt-2 flex justify-between items-center text-stone-500 text-[11px]">
            <span>Tablas SQLite: Platos, Ventas, Detalles</span>
            <button
              type="button"
              onClick={handleReset}
              className="text-stone-400 hover:text-amber-400 underline flex items-center space-x-1"
            >
              <RefreshCw className="w-3 h-3" />
              <span>Restablecer datos demo</span>
            </button>
          </div>

        </div>

        {/* Modal Footer */}
        <div className="p-3 bg-stone-950 border-t border-stone-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-stone-800 hover:bg-stone-700 text-stone-200 font-semibold rounded-xl text-xs"
          >
            Cerrar
          </button>
        </div>

      </div>
    </div>
  );
};
