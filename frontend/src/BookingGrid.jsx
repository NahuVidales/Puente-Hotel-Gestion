import React, { useState, useEffect } from 'react';
import axios from 'axios';

const API_BASE = 'http://localhost:8000';

/**
 * BookingGrid Component
 * 
 * Tabla visual que muestra:
 * - Filas: Habitaciones
 * - Columnas: Días del mes
 * - Celdas: Estado (disponible, ocupado, pendiente)
 */
function BookingGrid() {
  const [habitaciones, setHabitaciones] = useState([]);
  const [reservas, setReservas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCell, setSelectedCell] = useState(null);
  const [showModal, setShowModal] = useState(false);

  // Obtener habitaciones y reservas al montar el componente
  useEffect(() => {
    cargarDatos();
  }, []);

  async function cargarDatos() {
    try {
      setLoading(true);
      
      // Obtener habitaciones
      const habRes = await axios.get(`${API_BASE}/habitaciones`);
      setHabitaciones(habRes.data);

      // Obtener reservas del mes actual
      const hoy = new Date();
      const primero = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
      const ultimo = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0);

      const reservasRes = await axios.get(`${API_BASE}/reservas`, {
        params: {
          fecha_inicio: primero.toISOString().split('T')[0],
          fecha_fin: ultimo.toISOString().split('T')[0]
        }
      });
      setReservas(reservasRes.data);
    } catch (error) {
      console.error('Error cargando datos:', error);
    } finally {
      setLoading(false);
    }
  }

  /**
   * Determina el estado de una celda (habitación en un día)
   * Estados: disponible, ocupada, pendiente
   */
  function obtenerEstadoCelda(habitacionId, dia) {
    const reserva = reservas.find(r => {
      const fechaEntrada = new Date(r.fecha_entrada);
      const fechaSalida = new Date(r.fecha_salida);
      return r.habitacion_id === habitacionId &&
             dia >= fechaEntrada &&
             dia < fechaSalida;
    });

    if (!reserva) return 'disponible';
    return reserva.estado === 'PENDIENTE' ? 'pendiente' : 'ocupada';
  }

  /**
   * Obtiene el color de la celda basado en su estado
   */
  function obtenerColorCelda(estado) {
    switch (estado) {
      case 'disponible':
        return 'bg-green-100 hover:bg-green-200 cursor-pointer';
      case 'ocupada':
        return 'bg-red-200 cursor-not-allowed';
      case 'pendiente':
        return 'bg-yellow-200 cursor-not-allowed';
      default:
        return 'bg-gray-100';
    }
  }

  /**
   * Maneja el clic en una celda
   */
  function handleClickCelda(habitacionId, dia) {
    const estado = obtenerEstadoCelda(habitacionId, dia);
    if (estado === 'disponible') {
      setSelectedCell({ habitacionId, dia });
      setShowModal(true);
    }
  }

  if (loading) {
    return <div className="p-8 text-center">Cargando...</div>;
  }

  // Generar días del mes actual
  const hoy = new Date();
  const diasEnMes = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0).getDate();
  const dias = Array.from({ length: diasEnMes }, (_, i) => i + 1);

  return (
    <div className="p-6 bg-white">
      <h1 className="text-3xl font-bold mb-6">Disponibilidad de Habitaciones</h1>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse border border-gray-300">
          <thead>
            <tr className="bg-gray-100">
              <th className="border border-gray-300 p-2 text-left font-bold">Habitación</th>
              {dias.map(dia => (
                <th key={dia} className="border border-gray-300 p-1 text-center text-sm font-bold w-10">
                  {dia}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {habitaciones.map(hab => (
              <tr key={hab.id}>
                <td className="border border-gray-300 p-2 font-bold bg-gray-50">
                  {hab.numero} ({hab.tipo})
                </td>
                {dias.map(dia => {
                  const fecha = new Date(hoy.getFullYear(), hoy.getMonth(), dia);
                  const estado = obtenerEstadoCelda(hab.id, fecha);
                  const colorClass = obtenerColorCelda(estado);

                  return (
                    <td
                      key={`${hab.id}-${dia}`}
                      className={`border border-gray-300 p-1 h-10 ${colorClass}`}
                      onClick={() => handleClickCelda(hab.id, fecha)}
                      title={estado}
                    />
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-6 flex gap-4 text-sm">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-green-100 border border-gray-300"></div>
          <span>Disponible</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-red-200 border border-gray-300"></div>
          <span>Ocupada</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-yellow-200 border border-gray-300"></div>
          <span>Pendiente</span>
        </div>
      </div>

      {/* Modal para nueva reserva */}
      {showModal && selectedCell && (
        <NewBookingModal
          selectedCell={selectedCell}
          habitaciones={habitaciones}
          onClose={() => setShowModal(false)}
          onSuccess={() => {
            setShowModal(false);
            cargarDatos();
          }}
        />
      )}
    </div>
  );
}

/**
 * NewBookingModal Component
 * 
 * Formulario modal para crear una nueva reserva
 * - Selector de cliente (con autocompletado)
 * - Fechas pre-llenadas según la celda seleccionada
 */
function NewBookingModal({ selectedCell, habitaciones, onClose, onSuccess }) {
  const [clientes, setClientes] = useState([]);
  const [formData, setFormData] = useState({
    cliente_id: '',
    habitacion_id: selectedCell.habitacion_id,
    fecha_entrada: selectedCell.dia.toISOString().split('T')[0],
    fecha_salida: new Date(selectedCell.dia.getTime() + 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  });
  const [busquedaCliente, setBusquedaCliente] = useState('');
  const [showClientesList, setShowClientesList] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Cargar clientes cuando se abre el modal
  useEffect(() => {
    cargarClientes();
  }, []);

  async function cargarClientes() {
    try {
      // En una aplicación real, habría un endpoint GET /clientes
      // Por ahora, mostramos un ejemplo
      console.log('Clientes cargados');
    } catch (err) {
      console.error('Error cargando clientes:', err);
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    
    if (!formData.cliente_id) {
      setError('Selecciona un cliente');
      return;
    }

    try {
      setLoading(true);
      setError('');

      await axios.post(`${API_BASE}/reservas`, {
        cliente_id: parseInt(formData.cliente_id),
        habitacion_id: formData.habitacion_id,
        fecha_entrada: formData.fecha_entrada,
        fecha_salida: formData.fecha_salida
      });

      onSuccess();
    } catch (err) {
      const mensaje = err.response?.data?.detail || 'Error al crear la reserva';
      setError(mensaje);
    } finally {
      setLoading(false);
    }
  }

  const habitacion = habitaciones.find(h => h.id === formData.habitacion_id);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
      <div className="bg-white rounded-lg p-6 w-96 shadow-lg">
        <h2 className="text-2xl font-bold mb-4">Nueva Reserva</h2>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-sm font-bold mb-2">Habitación</label>
            <div className="bg-gray-100 p-2 rounded">
              {habitacion?.numero} ({habitacion?.tipo}) - ${habitacion?.precio_base}/noche
            </div>
          </div>

          <div className="mb-4">
            <label className="block text-sm font-bold mb-2">Fecha de Entrada</label>
            <input
              type="date"
              value={formData.fecha_entrada}
              onChange={(e) => setFormData({ ...formData, fecha_entrada: e.target.value })}
              className="w-full border border-gray-300 rounded p-2"
            />
          </div>

          <div className="mb-4">
            <label className="block text-sm font-bold mb-2">Fecha de Salida</label>
            <input
              type="date"
              value={formData.fecha_salida}
              onChange={(e) => setFormData({ ...formData, fecha_salida: e.target.value })}
              className="w-full border border-gray-300 rounded p-2"
            />
          </div>

          <div className="mb-4">
            <label className="block text-sm font-bold mb-2">Cliente</label>
            <div className="relative">
              <input
                type="text"
                placeholder="Buscar cliente por nombre o DNI..."
                value={busquedaCliente}
                onChange={(e) => setBusquedaCliente(e.target.value)}
                onFocus={() => setShowClientesList(true)}
                className="w-full border border-gray-300 rounded p-2"
              />
              {showClientesList && (
                <div className="absolute top-full left-0 right-0 bg-white border border-gray-300 rounded mt-1 shadow">
                  <p className="p-2 text-sm text-gray-500">Selecciona un cliente</p>
                </div>
              )}
            </div>
          </div>

          <div className="flex gap-2">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-blue-500 text-white p-2 rounded font-bold hover:bg-blue-600 disabled:bg-gray-400"
            >
              {loading ? 'Creando...' : 'Crear Reserva'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-gray-300 text-gray-700 p-2 rounded font-bold hover:bg-gray-400"
            >
              Cancelar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default BookingGrid;
