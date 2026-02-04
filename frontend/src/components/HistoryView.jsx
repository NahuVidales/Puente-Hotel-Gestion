import React, { useState, useEffect } from 'react';
import { Search, FileText, X, Printer, Trash2, Plus, Package } from 'lucide-react';
import api from '../api.js';

/**
 * HistoryView Component
 * Historial de reservas finalizadas con comprobantes editables e imprimibles
 */
function HistoryView() {
  const [reservas, setReservas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedReserva, setSelectedReserva] = useState(null);
  const [invoiceData, setInvoiceData] = useState(null);
  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false);
  const [newItemForm, setNewItemForm] = useState({ concepto: '', cantidad: 1, precio: '' });

  useEffect(() => {
    loadHistorial();
  }, []);

  const loadHistorial = async () => {
    try {
      setLoading(true);
      const response = await api.get('/reservas/historial');
      console.log('Historial cargado:', response.data?.length, 'reservas');
      setReservas(response.data || []);
    } catch (err) {
      console.error('Error al cargar historial:', err);
      setError('Error al cargar el historial');
    } finally {
      setLoading(false);
    }
  };

  const handleViewInvoice = async (reserva) => {
    try {
      // Cargar cuenta completa
      const response = await api.get(`/reservas/${reserva.id}/cuenta`);
      setInvoiceData(response.data);
      setSelectedReserva(reserva);
      setIsInvoiceModalOpen(true);
    } catch (err) {
      console.error('Error al cargar cuenta:', err);
      alert('Error al cargar los datos de la cuenta');
    }
  };

  const handleRemoveConsumo = async (consumoId, productoNombre) => {
    if (!invoiceData || !selectedReserva) return;
    
    // Confirmación antes de eliminar
    const confirmar = window.confirm(`¿Estás seguro de eliminar "${productoNombre}"?`);
    if (!confirmar) return;
    
    try {
      // Eliminar de la base de datos
      await api.delete(`/consumos/${consumoId}`);
      
      // Recargar la cuenta
      const response = await api.get(`/reservas/${selectedReserva.id}/cuenta`);
      setInvoiceData(response.data);
    } catch (err) {
      console.error('Error al eliminar consumo:', err);
      alert('Error al eliminar el consumo');
    }
  };

  const handleAddExtraItem = async () => {
    if (!newItemForm.concepto || !newItemForm.precio) return;
    if (!selectedReserva) return;
    
    const cantidad = parseInt(newItemForm.cantidad) || 1;
    const precio = parseFloat(newItemForm.precio) || 0;
    
    try {
      // Guardar el consumo manual en la base de datos
      await api.post(`/reservas/${selectedReserva.id}/consumos/manual`, {
        concepto: newItemForm.concepto,
        cantidad: cantidad,
        precio: precio
      });
      
      // Recargar la cuenta para mostrar el nuevo consumo
      const response = await api.get(`/reservas/${selectedReserva.id}/cuenta`);
      setInvoiceData(response.data);
      setNewItemForm({ concepto: '', cantidad: 1, precio: '' });
      
    } catch (err) {
      console.error('Error al agregar item:', err);
      alert('Error al guardar el ítem');
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const filteredReservas = reservas.filter(r => 
    r.cliente_nombre?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.cliente_dni?.includes(searchTerm) ||
    r.habitacion_numero?.includes(searchTerm)
  );

  const getEstadoBadge = (estado) => {
    switch(estado) {
      case 'FINALIZADA':
        return 'bg-gray-100 text-gray-800';
      case 'CANCELADA':
        return 'bg-red-100 text-red-800';
      case 'CHECKOUT':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-600';
    }
  };

  // Texto amigable para estados (Primera letra mayúscula)
  const getEstadoText = (estado) => {
    const textos = {
      'FINALIZADA': '✓ Finalizada',
      'CANCELADA': '✗ Cancelada',
      'CHECKOUT': '📤 Checkout',
    };
    return textos[estado] || estado;
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    // Agregar T00:00:00 para evitar problemas de zona horaria
    return new Date(dateStr + 'T00:00:00').toLocaleDateString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  // Loading
  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        <span className="ml-3 text-gray-600">Cargando historial...</span>
      </div>
    );
  }

  // Error
  if (error) {
    return (
      <div className="p-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
          {error}
          <button onClick={loadHistorial} className="ml-4 text-red-600 underline">
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Historial de Reservas</h1>
        <p className="text-gray-500">Reservas finalizadas y canceladas</p>
      </div>

      {/* Buscador */}
      <div className="mb-6">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
          <input
            type="text"
            placeholder="Buscar por cliente, DNI o habitación..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Tabla */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">ID</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Cliente</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Habitación</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Entrada</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Salida</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Estado</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Acciones</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredReservas.length === 0 ? (
              <tr>
                <td colSpan="8" className="px-6 py-12 text-center text-gray-500">
                  No hay reservas en el historial
                </td>
              </tr>
            ) : (
              filteredReservas.map((reserva) => (
                <tr key={reserva.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm text-gray-500">#{reserva.id}</td>
                  <td className="px-6 py-4">
                    <div className="font-medium text-gray-900">{reserva.cliente_nombre}</div>
                    <div className="text-sm text-gray-500">{reserva.cliente_dni}</div>
                  </td>
                  <td className="px-6 py-4 text-sm font-semibold">{reserva.habitacion_numero}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{formatDate(reserva.fecha_entrada)}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{formatDate(reserva.fecha_salida)}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getEstadoBadge(reserva.estado)}`}>
                      {getEstadoText(reserva.estado)}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm font-bold text-gray-900">
                    ${reserva.estado === 'CANCELADA' ? '0.00' : reserva.precio_total?.toFixed(2)}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button
                      onClick={() => handleViewInvoice(reserva)}
                      className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition"
                      title="Ver Comprobante"
                    >
                      <FileText size={16} />
                      Comprobante
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Modal de Factura/Comprobante */}
      {isInvoiceModalOpen && invoiceData && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-2xl w-full max-w-4xl max-h-[95vh] overflow-auto">
            {/* Header del modal (no se imprime) */}
            <div className="flex items-center justify-between p-4 border-b no-print">
              <h2 className="text-lg font-semibold">Comprobante de Estancia - Reserva #{selectedReserva?.id}</h2>
              <button
                onClick={() => setIsInvoiceModalOpen(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X size={20} />
              </button>
            </div>

            {/* SECCIÓN EDITABLE - Lista de consumos con eliminar (no se imprime) */}
            <div className="p-4 bg-white border-b no-print">
              <h3 className="text-md font-bold text-gray-800 mb-3">📋 Items de la Cuenta</h3>
              
              {/* Alojamiento (no editable) */}
              <div className="flex items-center gap-2 bg-gray-100 p-3 rounded mb-2">
                <span className="flex-1 font-medium">🛏️ Alojamiento ({invoiceData.noches} noches)</span>
                <span className="font-bold text-green-700">${invoiceData.total_alojamiento?.toFixed(2)}</span>
              </div>

              {/* Consumos editables */}
              {invoiceData.consumos?.length > 0 ? (
                <div className="space-y-2 mb-4">
                  {invoiceData.consumos.map((consumo) => (
                    <div key={consumo.id} className="flex items-center gap-2 bg-blue-50 p-3 rounded border border-blue-200">
                      <span className="flex-1">{consumo.producto_nombre}</span>
                      <span className="text-gray-600">{consumo.cantidad} × ${consumo.precio_unitario?.toFixed(2)}</span>
                      <span className="font-medium w-24 text-right">${consumo.subtotal?.toFixed(2)}</span>
                      <button
                        onClick={() => handleRemoveConsumo(consumo.id, consumo.producto_nombre)}
                        className="p-2 bg-red-100 text-red-600 hover:bg-red-200 rounded-full"
                        title="Eliminar este item"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-sm mb-4">No hay consumos adicionales</p>
              )}

              {/* Total actual */}
              <div className="flex justify-between items-center p-3 bg-green-100 rounded font-bold text-lg">
                <span>TOTAL:</span>
                <span className="text-green-700">${invoiceData.total_general?.toFixed(2)}</span>
              </div>
            </div>

            {/* Agregar item manual (no se imprime) */}
            <div className="p-4 bg-yellow-50 border-b no-print">
              <p className="text-sm font-medium text-gray-700 mb-2">➕ Agregar ítem (Descuento, Daños, etc.)</p>
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
                      <p className="font-bold">#{selectedReserva?.id}</p>
                      <p className="text-gray-600">{formatDate(new Date().toISOString())}</p>
                    </div>
                  </div>

                  <div className="flex justify-between mb-3 p-2 bg-gray-50 rounded text-xs">
                    <div>
                      <span className="text-gray-500">Check-in:</span>
                      <p className="font-semibold">{formatDate(invoiceData.fecha_entrada)}</p>
                    </div>
                    <div className="text-right">
                      <span className="text-gray-500">Check-out:</span>
                      <p className="font-semibold">{formatDate(invoiceData.fecha_salida)}</p>
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
                    </tbody>
                  </table>

                  {/* Total */}
                  <div className="border-t-2 border-gray-300 pt-2">
                    <div className="flex justify-between items-center text-sm font-bold">
                      <span>TOTAL:</span>
                      <span className="text-green-700">
                        ${invoiceData.total_general?.toFixed(2)}
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
                      <p className="font-bold">#{selectedReserva?.id}</p>
                      <p className="text-gray-600">{formatDate(new Date().toISOString())}</p>
                    </div>
                  </div>

                  <div className="flex justify-between mb-3 p-2 bg-gray-50 rounded text-xs">
                    <div>
                      <span className="text-gray-500">Check-in:</span>
                      <p className="font-semibold">{formatDate(invoiceData.fecha_entrada)}</p>
                    </div>
                    <div className="text-right">
                      <span className="text-gray-500">Check-out:</span>
                      <p className="font-semibold">{formatDate(invoiceData.fecha_salida)}</p>
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
                    </tbody>
                  </table>

                  {/* Total */}
                  <div className="border-t-2 border-gray-300 pt-2">
                    <div className="flex justify-between items-center text-sm font-bold">
                      <span>TOTAL:</span>
                      <span className="text-green-700">
                        ${invoiceData.total_general?.toFixed(2)}
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

export default HistoryView;
