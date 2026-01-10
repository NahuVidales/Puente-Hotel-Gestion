# Scripts de Inicio - Puente Hotel

Esta carpeta contiene los scripts para iniciar el sistema según tu sistema operativo.

## 🍎 macOS

Ejecuta en terminal:
```bash
./scripts/INICIAR_HOTEL_MAC.sh
```

O haz doble clic en `INICIAR_HOTEL_MAC.sh` y selecciona "Abrir con Terminal".

**Requisitos macOS:**
- Python 3
- Node.js y npm (`brew install node`)

## 🪟 Windows

Haz doble clic en `INICIAR_HOTEL_WIN.bat`

**Requisitos Windows:**
- Python 3
- Node.js y npm

---

## ¿Qué hacen los scripts?

1. Inician el **Backend** (FastAPI) en `http://localhost:8000`
2. Inician el **Frontend** (React) en `http://localhost:3000`
3. Abren automáticamente el navegador

## Detener el sistema

- **macOS**: Presiona `Ctrl+C` en la terminal
- **Windows**: Cierra las ventanas de Backend y Frontend
