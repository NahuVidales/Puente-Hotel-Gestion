import React, { useState, useEffect } from 'react';
import { Plus, Pencil, AlertCircle, X, Trash2 } from 'lucide-react';
import api from '../api.js';

/**
 * ClientsView Component
 * Panel de administración para gestionar clientes
 * Crear, leer, actualizar y eliminar clientes
 */
function ClientsView() {
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingClient, setEditingClient] = useState(null);
  const [formData, setFormData] = useState({
    nombre_completo: '',
    dni: '',
    email: '',
    telefono: '',
  });
  const [submitError, setSubmitError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // Cargar clientes al montar
  useEffect(() => {
    loadClients();
  }, []);

  const loadClients = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.get('/clientes');
      console.log('ClientsView - Respuesta de API:', response.data);
      const data = Array.isArray(response.data) ? response.data : [];
      setClients(data);
    } catch (err) {
      setError('Error al cargar clientes');
      console.error('ClientsView - Error:', err);
      setClients([]);
    } finally {
      setLoading(false);
    }
  };

  const handleNewClient = () => {
    setEditingClient(null);
    setFormData({ nombre_completo: '', dni: '', email: '', telefono: '' });
    setSubmitError(null);
    setIsModalOpen(true);
  };

  const handleEdit = (client) => {
    setEditingClient(client);
    setFormData({
      nombre_completo: client.nombre_completo,
      dni: client.dni,
      email: client.email,
      telefono: client.telefono || '',
    });
    setSubmitError(null);
    setIsModalOpen(true);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setSubmitError(null);

    // Validaciones
    if (!formData.nombre_completo || !formData.dni || !formData.email) {
      setSubmitError('Por favor completa todos los campos');
      setSubmitting(false);
      return;
    }

    try {
      if (editingClient) {
        // Actualizar cliente existente
        await api.put(`/clientes/${editingClient.id}`, formData);
        alert('✅ Cliente actualizado exitosamente');
      } else {
        // Crear nuevo cliente
        await api.post('/clientes', formData);
        alert('✅ Cliente creado exitosamente');
      }

      // Recargar lista y cerrar modal
      loadClients();
      setIsModalOpen(false);
    } catch (err) {
      setSubmitError(err.response?.data?.detail || 'Error al guardar cliente');
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (client) => {
    if (!confirm(`¿Estás seguro de eliminar al cliente ${client.nombre_completo}?`)) {
      return;
    }
    
    try {
      await api.delete(`/clientes/${client.id}`);
      alert('✅ Cliente eliminado correctamente');
      loadClients();
    } catch (err) {
      alert(`❌ Error: ${err.response?.data?.detail || 'No se pudo eliminar el cliente'}`);
    }
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingClient(null);
    setFormData({ nombre_completo: '', dni: '', email: '', telefono: '' });
    setSubmitError(null);
  };

  // Renderizar estado de carga
  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
          <p className="text-gray-600 font-medium">Cargando clientes...</p>
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
    <div className="max-w-6xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Gestión de Clientes</h1>
          <p className="text-gray-600 mt-1">
            Total: <strong>{clients.length}</strong> clientes registrados
          </p>
        </div>
        <button
          onClick={handleNewClient}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition"
        >
          <Plus size={20} />
          Nuevo Cliente
        </button>
      </div>

      {/* Tabla de Clientes */}
      {clients.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg border border-gray-200">
          <p className="text-gray-600 font-medium">No hay clientes registrados aún</p>
          <button
            onClick={handleNewClient}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Crear el primer cliente
          </button>
        </div>
      ) : (
        <div className="overflow-x-auto bg-white rounded-lg shadow">
          <table className="w-full">
            <thead className="bg-gray-100 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">ID</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Nombre</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">DNI</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Email</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Teléfono</th>
                <th className="px-6 py-3 text-center text-sm font-semibold text-gray-900">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {clients.map((client, index) => (
                <tr
                  key={client.id}
                  className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}
                >
                  <td className="px-6 py-4 text-sm text-gray-700">{client.id}</td>
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">
                    {client.nombre_completo}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-700">{client.dni}</td>
                  <td className="px-6 py-4 text-sm text-gray-700">{client.email}</td>
                  <td className="px-6 py-4 text-sm text-gray-700">{client.telefono || '-'}</td>
                  <td className="px-6 py-4 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <button
                        onClick={() => handleEdit(client)}
                        className="inline-flex items-center gap-2 px-3 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition text-sm font-medium"
                      >
                        <Pencil size={16} />
                        Editar
                      </button>
                      <button
                        onClick={() => handleDelete(client)}
                        className="inline-flex items-center gap-2 px-3 py-1 bg-red-100 text-red-700 rounded hover:bg-red-200 transition text-sm font-medium"
                      >
                        <Trash2 size={16} />
                        Eliminar
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal para crear/editar cliente */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-gray-900">
                {editingClient ? '✏️ Editar Cliente' : '➕ Nuevo Cliente'}
              </h3>
              <button
                onClick={handleCloseModal}
                className="text-gray-400 hover:text-gray-600 transition"
              >
                <X size={24} />
              </button>
            </div>

            {/* Formulario */}
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Nombre Completo */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nombre Completo
                </label>
                <input
                  type="text"
                  name="nombre_completo"
                  value={formData.nombre_completo}
                  onChange={handleChange}
                  placeholder="Ej: Juan Pérez García"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {/* DNI */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  DNI
                </label>
                <input
                  type="text"
                  name="dni"
                  value={formData.dni}
                  onChange={handleChange}
                  placeholder="Ej: 12345678"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {/* Email */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email
                </label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="Ej: juan@example.com"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {/* Teléfono */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Teléfono
                </label>
                <input
                  type="tel"
                  name="telefono"
                  value={formData.telefono}
                  onChange={handleChange}
                  placeholder="Ej: +54 11 1234-5678"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {/* Error */}
              {submitError && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
                  {submitError}
                </div>
              )}

              {/* Botones */}
              <div className="flex gap-2 pt-4 border-t">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 font-medium transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium disabled:opacity-50 transition"
                >
                  {submitting ? 'Guardando...' : editingClient ? 'Actualizar' : 'Crear'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default ClientsView;
