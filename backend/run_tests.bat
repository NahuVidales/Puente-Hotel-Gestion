@echo off
REM Script para iniciar el servidor y luego ejecutar las pruebas

cd /d "c:\Puente Hotel\backend"

REM Iniciar el servidor en segundo plano
start "Puente Hotel API Server" python main.py

REM Esperar 3 segundos a que el servidor inicie
timeout /t 3 /nobreak

REM Instalar requests si no está instalado
python -m pip install requests -q

REM Ejecutar las pruebas
python test_api.py

REM Esperar a que el usuario presione una tecla antes de cerrar
pause
