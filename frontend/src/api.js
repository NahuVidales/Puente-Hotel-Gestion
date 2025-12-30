import axios from 'axios';

/**
 * Instancia de Axios configurada para conectar con el backend FastAPI
 * Base URL: http://localhost:8000
 */
const api = axios.create({
  baseURL: 'http://localhost:8000',
  headers: {
    'Content-Type': 'application/json',
  },
});

export default api;
