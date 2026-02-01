import React, { useState, useEffect } from 'react';
import { AlertCircle, Calendar, Pencil, ChevronDown, ShoppingCart, FileText, X, Printer, Plus, Minus, Package, DollarSign } from 'lucide-react';
import api from '../api.js';
import BookingModal from './BookingModal';

/**
 * CalendarView Component
 * Visualiza disponibilidad de habitaciones por fecha (Máquina del Tiempo)
 * Selecciona una fecha y ve qué habitaciones estarán libres/ocupadas/en alerta en ese día
 * Incluye la misma lógica de semáforo y desplegables que RoomsView
 * Ahora incluye funcionalidad de ver y agregar consumos para habitaciones ocupadas
 */
function CalendarView() {
  // Obtener fecha local correctamente (evita problema de zona horaria con toISOString)
  const getLocalDateString = () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };
  
  const [fecha, setFecha] = useState(getLocalDateString());
  const [habitaciones, setHabitaciones] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
  const [expandedRoomId, setExpandedRoomId] = useState(null);
  
  // Estados para consumos
  const [isConsumosModalOpen, setIsConsumosModalOpen] = useState(false);
  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false);
  const [selectedRoomForConsumos, setSelectedRoomForConsumos] = useState(null);
  const [productos, setProductos] = useState([]);
  const [invoiceData, setInvoiceData] = useState(null);
  const [extraItems, setExtraItems] = useState([]);
  const [newItemForm, setNewItemForm] = useState({ concepto: '', cantidad: 1, precio: '' });

  // Estados para modal de pago
  const [isPagoModalOpen, setIsPagoModalOpen] = useState(false);
  const [selectedRoomForPago, setSelectedRoomForPago] = useState(null);
  const [pagoForm, setPagoForm] = useState({ tipo: 'seña', monto: '' });

  // Cargar disponibilidad al montar el componente y cuando cambia la fecha
  useEffect(() => {
    console.log('[CalendarView] Componente montado o fecha cambió, recargando...');
    loadDisponibilidad();
  }, [fecha]);
  
  // Recargar al montar el componente (por si cambia de pestaña)
  useEffect(() => {
    console.log('[CalendarView] Componente montado, forzando recarga inicial');
    loadDisponibilidad();
  }, []);

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

  // Cargar productos para el modal de consumos
  const loadProductos = async () => {
    try {
      const response = await api.get('/productos?solo_activos=true');
      setProductos(response.data || []);
    } catch (err) {
      console.error('Error al cargar productos:', err);
    }
  };

  // Abrir modal de agregar consumos
  const handleAddConsumos = async (habitacion) => {
    setSelectedRoomForConsumos(habitacion);
    await loadProductos();
    setIsConsumosModalOpen(true);
  };

  // Agregar un consumo a la reserva
  const handleAgregarConsumo = async (productoId) => {
    if (!selectedRoomForConsumos?.reserva_actual_id) return;
    try {
      await api.post(`/reservas/${selectedRoomForConsumos.reserva_actual_id}/consumos`, {
        producto_id: productoId,
        cantidad: 1
      });
      // Mostrar confirmación temporal
      alert('✅ Consumo agregado correctamente');
    } catch (err) {
      console.error('Error al agregar consumo:', err);
      alert('❌ Error al agregar consumo');
    }
  };

  // Abrir modal de ver consumos/comprobante
  const handleViewConsumos = async (habitacion) => {
    if (!habitacion.reserva_actual_id) return;
    try {
      const response = await api.get(`/reservas/${habitacion.reserva_actual_id}/cuenta`);
      setInvoiceData(response.data);
      setSelectedRoomForConsumos(habitacion);
      setExtraItems([]);
      setIsInvoiceModalOpen(true);
    } catch (err) {
      console.error('Error al cargar cuenta:', err);
      alert('Error al cargar los datos de la cuenta');
    }
  };

  // Funciones para el comprobante
  const handleAddExtraItem = () => {
    if (!newItemForm.concepto || !newItemForm.precio) return;
    const newItem = {
      concepto: newItemForm.concepto,
      cantidad: parseInt(newItemForm.cantidad) || 1,
      precio: parseFloat(newItemForm.precio) || 0
    };
    const newExtraItems = [...extraItems, newItem];
    setExtraItems(newExtraItems);
    setNewItemForm({ concepto: '', cantidad: 1, precio: '' });
    
    if (invoiceData) {
      const extraTotal = newExtraItems.reduce((sum, i) => sum + (i.cantidad * i.precio), 0);
      setInvoiceData({
        ...invoiceData,
        total_general: invoiceData.total_alojamiento + invoiceData.total_consumos + extraTotal
      });
    }
  };

  const handleRemoveExtraItem = (index) => {
    const newExtraItems = [...extraItems];
    newExtraItems.splice(index, 1);
    setExtraItems(newExtraItems);
    
    if (invoiceData) {
      const extraTotal = newExtraItems.reduce((sum, i) => sum + (i.cantidad * i.precio), 0);
      setInvoiceData({
        ...invoiceData,
        total_general: invoiceData.total_alojamiento + invoiceData.total_consumos + extraTotal
      });
    }
  };

  const handlePrint = () => {
    window.print();
  };

  // Abrir modal de pago
  const handleOpenPagoModal = (habitacion) => {
    setSelectedRoomForPago(habitacion);
    setPagoForm({ tipo: 'seña', monto: '' });
    setIsPagoModalOpen(true);
  };

  // Registrar pago como consumo negativo
  const handleRegistrarPago = async (e) => {
    e.preventDefault();
    if (!selectedRoomForPago?.reserva_actual_id || !pagoForm.monto) {
      alert('Por favor ingresa un monto válido');
      return;
    }

    const monto = parseFloat(pagoForm.monto);
    if (isNaN(monto) || monto <= 0) {
      alert('El monto debe ser un número mayor a 0');
      return;
    }

    // Buscar o crear producto de pago
    const concepto = pagoForm.tipo === 'seña' ? 'Seña/Adelanto' : 'Pago Completo';
    
    try {
      // Primero verificamos si existe el producto de pago
      let productoId = null;
      const productosResponse = await api.get('/productos');
      const productoExistente = productosResponse.data.find(p => p.nombre === concepto);
      
      if (productoExistente) {
        productoId = productoExistente.id;
        // Actualizar el precio del producto existente para que coincida con el monto negativo
        await api.put(`/productos/${productoId}`, {
          nombre: concepto,
          precio: -monto,
          activo: true
        });
      } else {
        // Crear el producto de pago con precio negativo
        const nuevoProducto = await api.post('/productos', {
          nombre: concepto,
          precio: -monto,
          activo: true
        });
        productoId = nuevoProducto.data.id;
      }

      // Registrar el consumo (con el precio negativo del producto)
      await api.post(`/reservas/${selectedRoomForPago.reserva_actual_id}/consumos`, {
        producto_id: productoId,
        cantidad: 1
      });

      alert(`✅ ${concepto} de $${monto.toFixed(2)} registrado correctamente`);
      setIsPagoModalOpen(false);
      loadDisponibilidad();
    } catch (err) {
      console.error('Error al registrar pago:', err);
      alert('❌ Error al registrar el pago: ' + (err.response?.data?.detail || err.message));
    }
  };

  // Formatear fecha para mostrar
  const formatDate = (dateStr) => {
    const date = new Date(dateStr + 'T00:00:00');
    return date.toLocaleDateString('es-ES', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  };

  // Formatear fecha corta (DD/MM/YYYY)
  const formatDateShort = (dateString) => {
    if (!dateString) return '';
    // Agregar T00:00:00 para evitar problemas de zona horaria
    const date = new Date(dateString + 'T00:00:00');
    return date.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });
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
            <div className="flex gap-2">
              <input
                type="date"
                value={fecha}
                onChange={(e) => setFecha(e.target.value)}
                className="px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-medium text-lg"
              />
              <button
                onClick={loadDisponibilidad}
                className="px-4 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition font-medium"
                title="Recargar"
              >
                🔄
              </button>
            </div>
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

                  {/* Botones de Consumos - Solo para habitaciones OCUPADAS */}
                  {hasActiveBooking && habitacion.reserva_actual_id && (
                    <div className="mt-3 space-y-2">
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          onClick={() => handleAddConsumos(habitacion)}
                          className="flex items-center justify-center gap-1 px-2 py-2 bg-purple-600 text-white rounded text-xs font-medium hover:bg-purple-700 transition"
                          title="Agregar consumo"
                        >
                          <ShoppingCart size={14} />
                          <span>+ Consumo</span>
                        </button>
                        <button
                          onClick={() => handleViewConsumos(habitacion)}
                          className="flex items-center justify-center gap-1 px-2 py-2 bg-amber-600 text-white rounded text-xs font-medium hover:bg-amber-700 transition"
                          title="Ver cuenta"
                        >
                          <FileText size={14} />
                          <span>Ver Cuenta</span>
                        </button>
                      </div>
                      {/* Botón de Pagar */}
                      <button
                        onClick={() => handleOpenPagoModal(habitacion)}
                        className="w-full flex items-center justify-center gap-1 px-2 py-2 bg-green-600 text-white rounded text-xs font-medium hover:bg-green-700 transition"
                        title="Registrar pago"
                      >
                        <DollarSign size={14} />
                        <span>💰 Registrar Pago</span>
                      </button>
                    </div>
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

      {/* Modal para agregar consumos */}
      {isConsumosModalOpen && selectedRoomForConsumos && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-2xl w-full max-w-lg max-h-[80vh] overflow-auto">
            <div className="flex items-center justify-between p-4 border-b bg-purple-50">
              <div>
                <h2 className="text-lg font-bold text-purple-800">
                  🛒 Agregar Consumo
                </h2>
                <p className="text-sm text-purple-600">
                  Habitación {selectedRoomForConsumos.numero} • {selectedRoomForConsumos.nombre_cliente}
                </p>
              </div>
              <button
                onClick={() => setIsConsumosModalOpen(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X size={24} />
              </button>
            </div>

            <div className="p-4">
              <p className="text-sm text-gray-600 mb-4">
                Selecciona un producto para agregarlo a la cuenta de la habitación:
              </p>
              
              {productos.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Package size={48} className="mx-auto mb-2 opacity-50" />
                  <p>No hay productos disponibles</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  {productos.map((producto) => (
                    <button
                      key={producto.id}
                      onClick={() => handleAgregarConsumo(producto.id)}
                      className="flex flex-col items-center p-4 bg-gray-50 border border-gray-200 rounded-lg hover:bg-purple-50 hover:border-purple-300 transition"
                    >
                      <span className="text-2xl mb-2">📦</span>
                      <span className="font-medium text-gray-800 text-center text-sm">
                        {producto.nombre}
                      </span>
                      <span className="text-purple-600 font-bold mt-1">
                        ${producto.precio.toFixed(2)}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3 p-4 border-t bg-gray-50">
              <button
                onClick={() => setIsConsumosModalOpen(false)}
                className="px-4 py-2 text-gray-600 hover:text-gray-800"
              >
                Cerrar
              </button>
              <button
                onClick={() => {
                  setIsConsumosModalOpen(false);
                  handleViewConsumos(selectedRoomForConsumos);
                }}
                className="flex items-center gap-2 px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700"
              >
                <FileText size={16} />
                Ver Cuenta
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Pago */}
      {isPagoModalOpen && selectedRoomForPago && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between p-4 border-b bg-green-50">
              <div>
                <h2 className="text-lg font-bold text-green-800">
                  💰 Registrar Pago
                </h2>
                <p className="text-sm text-green-600">
                  Habitación {selectedRoomForPago.numero} • {selectedRoomForPago.nombre_cliente}
                </p>
              </div>
              <button
                onClick={() => setIsPagoModalOpen(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleRegistrarPago} className="p-4">
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tipo de Pago
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setPagoForm({...pagoForm, tipo: 'seña'})}
                    className={`p-3 border-2 rounded-lg text-center transition ${
                      pagoForm.tipo === 'seña'
                        ? 'border-green-500 bg-green-50 text-green-700'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <span className="text-2xl block mb-1">💵</span>
                    <span className="font-medium">Seña/Adelanto</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setPagoForm({...pagoForm, tipo: 'completo'})}
                    className={`p-3 border-2 rounded-lg text-center transition ${
                      pagoForm.tipo === 'completo'
                        ? 'border-green-500 bg-green-50 text-green-700'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <span className="text-2xl block mb-1">✅</span>
                    <span className="font-medium">Pago Completo</span>
                  </button>
                </div>
              </div>

              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Monto a Registrar
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-lg">$</span>
                  <input
                    type="number"
                    value={pagoForm.monto}
                    onChange={(e) => setPagoForm({...pagoForm, monto: e.target.value})}
                    className="w-full pl-8 pr-4 py-3 border-2 border-gray-300 rounded-lg text-xl font-bold focus:border-green-500 focus:ring-2 focus:ring-green-200"
                    placeholder="0.00"
                    step="0.01"
                    min="0.01"
                    required
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Este monto se descontará del total de la cuenta
                </p>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t">
                <button
                  type="button"
                  onClick={() => setIsPagoModalOpen(false)}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex items-center gap-2 px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium"
                >
                  <DollarSign size={16} />
                  Registrar Pago
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Comprobante/Cuenta */}
      {isInvoiceModalOpen && invoiceData && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-2xl w-full max-w-4xl max-h-[95vh] overflow-auto">
            {/* Header del modal (no se imprime) */}
            <div className="flex items-center justify-between p-4 border-b no-print">
              <div>
                <h2 className="text-lg font-semibold">📋 Cuenta de Habitación</h2>
                <p className="text-sm text-gray-500">
                  Habitación {selectedRoomForConsumos?.numero} • Reserva #{invoiceData.reserva_id || selectedRoomForConsumos?.reserva_actual_id}
                </p>
              </div>
              <button
                onClick={() => setIsInvoiceModalOpen(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X size={20} />
              </button>
            </div>

            {/* Agregar item manual (no se imprime) */}
            <div className="p-4 bg-gray-50 border-b no-print">
              <p className="text-sm font-medium text-gray-700 mb-2">Agregar ítem manual (Descuento, Daños, etc.)</p>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Concepto"
                  value={newItemForm.concepto}
                  onChange={(e) => setNewItemForm({...newItemForm, concepto: e.target.value})}
                  className="flex-1 px-3 py-2 border rounded"
                />
                <input
                  type="number"
                  placeholder="Cant."
                  value={newItemForm.cantidad}
                  onChange={(e) => setNewItemForm({...newItemForm, cantidad: e.target.value})}
                  className="w-20 px-3 py-2 border rounded"
                  min="1"
                />
                <input
                  type="number"
                  placeholder="Precio"
                  value={newItemForm.precio}
                  onChange={(e) => setNewItemForm({...newItemForm, precio: e.target.value})}
                  className="w-24 px-3 py-2 border rounded"
                  step="0.01"
                />
                <button
                  onClick={handleAddExtraItem}
                  className="px-4 py-2 bg-yellow-500 text-white rounded hover:bg-yellow-600"
                >
                  <Plus size={16} />
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-1">Usa precio negativo para descuentos</p>
            </div>

            {/* Contenido del comprobante - DOS COPIAS (esto se imprime) */}
            <div id="invoice-content" className="bg-white print-area">
              {/* Contenedor de las dos copias una arriba de otra */}
              <div className="print-duplicado flex flex-col">
                {/* COPIA CLIENTE */}
                <div className="comprobante-copia p-4 flex-1 border-b-2 border-dashed border-gray-400">
                  {/* Etiqueta de copia */}
                  <div className="text-center mb-2">
                    <span className="inline-block px-3 py-1 bg-blue-100 text-blue-800 text-xs font-bold rounded-full uppercase">
                      Copia Cliente
                    </span>
                  </div>

                  {/* Cabecera del Hotel */}
                  <div className="text-center mb-4 border-b pb-3">
                    <h1 className="text-lg font-bold text-gray-800">🏨 PUENTE HOTEL</h1>
                    <p className="text-xs text-gray-400">Juan Bautista Alberdi 2350 • Tel: +5493572678258</p>
                  </div>

                  {/* Datos del comprobante */}
                  <div className="flex justify-between mb-3 text-xs">
                    <div>
                      <p className="font-bold">{invoiceData.cliente_nombre}</p>
                      <p className="text-gray-600">Hab: {invoiceData.habitacion_numero}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold">#{invoiceData.reserva_id || selectedRoomForConsumos?.reserva_actual_id}</p>
                      <p className="text-gray-600">{formatDateShort(new Date().toISOString().split('T')[0])}</p>
                    </div>
                  </div>

                  <div className="flex justify-between mb-3 p-2 bg-gray-50 rounded text-xs">
                    <div>
                      <span className="text-gray-500">Check-in:</span>
                      <p className="font-semibold">{formatDateShort(invoiceData.fecha_entrada)}</p>
                    </div>
                    <div className="text-right">
                      <span className="text-gray-500">Check-out:</span>
                      <p className="font-semibold">{formatDateShort(invoiceData.fecha_salida)}</p>
                    </div>
                  </div>

                  {/* Tabla de Items */}
                  <table className="w-full mb-3 text-xs">
                    <thead>
                      <tr className="border-b border-gray-300">
                        <th className="text-left py-1 font-semibold text-gray-600">Concepto</th>
                        <th className="text-center py-1 font-semibold text-gray-600">Cant.</th>
                        <th className="text-right py-1 font-semibold text-gray-600">Subtotal</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-b">
                        <td className="py-1">🛏️ Alojamiento ({invoiceData.noches} noches)</td>
                        <td className="text-center">{invoiceData.noches}</td>
                        <td className="text-right font-semibold">${invoiceData.total_alojamiento?.toFixed(2)}</td>
                      </tr>
                      {invoiceData.consumos?.map((consumo, idx) => (
                        <tr key={idx} className="border-b">
                          <td className="py-1">{consumo.producto_nombre}</td>
                          <td className="text-center">{consumo.cantidad}</td>
                          <td className="text-right">${consumo.subtotal?.toFixed(2)}</td>
                        </tr>
                      ))}
                      {extraItems.map((item, idx) => (
                        <tr key={`extra-${idx}`} className="border-b bg-yellow-50">
                          <td className="py-1">✏️ {item.concepto}</td>
                          <td className="text-center">{item.cantidad}</td>
                          <td className="text-right">${(item.cantidad * item.precio).toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  {/* Total */}
                  <div className="border-t-2 border-gray-300 pt-2">
                    <div className="flex justify-between items-center text-sm font-bold">
                      <span>TOTAL:</span>
                      <span className="text-green-700">
                        ${(invoiceData.total_alojamiento + invoiceData.total_consumos + extraItems.reduce((sum, i) => sum + (i.cantidad * i.precio), 0)).toFixed(2)}
                      </span>
                    </div>
                  </div>

                  {/* Pie */}
                  <div className="mt-3 pt-2 border-t text-center">
                    <p className="text-xs text-gray-500">¡Gracias por su preferencia!</p>
                    <p className="text-xs text-red-600 font-semibold mt-1">*No válido como factura</p>
                  </div>
                </div>

                {/* COPIA HOTEL */}
                <div className="comprobante-copia p-4 flex-1">
                  {/* Etiqueta de copia */}
                  <div className="text-center mb-2">
                    <span className="inline-block px-3 py-1 bg-green-100 text-green-800 text-xs font-bold rounded-full uppercase">
                      Copia Hotel
                    </span>
                  </div>

                  {/* Cabecera del Hotel */}
                  <div className="text-center mb-4 border-b pb-3">
                    <h1 className="text-lg font-bold text-gray-800">🏨 PUENTE HOTEL</h1>
                    <p className="text-xs text-gray-400">Juan Bautista Alberdi 2350 • Tel: +5493572678258</p>
                  </div>

                  {/* Datos del comprobante */}
                  <div className="flex justify-between mb-3 text-xs">
                    <div>
                      <p className="font-bold">{invoiceData.cliente_nombre}</p>
                      <p className="text-gray-600">Hab: {invoiceData.habitacion_numero}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold">#{invoiceData.reserva_id || selectedRoomForConsumos?.reserva_actual_id}</p>
                      <p className="text-gray-600">{formatDateShort(new Date().toISOString().split('T')[0])}</p>
                    </div>
                  </div>

                  <div className="flex justify-between mb-3 p-2 bg-gray-50 rounded text-xs">
                    <div>
                      <span className="text-gray-500">Check-in:</span>
                      <p className="font-semibold">{formatDateShort(invoiceData.fecha_entrada)}</p>
                    </div>
                    <div className="text-right">
                      <span className="text-gray-500">Check-out:</span>
                      <p className="font-semibold">{formatDateShort(invoiceData.fecha_salida)}</p>
                    </div>
                  </div>

                  {/* Tabla de Items */}
                  <table className="w-full mb-3 text-xs">
                    <thead>
                      <tr className="border-b border-gray-300">
                        <th className="text-left py-1 font-semibold text-gray-600">Concepto</th>
                        <th className="text-center py-1 font-semibold text-gray-600">Cant.</th>
                        <th className="text-right py-1 font-semibold text-gray-600">Subtotal</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-b">
                        <td className="py-1">🛏️ Alojamiento ({invoiceData.noches} noches)</td>
                        <td className="text-center">{invoiceData.noches}</td>
                        <td className="text-right font-semibold">${invoiceData.total_alojamiento?.toFixed(2)}</td>
                      </tr>
                      {invoiceData.consumos?.map((consumo, idx) => (
                        <tr key={idx} className="border-b">
                          <td className="py-1">{consumo.producto_nombre}</td>
                          <td className="text-center">{consumo.cantidad}</td>
                          <td className="text-right">${consumo.subtotal?.toFixed(2)}</td>
                        </tr>
                      ))}
                      {extraItems.map((item, idx) => (
                        <tr key={`extra-${idx}`} className="border-b bg-yellow-50">
                          <td className="py-1">✏️ {item.concepto}</td>
                          <td className="text-center">{item.cantidad}</td>
                          <td className="text-right">${(item.cantidad * item.precio).toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  {/* Total */}
                  <div className="border-t-2 border-gray-300 pt-2">
                    <div className="flex justify-between items-center text-sm font-bold">
                      <span>TOTAL:</span>
                      <span className="text-green-700">
                        ${(invoiceData.total_alojamiento + invoiceData.total_consumos + extraItems.reduce((sum, i) => sum + (i.cantidad * i.precio), 0)).toFixed(2)}
                      </span>
                    </div>
                  </div>

                  {/* Pie */}
                  <div className="mt-3 pt-2 border-t text-center">
                    <p className="text-xs text-gray-500">¡Gracias por su preferencia!</p>
                    <p className="text-xs text-red-600 font-semibold mt-1">*No válido como factura</p>
                  </div>

                  {/* Campo firma solo en copia hotel */}
                  <div className="mt-4 pt-3 border-t">
                    <div className="border-b border-gray-400 w-full mb-1" style={{height: '30px'}}></div>
                    <p className="text-xs text-gray-500 text-center">Firma del huésped</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Botones del modal (no se imprimen) */}
            <div className="flex justify-end gap-3 p-4 border-t bg-gray-50 no-print">
              <button
                onClick={() => setIsInvoiceModalOpen(false)}
                className="px-4 py-2 text-gray-600 hover:text-gray-800"
              >
                Cerrar
              </button>
              <button
                onClick={handlePrint}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                <Printer size={16} />
                Imprimir / Guardar PDF
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default CalendarView;
