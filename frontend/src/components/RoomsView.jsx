import React, { useState, useEffect } from 'react';
import api from '../api.js';
import { Edit2, User, Calendar, Plus, LogOut, ShoppingCart, Trash2, CalendarPlus } from 'lucide-react';
import AddHabitacionModal from './AddHabitacionModal';
import EditRoomModal from './EditRoomModal';
import BookingModal from './BookingModal';

const RoomsView = () => {
  const [rooms, setRooms] = useState([]);
  const [products, setProducts] = useState([]);
  
  // Estados para Modals
  const [isConsumptionModalOpen, setIsConsumptionModalOpen] = useState(false);
  const [selectedRoomForConsumption, setSelectedRoomForConsumption] = useState(null);
  const [consumptionData, setConsumptionData] = useState({ producto_id: '', cantidad: 1 });
  
  // Estados para modals de habitación y reserva
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
  const [selectedRoom, setSelectedRoom] = useState(null);

  // Cargar datos al inicio
  useEffect(() => {
    fetchRooms();
    fetchProducts();
  }, []);

  const fetchRooms = async () => {
    try {
      const response = await api.get('/habitaciones/');
      setRooms(response.data);
    } catch (error) {
      console.error("Error cargando habitaciones:", error);
    }
  };

  const fetchProducts = async () => {
    try {
      const response = await api.get('/productos'); // Asegúrate de que este endpoint exista
      setProducts(response.data);
    } catch (error) {
      console.error("Error cargando productos:", error);
    }
  };

  // --- LÓGICA DE CHECKOUT ---
  const handleCheckout = async (room) => {
    if (!window.confirm(`Confirmas finalizar la estadía de ${room.nombre_cliente}? Se liberará la habitación.`)) {
      return;
    }

    try {
      // Usamos el ID de la reserva activa que agregamos en el Paso 1
      await api.put(`/reservas/${room.reserva_actual_id}/checkout`);
      alert("Checkout realizado con éxito. Habitación liberada.");
      fetchRooms(); // Recargar para verla verde
    } catch (error) {
      console.error(error);
      alert("Error al finalizar reserva.");
    }
  };

  // --- LÓGICA DE CONSUMOS ---
  const openConsumptionModal = (room) => {
    setSelectedRoomForConsumption(room);
    setConsumptionData({ producto_id: '', cantidad: 1 });
    setIsConsumptionModalOpen(true);
  };

  const handleAddConsumption = async (e) => {
    e.preventDefault();
    if (!consumptionData.producto_id) return alert("Selecciona un producto");

    try {
      await api.post(`/reservas/${selectedRoomForConsumption.reserva_actual_id}/consumos`, {
        producto_id: parseInt(consumptionData.producto_id),
        cantidad: parseInt(consumptionData.cantidad)
      });
      alert("Consumo agregado correctamente");
      setIsConsumptionModalOpen(false);
    } catch (error) {
      console.error(error);
      alert("Error al agregar consumo.");
    }
  };

  // --- LÓGICA DE EDITAR HABITACIÓN ---
  const handleEditRoom = (room) => {
    setSelectedRoom(room);
    setIsEditModalOpen(true);
  };

  // --- LÓGICA DE ELIMINAR HABITACIÓN ---
  const handleDeleteRoom = async (room) => {
    if (!window.confirm(`¿Estás seguro de eliminar la habitación ${room.numero}?`)) {
      return;
    }
    try {
      await api.delete(`/habitaciones/${room.id}`);
      alert('✅ Habitación eliminada correctamente');
      fetchRooms();
    } catch (err) {
      alert(`❌ Error: ${err.response?.data?.detail || 'No se pudo eliminar la habitación'}`);
    }
  };

  // --- LÓGICA DE RESERVAR ---
  const handleBooking = (room) => {
    setSelectedRoom(room);
    setIsBookingModalOpen(true);
  };

  // --- RENDERIZADO ---
  return (
    <div className="p-6">
      {/* Header con título y botón agregar */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-800">Gestión de Habitaciones</h1>
        <button
          onClick={() => setIsAddModalOpen(true)}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-semibold transition-colors"
        >
          <Plus size={20} />
          Agregar Habitación
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {rooms.map((room) => {
          // Lógica Visual (Rojo/Verde)
          const isOccupied = room.reserva_actual_id !== null && room.reserva_actual_id !== undefined; // Usamos el ID como indicador
          
          let cardClass = "bg-white border-green-500";
          let badgeClass = "bg-green-100 text-green-800";
          let statusText = "DISPONIBLE";

          if (room.estado === 'MANTENIMIENTO') {
             cardClass = "bg-orange-50 border-orange-500";
             badgeClass = "bg-orange-100 text-orange-800";
             statusText = "MANTENIMIENTO";
          } else if (isOccupied) {
             cardClass = "bg-red-50 border-red-500";
             badgeClass = "bg-red-100 text-red-800";
             statusText = "OCUPADA";
          }

          return (
            <div key={room.id} className={`border-l-4 shadow-md rounded-lg p-5 ${cardClass}`}>
              
              {/* Cabecera Tarjeta */}
              <div className="flex justify-between items-start">
                <div>
                  <h2 className="text-2xl font-bold text-gray-800">Habitación {room.numero}</h2>
                  <span className={`text-xs font-semibold px-2 py-1 rounded uppercase ${badgeClass}`}>
                    {statusText}
                  </span>
                </div>
                {/* Botones Editar y Eliminar */}
                <div className="flex gap-1">
                  <button 
                    onClick={() => handleEditRoom(room)}
                    className="text-gray-400 hover:text-blue-600 p-1"
                    title="Editar habitación"
                  >
                    <Edit2 size={18}/>
                  </button>
                  <button 
                    onClick={() => handleDeleteRoom(room)}
                    className="text-gray-400 hover:text-red-600 p-1"
                    title="Eliminar habitación"
                  >
                    <Trash2 size={18}/>
                  </button>
                </div>
              </div>

              {/* Info Básica */}
              <div className="mt-4 text-sm text-gray-600">
                <p>{room.tipo} - ${room.precio_base}/noche</p>
              </div>

              {/* DATOS DE OCUPACIÓN (Solo si está ocupada) */}
              {isOccupied && (
                <div className="mt-4 bg-white p-3 rounded border border-red-200">
                  <p className="font-bold flex items-center gap-2 text-gray-800">
                    <User size={16}/> {room.nombre_cliente}
                  </p>
                  <p className="text-xs text-red-600 mt-1 flex items-center gap-2">
                    <Calendar size={14}/> Salida: {room.reserva_actual_fin}
                  </p>

                  {/* --- BOTONES DE ACCIÓN (NUEVOS) --- */}
                  <div className="flex gap-2 mt-3">
                    <button 
                      onClick={() => openConsumptionModal(room)}
                      className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-1 px-2 rounded text-xs flex items-center justify-center gap-1"
                      title="Agregar Consumo"
                    >
                      <ShoppingCart size={14} /> Consumo
                    </button>
                    
                    <button 
                      onClick={() => handleCheckout(room)}
                      className="flex-1 bg-gray-800 hover:bg-black text-white py-1 px-2 rounded text-xs flex items-center justify-center gap-1"
                      title="Finalizar Estadía"
                    >
                      <LogOut size={14} /> Checkout
                    </button>
                  </div>
                </div>
              )}

              {/* Botón Reservar */}
              <button 
                onClick={() => handleBooking(room)}
                className="w-full mt-4 bg-blue-500 hover:bg-blue-600 text-white py-2 rounded font-semibold text-sm flex items-center justify-center gap-2 transition-colors"
              >
                <CalendarPlus size={16} />
                Nueva Reserva
              </button>
            </div>
          );
        })}
      </div>

      {/* --- MODAL DE CONSUMOS --- */}
      {isConsumptionModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 w-96 shadow-xl">
            <h3 className="text-xl font-bold mb-4">Agregar Consumo</h3>
            <p className="mb-4 text-sm text-gray-600">Habitación {selectedRoomForConsumption?.numero}</p>
            
            <form onSubmit={handleAddConsumption}>
              <label className="block text-sm font-medium mb-1">Producto</label>
              <select 
                className="w-full border p-2 rounded mb-3"
                value={consumptionData.producto_id}
                onChange={e => setConsumptionData({...consumptionData, producto_id: e.target.value})}
                required
              >
                <option value="">Seleccionar...</option>
                {products.map(p => (
                  <option key={p.id} value={p.id}>{p.nombre} - ${p.precio}</option>
                ))}
              </select>

              <label className="block text-sm font-medium mb-1">Cantidad</label>
              <input 
                type="number" 
                min="1"
                className="w-full border p-2 rounded mb-6"
                value={consumptionData.cantidad}
                onChange={e => setConsumptionData({...consumptionData, cantidad: e.target.value})}
              />

              <div className="flex justify-end gap-2">
                <button 
                  type="button" 
                  onClick={() => setIsConsumptionModalOpen(false)}
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

      {/* --- MODAL AGREGAR HABITACIÓN --- */}
      <AddHabitacionModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSuccess={fetchRooms}
      />

      {/* --- MODAL EDITAR HABITACIÓN --- */}
      <EditRoomModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        room={selectedRoom}
        onSuccess={fetchRooms}
      />

      {/* --- MODAL RESERVAR --- */}
      <BookingModal
        isOpen={isBookingModalOpen}
        onClose={() => setIsBookingModalOpen(false)}
        room={selectedRoom}
        onSuccess={fetchRooms}
      />
    </div>
  );
};

export default RoomsView;
