import React, { useState, useEffect } from 'react';
import { AlertCircle, Trash2, Calendar, User, Home, ShoppingCart, LogOut, X } from 'lucide-react';
import api from '../api.js';

/**
 * ReservationsView Component
 * Panel de administración para ver, eliminar reservas, agregar consumos y hacer checkout
 */
function ReservationsView() {
  const [reservations, setReservations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Estados para modal de consumos
  const [isConsumoModalOpen, setIsConsumoModalOpen] = useState(false);
  const [selectedReserva, setSelectedReserva] = useState(null);
  const [productos, setProductos] = useState([]);
  const [consumoForm, setConsumoForm] = useState({ producto_id: '', cantidad: 1 });

  // Cargar reservas al montar
  useEffect(() => {
    loadReservations();
  }, []);

  const loadReservations = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.get('/reservas');
      console.log('ReservationsView - Respuesta de API:', response.data);
      const data = Array.isArray(response.data) ? response.data : [];
      setReservations(data);
    } catch (err) {
      setError('Error al cargar reservas');
      console.error('ReservationsView - Error:', err);
      setReservations([]);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (reservation) => {
    const confirmMsg = `¿Estás seguro de eliminar la reserva #${reservation.id}?\n\nHabitación: ${reservation.habitacion?.numero || reservation.habitacion_id}\nCliente: ${reservation.cliente?.nombre_completo || reservation.cliente_id}\nFechas: ${reservation.fecha_entrada} - ${reservation.fecha_salida}`;
    
    if (!confirm(confirmMsg)) {
      return;
    }
    
    try {
      await api.delete(`/reservas/${reservation.id}`);
      alert('✅ Reserva eliminada correctamente');
      loadReservations();
    } catch (err) {
      alert(`❌ Error: ${err.response?.data?.detail || 'No se pudo eliminar la reserva'}`);
    }
  };

  // --- CHECKOUT ---
  const handleCheckout = async (reservation) => {
    const clienteName = reservation.cliente?.nombre_completo || `Cliente #${reservation.cliente_id}`;
    if (!window.confirm(`¿Confirmas la salida de ${clienteName}?\n\nSi es antes de la fecha prevista, se recalculará el total.`)) {
      return;
    }
    
    try {
      const response = await api.put(`/reservas/${reservation.id}/checkout`);
      alert(`✅ ${response.data.mensaje}\n\nFecha salida: ${response.data.fecha_salida_final}\nTotal final: $${response.data.precio_total_final.toFixed(2)}`);
      loadReservations();
    } catch (err) {
      alert('❌ Error al hacer checkout: ' + (err.response?.data?.detail || err.message));
    }
  };

  // --- CONSUMOS ---
  const loadProductos = async () => {
    try {
      const response = await api.get('/productos');
      setProductos(response.data || []);
    } catch (err) {
      console.error('Error al cargar productos:', err);
    }
  };

  const openConsumoModal = async (reservation) => {
    setSelectedReserva(reservation);
    setConsumoForm({ producto_id: '', cantidad: 1 });
    await loadProductos();
    setIsConsumoModalOpen(true);
  };

  const handleAddConsumo = async (e) => {
    e.preventDefault();
    if (!consumoForm.producto_id) {
      alert('Selecciona un producto');
      return;
    }
    
    try {
      await api.post(`/reservas/${selectedReserva.id}/consumos`, {
        producto_id: parseInt(consumoForm.producto_id),
        cantidad: parseInt(consumoForm.cantidad)
      });
      alert('✅ Consumo agregado correctamente');
      setIsConsumoModalOpen(false);
      loadReservations();
    } catch (err) {
      alert('❌ Error: ' + (err.response?.data?.detail || 'No se pudo agregar el consumo'));
    }
  };

  // Verificar si la reserva está activa (puede recibir consumos/checkout)
  const isReservaActiva = (reservation) => {
    const estado = reservation.estado?.toUpperCase();
    return estado === 'CHECKIN' || estado === 'PENDIENTE' || estado === 'CONFIRMADA';
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('es-ES', { 
      day: '2-digit', 
      month: '2-digit', 
      year: 'numeric' 
    });
  };

  const getStatusBadge = (estado) => {
    const badges = {
      'PENDIENTE': 'bg-yellow-100 text-yellow-800',
      'CHECKIN': 'bg-green-100 text-green-800',
      'CHECKOUT': 'bg-blue-100 text-blue-800',
      'CANCELADA': 'bg-red-100 text-red-800',
    };
    return badges[estado] || 'bg-gray-100 text-gray-800';
  };

  // Renderizar estado de carga
  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
          <p className="text-gray-600 font-medium">Cargando reservas...</p>
        </div>
      </div>
    );
  }

  // Renderizar error
  if (error) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
        <AlertCircle className="text-red-600 mt-0.5" size={20} />
        <div>
          <h3 className="font-bold text-red-800">Error</h3>
          <p className="text-red-700">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Gestión de Reservas</h1>
          <p className="text-gray-600 mt-1">
            Total: <strong>{reservations.length}</strong> reservas registradas
          </p>
        </div>
      </div>

      {/* Tabla de Reservas */}
      {reservations.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg border border-gray-200">
          <p className="text-gray-600 font-medium">No hay reservas registradas aún</p>
        </div>
      ) : (
        <div className="overflow-x-auto bg-white rounded-lg shadow">
          <table className="w-full">
            <thead className="bg-gray-100 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">ID</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">
                  <div className="flex items-center gap-1">
                    <Home size={14} />
                    Habitación
                  </div>
                </th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">
                  <div className="flex items-center gap-1">
                    <User size={14} />
                    Cliente
                  </div>
                </th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">
                  <div className="flex items-center gap-1">
                    <Calendar size={14} />
                    Entrada
                  </div>
                </th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">
                  <div className="flex items-center gap-1">
                    <Calendar size={14} />
                    Salida
                  </div>
                </th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Estado</th>
                <th className="px-4 py-3 text-right text-sm font-semibold text-gray-900">Total</th>
                <th className="px-4 py-3 text-center text-sm font-semibold text-gray-900">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {reservations.map((reservation, index) => (
                <tr
                  key={reservation.id}
                  className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}
                >
                  <td className="px-4 py-4 text-sm text-gray-700">#{reservation.id}</td>
                  <td className="px-4 py-4 text-sm font-medium text-gray-900">
                    🛏️ {reservation.habitacion?.numero || reservation.habitacion_id}
                  </td>
                  <td className="px-4 py-4 text-sm text-gray-700">
                    {reservation.cliente?.nombre_completo || `Cliente #${reservation.cliente_id}`}
                  </td>
                  <td className="px-4 py-4 text-sm text-gray-700">
                    {formatDate(reservation.fecha_entrada)}
                  </td>
                  <td className="px-4 py-4 text-sm text-gray-700">
                    {formatDate(reservation.fecha_salida)}
                  </td>
                  <td className="px-4 py-4">
                    <span className={`px-2 py-1 text-xs font-semibold rounded ${getStatusBadge(reservation.estado)}`}>
                      {reservation.estado}
                    </span>
                  </td>
                  <td className="px-4 py-4 text-sm font-semibold text-green-600 text-right">
                    ${reservation.precio_total?.toFixed(2) || '0.00'}
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex items-center justify-center gap-1">
                      {isReservaActiva(reservation) && (
                        <>
                          <button
                            onClick={() => openConsumoModal(reservation)}
                            className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition text-xs font-medium"
                            title="Agregar consumo"
                          >
                            <ShoppingCart size={14} />
                            Consumo
                          </button>
                          <button
                            onClick={() => handleCheckout(reservation)}
                            className="inline-flex items-center gap-1 px-2 py-1 bg-gray-700 text-white rounded hover:bg-gray-800 transition text-xs font-medium"
                            title="Hacer checkout"
                          >
                            <LogOut size={14} />
                            Checkout
                          </button>
                        </>
                      )}
                      <button
                        onClick={() => handleDelete(reservation)}
                        className="inline-flex items-center gap-1 px-2 py-1 bg-red-100 text-red-700 rounded hover:bg-red-200 transition text-xs font-medium"
                        title="Eliminar reserva"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* --- MODAL DE CONSUMOS --- */}
      {isConsumoModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 w-96 shadow-xl">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold">Agregar Consumo</h3>
              <button onClick={() => setIsConsumoModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            </div>
            <p className="mb-4 text-sm text-gray-600">
              Reserva #{selectedReserva?.id} - {selectedReserva?.cliente?.nombre_completo || 'Cliente'}
            </p>
            
            <form onSubmit={handleAddConsumo}>
              <label className="block text-sm font-medium mb-1">Producto</label>
              <select 
                className="w-full border p-2 rounded mb-3"
                value={consumoForm.producto_id}
                onChange={e => setConsumoForm({...consumoForm, producto_id: e.target.value})}
                required
              >
                <option value="">Seleccionar...</option>
                {productos.map(p => (
                  <option key={p.id} value={p.id}>{p.nombre} - ${p.precio}</option>
                ))}
              </select>

              <label className="block text-sm font-medium mb-1">Cantidad</label>
              <input 
                type="number" 
                min="1"
                className="w-full border p-2 rounded mb-6"
                value={consumoForm.cantidad}
                onChange={e => setConsumoForm({...consumoForm, cantidad: e.target.value})}
              />

              <div className="flex justify-end gap-2">
                <button 
                  type="button" 
                  onClick={() => setIsConsumoModalOpen(false)}
                  className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded"
                >
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  Guardar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default ReservationsView;
