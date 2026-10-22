import React, { useState } from 'react';
import { Plato } from '../types';
import { imageService } from '../services/imageService';
import { sqliteService } from '../db/sqliteService';
import { formatPrice, safeParsePrice } from '../utils/currency';
import {
  Plus,
  Pencil,
  Trash2,
  Search,
  Image as ImageIcon,
  DollarSign,
  Tag,
  Upload,
  Check,
  X,
  AlertTriangle,
  FolderOpen,
  LayoutGrid,
  Table as TableIcon
} from 'lucide-react';

interface PlatosViewProps {
  platos: Plato[];
  onRefresh: () => void;
  onOpenImageModal: () => void;
}

export const PlatosView: React.FC<PlatosViewProps> = ({ platos, onRefresh, onOpenImageModal }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('Todos');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('table');

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPlato, setEditingPlato] = useState<Plato | null>(null);
  const [deleteConfirmPlato, setDeleteConfirmPlato] = useState<Plato | null>(null);

  // Form states
  const [formData, setFormData] = useState<{
    Plato: string;
    Precio: string;
    Categoria: string;
    Imagen: string;
  }>({
    Plato: '',
    Precio: '',
    Categoria: 'Pollo Broaster',
    Imagen: '',
  });

  const [formImagePreview, setFormImagePreview] = useState<string>('');

  const categories = ['Todos', ...Array.from(new Set(platos.map((p) => p.Categoria)))];

  const filteredPlatos = platos.filter((p) => {
    const matchesCat = categoryFilter === 'Todos' || p.Categoria === categoryFilter;
    const matchesSearch =
      p.Plato.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.Categoria.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.Imagen.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCat && matchesSearch;
  });

  const openCreateModal = () => {
    setEditingPlato(null);
    setFormData({
      Plato: '',
      Precio: '',
      Categoria: 'Pollo Broaster',
      Imagen: '',
    });
    setFormImagePreview('');
    setIsModalOpen(true);
  };

  const openEditModal = (plato: Plato) => {
    setEditingPlato(plato);
    setFormData({
      Plato: plato.Plato,
      Precio: plato.Precio.toString(),
      Categoria: plato.Categoria,
      Imagen: plato.Imagen,
    });
    setFormImagePreview(imageService.getImageUrl(plato.Imagen, plato.Categoria));
    setIsModalOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.Plato.trim() || !formData.Precio) {
      alert('Por favor complete el nombre del plato y el precio.');
      return;
    }

    const precioNum = safeParsePrice(formData.Precio);
    if (isNaN(precioNum) || precioNum <= 0) {
      alert('Por favor ingrese un precio numérico válido (ej: 8000 o 8.000).');
      return;
    }

    if (editingPlato) {
      sqliteService.updatePlato({
        ID: editingPlato.ID,
        Plato: formData.Plato.trim(),
        Precio: precioNum,
        Categoria: formData.Categoria.trim() || 'General',
        Imagen: formData.Imagen.trim(),
      });
    } else {
      sqliteService.addPlato({
        Plato: formData.Plato.trim(),
        Precio: precioNum,
        Categoria: formData.Categoria.trim() || 'General',
        Imagen: formData.Imagen.trim(),
      });
    }

    setIsModalOpen(false);
    onRefresh();
  };

  const handleDelete = () => {
    if (!deleteConfirmPlato) return;
    sqliteService.deletePlato(deleteConfirmPlato.ID);
    setDeleteConfirmPlato(null);
    onRefresh();
  };

  // Upload an image file for this plato
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      imageService.registerFile(file);
      setFormData((prev) => ({ ...prev, Imagen: file.name }));
      setFormImagePreview(URL.createObjectURL(file));
    }
  };

  return (
    <div className="flex-1 overflow-y-auto bg-stone-950 p-4 sm:p-6 lg:p-8 space-y-6">
      
      {/* Top Header & Breadcrumb */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-stone-800">
        <div>
          <h1 className="text-2xl font-black text-stone-100 flex items-center space-x-2">
            <span>Gestión de Platos & Productos</span>
            <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-stone-800 text-amber-400 border border-stone-700">
              Tabla: Platos
            </span>
          </h1>
          <p className="text-xs text-stone-400 mt-1">
            Administre los platos del restaurante en SQLite ('TerrenoBroaster.db'). Fotos en carpeta local <code className="text-amber-300 font-mono">img\</code>.
          </p>
        </div>

        <div className="flex items-center space-x-3 w-full sm:w-auto">
          <button
            onClick={onOpenImageModal}
            className="flex-1 sm:flex-none flex items-center justify-center space-x-2 px-3.5 py-2.5 bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs font-semibold rounded-xl border border-stone-700 transition-colors"
          >
            <FolderOpen className="w-4 h-4 text-amber-400" />
            <span>Vincular Carpeta img</span>
          </button>

          <button
            onClick={openCreateModal}
            className="flex-1 sm:flex-none flex items-center justify-center space-x-2 px-4 py-2.5 bg-amber-500 hover:bg-amber-400 text-stone-950 text-xs font-black rounded-xl shadow-lg shadow-amber-500/20 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>NUEVO PLATO</span>
          </button>
        </div>
      </div>

      {/* Filter and search toolbar */}
      <div className="bg-stone-900 border border-stone-800 rounded-2xl p-4 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        
        {/* Search */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por nombre, categoría o nombre de imagen..."
            className="w-full pl-9 pr-4 py-2 bg-stone-950 text-stone-100 placeholder-stone-500 rounded-xl border border-stone-800 text-xs focus:outline-none focus:border-amber-500"
          />
        </div>

        {/* Category dropdown & View toggle */}
        <div className="flex items-center space-x-3">
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="py-2 px-3 bg-stone-950 text-stone-200 border border-stone-800 rounded-xl text-xs focus:outline-none focus:border-amber-500"
          >
            {categories.map((c) => (
              <option key={c} value={c}>
                Categoría: {c}
              </option>
            ))}
          </select>

          <div className="flex bg-stone-950 p-1 rounded-xl border border-stone-800">
            <button
              onClick={() => setViewMode('table')}
              className={`p-1.5 rounded-lg text-xs ${
                viewMode === 'table' ? 'bg-amber-500 text-stone-950 font-bold' : 'text-stone-400 hover:text-white'
              }`}
            >
              <TableIcon className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-lg text-xs ${
                viewMode === 'grid' ? 'bg-amber-500 text-stone-950 font-bold' : 'text-stone-400 hover:text-white'
              }`}
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
          </div>
        </div>

      </div>

      {/* Main content: Table or Grid */}
      {viewMode === 'table' ? (
        <div className="bg-stone-900 border border-stone-800 rounded-2xl overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-stone-950 border-b border-stone-800 text-stone-400 font-bold uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="py-3.5 px-4 w-16">ID</th>
                  <th className="py-3.5 px-4 w-20">Foto</th>
                  <th className="py-3.5 px-4">Nombre del Plato</th>
                  <th className="py-3.5 px-4">Categoría</th>
                  <th className="py-3.5 px-4">Archivo Imagen</th>
                  <th className="py-3.5 px-4 text-right">Precio ($)</th>
                  <th className="py-3.5 px-4 text-center w-28">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-800/80">
                {filteredPlatos.map((plato) => {
                  const imgUrl = imageService.getImageUrl(plato.Imagen, plato.Categoria);
                  return (
                    <tr key={plato.ID} className="hover:bg-stone-800/50 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-amber-500">#{plato.ID}</td>
                      <td className="py-3 px-4">
                        <img
                          src={imgUrl}
                          alt={plato.Plato}
                          className="w-12 h-12 rounded-lg object-cover bg-stone-950 border border-stone-800"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = imageService.getFallbackForCategory(plato.Categoria);
                          }}
                        />
                      </td>
                      <td className="py-3 px-4 font-semibold text-stone-100 max-w-xs">{plato.Plato}</td>
                      <td className="py-3 px-4">
                        <span className="px-2.5 py-1 rounded-md text-[10px] font-bold bg-stone-800 text-amber-400 border border-stone-700/60 uppercase">
                          {plato.Categoria}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-mono text-stone-400 text-[11px]">
                        {plato.Imagen ? (
                          <span className="bg-stone-950 px-2 py-0.5 rounded border border-stone-800">
                            {plato.Imagen}
                          </span>
                        ) : (
                          <span className="text-stone-600 italic">Sin imagen asignada</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right font-black text-sm text-stone-100">
                        {formatPrice(plato.Precio)}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center space-x-1.5">
                          <button
                            onClick={() => openEditModal(plato)}
                            className="p-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-300 hover:text-white transition-colors"
                            title="Editar plato"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setDeleteConfirmPlato(plato)}
                            className="p-1.5 rounded-lg bg-stone-800 hover:bg-red-950/80 text-stone-400 hover:text-red-400 transition-colors"
                            title="Eliminar plato"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filteredPlatos.map((plato) => {
            const imgUrl = imageService.getImageUrl(plato.Imagen, plato.Categoria);
            return (
              <div
                key={plato.ID}
                className="bg-stone-900 border border-stone-800 rounded-2xl overflow-hidden flex flex-col justify-between"
              >
                <div className="relative h-40 bg-stone-950">
                  <img
                    src={imgUrl}
                    alt={plato.Plato}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = imageService.getFallbackForCategory(plato.Categoria);
                    }}
                  />
                  <span className="absolute top-2 left-2 text-[10px] font-bold bg-stone-950/80 backdrop-blur-sm text-amber-400 px-2 py-0.5 rounded">
                    {plato.Categoria}
                  </span>
                  <span className="absolute bottom-2 right-2 text-xs font-black bg-stone-950/90 text-amber-400 px-2 py-1 rounded">
                    {formatPrice(plato.Precio)}
                  </span>
                </div>

                <div className="p-4 flex-1 flex flex-col justify-between">
                  <div>
                    <h4 className="font-semibold text-stone-100 text-sm">{plato.Plato}</h4>
                    <p className="text-[11px] font-mono text-stone-400 mt-1">Archivo: {plato.Imagen || 'N/A'}</p>
                  </div>

                  <div className="mt-4 pt-3 border-t border-stone-800 flex justify-end space-x-2">
                    <button
                      onClick={() => openEditModal(plato)}
                      className="px-3 py-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs font-semibold flex items-center space-x-1"
                    >
                      <Pencil className="w-3 h-3" />
                      <span>Editar</span>
                    </button>
                    <button
                      onClick={() => setDeleteConfirmPlato(plato)}
                      className="px-2.5 py-1.5 rounded-lg bg-stone-800 hover:bg-red-950 text-red-400 text-xs font-semibold"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* CREATE / EDIT MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-stone-900 border border-stone-800 rounded-2xl max-w-lg w-full shadow-2xl overflow-hidden">
            <div className="p-4 bg-stone-950 border-b border-stone-800 flex items-center justify-between">
              <h3 className="text-sm font-black text-stone-100">
                {editingPlato ? `Editar Plato #${editingPlato.ID}` : 'Registrar Nuevo Plato en Menú'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-stone-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-5 space-y-4 text-xs">
              
              {/* Nombre Plato */}
              <div>
                <label className="block text-stone-300 font-semibold mb-1">Nombre del Plato:</label>
                <input
                  type="text"
                  required
                  value={formData.Plato}
                  onChange={(e) => setFormData({ ...formData, Plato: e.target.value })}
                  placeholder="Ej: Combo Broaster Especial 3 Piezas"
                  className="w-full py-2.5 px-3 bg-stone-950 border border-stone-700 rounded-xl text-stone-100 focus:outline-none focus:border-amber-500"
                />
              </div>

              {/* Precio y Categoria en 2 cols */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-stone-300 font-semibold mb-1">Precio ($ USD / Bs):</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-500 font-bold">$</span>
                    <input
                      type="text"
                      required
                      value={formData.Precio}
                      onChange={(e) => setFormData({ ...formData, Precio: e.target.value })}
                      placeholder="ej: 8000 o 8.000"
                      className="w-full pl-7 pr-3 py-2.5 bg-stone-950 border border-stone-700 rounded-xl text-stone-100 font-bold focus:outline-none focus:border-amber-500"
                    />
                  </div>
                  <p className="text-[10px] text-stone-500 mt-1">Escriba 8000 o 8.000 (sin error de centavos)</p>
                </div>

                <div>
                  <label className="block text-stone-300 font-semibold mb-1">Categoría:</label>
                  <select
                    value={formData.Categoria}
                    onChange={(e) => setFormData({ ...formData, Categoria: e.target.value })}
                    className="w-full py-2.5 px-3 bg-stone-950 border border-stone-700 rounded-xl text-stone-100 focus:outline-none focus:border-amber-500"
                  >
                    <option value="Pollo Broaster">Pollo Broaster</option>
                    <option value="Hamburguesas">Hamburguesas</option>
                    <option value="Raciones">Raciones</option>
                    <option value="Bebidas">Bebidas</option>
                    <option value="Combos">Combos</option>
                    <option value="Postres">Postres</option>
                  </select>
                </div>
              </div>

              {/* Imagen Filename & Upload */}
              <div className="space-y-2">
                <label className="block text-stone-300 font-semibold">
                  Nombre de Archivo Imagen (ej: <span className="text-amber-400 font-mono">imagen.jpg</span>):
                </label>
                <div className="flex space-x-2">
                  <input
                    type="text"
                    value={formData.Imagen}
                    onChange={(e) => {
                      const val = e.target.value;
                      setFormData({ ...formData, Imagen: val });
                      setFormImagePreview(imageService.getImageUrl(val, formData.Categoria));
                    }}
                    placeholder="ej: combo_broaster.jpg"
                    className="flex-1 py-2 px-3 bg-stone-950 border border-stone-700 rounded-xl text-stone-100 font-mono text-xs focus:outline-none focus:border-amber-500"
                  />
                  <label className="px-3 py-2 bg-stone-800 hover:bg-stone-700 text-stone-200 rounded-xl border border-stone-700 cursor-pointer flex items-center space-x-1.5 transition-colors">
                    <Upload className="w-3.5 h-3.5 text-amber-400" />
                    <span>Subir Foto</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                  </label>
                </div>
                <p className="text-[10px] text-stone-400">
                  Ubicación física en tu equipo: <code className="text-amber-300">C:\Users\Admin\Desktop\Trabajos\Gemini AI\POS\img\</code>
                </p>
              </div>

              {/* Image Preview box */}
              {formImagePreview && (
                <div className="p-2 bg-stone-950 rounded-xl border border-stone-800 flex items-center space-x-3">
                  <img
                    src={formImagePreview}
                    alt="Preview"
                    className="w-16 h-16 rounded-lg object-cover bg-stone-900 border border-stone-700"
                  />
                  <div>
                    <p className="text-xs font-bold text-stone-200">Vista previa del plato</p>
                    <p className="text-[10px] text-stone-400 font-mono">{formData.Imagen || 'Imagen de categoría'}</p>
                  </div>
                </div>
              )}

              {/* Modal footer */}
              <div className="pt-3 border-t border-stone-800 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2.5 bg-stone-800 hover:bg-stone-700 text-stone-300 font-semibold rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-stone-950 font-black rounded-xl shadow-lg shadow-amber-500/20"
                >
                  {editingPlato ? 'Guardar Cambios' : 'Crear Plato'}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {deleteConfirmPlato && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-stone-900 border border-stone-800 rounded-2xl max-w-sm w-full p-5 space-y-4">
            <div className="flex items-center space-x-3 text-red-400">
              <AlertTriangle className="w-6 h-6 shrink-0" />
              <h3 className="font-bold text-sm text-stone-100">¿Eliminar este Plato?</h3>
            </div>
            <p className="text-xs text-stone-300">
              ¿Estás seguro de que deseas eliminar <strong className="text-white">"{deleteConfirmPlato.Plato}"</strong> de la base de datos SQLite? Esta acción no se puede deshacer.
            </p>
            <div className="flex justify-end space-x-2 pt-2">
              <button
                onClick={() => setDeleteConfirmPlato(null)}
                className="px-3.5 py-2 bg-stone-800 hover:bg-stone-700 text-stone-300 text-xs font-semibold rounded-xl"
              >
                Cancelar
              </button>
              <button
                onClick={handleDelete}
                className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white text-xs font-bold rounded-xl"
              >
                Sí, Eliminar
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
