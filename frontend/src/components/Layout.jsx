import React, { useState } from 'react';
import Sidebar from './Sidebar';
import Dashboard from './Dashboard';
import CalendarView from './CalendarView';
import ClientsView from './ClientsView';
import RoomsView from './RoomsView';
import ReservationsView from './ReservationsView';
import ProductsView from './ProductsView';
import HistoryView from './HistoryView';
import CheckinView from './CheckinView';

/**
 * Layout Component
 * Estructura principal de la aplicación
 * Combina Sidebar + Header + Contenido principal
 */
function Layout({ children }) {
  const [activeSection, setActiveSection] = useState('dashboard');

  // Renderizar contenido según sección activa
  const renderContent = () => {
    switch (activeSection) {
      case 'dashboard':
        return <Dashboard setActiveSection={setActiveSection} />;
      case 'checkin':
        return <CheckinView />;
      case 'calendar':
        return <CalendarView />;
      case 'rooms':
        return <RoomsView />;
      case 'guests':
        return <ClientsView />;
      case 'reservations':
        return <ReservationsView />;
      case 'products':
        return <ProductsView />;
      case 'history':
        return <HistoryView />;
      default:
        return children;
    }
  };

  return (
    <div className="flex h-screen bg-slate-50">
      {/* Sidebar */}
      <Sidebar activeSection={activeSection} setActiveSection={setActiveSection} />

      {/* Contenido Principal */}
      <main className="ml-64 flex-1 overflow-auto">
        {/* Header */}
        <header className="bg-white shadow-sm border-b border-slate-200 sticky top-0 z-10 no-print">
          <div className="px-8 py-6">
            <h2 className="text-2xl font-bold text-gray-900">
              {activeSection === 'dashboard' && '📊 Tablero'}
              {activeSection === 'checkin' && '✅ Check-in'}
              {activeSection === 'rooms' && '🛏️ Habitaciones'}
              {activeSection === 'guests' && '👥 Clientes'}
              {activeSection === 'reservations' && '📋 Reservas'}
              {activeSection === 'products' && '📦 Productos (POS)'}
              {activeSection === 'history' && '📜 Historial'}
              {activeSection === 'booking' && '📅 Nueva Reserva'}
              {activeSection === 'calendar' && '📅 Disponibilidad por Fecha'}
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              Bienvenido al Sistema de Gestión Puente Hotel
            </p>
          </div>
        </header>

        {/* Contenido */}
        <div className="p-8">
          {renderContent()}
        </div>
      </main>
    </div>
  );
}

export default Layout;
