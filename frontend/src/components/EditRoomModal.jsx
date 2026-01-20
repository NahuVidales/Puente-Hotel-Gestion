import React, { useState } from 'react';
import { X, AlertCircle } from 'lucide-react';
import api from '../api.js';

/**
 * EditRoomModal Component
 * Modal para editar datos de una habitación
 */
function EditRoomModal({ isOpen, onClose, room, onSuccess }) {
  const [formData, setFormData] = useState(
    room ? {
      numero: room.numero,
      tipo: room.tipo,
      precio_base: room.precio_base,
      estado: room.estado,
    } : {
      numero: '',
      tipo: 'SIMPLE',
      precio_base: '',
      estado: 'DISPONIBLE',
    }
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Actualizar formData cuando cambie la habitación
  React.useEffect(() => {
    if (room) {
      setFormData({
        numero: room.numero,
        tipo: room.tipo,
        precio_base: room.precio_base,
        estado: room.estado,
      });
    }
  }, [room]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: name === 'precio_base' ? parseFloat(value) : value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      await api.put(`/habitaciones/${room.id}`, {
        numero: formData.numero,
        tipo: formData.tipo,
        precio_base: formData.precio_base,
        estado: formData.estado,
      });

      alert('✅ Habitación actualizada exitosamente');
      onSuccess();
      onClose();
    } catch (err) {
      setError(err.response?.data?.detail || 'Error al actualizar habitación');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen || !room) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-bold text-gray-900">Editar Habitación {room.numero}</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X size={24} />
          </button>
        </div>

        {/* Formulario */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Número de Habitación */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Número de Habitación
            </label>
            <input
              type="text"
              name="numero"
              value={formData.numero}
              onChange={handleChange}
              placeholder="Ej: 101"
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Tipo de Habitación */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Tipo de Habitación
            </label>
            <select
              name="tipo"
              value={formData.tipo}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="SIMPLE">Simple</option>
              <option value="DOBLE">Doble</option>
              <option value="TRIPLE">Triple</option>
              <option value="CUADRUPLE">Cuádruple</option>
            </select>
          </div>

          {/* Precio Base */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Precio Base ($/noche)
            </label>
            <input
              type="number"
              name="precio_base"
              value={formData.precio_base}
              onChange={handleChange}
              placeholder="Ej: 85.00"
              step="0.01"
              min="0"
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Estado */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Estado
            </label>
            <select
              name="estado"
              value={formData.estado}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="DISPONIBLE">Disponible</option>
              <option value="LIMPIEZA">Limpieza</option>
              <option value="MANTENIMIENTO">Mantenimiento</option>
            </select>
          </div>

          {/* Error */}
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm flex items-start gap-2">
              <AlertCircle size={18} className="mt-0.5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Botones */}
          <div className="flex gap-2 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 font-medium"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium disabled:opacity-50"
            >
              {loading ? 'Guardando...' : 'Guardar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default EditRoomModal;
