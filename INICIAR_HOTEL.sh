#!/bin/bash

echo "========================================"
echo "   PUENTE HOTEL - Sistema de Gestión"
echo "========================================"
echo ""
echo "Iniciando servidores..."
echo "Por favor, no cierres estas ventanas mientras uses el programa."
echo ""
echo "Backend:  http://localhost:8000"
echo "Frontend: http://localhost:3000"
echo ""
echo "========================================"
echo ""

# Obtener directorio del script
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

# Función para limpiar al cerrar
cleanup() {
    echo ""
    echo "Deteniendo servidores..."
    kill $BACKEND_PID 2>/dev/null
    kill $FRONTEND_PID 2>/dev/null
    exit 0
}

# Capturar señal de cierre
trap cleanup SIGINT SIGTERM

# Iniciar Backend
echo "[1/2] Iniciando Backend (FastAPI)..."
cd "$SCRIPT_DIR/backend"

# Verificar si existe entorno virtual, si no crearlo
if [ ! -d "venv" ]; then
    echo "Creando entorno virtual..."
    python3 -m venv venv
fi

# Activar entorno virtual e instalar dependencias
source venv/bin/activate
pip install -r requirements.txt --quiet

# Iniciar uvicorn en background
python -m uvicorn main:app --host 0.0.0.0 --port 8000 &
BACKEND_PID=$!

# Esperar a que el backend inicie
sleep 2

# Iniciar Frontend
echo "[2/2] Iniciando Frontend (React)..."
cd "$SCRIPT_DIR/frontend"

# Verificar si node_modules existe
if [ ! -d "node_modules" ]; then
    echo "Instalando dependencias de frontend..."
    npm install
fi

# Iniciar vite en background
npm run dev &
FRONTEND_PID=$!

# Esperar a que el frontend inicie
sleep 3

# Abrir navegador
echo ""
echo "Abriendo navegador..."
open http://localhost:3000

echo ""
echo "========================================"
echo "Sistema iniciado correctamente!"
echo ""
echo "Para detener: presiona Ctrl+C"
echo "========================================"
echo ""

# Mantener script corriendo
wait
