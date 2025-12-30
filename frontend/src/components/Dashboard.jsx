import React, { useState, useEffect } from 'react';
import { TrendingUp } from 'lucide-react';
import api from '../api.js';

/**
 * Dashboard Component
 * Tablero simplificado con resumen y métricas rápidas
 */
function Dashboard({ setActiveSection }) {
  const [habitaciones, setHabitaciones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Cargar habitaciones al montar
  useEffect(() => {
    loadHabitaciones();
  }, []);

  const loadHabitaciones = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.get('/habitaciones');
      console.log('Dashboard - Respuesta de API:', response.data);
      // Asegurarse de que response.data es un array
      const data = Array.isArray(response.data) ? response.data : [];
      setHabitaciones(data);
    } catch (err) {
      setError('Error al cargar las habitaciones');
      console.error('Dashboard - Error:', err);
      setHabitaciones([]); // Array vacío en caso de error
    } finally {
      setLoading(false);
    }
  };

  // Calcular métricas
  const disponibles = habitaciones.filter(h => h.estado === 'DISPONIBLE').length;
  const ocupadas = habitaciones.filter(h => h.estado === 'OCUPADA').length;
  const mantenimiento = habitaciones.filter(h => h.estado === 'MANTENIMIENTO' || h.estado === 'LIMPIEZA').length;
  const ocupancyRate = habitaciones.length > 0 ? ((ocupadas / habitaciones.length) * 100).toFixed(1) : 0;

  return (
    <div className="max-w-7xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Bienvenido a Puente Hotel</h1>
        <p className="text-gray-600">Sistema de Gestión de Reservas</p>
      </div>

      {/* Tarjetas de Resumen */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {/* Total Habitaciones */}
        <div className="bg-white rounded-lg shadow p-6 border-l-4 border-blue-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm font-medium">Total Habitaciones</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">{habitaciones.length}</p>
            </div>
            <div className="bg-blue-100 rounded-lg p-3">
              <TrendingUp className="text-blue-600" size={24} />
            </div>
          </div>
        </div>

        {/* Disponibles */}
        <div className="bg-white rounded-lg shadow p-6 border-l-4 border-green-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm font-medium">Disponibles</p>
              <p className="text-3xl font-bold text-green-600 mt-2">{disponibles}</p>
            </div>
            <div className="bg-green-100 rounded-lg p-3">
              <div className="text-2xl">✅</div>
            </div>
          </div>
        </div>

        {/* Ocupadas */}
        <div className="bg-white rounded-lg shadow p-6 border-l-4 border-red-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm font-medium">Ocupadas</p>
              <p className="text-3xl font-bold text-red-600 mt-2">{ocupadas}</p>
            </div>
            <div className="bg-red-100 rounded-lg p-3">
              <div className="text-2xl">🔴</div>
            </div>
          </div>
        </div>

        {/* Tasa de Ocupación */}
        <div className="bg-white rounded-lg shadow p-6 border-l-4 border-purple-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm font-medium">Ocupación</p>
              <p className="text-3xl font-bold text-purple-600 mt-2">{ocupancyRate}%</p>
            </div>
            <div className="bg-purple-100 rounded-lg p-3">
              <div className="text-2xl">📊</div>
            </div>
          </div>
        </div>
      </div>

      {/* Sección de Acciones Rápidas */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Acciones Rápidas</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button 
            onClick={() => setActiveSection('rooms')}
            className="p-4 border-2 border-dashed border-blue-300 rounded-lg hover:bg-blue-50 transition text-center cursor-pointer"
          >
            <div className="text-2xl mb-2">🛏️</div>
            <p className="font-semibold text-gray-900">Ver Habitaciones</p>
            <p className="text-sm text-gray-600 mt-1">Gestionar habitaciones y precios</p>
          </button>
          <button 
            onClick={() => setActiveSection('guests')}
            className="p-4 border-2 border-dashed border-purple-300 rounded-lg hover:bg-purple-50 transition text-center cursor-pointer"
          >
            <div className="text-2xl mb-2">👥</div>
            <p className="font-semibold text-gray-900">Ver Clientes</p>
            <p className="text-sm text-gray-600 mt-1">Administrar base de datos de huéspedes</p>
          </button>
          <button 
            onClick={() => setActiveSection('calendar')}
            className="p-4 border-2 border-dashed border-orange-300 rounded-lg hover:bg-orange-50 transition text-center cursor-pointer"
          >
            <div className="text-2xl mb-2">📅</div>
            <p className="font-semibold text-gray-900">Ver Calendario</p>
            <p className="text-sm text-gray-600 mt-1">Visualizar disponibilidad por fechas</p>
          </button>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;
