import React, { useState, useEffect } from 'react';
import { AlertCircle, Calendar, Pencil, ChevronDown } from 'lucide-react';
import api from '../api.js';
import BookingModal from './BookingModal';

/**
 * CalendarView Component
 * Visualiza disponibilidad de habitaciones por fecha (Máquina del Tiempo)
 * Selecciona una fecha y ve qué habitaciones estarán libres/ocupadas/en alerta en ese día
 * Incluye la misma lógica de semáforo y desplegables que RoomsView
 */
function CalendarView() {
  const [fecha, setFecha] = useState(new Date().toISOString().split('T')[0]);
  const [habitaciones, setHabitaciones] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
  const [expandedRoomId, setExpandedRoomId] = useState(null);

  // Cargar disponibilidad cuando cambia la fecha
  useEffect(() => {
    loadDisponibilidad();
  }, [fecha]);

  const loadDisponibilidad = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.get(`/disponibilidad/?fecha=${fecha}`);
      console.log('CalendarView - Respuesta de API:', response.data);
      const data = Array.isArray(response.data) ? response.data : [];
      setHabitaciones(data);
    } catch (err) {
      setError('Error al cargar disponibilidad');
      console.error('CalendarView - Error:', err);
      setHabitaciones([]);
    } finally {
      setLoading(false);
    }
  };

  const toggleDropdown = (roomId) => {
    setExpandedRoomId(expandedRoomId === roomId ? null : roomId);
  };

  const handleBooking = (room) => {
    setSelectedRoom(room);
    setIsBookingModalOpen(true);
  };

  // Formatear fecha para mostrar
  const formatDate = (dateStr) => {
    const date = new Date(dateStr + 'T00:00:00');
    return date.toLocaleDateString('es-ES', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  // Formatear fecha corta (DD/MM)
  const formatDateShort = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit' });
  };

  return (
    <div className="max-w-7xl">
      {/* Header con selector de fecha */}
      <div className="mb-8">
        <div className="flex items-end gap-4">
          <div className="flex-1">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              📅 Disponibilidad por Fecha
            </h1>
            <p className="text-gray-600">
              Selecciona una fecha para ver el estado de todas las habitaciones
            </p>
          </div>

          {/* Input de Fecha */}
          <div className="bg-white rounded-lg shadow p-4 border-2 border-blue-500">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Selecciona una Fecha
            </label>
            <input
              type="date"
              value={fecha}
              onChange={(e) => setFecha(e.target.value)}
              className="px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-medium text-lg"
            />
          </div>
        </div>

        {/* Fecha seleccionada formateada */}
        <div className="mt-4 text-lg font-semibold text-blue-600">
          📍 {formatDate(fecha)}
        </div>
      </div>

      {/* Renderizar estado de carga */}
      {loading ? (
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
            <p className="text-gray-600 font-medium">Cargando disponibilidad...</p>
          </div>
        </div>
      ) : error ? (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
          <AlertCircle className="text-red-600 mt-0.5" size={20} />
          <div>
            <h3 className="font-bold text-red-800">Error</h3>
            <p className="text-red-700">{error}</p>
          </div>
        </div>
      ) : (
        <>
          {/* Resumen */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <div className="bg-green-50 rounded-lg p-4 border-2 border-green-200">
              <div className="text-3xl font-bold text-green-600">
                {habitaciones.filter((h) => !h.reserva_actual_fin && (!h.proximas_reservas || h.proximas_reservas.length === 0)).length}
              </div>
              <div className="text-sm text-green-700">Completamente Libres</div>
            </div>

            <div className="bg-yellow-50 rounded-lg p-4 border-2 border-yellow-200">
              <div className="text-3xl font-bold text-yellow-600">
                {habitaciones.filter((h) => !h.reserva_actual_fin && h.proximas_reservas && h.proximas_reservas.length > 0).length}
              </div>
              <div className="text-sm text-yellow-700">Libres pero Alertas</div>
            </div>

            <div className="bg-red-50 rounded-lg p-4 border-2 border-red-200">
              <div className="text-3xl font-bold text-red-600">
                {habitaciones.filter((h) => h.reserva_actual_fin).length}
              </div>
              <div className="text-sm text-red-700">Ocupadas</div>
            </div>
          </div>

          {/* Grid de Habitaciones - Con Lógica Inteligente */}
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {habitaciones.map((habitacion) => {
              // ============================================================
              // LÓGICA DE SEMÁFORO - IGUAL QUE ROOMSVIEW
              // ============================================================
              
              // 1. Detectar ocupación en esa fecha y reservas futuras
              const hasActiveBooking = habitacion.reserva_actual_fin !== null && 
                                       habitacion.reserva_actual_fin !== undefined;
              const tieneReservasFuturas = habitacion.proximas_reservas && 
                                           habitacion.proximas_reservas.length > 0;
              
              // 2. Lógica de Colores (Cascada de Prioridades) - IGUAL QUE ROOMSVIEW
              let borderColor = 'border-green-500';
              let bgColor = 'bg-green-50';
              let badgeColor = 'bg-green-100 text-green-800';
              let indicatorColor = 'bg-green-500';
              let statusText = '✅ Disponible';
              let showBookingInfo = false;
              let disableBooking = false;
              let buttonText = 'Reservar';
              
              // PRIORIDAD 1: Mantenimiento/Limpieza (ÚNICO CASO QUE DESHABILITA)
              if (habitacion.estado === 'MANTENIMIENTO' || habitacion.estado === 'LIMPIEZA') {
                borderColor = 'border-amber-500';
                bgColor = 'bg-amber-50';
                badgeColor = 'bg-amber-100 text-amber-800';
                indicatorColor = 'bg-amber-500';
                statusText = habitacion.estado === 'MANTENIMIENTO' ? '🔧 Mantenimiento' : '🧹 Limpieza';
                disableBooking = true;  // ← ÚNICO CASO DESHABILITADO
                buttonText = 'No Disponible';
              }
              // PRIORIDAD 2: OCUPADA EN ESA FECHA (PERO BOTÓN HABILITADO PARA RESERVAS FUTURAS)
              else if (hasActiveBooking) {
                borderColor = 'border-red-500';
                bgColor = 'bg-red-50';
                badgeColor = 'bg-red-100 text-red-800';
                indicatorColor = 'bg-red-500';
                statusText = '❌ Ocupada';
                showBookingInfo = true;
                disableBooking = false;  // ← HABILITADO para reservas futuras
                buttonText = 'Reservar Futuro';
              }
              // PRIORIDAD 3: LIBRE PERO CON RESERVAS FUTURAS (Amarillo de alerta)
              else if (tieneReservasFuturas) {
                borderColor = 'border-yellow-500';
                bgColor = 'bg-yellow-50';
                badgeColor = 'bg-yellow-100 text-yellow-800';
                indicatorColor = 'bg-yellow-500';
                statusText = '⚠️ Disponible (Reservada pronto)';
                disableBooking = false;
                buttonText = 'Reservar';
              }
              // PRIORIDAD 4: COMPLETAMENTE DISPONIBLE
              else {
                borderColor = 'border-green-500';
                bgColor = 'bg-green-50';
                badgeColor = 'bg-green-100 text-green-800';
                indicatorColor = 'bg-green-500';
                statusText = '✅ Disponible';
                disableBooking = false;
                buttonText = 'Reservar';
              }
              
              const isExpanded = expandedRoomId === habitacion.id;
              
              return (
                <div
                  key={habitacion.id}
                  className={`border-2 ${borderColor} ${bgColor} rounded-lg p-4 shadow-md hover:shadow-lg transition relative`}
                >
                  {/* Número de Habitación Grande */}
                  <div className="mb-3">
                    <div className="text-4xl font-bold text-gray-900">
                      {habitacion.numero}
                    </div>

                    {/* Nombre del cliente - Solo si está ocupada */}
                    {showBookingInfo && habitacion.nombre_cliente && (
                      <p className="text-sm font-semibold text-red-700 mt-1">
                        👤 {habitacion.nombre_cliente}
                      </p>
                    )}
                  </div>

                  {/* Indicador de Estado */}
                  <div className="flex items-center gap-2 mb-3">
                    <div className={`h-3 w-3 rounded-full ${indicatorColor}`}></div>
                    <span className={`text-xs font-semibold px-2 py-1 rounded ${badgeColor}`}>
                      {statusText}
                    </span>
                  </div>

                  {/* Información de Ocupación en esa Fecha */}
                  {showBookingInfo && habitacion.reserva_actual_inicio && habitacion.reserva_actual_fin && (
                    <div className="mb-3 p-2 bg-white border border-red-200 rounded">
                      <p className="text-xs text-red-700 font-medium">
                        📅 Del {formatDateShort(habitacion.reserva_actual_inicio)} al {formatDateShort(habitacion.reserva_actual_fin)}
                      </p>
                    </div>
                  )}

                  {/* Tipo y Precio */}
                  <div className="space-y-2 mb-4">
                    <div>
                      <p className="text-xs text-gray-600">Tipo</p>
                      <p className="font-semibold text-gray-900">
                        {habitacion.tipo === 'SIMPLE'
                          ? '🛏️ Simple'
                          : habitacion.tipo === 'DOBLE'
                          ? '🛏️🛏️ Doble'
                          : '👑 Suite'}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-600">Precio/Noche</p>
                      <p className="text-2xl font-bold text-blue-600">
                        ${habitacion.precio_base.toFixed(2)}
                      </p>
                    </div>
                  </div>

                  {/* Botón de Acción */}
                  {!disableBooking ? (
                    <button
                      onClick={() => handleBooking(habitacion)}
                      className={`w-full px-3 py-2 text-white rounded font-medium text-sm transition ${
                        hasActiveBooking 
                          ? 'bg-blue-600 hover:bg-blue-700' 
                          : 'bg-green-600 hover:bg-green-700'
                      }`}
                    >
                      {buttonText}
                    </button>
                  ) : (
                    <button
                      disabled
                      className="w-full px-3 py-2 bg-gray-400 text-white rounded font-medium text-sm cursor-not-allowed"
                    >
                      {buttonText}
                    </button>
                  )}

                  {/* Desplegable de Próximas Reservas */}
                  {tieneReservasFuturas && (
                    <div className="mt-3 border-t border-gray-200 pt-3">
                      <button
                        onClick={() => toggleDropdown(habitacion.id)}
                        className="w-full flex items-center justify-between px-2 py-1 text-xs font-medium text-gray-700 hover:bg-gray-100 rounded transition"
                      >
                        <span>📅 Ver próximas ({habitacion.proximas_reservas.length})</span>
                        <ChevronDown 
                          size={16} 
                          className={`transform transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                        />
                      </button>
                      
                      {/* Lista de próximas reservas */}
                      {isExpanded && (
                        <ul className="mt-2 space-y-2 text-xs">
                          {habitacion.proximas_reservas.map((reserva, idx) => (
                            <li key={idx} className="p-2 bg-white border border-gray-200 rounded">
                              <p className="font-semibold text-gray-800">{reserva.nombre_cliente}</p>
                              <p className="text-gray-600">
                                📌 {formatDateShort(reserva.fecha_entrada)} - {formatDateShort(reserva.fecha_salida)}
                              </p>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </>      )}

      {/* Modal para reservar */}
      <BookingModal
        isOpen={isBookingModalOpen}
        onClose={() => setIsBookingModalOpen(false)}
        room={selectedRoom}
        onSuccess={loadDisponibilidad}
      />
    </div>
  );
}

export default CalendarView;
