import React, { useState, useEffect } from 'react';
import { AlertCircle, Trash2, Calendar, User, Home, ShoppingCart, LogOut, X, DollarSign /*, Edit */ } from 'lucide-react';
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

  // Estados para modal de pago
  const [isPagoModalOpen, setIsPagoModalOpen] = useState(false);
  const [selectedReservaForPago, setSelectedReservaForPago] = useState(null);
  const [pagoForm, setPagoForm] = useState({ tipo: 'seña', monto: '' });

  // Estados para modal de edición (DESACTIVADO)
  // const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  // const [selectedReservaForEdit, setSelectedReservaForEdit] = useState(null);
  // const [habitacionesDisponibles, setHabitacionesDisponibles] = useState([]);
  // const [editForm, setEditForm] = useState({
  //   fecha_entrada: '',
  //   fecha_salida: '',
  //   habitacion_id: '',
  //   precio_total: '',
  //   estado: ''
  // });
  // const [editLoading, setEditLoading] = useState(false);

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

  const handleCancel = async (reservation) => {
    // No permitir cancelar si ya está en CHECKIN, FINALIZADA o CANCELADA
    const estado = reservation.estado?.toUpperCase();
    if (estado === 'CHECKIN') {
      alert('⚠️ No puedes cancelar una reserva que ya hizo Check-in. Usa Checkout en su lugar.');
      return;
    }
    if (estado === 'FINALIZADA' || estado === 'CANCELADA') {
      alert('⚠️ Esta reserva ya está finalizada o cancelada.');
      return;
    }
    
    const confirmMsg = `¿Estás seguro de CANCELAR la reserva #${reservation.id}?\n\nHabitación: ${reservation.habitacion?.numero || reservation.habitacion_id}\nCliente: ${reservation.cliente?.nombre_completo || reservation.cliente_id}\nFechas: ${reservation.fecha_entrada} - ${reservation.fecha_salida}\n\nLa reserva aparecerá en el historial como CANCELADA.`;
    
    if (!confirm(confirmMsg)) {
      return;
    }
    
    try {
      await api.put(`/reservas/${reservation.id}/cancelar`);
      alert('✅ Reserva cancelada correctamente');
      loadReservations();
    } catch (err) {
      alert(`❌ Error: ${err.response?.data?.detail || 'No se pudo cancelar la reserva'}`);
    }
  };

  // --- EDICION (DESACTIVADO) ---
  // const handleEdit = async (reservation) => {
  //   setSelectedReservaForEdit(reservation);
  //   setEditForm({
  //     fecha_entrada: reservation.fecha_entrada || '',
  //     fecha_salida: reservation.fecha_salida || '',
  //     habitacion_id: reservation.habitacion_id || '',
  //     precio_total: reservation.precio_total || '',
  //     estado: reservation.estado || ''
  //   });
  //   
  //   // Cargar habitaciones para el selector
  //   try {
  //     const response = await api.get('/habitaciones');
  //     setHabitacionesDisponibles(response.data || []);
  //   } catch (err) {
  //     console.error('Error al cargar habitaciones:', err);
  //   }
  //   
  //   setIsEditModalOpen(true);
  // };

  // const handleSaveEdit = async (e) => {
  //   e.preventDefault();
  //   
  //   if (!selectedReservaForEdit) return;
  //   
  //   // Validar fechas
  //   if (new Date(editForm.fecha_salida) <= new Date(editForm.fecha_entrada)) {
  //     alert('❌ La fecha de salida debe ser posterior a la fecha de entrada');
  //     return;
  //   }
  //   
  //   try {
  //     setEditLoading(true);
  //     
  //     const datosActualizar = {
  //       fecha_entrada: editForm.fecha_entrada,
  //       fecha_salida: editForm.fecha_salida,
  //       habitacion_id: parseInt(editForm.habitacion_id),
  //       precio_total: parseFloat(editForm.precio_total),
  //       estado: editForm.estado
  //     };
  //     
  //     await api.put(`/reservas/${selectedReservaForEdit.id}`, datosActualizar);
  //     
  //     alert('✅ Reserva actualizada correctamente');
  //     setIsEditModalOpen(false);
  //     loadReservations();
  //   } catch (err) {
  //     alert('❌ Error al actualizar: ' + (err.response?.data?.detail || err.message));
  //   } finally {
  //     setEditLoading(false);
  //   }
  // };

  // const calcularPrecioSugerido = () => {
  //   if (!editForm.fecha_entrada || !editForm.fecha_salida || !editForm.habitacion_id) return;
  //   
  //   const habitacion = habitacionesDisponibles.find(h => h.id === parseInt(editForm.habitacion_id));
  //   if (!habitacion) return;
  //   
  //   const entrada = new Date(editForm.fecha_entrada);
  //   const salida = new Date(editForm.fecha_salida);
  //   const noches = Math.ceil((salida - entrada) / (1000 * 60 * 60 * 24));
  //   
  //   if (noches > 0) {
  //     const precioSugerido = habitacion.precio_base * noches;
  //     setEditForm(prev => ({ ...prev, precio_total: precioSugerido.toString() }));
  //   }
  // };

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

  // --- PAGO ---
  const handleOpenPagoModal = (reservation) => {
    setSelectedReservaForPago(reservation);
    setPagoForm({ tipo: 'seña', monto: '' });
    setIsPagoModalOpen(true);
  };

  const handleRegistrarPago = async (e) => {
    e.preventDefault();
    
    if (!pagoForm.monto || parseFloat(pagoForm.monto) <= 0) {
      alert('Ingresa un monto válido mayor a 0');
      return;
    }

    try {
      // Crear producto temporal para el pago (precio negativo = abono)
      const nombrePago = pagoForm.tipo === 'seña' ? 'Seña/Adelanto' : 'Pago Completo';
      const montoPago = parseFloat(pagoForm.monto);
      
      // Buscar si existe un producto con ese nombre, si no crearlo
      let productoId = null;
      const productosResponse = await api.get('/productos');
      const productoExistente = productosResponse.data.find(p => p.nombre === nombrePago);
      
      if (productoExistente) {
        // Actualizar precio del producto existente
        await api.put(`/productos/${productoExistente.id}`, {
          nombre: nombrePago,
          precio: -montoPago,
          activo: true
        });
        productoId = productoExistente.id;
      } else {
        // Crear nuevo producto con precio negativo
        const nuevoProducto = await api.post('/productos', {
          nombre: nombrePago,
          precio: -montoPago,
          activo: true
        });
        productoId = nuevoProducto.data.id;
      }
      
      // Agregar consumo (que será un descuento por ser negativo)
      await api.post(`/reservas/${selectedReservaForPago.id}/consumos`, {
        producto_id: productoId,
        cantidad: 1
      });
      
      alert(`✅ ${nombrePago} de $${montoPago.toFixed(2)} registrado correctamente`);
      setIsPagoModalOpen(false);
      loadReservations();
    } catch (err) {
      alert('❌ Error: ' + (err.response?.data?.detail || 'No se pudo registrar el pago'));
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    // Agregar T00:00:00 para evitar problemas de zona horaria
    const date = new Date(dateString + 'T00:00:00');
    return date.toLocaleDateString('es-ES', { 
      day: '2-digit', 
      month: '2-digit', 
      year: 'numeric' 
    });
  };

  // Verificar si una fecha es hoy
  const isToday = (dateString) => {
    if (!dateString) return false;
    const date = new Date(dateString + 'T00:00:00');
    const today = new Date();
    return date.getDate() === today.getDate() &&
           date.getMonth() === today.getMonth() &&
           date.getFullYear() === today.getFullYear();
  };

  // Obtener estado visual (considera si debe hacer check-in hoy)
  const getEstadoVisual = (reservation) => {
    const estado = reservation.estado?.toUpperCase();
    // Si está PENDIENTE y la fecha de entrada es HOY, mostrar como "LLEGAHOY"
    if (estado === 'PENDIENTE' && isToday(reservation.fecha_entrada)) {
      return 'LLEGAHOY';
    }
    return estado;
  };

  const getStatusBadge = (estadoVisual) => {
    const badges = {
      'PENDIENTE': 'bg-yellow-100 text-yellow-800',
      'LLEGAHOY': 'bg-orange-500 text-white',  // Naranja para check-in pendiente hoy
      'CHECKIN': 'bg-green-500 text-white',    // Verde para activas
      'CHECKOUT': 'bg-blue-100 text-blue-800',
      'FINALIZADA': 'bg-gray-100 text-gray-800',
      'CANCELADA': 'bg-red-100 text-red-800',
    };
    return badges[estadoVisual] || 'bg-gray-100 text-gray-800';
  };

  // Texto amigable para estados (Primera letra mayúscula)
  const getStatusText = (estadoVisual) => {
    const textos = {
      'PENDIENTE': '⏳ Pendiente',
      'LLEGAHOY': '🔔 Check-in hoy',
      'CHECKIN': '🏠 Activa',
      'CHECKOUT': '📤 Checkout',
      'FINALIZADA': '✓ Finalizada',
      'CANCELADA': '✗ Cancelada',
    };
    return textos[estadoVisual] || estadoVisual;
  };

  // Determinar estado de pago basado en consumos
  const getEstadoPago = (reservation) => {
    const precioReserva = reservation.precio_total || 0;
    const consumos = reservation.consumos || [];
    
    // Calcular consumos positivos (productos, minibar, etc.)
    const totalConsumosPositivos = consumos
      .filter(c => c.precio_unitario > 0)
      .reduce((sum, c) => sum + (c.precio_unitario * c.cantidad), 0);
    
    // Calcular pagos (consumos negativos)
    const totalPagado = consumos
      .filter(c => c.precio_unitario < 0)
      .reduce((sum, c) => sum + Math.abs(c.precio_unitario * c.cantidad), 0);
    
    // Total a pagar = precio reserva + consumos extras
    const totalAPagar = precioReserva + totalConsumosPositivos;
    
    // Saldo pendiente
    const saldo = totalAPagar - totalPagado;
    
    // Si no hay ningún pago registrado
    if (totalPagado === 0) {
      return { estado: 'sin_pago', texto: 'No pagó', badge: 'bg-gray-100 text-gray-600' };
    }
    
    // Si el saldo es 0 o menor = Pagado
    if (saldo <= 0) {
      return { estado: 'pagado', texto: '✅ Pagado', badge: 'bg-green-100 text-green-700' };
    }
    
    // Tiene pagos pero hay saldo pendiente
    const estadoReserva = reservation.estado?.toUpperCase();
    const esActiva = estadoReserva === 'CHECKIN' || estadoReserva === 'PENDIENTE' || estadoReserva === 'CONFIRMADA';
    
    if (esActiva) {
      return { estado: 'senado', texto: `💰 Señado (Debe: $${saldo.toFixed(0)})`, badge: 'bg-yellow-100 text-yellow-700' };
    } else {
      return { estado: 'senado', texto: '💰 Señado', badge: 'bg-yellow-100 text-yellow-700' };
    }
  };

  // Ordenar reservas: CHECK-IN HOY primero, luego ACTIVAS, luego PENDIENTES
  const getEstadoPrioridad = (reservation) => {
    const estadoVisual = getEstadoVisual(reservation);
    const prioridades = {
      'LLEGAHOY': 0,    // Check-in pendiente hoy (máxima prioridad)
      'CHECKIN': 1,     // Activas (huésped alojado)
      'PENDIENTE': 2,   // Futuras
      'CONFIRMADA': 3,
      'CHECKOUT': 4,
      'FINALIZADA': 5,
      'CANCELADA': 6,
    };
    return prioridades[estadoVisual] ?? 99;
  };

  const sortedReservations = [...reservations].sort((a, b) => {
    // Primero ordenar por prioridad de estado
    const prioridadA = getEstadoPrioridad(a);
    const prioridadB = getEstadoPrioridad(b);
    
    if (prioridadA !== prioridadB) {
      return prioridadA - prioridadB;
    }
    
    // Si tienen el mismo estado, ordenar por fecha de entrada (más próxima primero)
    const fechaA = new Date(a.fecha_entrada + 'T00:00:00');
    const fechaB = new Date(b.fecha_entrada + 'T00:00:00');
    return fechaA - fechaB;
  });

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
    <div className="w-full max-w-full px-4">
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
                {/* <th className="px-2 py-3 text-center text-sm font-semibold text-gray-900 w-16">Editar</th> */}
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
                <th className="px-2 py-3 text-left text-sm font-semibold text-gray-900 w-28">
                  📧 Email
                </th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">
                  📞 Teléfono
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
                <th className="px-4 py-3 text-center text-sm font-semibold text-gray-900">
                  <div className="flex items-center justify-center gap-1">
                    <DollarSign size={14} />
                    Pago
                  </div>
                </th>
                <th className="px-4 py-3 text-right text-sm font-semibold text-gray-900">Total</th>
                <th className="px-4 py-3 text-center text-sm font-semibold text-gray-900">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {sortedReservations.map((reservation, index) => (
                <tr
                  key={reservation.id}
                  className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}
                >
                  {/* <td className="px-2 py-4 text-center">
                    <button
                      onClick={() => handleEdit(reservation)}
                      className="inline-flex items-center justify-center p-1 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded transition"
                      title="Editar reserva"
                    >
                      <Edit size={16} />
                    </button>
                  </td> */}
                  <td className="px-4 py-4 text-sm text-gray-700">#{reservation.id}</td>
                  <td className="px-4 py-4 text-sm font-medium text-gray-900">
                    🛏️ {reservation.habitacion?.numero || reservation.habitacion_id}
                  </td>
                  <td className="px-4 py-4 text-sm text-gray-700">
                    {reservation.cliente?.nombre_completo || `Cliente #${reservation.cliente_id}`}
                  </td>
                  <td className="px-2 py-4 text-sm text-gray-500 max-w-28 truncate" title={reservation.cliente?.email || ''}>
                    {reservation.cliente?.email || '-'}
                  </td>
                  <td className="px-4 py-4 text-sm text-gray-500">
                    {reservation.cliente?.telefono || '-'}
                  </td>
                  <td className="px-4 py-4 text-sm text-gray-700">
                    {formatDate(reservation.fecha_entrada)}
                  </td>
                  <td className="px-4 py-4 text-sm text-gray-700">
                    {formatDate(reservation.fecha_salida)}
                  </td>
                  <td className="px-4 py-4">
                    <span className={`px-2 py-1 text-xs font-semibold rounded ${getStatusBadge(getEstadoVisual(reservation))}`}>
                      {getStatusText(getEstadoVisual(reservation))}
                    </span>
                  </td>
                  <td className="px-4 py-4 text-center">
                    <span className={`px-2 py-1 text-xs font-semibold rounded ${getEstadoPago(reservation).badge}`}>
                      {getEstadoPago(reservation).texto}
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
                            onClick={() => handleOpenPagoModal(reservation)}
                            className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 rounded hover:bg-green-200 transition text-xs font-medium"
                            title="Registrar pago"
                          >
                            <DollarSign size={14} />
                            Pago
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
                      {reservation.estado !== 'CANCELADA' && reservation.estado !== 'FINALIZADA' && reservation.estado !== 'CHECKIN' && (
                        <button
                          onClick={() => handleCancel(reservation)}
                          className="inline-flex items-center gap-1 px-2 py-1 bg-red-100 text-red-700 rounded hover:bg-red-200 transition text-xs font-medium"
                          title="Cancelar reserva"
                        >
                          <Trash2 size={14} />
                          Cancelar
                        </button>
                      )}
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

      {/* --- MODAL DE PAGO --- */}
      {isPagoModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 w-96 shadow-xl">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold flex items-center gap-2">
                <DollarSign className="text-green-600" size={24} />
                Registrar Pago
              </h3>
              <button onClick={() => setIsPagoModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            </div>
            <p className="mb-4 text-sm text-gray-600">
              Reserva #{selectedReservaForPago?.id} - {selectedReservaForPago?.cliente?.nombre_completo || 'Cliente'}
            </p>
            <p className="mb-4 text-sm text-gray-500">
              Total reserva: <span className="font-semibold text-gray-700">${selectedReservaForPago?.precio_total?.toFixed(2) || '0.00'}</span>
            </p>
            
            <form onSubmit={handleRegistrarPago}>
              <label className="block text-sm font-medium mb-2">Tipo de Pago</label>
              <div className="flex gap-4 mb-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="tipoPago"
                    value="seña"
                    checked={pagoForm.tipo === 'seña'}
                    onChange={(e) => setPagoForm({...pagoForm, tipo: e.target.value})}
                    className="w-4 h-4 text-green-600"
                  />
                  <span className="text-sm">Seña / Adelanto</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="tipoPago"
                    value="completo"
                    checked={pagoForm.tipo === 'completo'}
                    onChange={(e) => setPagoForm({...pagoForm, tipo: e.target.value})}
                    className="w-4 h-4 text-green-600"
                  />
                  <span className="text-sm">Pago Completo</span>
                </label>
              </div>

              <label className="block text-sm font-medium mb-1">Monto ($)</label>
              <input 
                type="number" 
                min="0.01"
                step="0.01"
                className="w-full border p-2 rounded mb-6"
                placeholder="Ej: 50000"
                value={pagoForm.monto}
                onChange={(e) => setPagoForm({...pagoForm, monto: e.target.value})}
                required
              />

              <div className="flex justify-end gap-2">
                <button 
                  type="button" 
                  onClick={() => setIsPagoModalOpen(false)}
                  className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded"
                >
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 flex items-center gap-2"
                >
                  <DollarSign size={16} />
                  Registrar Pago
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- MODAL DE EDICIÓN (DESACTIVADO) ---
      {isEditModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-lg shadow-xl">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold flex items-center gap-2">
                <Edit className="text-blue-600" size={24} />
                Editar Reserva #{selectedReservaForEdit?.id}
              </h3>
              <button onClick={() => setIsEditModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            </div>
            
            <p className="mb-4 text-sm text-gray-600">
              Cliente: <span className="font-semibold">{selectedReservaForEdit?.cliente?.nombre_completo || 'N/A'}</span>
            </p>
            
            <form onSubmit={handleSaveEdit}>
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Fecha Entrada</label>
                  <input 
                    type="date"
                    className="w-full border p-2 rounded"
                    value={editForm.fecha_entrada}
                    onChange={(e) => setEditForm({...editForm, fecha_entrada: e.target.value})}
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Fecha Salida</label>
                  <input 
                    type="date"
                    className="w-full border p-2 rounded"
                    value={editForm.fecha_salida}
                    onChange={(e) => setEditForm({...editForm, fecha_salida: e.target.value})}
                    required
                  />
                </div>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium mb-1">Habitación</label>
                <select 
                  className="w-full border p-2 rounded"
                  value={editForm.habitacion_id}
                  onChange={(e) => setEditForm({...editForm, habitacion_id: e.target.value})}
                  required
                >
                  <option value="">Seleccionar habitación...</option>
                  {habitacionesDisponibles.map(hab => (
                    <option key={hab.id} value={hab.id}>
                      #{hab.numero} - {hab.tipo} (${hab.precio_base?.toLocaleString()}/noche)
                    </option>
                  ))}
                </select>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium mb-1">Precio Total ($)</label>
                <div className="flex gap-2">
                  <input 
                    type="number"
                    min="0"
                    step="0.01"
                    className="flex-1 border p-2 rounded"
                    value={editForm.precio_total}
                    onChange={(e) => setEditForm({...editForm, precio_total: e.target.value})}
                    required
                  />
                  <button
                    type="button"
                    onClick={calcularPrecioSugerido}
                    className="px-3 py-2 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 text-sm"
                    title="Recalcular según habitación y noches"
                  >
                    Recalcular
                  </button>
                </div>
              </div>

              <div className="mb-6">
                <label className="block text-sm font-medium mb-1">Estado</label>
                <select 
                  className="w-full border p-2 rounded"
                  value={editForm.estado}
                  onChange={(e) => setEditForm({...editForm, estado: e.target.value})}
                  required
                >
                  <option value="PENDIENTE">⏳ Pendiente</option>
                  <option value="CHECKIN">🏠 Check-in (Activa)</option>
                  <option value="FINALIZADA">✓ Finalizada</option>
                  <option value="CANCELADA">✗ Cancelada</option>
                </select>
              </div>

              <div className="flex justify-end gap-2">
                <button 
                  type="button" 
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded"
                >
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  disabled={editLoading}
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center gap-2 disabled:opacity-50"
                >
                  <Edit size={16} />
                  {editLoading ? 'Guardando...' : 'Guardar Cambios'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      */}
    </div>
  );
}

export default ReservationsView;
