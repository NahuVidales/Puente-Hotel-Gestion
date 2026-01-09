import React, { useState, useEffect } from 'react';
import { X, AlertCircle } from 'lucide-react';
import api from '../api.js';

/**
 * BookingModal Component
 * Modal inteligente para crear reservas
 * Carga clientes dinámicamente y valida disponibilidad
 */
function BookingModal({ isOpen, onClose, room, onSuccess }) {
  const [clientes, setClientes] = useState([]);
  const [loadingClientes, setLoadingClientes] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isNewClient, setIsNewClient] = useState(false);
  const [formData, setFormData] = useState({
    cliente_id: '',
    fecha_entrada: '',
    fecha_salida: '',
  });
  const [newClientData, setNewClientData] = useState({
    nombre_completo: '',
    dni: '',
    email: '',
    telefono: '',
  });

  // Cargar clientes al abrir el modal
  useEffect(() => {
    if (isOpen) {
      loadClientes();
    }
  }, [isOpen]);

  const loadClientes = async () => {
    try {
      setLoadingClientes(true);
      const response = await api.get('/clientes');
      console.log('BookingModal - Respuesta clientes:', response.data);
      const data = Array.isArray(response.data) ? response.data : [];
      setClientes(data);
      setError(null);
    } catch (err) {
      setError('Error al cargar clientes');
      console.error('BookingModal - Error:', err);
      setClientes([]);
    } finally {
      setLoadingClientes(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value,
    });
  };

  const handleNewClientChange = (e) => {
    const { name, value } = e.target;
    setNewClientData({
      ...newClientData,
      [name]: value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    // Validaciones básicas
    if (!formData.fecha_entrada || !formData.fecha_salida) {
      setError('Por favor completa las fechas');
      setLoading(false);
      return;
    }

    // Validar que fecha_salida sea después de fecha_entrada
    if (new Date(formData.fecha_salida) <= new Date(formData.fecha_entrada)) {
      setError('La fecha de salida debe ser posterior a la entrada');
      setLoading(false);
      return;
    }

    try {
      let clienteId;

      // Caso 1: Crear nuevo cliente
      if (isNewClient) {
        if (!newClientData.nombre_completo || !newClientData.dni || !newClientData.telefono) {
          setError('Por favor completa: Nombre, DNI y Teléfono');
          setLoading(false);
          return;
        }

        try {
          const clientResponse = await api.post('/clientes', newClientData);
          clienteId = clientResponse.data.id;
        } catch (clientErr) {
          setError(clientErr.response?.data?.detail || 'Error al crear el cliente');
          setLoading(false);
          return;
        }
      } else {
        // Caso 2: Usar cliente existente
        if (!formData.cliente_id) {
          setError('Por favor selecciona un cliente');
          setLoading(false);
          return;
        }
        clienteId = parseInt(formData.cliente_id);
      }

      // Crear la reserva con el cliente (nuevo o existente)
      const response = await api.post('/reservas', {
        habitacion_id: room.id,
        cliente_id: clienteId,
        fecha_entrada: formData.fecha_entrada,
        fecha_salida: formData.fecha_salida,
      });

      // Éxito
      alert(
        `✅ ¡Reserva Exitosa!\n\nID: ${response.data.id}\nTotal: $${response.data.precio_total.toFixed(2)}`
      );
      setFormData({ cliente_id: '', fecha_entrada: '', fecha_salida: '' });
      setNewClientData({ nombre_completo: '', dni: '', email: '', telefono: '' });
      setIsNewClient(false);
      onSuccess();
      onClose();
    } catch (err) {
      if (err.response?.status === 409) {
        setError('❌ Fechas no disponibles. Elige otros días para esta habitación.');
      } else {
        setError(err.response?.data?.detail || 'Error al crear la reserva');
      }
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-bold text-gray-900">
            Reservar Habitación {room?.numero}
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition"
          >
            <X size={24} />
          </button>
        </div>

        {/* Cargando clientes */}
        {loadingClientes ? (
          <div className="flex items-center justify-center h-32">
            <div className="text-center">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-2"></div>
              <p className="text-sm text-gray-600">Cargando clientes...</p>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Selector de Modo Cliente */}
            <div className="flex gap-2 mb-4">
              <button
                type="button"
                onClick={() => setIsNewClient(false)}
                className={`flex-1 px-3 py-2 rounded font-medium transition ${
                  !isNewClient
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Existente
              </button>
              <button
                type="button"
                onClick={() => setIsNewClient(true)}
                className={`flex-1 px-3 py-2 rounded font-medium transition ${
                  isNewClient
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Nuevo
              </button>
            </div>

            {/* Cliente Existente */}
            {!isNewClient && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Selecciona un Cliente
                </label>
                <select
                  name="cliente_id"
                  value={formData.cliente_id}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Elige un cliente...</option>
                  {clientes.map((cliente) => (
                    <option key={cliente.id} value={cliente.id}>
                      {cliente.nombre_completo} ({cliente.dni})
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Nuevo Cliente */}
            {isNewClient && (
              <div className="space-y-3 p-3 bg-blue-50 rounded-lg">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nombre Completo
                  </label>
                  <input
                    type="text"
                    name="nombre_completo"
                    value={newClientData.nombre_completo}
                    onChange={handleNewClientChange}
                    placeholder="Ej: Juan Pérez"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    DNI
                  </label>
                  <input
                    type="text"
                    name="dni"
                    value={newClientData.dni}
                    onChange={handleNewClientChange}
                    placeholder="Ej: 12345678"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={newClientData.email}
                    onChange={handleNewClientChange}
                    placeholder="Ej: juan@example.com"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Teléfono
                  </label>
                  <input
                    type="tel"
                    name="telefono"
                    value={newClientData.telefono}
                    onChange={handleNewClientChange}
                    placeholder="Ej: +54 9 11 1234-5678"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                  />
                </div>
              </div>
            )}

            {/* Fecha Entrada */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Fecha de Entrada
              </label>
              <input
                type="date"
                name="fecha_entrada"
                value={formData.fecha_entrada}
                onChange={handleChange}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Fecha Salida */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Fecha de Salida
              </label>
              <input
                type="date"
                name="fecha_salida"
                value={formData.fecha_salida}
                onChange={handleChange}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Error */}
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex gap-2">
                <AlertCircle className="text-red-600 mt-0.5 flex-shrink-0" size={18} />
                <p className="text-red-700 text-sm">{error}</p>
              </div>
            )}

            {/* Botones */}
            <div className="flex gap-2 pt-4 border-t">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 font-medium transition"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={loading || loadingClientes}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium disabled:opacity-50 transition"
              >
                {loading ? 'Guardando...' : 'Guardar Reserva'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

export default BookingModal;
