import React, { useState, useEffect } from 'react';
import { X, AlertCircle, ChevronLeft, ChevronRight } from 'lucide-react';
import api from '../api.js';

/**
 * BookingModal Component
 * Modal inteligente para crear reservas
 * Carga clientes dinámicamente y valida disponibilidad
 * Muestra calendario con días ocupados marcados en rojo
 */
function BookingModal({ isOpen, onClose, room, onSuccess }) {
  const [clientes, setClientes] = useState([]);
  const [loadingClientes, setLoadingClientes] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isNewClient, setIsNewClient] = useState(false);
  const [reservasHabitacion, setReservasHabitacion] = useState([]);
  const [formData, setFormData] = useState({
    cliente_id: '',
    fecha_entrada: '',
    fecha_salida: '',
    precio_noche: '',
  });
  const [newClientData, setNewClientData] = useState({
    nombre_completo: '',
    dni: '',
    email: '',
    telefono: '',
  });
  // Estado para el calendario visual
  const [calendarMonth, setCalendarMonth] = useState(new Date());

  // Cargar clientes al abrir el modal y establecer precio por defecto
  useEffect(() => {
    if (isOpen) {
      loadClientes();
      loadReservasHabitacion();
      // Establecer precio_noche con el precio base de la habitación
      if (room?.precio_base) {
        setFormData(prev => ({
          ...prev,
          precio_noche: room.precio_base.toString()
        }));
      }
      // Inicializar el calendario en el mes actual
      setCalendarMonth(new Date());
    }
  }, [isOpen, room]);

  // Cargar reservas de la habitación
  const loadReservasHabitacion = async () => {
    if (!room?.id) return;
    try {
      const response = await api.get(`/reservas?habitacion_id=${room.id}`);
      console.log('BookingModal - Reservas de habitación:', response.data);
      const reservas = Array.isArray(response.data) ? response.data : [];
      console.log('BookingModal - Reservas filtradas (estados):', reservas.map(r => ({ id: r.id, estado: r.estado, entrada: r.fecha_entrada, salida: r.fecha_salida })));
      setReservasHabitacion(reservas);
    } catch (err) {
      console.error('Error al cargar reservas de habitación:', err);
      setReservasHabitacion([]);
    }
  };

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
      const reservaData = {
        habitacion_id: room.id,
        cliente_id: clienteId,
        fecha_entrada: formData.fecha_entrada,
        fecha_salida: formData.fecha_salida,
      };
      
      // Solo incluir precio_noche si es diferente al precio base
      if (formData.precio_noche && parseFloat(formData.precio_noche) !== room.precio_base) {
        reservaData.precio_noche = parseFloat(formData.precio_noche);
      }
      
      console.log('Enviando reserva con datos:', reservaData);
      const response = await api.post('/reservas', reservaData);

      // Éxito
      alert(
        `✅ ¡Reserva Exitosa!\n\nID: ${response.data.id}\nTotal: $${response.data.precio_total.toFixed(2)}`
      );
      setFormData({ cliente_id: '', fecha_entrada: '', fecha_salida: '', precio_noche: '' });
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

  // Verificar si una fecha está ocupada por alguna reserva
  const isDateOccupied = (date) => {
    const checkDate = new Date(date);
    checkDate.setHours(0, 0, 0, 0);
    
    return reservasHabitacion.some(reserva => {
      // Solo considerar reservas activas (PENDIENTE o CHECKIN)
      // PENDIENTE = reserva confirmada esperando check-in
      // CHECKIN = huésped actualmente alojado
      if (reserva.estado !== 'PENDIENTE' && reserva.estado !== 'CHECKIN') {
        return false;
      }
      const entrada = new Date(reserva.fecha_entrada + 'T00:00:00');
      const salida = new Date(reserva.fecha_salida + 'T00:00:00');
      entrada.setHours(0, 0, 0, 0);
      salida.setHours(0, 0, 0, 0);
      // El día de salida no cuenta como ocupado (checkout)
      return checkDate >= entrada && checkDate < salida;
    });
  };

  // Obtener los días del mes para el calendario
  const getCalendarDays = () => {
    const year = calendarMonth.getFullYear();
    const month = calendarMonth.getMonth();
    
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    
    const days = [];
    const startPadding = firstDay.getDay(); // Días de padding al inicio
    
    // Días vacíos al inicio
    for (let i = 0; i < startPadding; i++) {
      days.push(null);
    }
    
    // Días del mes
    for (let d = 1; d <= lastDay.getDate(); d++) {
      days.push(new Date(year, month, d));
    }
    
    return days;
  };

  // Navegar meses en el calendario
  const prevMonth = () => {
    setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() - 1, 1));
  };

  const nextMonth = () => {
    setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 1));
  };

  // Formatear fecha para mostrar
  const formatMonthYear = (date) => {
    return date.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });
  };

  // Manejar click en día del calendario
  const handleDayClick = (date) => {
    if (!date || isDateOccupied(date)) return;
    
    const dateStr = date.toISOString().split('T')[0];
    
    if (!formData.fecha_entrada || (formData.fecha_entrada && formData.fecha_salida)) {
      // Empezar nueva selección
      setFormData(prev => ({
        ...prev,
        fecha_entrada: dateStr,
        fecha_salida: ''
      }));
    } else {
      // Ya hay fecha de entrada, establecer salida
      if (new Date(dateStr) > new Date(formData.fecha_entrada)) {
        // Verificar que no haya días ocupados en el rango
        const start = new Date(formData.fecha_entrada);
        const end = new Date(dateStr);
        let hasOccupiedInRange = false;
        
        for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
          if (isDateOccupied(d)) {
            hasOccupiedInRange = true;
            break;
          }
        }
        
        if (hasOccupiedInRange) {
          setError('Hay días ocupados en el rango seleccionado');
          return;
        }
        
        setFormData(prev => ({
          ...prev,
          fecha_salida: dateStr
        }));
        setError(null);
      } else {
        // Si la fecha es anterior, reiniciar con esta como entrada
        setFormData(prev => ({
          ...prev,
          fecha_entrada: dateStr,
          fecha_salida: ''
        }));
      }
    }
  };

  // Verificar si un día está en el rango seleccionado
  const isInSelectedRange = (date) => {
    if (!date || !formData.fecha_entrada) return false;
    const checkDate = new Date(date);
    checkDate.setHours(0, 0, 0, 0);
    
    const entrada = new Date(formData.fecha_entrada + 'T00:00:00');
    entrada.setHours(0, 0, 0, 0);
    
    if (!formData.fecha_salida) {
      return checkDate.getTime() === entrada.getTime();
    }
    
    const salida = new Date(formData.fecha_salida + 'T00:00:00');
    salida.setHours(0, 0, 0, 0);
    
    return checkDate >= entrada && checkDate <= salida;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 overflow-y-auto py-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-lg p-6 max-h-[95vh] overflow-y-auto">
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

            {/* Calendario Visual con Días Ocupados */}
            <div className="border border-gray-200 rounded-lg p-3 bg-gray-50">
              <div className="flex items-center justify-between mb-3">
                <button
                  type="button"
                  onClick={prevMonth}
                  className="p-1 hover:bg-gray-200 rounded transition"
                >
                  <ChevronLeft size={20} />
                </button>
                <span className="font-medium text-gray-800 capitalize">
                  {formatMonthYear(calendarMonth)}
                </span>
                <button
                  type="button"
                  onClick={nextMonth}
                  className="p-1 hover:bg-gray-200 rounded transition"
                >
                  <ChevronRight size={20} />
                </button>
              </div>
              
              {/* Días de la semana */}
              <div className="grid grid-cols-7 gap-1 mb-1">
                {['Do', 'Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sa'].map(day => (
                  <div key={day} className="text-center text-xs font-medium text-gray-500 py-1">
                    {day}
                  </div>
                ))}
              </div>
              
              {/* Días del mes */}
              <div className="grid grid-cols-7 gap-1">
                {getCalendarDays().map((date, index) => {
                  if (!date) {
                    return <div key={`empty-${index}`} className="h-8" />;
                  }
                  
                  const isOccupied = isDateOccupied(date);
                  const isSelected = isInSelectedRange(date);
                  const isToday = new Date().toDateString() === date.toDateString();
                  const isPast = date < new Date(new Date().setHours(0, 0, 0, 0));
                  
                  return (
                    <button
                      key={date.toISOString()}
                      type="button"
                      onClick={() => handleDayClick(date)}
                      disabled={isOccupied || isPast}
                      className={`h-8 w-full text-xs rounded transition font-medium
                        ${isOccupied 
                          ? 'bg-red-500 text-white cursor-not-allowed' 
                          : isPast
                            ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                            : isSelected
                              ? 'bg-blue-500 text-white'
                              : isToday
                                ? 'bg-blue-100 text-blue-800 hover:bg-blue-200'
                                : 'hover:bg-gray-200 text-gray-700'
                        }`}
                      title={isOccupied ? 'Día ocupado' : isPast ? 'Fecha pasada' : 'Disponible'}
                    >
                      {date.getDate()}
                    </button>
                  );
                })}
              </div>
              
              {/* Leyenda */}
              <div className="flex items-center gap-4 mt-3 pt-2 border-t border-gray-200">
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 bg-red-500 rounded"></div>
                  <span className="text-xs text-gray-600">Ocupado</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 bg-blue-500 rounded"></div>
                  <span className="text-xs text-gray-600">Seleccionado</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 bg-gray-100 border border-gray-300 rounded"></div>
                  <span className="text-xs text-gray-600">Pasado</span>
                </div>
              </div>
            </div>

            {/* Precio por Noche (Editable) */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Precio por Noche
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                <input
                  type="number"
                  name="precio_noche"
                  value={formData.precio_noche}
                  onChange={handleChange}
                  min="0"
                  step="0.01"
                  placeholder={room?.precio_base?.toString() || '0'}
                  className="w-full pl-8 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Precio base: ${room?.precio_base?.toFixed(2) || '0.00'} — Modifícalo si es necesario
              </p>
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
