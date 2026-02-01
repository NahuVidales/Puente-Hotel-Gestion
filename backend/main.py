"""
Puente Hotel - API REST con FastAPI
Endpoints para gestionar habitaciones, clientes y reservas
"""

from fastapi import FastAPI, HTTPException, Depends, Body
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from datetime import date
from typing import List
import os

from models import engine, init_db
from sqlalchemy.orm import sessionmaker
import schemas
import crud

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
from logic import check_availability, crear_reserva

# ============================================================================
# INICIALIZAR FASTAPI
# ============================================================================

app = FastAPI(
    title="Puente Hotel API",
    description="API para gestión de reservas hoteleras",
    version="1.0.0"
)

# ============================================================================
# CONFIGURAR CORS (Permitir peticiones desde el frontend)
# ============================================================================

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # En producción, especificar dominios
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ============================================================================
# INICIALIZAR BASE DE DATOS
# ============================================================================

init_db()

# ============================================================================
# DEPENDENCIAS
# ============================================================================

def get_db():
    """Proporciona una sesión de BD para cada request"""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# ============================================================================
# ENDPOINTS: HABITACIONES
# ============================================================================

@app.post("/habitaciones", response_model=schemas.HabitacionResponse)
def crear_habitacion(habitacion: schemas.HabitacionCreate, db: Session = Depends(get_db)):
    """
    POST /habitaciones
    Crea una nueva habitación
    """
    return crud.create_habitacion(db, habitacion)

@app.get("/habitaciones", response_model=List[schemas.HabitacionDetalle])
def listar_habitaciones(db: Session = Depends(get_db)):
    """
    GET /habitaciones
    Retorna lista de todas las habitaciones con información de reservas activas.
    Antes de listar, actualiza automáticamente las reservas vencidas.
    """
    # Actualizar reservas vencidas automáticamente
    crud.actualizar_reservas_vencidas(db)
    
    return crud.get_habitaciones(db)

@app.get("/habitaciones/{habitacion_id}", response_model=schemas.HabitacionResponse)
def obtener_habitacion(habitacion_id: int, db: Session = Depends(get_db)):
    """
    GET /habitaciones/{habitacion_id}
    Retorna los detalles de una habitación específica
    """
    hab = crud.get_habitacion(db, habitacion_id)
    if not hab:
        raise HTTPException(status_code=404, detail="Habitación no encontrada")
    return hab

@app.put("/habitaciones/{habitacion_id}", response_model=schemas.HabitacionResponse)
def actualizar_habitacion(
    habitacion_id: int,
    habitacion_data: schemas.HabitacionCreate,
    db: Session = Depends(get_db)
):
    """
    PUT /habitaciones/{habitacion_id}
    Actualiza los datos de una habitación existente
    
    Body: { numero, tipo, precio_base, estado }
    """
    try:
        return crud.update_habitacion(db, habitacion_id, habitacion_data)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))

@app.delete("/habitaciones/{habitacion_id}")
def eliminar_habitacion(habitacion_id: int, db: Session = Depends(get_db)):
    """
    DELETE /habitaciones/{habitacion_id}
    Elimina una habitación (solo si no tiene reservas)
    """
    try:
        crud.delete_habitacion(db, habitacion_id)
        return {"mensaje": "Habitación eliminada correctamente"}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

# ============================================================================
# ENDPOINTS: CLIENTES
# ============================================================================

@app.post("/clientes", response_model=schemas.ClienteResponse)
def crear_cliente(cliente: schemas.ClienteCreate, db: Session = Depends(get_db)):
    """
    POST /clientes
    Registra un nuevo cliente en el sistema
    """
    # Verificar que el DNI no exista
    cliente_existente = crud.get_cliente_por_dni(db, cliente.dni)
    if cliente_existente:
        raise HTTPException(status_code=409, detail="El DNI ya está registrado")
    
    return crud.create_cliente(db, cliente)

@app.get("/clientes", response_model=List[schemas.ClienteResponse])
def listar_clientes(db: Session = Depends(get_db)):
    """
    GET /clientes
    Lista todos los clientes registrados
    """
    return crud.get_clientes(db)

@app.get("/clientes/{cliente_id}", response_model=schemas.ClienteResponse)
def obtener_cliente(cliente_id: int, db: Session = Depends(get_db)):
    """
    GET /clientes/{cliente_id}
    Obtiene los datos de un cliente específico
    """
    cliente = crud.get_cliente(db, cliente_id)
    if not cliente:
        raise HTTPException(status_code=404, detail="Cliente no encontrado")
    return cliente

@app.put("/clientes/{cliente_id}", response_model=schemas.ClienteResponse)
def actualizar_cliente(
    cliente_id: int,
    cliente_data: schemas.ClienteCreate,
    db: Session = Depends(get_db)
):
    """
    PUT /clientes/{cliente_id}
    Actualiza los datos de un cliente existente
    
    Body: { dni, nombre_completo, email }
    """
    try:
        return crud.update_cliente(db, cliente_id, cliente_data)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))

@app.delete("/clientes/{cliente_id}")
def eliminar_cliente(cliente_id: int, db: Session = Depends(get_db)):
    """
    DELETE /clientes/{cliente_id}
    Elimina un cliente (solo si no tiene reservas activas)
    """
    try:
        crud.delete_cliente(db, cliente_id)
        return {"mensaje": "Cliente eliminado correctamente"}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

# ============================================================================
# ENDPOINTS: DISPONIBILIDAD
# ============================================================================

@app.post("/disponibilidad", response_model=schemas.DisponibilidadResponse)
def verificar_disponibilidad(
    request: schemas.DisponibilidadRequest,
    db: Session = Depends(get_db)
):
    """
    POST /disponibilidad
    Verifica qué habitaciones están disponibles en un rango de fechas
    """
    if request.habitacion_id:
        # Verificar disponibilidad de una habitación específica
        disponible = crud.check_availability(
            db,
            request.habitacion_id,
            request.fecha_entrada,
            request.fecha_salida
        )
        
        if disponible:
            hab = crud.get_habitacion(db, request.habitacion_id)
            return schemas.DisponibilidadResponse(
                disponible=True,
                mensaje="Habitación disponible",
                habitaciones_libres=[hab] if hab else []
            )
        else:
            return schemas.DisponibilidadResponse(
                disponible=False,
                mensaje="Habitación no disponible en esas fechas"
            )
    else:
        # Obtener todas las habitaciones disponibles
        disponibles = crud.get_habitaciones_disponibles(
            db,
            request.fecha_entrada,
            request.fecha_salida
        )
        
        return schemas.DisponibilidadResponse(
            disponible=len(disponibles) > 0,
            mensaje=f"{len(disponibles)} habitaciones disponibles",
            habitaciones_libres=disponibles
        )

# ============================================================================
# ENDPOINTS: RESERVAS
# ============================================================================

@app.post("/reservas", response_model=schemas.ReservaResponse)
def crear_reserva(
    reserva: schemas.ReservaCreate,
    db: Session = Depends(get_db)
):
    """
    POST /reservas
    Crea una nueva reserva (con validaciones de disponibilidad)
    
    IMPORTANTE: Antes de guardar, ejecuta check_availability.
    Si la habitación está ocupada, retorna HTTP 409 (Conflict)
    """
    # Verificar que el cliente existe
    cliente = crud.get_cliente(db, reserva.cliente_id)
    if not cliente:
        raise HTTPException(status_code=404, detail="Cliente no encontrado")
    
    # Verificar que la habitación existe
    habitacion = crud.get_habitacion(db, reserva.habitacion_id)
    if not habitacion:
        raise HTTPException(status_code=404, detail="Habitación no encontrada")
    
    # Validar que fecha_salida > fecha_entrada
    if reserva.fecha_salida <= reserva.fecha_entrada:
        raise HTTPException(
            status_code=400,
            detail="La fecha de salida debe ser posterior a la de entrada"
        )
    
    # FUNCIÓN CRÍTICA: Verificar disponibilidad
    disponible = crud.check_availability(
        db,
        reserva.habitacion_id,
        reserva.fecha_entrada,
        reserva.fecha_salida
    )
    
    if not disponible:
        raise HTTPException(
            status_code=409,
            detail="La habitación no está disponible en esas fechas"
        )
    
    # Calcular precio total
    # Si se envió precio_noche personalizado, usarlo; sino usar precio_base de habitación
    precio_por_noche = reserva.precio_noche if reserva.precio_noche else habitacion.precio_base
    noches = (reserva.fecha_salida - reserva.fecha_entrada).days
    precio_total = precio_por_noche * noches
    
    # Crear la reserva
    nueva_reserva = crud.create_reserva(db, reserva, precio_total)
    
    return nueva_reserva

@app.get("/reservas", response_model=List[schemas.ReservaResponse])
def listar_reservas(
    fecha_inicio: date = None,
    fecha_fin: date = None,
    cliente_id: int = None,
    habitacion_id: int = None,
    db: Session = Depends(get_db)
):
    """
    GET /reservas
    Lista todas las reservas, opcionalmente filtrando por rango de fechas o cliente.
    Antes de listar, actualiza automáticamente las reservas vencidas.
    Incluye consumos con nombre del producto para determinar estado de pago.
    """
    # Actualizar reservas vencidas automáticamente
    crud.actualizar_reservas_vencidas(db)
    
    reservas = crud.get_reservas(
        db,
        fecha_inicio=fecha_inicio,
        fecha_fin=fecha_fin,
        cliente_id=cliente_id,
        habitacion_id=habitacion_id
    )
    
    # Enriquecer consumos con nombre del producto
    resultado = []
    for reserva in reservas:
        reserva_dict = {
            "id": reserva.id,
            "habitacion_id": reserva.habitacion_id,
            "cliente_id": reserva.cliente_id,
            "fecha_entrada": reserva.fecha_entrada,
            "fecha_salida": reserva.fecha_salida,
            "precio_total": reserva.precio_total,
            "estado": reserva.estado.value if hasattr(reserva.estado, 'value') else str(reserva.estado),
            "cliente": reserva.cliente,
            "habitacion": reserva.habitacion,
            "consumos": [
                {
                    "id": c.id,
                    "producto_id": c.producto_id,
                    "cantidad": c.cantidad,
                    "precio_unitario": c.precio_unitario,
                    "producto_nombre": c.producto.nombre if c.producto else None
                }
                for c in reserva.consumos
            ] if reserva.consumos else []
        }
        resultado.append(reserva_dict)
    
    return resultado

@app.get("/reservas/historial", response_model=List[schemas.ReservaHistorialResponse])
def obtener_historial(db: Session = Depends(get_db)):
    """
    GET /reservas/historial
    Obtiene reservas finalizadas o canceladas.
    Antes de listar, actualiza automáticamente las reservas vencidas.
    """
    # Actualizar reservas vencidas automáticamente
    crud.actualizar_reservas_vencidas(db)
    
    return crud.get_reservas_historial(db)

@app.get("/reservas/{reserva_id}", response_model=schemas.ReservaResponse)
def obtener_reserva(reserva_id: int, db: Session = Depends(get_db)):
    """
    GET /reservas/{reserva_id}
    Obtiene los detalles de una reserva específica
    """
    reserva = crud.get_reserva(db, reserva_id)
    if not reserva:
        raise HTTPException(status_code=404, detail="Reserva no encontrada")
    return reserva

@app.delete("/reservas/{reserva_id}")
def eliminar_reserva(reserva_id: int, db: Session = Depends(get_db)):
    """
    DELETE /reservas/{reserva_id}
    Elimina una reserva
    """
    try:
        crud.delete_reserva(db, reserva_id)
        return {"mensaje": "Reserva eliminada correctamente"}
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))

@app.put("/reservas/{reserva_id}/cancelar")
def cancelar_reserva(reserva_id: int, db: Session = Depends(get_db)):
    """
    PUT /reservas/{reserva_id}/cancelar
    Cancela una reserva (cambia estado a CANCELADA, no la elimina)
    """
    resultado = crud.cancelar_reserva(db, reserva_id)
    if not resultado:
        raise HTTPException(status_code=404, detail="Reserva no encontrada o no se puede cancelar")
    return resultado

@app.put("/reservas/{reserva_id}/checkout")
def checkout_reserva(reserva_id: int, db: Session = Depends(get_db)):
    """
    PUT /reservas/{reserva_id}/checkout
    Realiza el checkout de una reserva (incluso anticipado)
    """
    reserva = crud.checkout_reserva(db, reserva_id)
    if not reserva:
        raise HTTPException(status_code=404, detail="Reserva no encontrada")
    return {
        "mensaje": "Checkout realizado exitosamente",
        "reserva_id": reserva.id,
        "fecha_salida_final": str(reserva.fecha_salida),
        "precio_total_final": reserva.precio_total
    }

# ============================================================================
# HEALTH CHECK - COMENTADO PARA QUE EL FRONTEND SEA LA RAÍZ
# ============================================================================
# Si necesitas verificar que el servidor está corriendo, usa /docs o /habitaciones
#
# @app.get("/")
# def root():
#     """
#     GET /
#     Health check - verifica que el servidor está corriendo
#     """
#     return {
#         "message": "¡Bienvenido a Puente Hotel API!",
#         "status": "ok",
#         "docs": "http://localhost:8000/docs"
#     }


# ============================================================================
# ENDPOINT: DISPONIBILIDAD POR FECHA
# ============================================================================

@app.get("/disponibilidad")
def get_disponibilidad_por_fecha(
    fecha: str,
    db: Session = Depends(get_db)
):
    """
    GET /disponibilidad/?fecha=YYYY-MM-DD
    Devuelve todas las habitaciones con su estado en una fecha específica
    
    Query Parameters:
        fecha (str): Fecha en formato YYYY-MM-DD
    
    Response:
        Lista de habitaciones con estado_en_fecha ('DISPONIBLE' u 'OCUPADA')
    """
    try:
        # Actualizar reservas vencidas automáticamente (sincronizar con otras vistas)
        crud.actualizar_reservas_vencidas(db)
        
        # Convertir string a date
        from datetime import datetime
        fecha_obj = datetime.strptime(fecha, "%Y-%m-%d").date()
        
        # Obtener habitaciones con estado en esa fecha
        habitaciones = crud.get_habitaciones_por_fecha(db, fecha_obj)
        
        return habitaciones
    except ValueError as e:
        raise HTTPException(
            status_code=400,
            detail=f"Formato de fecha inválido. Usa YYYY-MM-DD: {str(e)}"
        )

# ============================================================================
# SERVIR FRONTEND ESTÁTICO (PRODUCCIÓN) - DESACTIVADO EN DESARROLLO
# ============================================================================

# ⚠️ IMPORTANTE: Este bloque está comentado para desarrollo con dos servidores
# Descomenta solo cuando quieras ejecutar en producción con un solo servidor

# # Ruta al directorio de distribución de React
# frontend_path = os.path.join(os.path.dirname(__file__), "..", "frontend", "dist")

# # Verificar si existe la carpeta dist
# if os.path.exists(frontend_path):
#     print(f"✅ Frontend encontrado en: {frontend_path}")
#     
#     # CRÍTICO: Montar assets PRIMERO antes del catch-all
#     assets_path = os.path.join(frontend_path, "assets")
#     if os.path.exists(assets_path):
#         app.mount("/assets", StaticFiles(directory=assets_path), name="assets")
#         print(f"✅ Assets montados desde: {assets_path}")
#     
#     # Ruta catch-all para SPA - DEBE IR DESPUÉS del mount de assets
#     @app.get("/{full_path:path}")
#     async def serve_spa(full_path: str):
#         """
#         Sirve el index.html para todas las rutas no definidas.
#         Esto permite que React Router maneje las rutas del frontend.
#         """
#         # Si la ruta es un archivo específico (ej: favicon.ico), intentar servirlo
#         possible_file = os.path.join(frontend_path, full_path)
#         if os.path.exists(possible_file) and os.path.isfile(possible_file):
#             return FileResponse(possible_file)
#         
#         # Para todo lo demás, devolver index.html (SPA routing)
#         index_path = os.path.join(frontend_path, "index.html")
#         return FileResponse(index_path)
# else:
#     print("⚠️ ADVERTENCIA: No se encontró '../frontend/dist'. Ejecuta 'npm run build' en el frontend.")

# ============================================================================
# SI SE EJECUTA DIRECTAMENTE
# ============================================================================

# ============================================================================
# ENDPOINTS: PRODUCTOS (POS)
# ============================================================================

@app.get("/productos", response_model=List[schemas.ProductoResponse])
def listar_productos(solo_activos: bool = False, db: Session = Depends(get_db)):
    """
    GET /productos
    Lista todos los productos del minibar/kiosko
    """
    return crud.get_productos(db, solo_activos)

@app.post("/productos", response_model=schemas.ProductoResponse)
def crear_producto(producto: schemas.ProductoCreate, db: Session = Depends(get_db)):
    """
    POST /productos
    Crea un nuevo producto
    """
    return crud.create_producto(db, producto)

@app.get("/productos/{producto_id}", response_model=schemas.ProductoResponse)
def obtener_producto(producto_id: int, db: Session = Depends(get_db)):
    """
    GET /productos/{id}
    Obtiene un producto por ID
    """
    producto = crud.get_producto(db, producto_id)
    if not producto:
        raise HTTPException(status_code=404, detail="Producto no encontrado")
    return producto

@app.put("/productos/{producto_id}", response_model=schemas.ProductoResponse)
def actualizar_producto(producto_id: int, producto: schemas.ProductoCreate, db: Session = Depends(get_db)):
    """
    PUT /productos/{id}
    Actualiza un producto
    """
    db_producto = crud.update_producto(db, producto_id, producto)
    if not db_producto:
        raise HTTPException(status_code=404, detail="Producto no encontrado")
    return db_producto

@app.delete("/productos/{producto_id}")
def eliminar_producto(producto_id: int, db: Session = Depends(get_db)):
    """
    DELETE /productos/{id}
    Elimina un producto
    """
    if crud.delete_producto(db, producto_id):
        return {"mensaje": "Producto eliminado correctamente"}
    raise HTTPException(status_code=404, detail="Producto no encontrado")

# ============================================================================
# ENDPOINTS: CONSUMOS Y FACTURACIÓN
# ============================================================================

@app.post("/reservas/{reserva_id}/consumos", response_model=schemas.ConsumoResponse)
def agregar_consumo(reserva_id: int, consumo: schemas.ConsumoCreate, db: Session = Depends(get_db)):
    """
    POST /reservas/{id}/consumos
    Agrega un consumo a una reserva
    """
    db_consumo = crud.registrar_consumo(db, reserva_id, consumo.producto_id, consumo.cantidad)
    if not db_consumo:
        raise HTTPException(status_code=400, detail="No se pudo registrar el consumo. Verifique que la reserva y producto existan.")
    return db_consumo

@app.get("/reservas/{reserva_id}/consumos", response_model=List[schemas.ConsumoResponse])
def listar_consumos(reserva_id: int, db: Session = Depends(get_db)):
    """
    GET /reservas/{id}/consumos
    Lista todos los consumos de una reserva
    """
    return crud.get_consumos_reserva(db, reserva_id)

@app.delete("/consumos/{consumo_id}")
def eliminar_consumo(consumo_id: int, db: Session = Depends(get_db)):
    """
    DELETE /consumos/{id}
    Elimina un consumo
    """
    if crud.delete_consumo(db, consumo_id):
        return {"mensaje": "Consumo eliminado correctamente"}
    raise HTTPException(status_code=404, detail="Consumo no encontrado")

@app.get("/reservas/{reserva_id}/cuenta", response_model=schemas.CuentaResponse)
def obtener_cuenta(reserva_id: int, db: Session = Depends(get_db)):
    """
    GET /reservas/{id}/cuenta
    Genera la cuenta/factura completa de una reserva
    """
    cuenta = crud.get_cuenta_reserva(db, reserva_id)
    if not cuenta:
        raise HTTPException(status_code=404, detail="Reserva no encontrada")
    return cuenta

# ============================================================================
# ENDPOINTS: CHECK-IN
# ============================================================================

@app.get("/checkin/llegadas-hoy")
def obtener_llegadas_hoy(db: Session = Depends(get_db)):
    """
    GET /checkin/llegadas-hoy
    Obtiene todas las reservas con llegada programada para hoy que están PENDIENTES
    """
    return crud.get_llegadas_hoy(db)

@app.get("/checkin/buscar")
def buscar_para_checkin(
    q: str = None,
    db: Session = Depends(get_db)
):
    """
    GET /checkin/buscar?q=texto
    Busca reservas PENDIENTES por apellido, DNI o ID de reserva
    """
    if not q or len(q) < 2:
        return []
    return crud.buscar_reservas_checkin(db, q)

@app.post("/checkin/{reserva_id}")
def realizar_checkin(
    reserva_id: int,
    datos_cliente: schemas.ClienteUpdate = Body(default=None),
    db: Session = Depends(get_db)
):
    """
    POST /checkin/{reserva_id}
    Realiza el check-in de una reserva:
    1. Actualiza datos del cliente si se proporcionan
    2. Cambia estado de reserva a CHECKIN
    3. Cambia estado de habitación a OCUPADA
    4. Registra el timestamp del check-in
    """
    resultado = crud.realizar_checkin(db, reserva_id, datos_cliente)
    if not resultado:
        raise HTTPException(status_code=404, detail="Reserva no encontrada o no está en estado PENDIENTE")
    return resultado

@app.get("/checkin/habitaciones-disponibles")
def obtener_habitaciones_disponibles_checkin(db: Session = Depends(get_db)):
    """
    GET /checkin/habitaciones-disponibles
    Obtiene habitaciones disponibles y limpias para reasignación durante check-in
    """
    return crud.get_habitaciones_disponibles_checkin(db)

@app.put("/checkin/{reserva_id}/cambiar-habitacion/{nueva_habitacion_id}")
def cambiar_habitacion_checkin(
    reserva_id: int,
    nueva_habitacion_id: int,
    db: Session = Depends(get_db)
):
    """
    PUT /checkin/{reserva_id}/cambiar-habitacion/{nueva_habitacion_id}
    Cambia la habitación asignada a una reserva antes del check-in
    """
    resultado = crud.cambiar_habitacion_reserva(db, reserva_id, nueva_habitacion_id)
    if not resultado:
        raise HTTPException(status_code=400, detail="No se pudo cambiar la habitación")
    return resultado

if __name__ == "__main__":
    import uvicorn
    
    print("=" * 70)
    print("INICIANDO PUENTE HOTEL API")
    print("=" * 70)
    print("\n📍 Servidor corriendo en: http://localhost:8000")
    print("📚 Documentación interactiva: http://localhost:8000/docs")
    print("🔄 Documentación alternativa: http://localhost:8000/redoc")
    print("\nPresiona CTRL+C para detener el servidor\n")
    
    uvicorn.run(app, host="0.0.0.0", port=8000)
