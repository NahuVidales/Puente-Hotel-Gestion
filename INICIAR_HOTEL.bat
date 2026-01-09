@echo off
echo ========================================
echo    PUENTE HOTEL - Sistema de Gestion
echo ========================================
echo.
echo Iniciando servidores...
echo Por favor, no cierres estas ventanas mientras uses el programa.
echo.
echo Backend:  http://localhost:8000
echo Frontend: http://localhost:3000
echo.
echo ========================================
echo.

REM Iniciar Backend en nueva ventana
echo [1/2] Iniciando Backend (FastAPI)...
start "Puente Hotel - Backend" cmd /k "cd /d "%~dp0backend" && python -m uvicorn main:app --host 0.0.0.0 --port 8000"

REM Esperar 2 segundos para que el backend inicie
timeout /t 2 /nobreak > nul

REM Iniciar Frontend en nueva ventana
echo [2/2] Iniciando Frontend (React)...
start "Puente Hotel - Frontend" cmd /k "cd /d "%~dp0frontend" && npm run dev"

REM Esperar 3 segundos y abrir navegador
timeout /t 3 /nobreak > nul
echo.
echo Abriendo navegador...
start http://localhost:3000

echo.
echo ========================================
echo Sistema iniciado correctamente!
echo.
echo Para detener: cierra las ventanas de Backend y Frontend
echo ========================================
echo.
pause
