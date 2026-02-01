import React, { useState, useEffect } from 'react';
import { 
  Search, 
  UserCheck, 
  AlertTriangle, 
  Clock, 
  BedDouble, 
  User, 
  Mail, 
  Phone,
  Calendar,
  CheckCircle,
  RefreshCw,
  ArrowRight
} from 'lucide-react';
import api from '../api.js';

/**
 * CheckinView Component
 * Módulo de Check-in para formalizar la entrada de huéspedes
 */
function CheckinView() {
  // Estados principales
  const [llegadasHoy, setLlegadasHoy] = useState([]);
  const [searchResults, setSearchResults] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  
  // Estados para el proceso de check-in
  const [selectedReserva, setSelectedReserva] = useState(null);
  const [paso, setPaso] = useState(1); // 1: Selección, 2: Datos, 3: Habitación, 4: Confirmar
  const [datosCliente, setDatosCliente] = useState({
    nombre_completo: '',
    email: '',
    telefono: ''
  });
  
  // Estados para cambio de habitación
  const [habitacionesDisponibles, setHabitacionesDisponibles] = useState([]);
  const [mostrarCambioHabitacion, setMostrarCambioHabitacion] = useState(false);
  const [procesandoCheckin, setProcesandoCheckin] = useState(false);

  useEffect(() => {
    cargarLlegadasHoy();
  }, []);

  const cargarLlegadasHoy = async () => {
    try {
      setLoading(true);
      const response = await api.get('/checkin/llegadas-hoy');
      setLlegadasHoy(response.data || []);
    } catch (err) {
      console.error('Error al cargar llegadas:', err);
    } finally {
      setLoading(false);
    }
  };

  const buscarReservas = async (query) => {
    if (!query || query.length < 2) {
      setSearchResults([]);
      return;
    }
    
    try {
      setSearching(true);
      const response = await api.get(`/checkin/buscar?q=${encodeURIComponent(query)}`);
      setSearchResults(response.data || []);
    } catch (err) {
      console.error('Error en búsqueda:', err);
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  };

  const handleSearchChange = (e) => {
    const value = e.target.value;
    setSearchTerm(value);
    
    // Debounce de búsqueda
    clearTimeout(window.searchTimeout);
    window.searchTimeout = setTimeout(() => {
      buscarReservas(value);
    }, 300);
  };

  const seleccionarReserva = (reserva) => {
    setSelectedReserva(reserva);
    setDatosCliente({
      nombre_completo: reserva.cliente_nombre || '',
      email: reserva.cliente_email || '',
      telefono: reserva.cliente_telefono || ''
    });
    setPaso(2);
    setMostrarCambioHabitacion(false);
    
    // Verificar estado de habitación - usar el nuevo campo puede_checkin
    if (reserva.puede_checkin === false || 
        (reserva.habitacion_estado !== 'DISPONIBLE' && reserva.habitacion_estado !== 'OCUPADA')) {
      cargarHabitacionesDisponibles();
    }
  };

  const cargarHabitacionesDisponibles = async () => {
    try {
      const response = await api.get('/checkin/habitaciones-disponibles');
      setHabitacionesDisponibles(response.data || []);
    } catch (err) {
      console.error('Error al cargar habitaciones:', err);
    }
  };

  const cambiarHabitacion = async (nuevaHabitacionId) => {
    try {
      const response = await api.put(
        `/checkin/${selectedReserva.id}/cambiar-habitacion/${nuevaHabitacionId}`
      );
      
      // Actualizar la reserva seleccionada con la nueva habitación
      const nuevaHab = habitacionesDisponibles.find(h => h.id === nuevaHabitacionId);
      setSelectedReserva({
        ...selectedReserva,
        habitacion_id: nuevaHabitacionId,
        habitacion_numero: nuevaHab?.numero,
        habitacion_estado: 'DISPONIBLE',
        precio_total: response.data.precio_nuevo
      });
      
      setMostrarCambioHabitacion(false);
      alert('✅ Habitación cambiada correctamente');
    } catch (err) {
      alert('❌ Error al cambiar habitación: ' + (err.response?.data?.detail || err.message));
    }
  };

  const realizarCheckin = async () => {
    if (!selectedReserva) return;
    
    // Verificar si puede hacer check-in usando el nuevo campo del backend
    if (selectedReserva.puede_checkin === false) {
      alert(`⚠️ No se puede hacer check-in: ${selectedReserva.motivo_bloqueo || 'La habitación no está disponible'}`);
      return;
    }
    
    // Fallback: verificar manualmente MANTENIMIENTO o LIMPIEZA
    if (selectedReserva.habitacion_estado === 'MANTENIMIENTO' || selectedReserva.habitacion_estado === 'LIMPIEZA') {
      alert(`⚠️ La habitación está en ${selectedReserva.habitacion_estado}. Por favor, asigna otra habitación o espera a que esté lista.`);
      return;
    }
    
    try {
      setProcesandoCheckin(true);
      
      const response = await api.post(`/checkin/${selectedReserva.id}`, {
        nombre_completo: datosCliente.nombre_completo,
        email: datosCliente.email,
        telefono: datosCliente.telefono
      });
      
      alert(`✅ Check-in realizado correctamente\n\nHabitación: ${response.data.habitacion}\nHuésped: ${response.data.cliente}\nHora: ${new Date(response.data.checkin_timestamp).toLocaleString('es-ES')}`);
      
      // Resetear y recargar
      setSelectedReserva(null);
      setPaso(1);
      setSearchTerm('');
      setSearchResults([]);
      cargarLlegadasHoy();
      
    } catch (err) {
      alert('❌ Error al realizar check-in: ' + (err.response?.data?.detail || err.message));
    } finally {
      setProcesandoCheckin(false);
    }
  };

  const cancelarProceso = () => {
    setSelectedReserva(null);
    setPaso(1);
    setMostrarCambioHabitacion(false);
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleDateString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  // Renderizar lista de reservas (llegadas hoy o resultados de búsqueda)
  const renderListaReservas = (reservas, titulo) => (
    <div className="bg-white rounded-lg shadow-sm border">
      <div className="px-4 py-3 border-b bg-gray-50">
        <h3 className="font-semibold text-gray-700">{titulo}</h3>
      </div>
      {reservas.length === 0 ? (
        <div className="p-8 text-center text-gray-500">
          No hay reservas para mostrar
        </div>
      ) : (
        <div className="divide-y">
          {reservas.map((reserva) => (
            <div
              key={reserva.id}
              className="p-4 hover:bg-blue-50 cursor-pointer transition-colors"
              onClick={() => seleccionarReserva(reserva)}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
                    <User className="text-blue-600" size={24} />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">{reserva.cliente_nombre}</p>
                    <p className="text-sm text-gray-500">DNI: {reserva.cliente_dni}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-medium text-gray-700">
                    <BedDouble size={16} className="inline mr-1" />
                    Hab. {reserva.habitacion_numero}
                  </p>
                  <p className="text-sm text-gray-500">
                    {reserva.noches} {reserva.noches === 1 ? 'noche' : 'noches'}
                  </p>
                </div>
                <ArrowRight className="text-gray-400" size={20} />
              </div>
              {reserva.habitacion_estado !== 'DISPONIBLE' && (
                <div className="mt-2 flex items-center gap-2 text-amber-600 text-sm">
                  <AlertTriangle size={14} />
                  Habitación en estado: {reserva.habitacion_estado}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );

  // Loading
  if (loading && !selectedReserva) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        <span className="ml-3 text-gray-600">Cargando llegadas de hoy...</span>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <UserCheck className="text-green-600" />
          Módulo de Check-in
        </h1>
        <p className="text-gray-500 mt-1">Registra la entrada de huéspedes</p>
      </div>

      {/* Indicador de pasos */}
      <div className="mb-6 flex items-center justify-center gap-2">
        {[1, 2, 3, 4].map((p) => (
          <React.Fragment key={p}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
              paso >= p ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-500'
            }`}>
              {p}
            </div>
            {p < 4 && (
              <div className={`w-12 h-1 ${paso > p ? 'bg-blue-600' : 'bg-gray-200'}`}></div>
            )}
          </React.Fragment>
        ))}
      </div>
      <div className="mb-8 flex justify-center gap-8 text-xs text-gray-500">
        <span className={paso >= 1 ? 'text-blue-600 font-medium' : ''}>Selección</span>
        <span className={paso >= 2 ? 'text-blue-600 font-medium' : ''}>Datos</span>
        <span className={paso >= 3 ? 'text-blue-600 font-medium' : ''}>Habitación</span>
        <span className={paso >= 4 ? 'text-blue-600 font-medium' : ''}>Confirmar</span>
      </div>

      {/* PASO 1: Búsqueda y Selección */}
      {paso === 1 && (
        <div className="space-y-6">
          {/* Barra de búsqueda */}
          <div className="bg-white p-4 rounded-lg shadow-sm border">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
              <input
                type="text"
                placeholder="Buscar por nombre, DNI o ID de reserva..."
                value={searchTerm}
                onChange={handleSearchChange}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-lg"
              />
              {searching && (
                <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                  <RefreshCw className="animate-spin text-gray-400" size={20} />
                </div>
              )}
            </div>
          </div>

          {/* Resultados de búsqueda o Llegadas de hoy */}
          {searchTerm.length >= 2 ? (
            renderListaReservas(searchResults, `Resultados de búsqueda (${searchResults.length})`)
          ) : (
            renderListaReservas(llegadasHoy, `📅 Llegadas de Hoy (${llegadasHoy.length})`)
          )}
        </div>
      )}

      {/* PASO 2, 3, 4: Formulario de Check-in */}
      {paso >= 2 && selectedReserva && (
        <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
          {/* Info de la reserva */}
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-100 text-sm">Reserva #{selectedReserva.id}</p>
                <h2 className="text-2xl font-bold">{selectedReserva.cliente_nombre}</h2>
                <p className="text-blue-100">DNI: {selectedReserva.cliente_dni}</p>
              </div>
              <div className="text-right">
                <p className="text-3xl font-bold">{selectedReserva.habitacion_numero}</p>
                <p className="text-blue-100">{selectedReserva.habitacion_tipo}</p>
              </div>
            </div>
            <div className="mt-4 flex items-center gap-6 text-sm">
              <span className="flex items-center gap-1">
                <Calendar size={14} />
                {formatDate(selectedReserva.fecha_entrada)} - {formatDate(selectedReserva.fecha_salida)}
              </span>
              <span className="flex items-center gap-1">
                <Clock size={14} />
                {selectedReserva.noches} {selectedReserva.noches === 1 ? 'noche' : 'noches'}
              </span>
              <span className="font-semibold">${selectedReserva.precio_total?.toFixed(2)}</span>
            </div>
          </div>

          <div className="p-6 space-y-6">
            {/* PASO 2: Datos del huésped */}
            {paso >= 2 && (
              <div className={paso === 2 ? '' : 'opacity-60'}>
                <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                  <User size={20} className="text-blue-600" />
                  Datos del Huésped
                  {paso > 2 && <CheckCircle size={18} className="text-green-500" />}
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Nombre Completo
                    </label>
                    <input
                      type="text"
                      value={datosCliente.nombre_completo}
                      onChange={(e) => setDatosCliente({...datosCliente, nombre_completo: e.target.value})}
                      className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      disabled={paso > 2}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      <Mail size={14} className="inline mr-1" />
                      Email
                    </label>
                    <input
                      type="email"
                      value={datosCliente.email}
                      onChange={(e) => setDatosCliente({...datosCliente, email: e.target.value})}
                      className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      disabled={paso > 2}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      <Phone size={14} className="inline mr-1" />
                      Teléfono
                    </label>
                    <input
                      type="tel"
                      value={datosCliente.telefono}
                      onChange={(e) => setDatosCliente({...datosCliente, telefono: e.target.value})}
                      className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      disabled={paso > 2}
                    />
                  </div>
                </div>
                {paso === 2 && (
                  <div className="mt-4 flex justify-end">
                    <button
                      onClick={() => setPaso(3)}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                    >
                      Continuar →
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* PASO 3: Verificación de Habitación */}
            {paso >= 3 && (
              <div className={`border-t pt-6 ${paso === 3 ? '' : 'opacity-60'}`}>
                <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                  <BedDouble size={20} className="text-blue-600" />
                  Asignación de Habitación
                  {paso > 3 && <CheckCircle size={18} className="text-green-500" />}
                </h3>
                
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-2xl font-bold text-gray-800">
                        Habitación {selectedReserva.habitacion_numero}
                      </p>
                      <p className="text-gray-500">{selectedReserva.habitacion_tipo}</p>
                    </div>
                    <div>
                      {selectedReserva.habitacion_estado === 'DISPONIBLE' ? (
                        <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium">
                          ✓ Disponible
                        </span>
                      ) : (
                        <span className="px-3 py-1 bg-red-100 text-red-800 rounded-full text-sm font-medium">
                          ⚠ {selectedReserva.habitacion_estado}
                        </span>
                      )}
                    </div>
                  </div>
                  
                  {selectedReserva.habitacion_estado !== 'DISPONIBLE' && (
                    <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                      <div className="flex items-start gap-2">
                        <AlertTriangle className="text-amber-600 mt-0.5" size={18} />
                        <div>
                          <p className="font-medium text-amber-800">
                            La habitación no está disponible
                          </p>
                          <p className="text-sm text-amber-700 mt-1">
                            Estado actual: {selectedReserva.habitacion_estado}. 
                            Puedes asignar otra habitación para continuar.
                          </p>
                          <button
                            onClick={() => {
                              cargarHabitacionesDisponibles();
                              setMostrarCambioHabitacion(true);
                            }}
                            className="mt-2 px-3 py-1 bg-amber-600 text-white rounded text-sm hover:bg-amber-700"
                          >
                            Cambiar Habitación
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {/* Modal de cambio de habitación */}
                  {mostrarCambioHabitacion && (
                    <div className="mt-4 p-4 bg-white border rounded-lg">
                      <h4 className="font-medium mb-3">Habitaciones Disponibles:</h4>
                      {habitacionesDisponibles.length === 0 ? (
                        <p className="text-gray-500 text-sm">No hay habitaciones disponibles en este momento</p>
                      ) : (
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                          {habitacionesDisponibles.map((hab) => (
                            <button
                              key={hab.id}
                              onClick={() => cambiarHabitacion(hab.id)}
                              className="p-3 border rounded-lg hover:bg-blue-50 hover:border-blue-300 transition text-left"
                            >
                              <p className="font-bold">{hab.numero}</p>
                              <p className="text-xs text-gray-500">{hab.tipo}</p>
                              <p className="text-sm text-green-600">${hab.precio_base}/noche</p>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
                
                {paso === 3 && (
                  <div className="mt-4 flex justify-between">
                    <button
                      onClick={() => setPaso(2)}
                      className="px-4 py-2 text-gray-600 hover:text-gray-800"
                    >
                      ← Atrás
                    </button>
                    <button
                      onClick={() => setPaso(4)}
                      disabled={selectedReserva.habitacion_estado !== 'DISPONIBLE'}
                      className={`px-4 py-2 rounded-lg transition ${
                        selectedReserva.habitacion_estado === 'DISPONIBLE'
                          ? 'bg-blue-600 text-white hover:bg-blue-700'
                          : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      }`}
                    >
                      Continuar →
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* PASO 4: Confirmación */}
            {paso === 4 && (
              <div className="border-t pt-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                  <CheckCircle size={20} className="text-green-600" />
                  Confirmar Check-in
                </h3>
                
                <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
                  <p className="text-green-800">
                    Todo listo para realizar el check-in. Al confirmar:
                  </p>
                  <ul className="mt-2 text-sm text-green-700 list-disc list-inside">
                    <li>La reserva pasará a estado <strong>CHECKIN</strong></li>
                    <li>La habitación {selectedReserva.habitacion_numero} quedará como <strong>OCUPADA</strong></li>
                    <li>Se registrará la hora exacta de entrada</li>
                  </ul>
                </div>
                
                <div className="flex justify-between">
                  <button
                    onClick={() => setPaso(3)}
                    className="px-4 py-2 text-gray-600 hover:text-gray-800"
                  >
                    ← Atrás
                  </button>
                  <button
                    onClick={realizarCheckin}
                    disabled={procesandoCheckin}
                    className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition font-semibold flex items-center gap-2"
                  >
                    {procesandoCheckin ? (
                      <>
                        <RefreshCw className="animate-spin" size={18} />
                        Procesando...
                      </>
                    ) : (
                      <>
                        <UserCheck size={18} />
                        Realizar Check-in
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Botón cancelar */}
          <div className="px-6 py-4 bg-gray-50 border-t">
            <button
              onClick={cancelarProceso}
              className="text-gray-500 hover:text-gray-700 text-sm"
            >
              ← Cancelar y volver a la lista
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default CheckinView;
