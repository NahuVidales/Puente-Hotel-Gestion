"""
Puente Hotel - Lógica de Disponibilidad
FUNCIÓN CRÍTICA: check_availability

Regla de Negocio:
Una habitación NO está disponible si existe una reserva confirmada 
cuyas fechas se solapan con las fechas solicitadas.

Fórmula de Solapamiento de Fechas:
(ReservaExistente.fecha_entrada < Nueva.fecha_salida) AND 
(ReservaExistente.fecha_salida > Nueva.fecha_entrada)

Si esta condición es VERDADERA, la habitación está OCUPADA.
"""

from datetime import date
from sqlalchemy.orm import Session
from models import Habitacion, Reserva, EstadoReserva
from typing import List

# ============================================================================
# FUNCIÓN CRÍTICA: Verificar Disponibilidad
# ============================================================================

def check_availability(
    db: Session,
    fecha_entrada: date,
    fecha_salida: date,
    habitacion_id: int = None
) -> List[Habitacion]:
    """
    Verifica qué habitaciones están disponibles en un rango de fechas.
    
    Args:
        db: Sesión de base de datos
        fecha_entrada: Fecha de check-in
        fecha_salida: Fecha de check-out
        habitacion_id: (Opcional) Para verificar una habitación específica
    
    Returns:
        Lista de habitaciones disponibles en ese rango
    
    ⚠️ LÓGICA:
    Encontrar habitaciones que NO tengan reservas confirmadas 
    cuyas fechas se solapen con el rango solicitado.
    """
    
    # Obtener todas las habitaciones (o una específica)
    if habitacion_id:
        habitaciones = db.query(Habitacion).filter(Habitacion.id == habitacion_id).all()
    else:
        habitaciones = db.query(Habitacion).all()
    
    habitaciones_disponibles = []
    
    for hab in habitaciones:
        # Buscar si hay alguna reserva que se solape
        reserva_solapada = db.query(Reserva).filter(
            Reserva.habitacion_id == hab.id,
            Reserva.estado != EstadoReserva.CANCELADA,  # Ignorar canceladas
            # FÓRMULA CRÍTICA DE SOLAPAMIENTO:
            Reserva.fecha_entrada < fecha_salida,
            Reserva.fecha_salida > fecha_entrada
        ).first()
        
        # Si NO hay solapamiento, la habitación está disponible
        if not reserva_solapada:
            habitaciones_disponibles.append(hab)
    
    return habitaciones_disponibles

# ============================================================================
# FUNCIÓN: Calcular Precio Total de la Reserva
# ============================================================================

def calcular_precio_total(
    precio_base: float,
    fecha_entrada: date,
    fecha_salida: date
) -> float:
    """
    Calcula el precio total de una reserva.
    
    Args:
        precio_base: Precio por noche (en base)
        fecha_entrada: Fecha de entrada
        fecha_salida: Fecha de salida
    
    Returns:
        Precio total para esas noches
    
    Fórmula: (Fecha_Salida - Fecha_Entrada).days * Precio_Base
    """
    dias_hospedaje = (fecha_salida - fecha_entrada).days
    if dias_hospedaje <= 0:
        raise ValueError("La fecha de salida debe ser posterior a la de entrada")
    
    return dias_hospedaje * precio_base

# ============================================================================
# FUNCIÓN: Crear una Nueva Reserva (con validaciones)
# ============================================================================

def crear_reserva(
    db: Session,
    cliente_id: int,
    habitacion_id: int,
    fecha_entrada: date,
    fecha_salida: date
) -> dict:
    """
    Crea una nueva reserva después de validar disponibilidad.
    
    Args:
        db: Sesión de base de datos
        cliente_id: ID del cliente
        habitacion_id: ID de la habitación
        fecha_entrada: Fecha de entrada
        fecha_salida: Fecha de salida
    
    Returns:
        dict con status, mensaje y datos de la reserva
    
    Flujo:
    1. Verificar que la habitación está disponible en esas fechas
    2. Si NO está disponible, retornar error HTTP 409
    3. Si está disponible, calcular precio total
    4. Crear y guardar la reserva
    """
    
    # Step 1: Verificar disponibilidad
    habitaciones_disponibles = check_availability(db, fecha_entrada, fecha_salida, habitacion_id)
    
    if not habitaciones_disponibles:
        return {
            "success": False,
            "error": "HABITACION_NO_DISPONIBLE",
            "message": "La habitación no está disponible en esas fechas",
            "http_code": 409  # Conflict
        }
    
    # Step 2: Obtener la habitación
    habitacion = db.query(Habitacion).filter(Habitacion.id == habitacion_id).first()
    if not habitacion:
        return {
            "success": False,
            "error": "HABITACION_NO_ENCONTRADA",
            "message": "La habitación solicitada no existe",
            "http_code": 404
        }
    
    # Step 3: Calcular precio total
    try:
        precio_total = calcular_precio_total(habitacion.precio_base, fecha_entrada, fecha_salida)
    except ValueError as e:
        return {
            "success": False,
            "error": "FECHAS_INVALIDAS",
            "message": str(e),
            "http_code": 400
        }
    
    # Step 4: Crear la reserva
    nueva_reserva = Reserva(
        habitacion_id=habitacion_id,
        cliente_id=cliente_id,
        fecha_entrada=fecha_entrada,
        fecha_salida=fecha_salida,
        precio_total=precio_total
    )
    
    db.add(nueva_reserva)
    db.commit()
    db.refresh(nueva_reserva)
    
    return {
        "success": True,
        "message": "Reserva creada correctamente",
        "reserva": {
            "id": nueva_reserva.id,
            "habitacion_numero": habitacion.numero,
            "fecha_entrada": str(nueva_reserva.fecha_entrada),
            "fecha_salida": str(nueva_reserva.fecha_salida),
            "precio_total": nueva_reserva.precio_total,
            "estado": nueva_reserva.estado.value
        }
    }

if __name__ == "__main__":
    print("✓ Módulo de lógica de disponibilidad cargado correctamente")
