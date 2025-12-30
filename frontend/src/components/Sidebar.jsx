import React, { useState } from 'react';
import {
  LayoutDashboard,
  BedDouble,
  Users,
  Calendar,
  ChevronRight,
  ClipboardList,
  Package,
  History,
} from 'lucide-react';

/**
 * Sidebar Component
 * Barra lateral de navegación con iconos y colores profesionales
 */
function Sidebar({ activeSection, setActiveSection }) {
  const [hoveredItem, setHoveredItem] = useState(null);

  const menuItems = [
    {
      id: 'dashboard',
      label: 'Tablero',
      icon: LayoutDashboard,
      color: 'text-blue-400',
    },
    {
      id: 'rooms',
      label: 'Habitaciones',
      icon: BedDouble,
      color: 'text-green-400',
    },
    {
      id: 'guests',
      label: 'Clientes',
      icon: Users,
      color: 'text-purple-400',
    },
    {
      id: 'reservations',
      label: 'Reservas',
      icon: ClipboardList,
      color: 'text-cyan-400',
    },
    {
      id: 'products',
      label: 'Productos (POS)',
      icon: Package,
      color: 'text-pink-400',
    },
    {
      id: 'history',
      label: 'Historial',
      icon: History,
      color: 'text-gray-400',
    },
    {
      id: 'calendar',
      label: 'Calendario',
      icon: Calendar,
      color: 'text-yellow-400',
    },
  ];

  return (
    <aside className="w-64 bg-slate-900 text-white h-screen fixed left-0 top-0 shadow-lg">
      {/* Encabezado */}
      <div className="p-6 border-b border-slate-700">
        <h1 className="text-2xl font-bold tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-400">
          🏨 PUENTE
        </h1>
        <p className="text-xs text-slate-400 mt-1">Hotel Management</p>
      </div>

      {/* Menú de Navegación */}
      <nav className="mt-8 px-3 space-y-2">
        {menuItems.map((item) => {
          const IconComponent = item.icon;
          const isActive = activeSection === item.id;

          return (
            <button
              key={item.id}
              onClick={() => setActiveSection(item.id)}
              onMouseEnter={() => setHoveredItem(item.id)}
              onMouseLeave={() => setHoveredItem(null)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 ${
                isActive
                  ? 'bg-gradient-to-r from-blue-600 to-blue-700 shadow-lg'
                  : hoveredItem === item.id
                    ? 'bg-slate-800'
                    : 'hover:bg-slate-800'
              }`}
            >
              <IconComponent
                size={20}
                className={`${item.color} ${isActive ? 'text-white' : ''}`}
              />
              <span className="flex-1 text-left font-medium">{item.label}</span>
              {isActive && <ChevronRight size={18} className="text-white" />}
            </button>
          );
        })}
      </nav>

      {/* Footer del Sidebar */}
      <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-slate-700">
        <p className="text-xs text-slate-400 text-center">
          Backend: http://localhost:8000
        </p>
      </div>
    </aside>
  );
}

export default Sidebar;
