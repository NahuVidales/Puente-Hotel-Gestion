"""
Puente Hotel - Schemas Pydantic
Define la estructura de datos que se envía/recibe en las solicitudes HTTP
"""

from pydantic import BaseModel, ConfigDict, Field
from datetime import date
from typing import Optional, List

# ============================================================================
# HABITACIÓN SCHEMAS
# ============================================================================

class HabitacionBase(BaseModel):
    numero: str = Field(..., min_length=1, max_length=10, description="Número de habitación")
    tipo: str = Field(..., description="Tipo: SIMPLE, DOBLE, TRIPLE, SUITE")
    precio_base: float = Field(..., gt=0, description="Precio por noche")
    estado: str = Field(default="DISPONIBLE", description="Estado actual de la habitación")

class HabitacionCreate(HabitacionBase):
    pass

class HabitacionUpdate(BaseModel):
    estado: Optional[str] = None

class HabitacionResponse(HabitacionBase):
    model_config = ConfigDict(from_attributes=True)
    id: int

# ============================================================================
# RESERVA FUTURA SCHEMA (Para mostrar en tarjeta)
# ============================================================================

class ReservaFutura(BaseModel):
    """Información simplificada de una reserva futura"""
    fecha_entrada: date
    fecha_salida: date
    nombre_cliente: str

class HabitacionDetalle(HabitacionResponse):
    """Esquema extendido con información de reservas activas y futuras"""
    reserva_actual_id: Optional[int] = None
    reserva_actual_inicio: Optional[date] = None
    reserva_actual_fin: Optional[date] = None
    nombre_cliente: Optional[str] = None
    proximas_reservas: List[ReservaFutura] = []

# ============================================================================
# CLIENTE SCHEMAS
# ============================================================================

class ClienteBase(BaseModel):
    dni: str = Field(..., min_length=5, max_length=20, description="DNI/Pasaporte único")
    nombre_completo: str = Field(..., min_length=3, max_length=100, description="Nombre completo")
    email: Optional[str] = Field(None, description="Email del cliente (opcional)")
    telefono: str = Field(..., max_length=20, description="Teléfono de contacto (obligatorio)")

class ClienteCreate(ClienteBase):
    pass

class ClienteUpdate(BaseModel):
    """Schema para actualizar datos del cliente durante check-in"""
    nombre_completo: Optional[str] = Field(None, min_length=3, max_length=100)
    email: Optional[str] = Field(None)
    telefono: Optional[str] = Field(None, max_length=20)

class ClienteResponse(BaseModel):
    """Schema de respuesta - telefono opcional para clientes antiguos sin teléfono"""
    model_config = ConfigDict(from_attributes=True)
    id: int
    dni: str
    nombre_completo: str
    email: Optional[str] = None
    telefono: Optional[str] = None

# ============================================================================
# RESERVA SCHEMAS
# ============================================================================

class ReservaBase(BaseModel):
    habitacion_id: int = Field(..., gt=0)
    cliente_id: int = Field(..., gt=0)
    fecha_entrada: date = Field(..., description="Fecha de check-in")
    fecha_salida: date = Field(..., description="Fecha de check-out")

class ReservaCreate(ReservaBase):
    """
    IMPORTANTE: precio_noche es opcional
    Si no se envía, se usa el precio_base de la habitación
    """
    precio_noche: Optional[float] = Field(None, gt=0, description="Precio por noche personalizado (opcional)")

class ReservaUpdate(BaseModel):
    estado: Optional[str] = None

# Schema embebido para cliente en respuesta de reserva
class ClienteEmbedded(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    dni: str
    nombre_completo: str
    email: Optional[str] = None
    telefono: Optional[str] = None  # Opcional en respuesta para clientes antiguos

# Schema embebido para habitación en respuesta de reserva
class HabitacionEmbedded(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    numero: str
    tipo: str
    precio_base: float

class ReservaResponse(ReservaBase):
    model_config = ConfigDict(from_attributes=True)
    id: int
    precio_total: float = Field(..., description="Precio total calculado")
    estado: str = Field(..., description="Estado de la reserva")
    cliente: Optional[ClienteEmbedded] = None
    habitacion: Optional[HabitacionEmbedded] = None

# Respuesta extendida con datos de cliente y habitación para historial
class ReservaHistorialResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    habitacion_id: int
    cliente_id: int
    fecha_entrada: date
    fecha_salida: date
    precio_total: float
    estado: str
    cliente_nombre: Optional[str] = None
    cliente_dni: Optional[str] = None
    habitacion_numero: Optional[str] = None

# ============================================================================
# PRODUCTO SCHEMAS (Minibar/Kiosco)
# ============================================================================

class ProductoBase(BaseModel):
    nombre: str = Field(..., min_length=1, max_length=100, description="Nombre del producto")
    # Permitir precios negativos (ej: cargos/ajustes negativos)
    precio: float = Field(..., description="Precio unitario")
    activo: Optional[bool] = True

class ProductoCreate(ProductoBase):
    pass

class ProductoResponse(ProductoBase):
    model_config = ConfigDict(from_attributes=True)
    id: int

# ============================================================================
# CONSUMO SCHEMAS (Gastos extras)
# ============================================================================

class ConsumoCreate(BaseModel):
    producto_id: int = Field(..., gt=0)
    cantidad: int = Field(1, gt=0, description="Cantidad consumida")

class ConsumoResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    reserva_id: int
    producto_id: int
    cantidad: int
    precio_unitario: float
    fecha_consumo: date

# ============================================================================
# CUENTA/FACTURA SCHEMAS
# ============================================================================

class CuentaConsumoDetalle(BaseModel):
    id: int
    producto_nombre: str
    cantidad: int
    precio_unitario: float
    subtotal: float
    fecha: date

class CuentaResponse(BaseModel):
    reserva_id: int
    habitacion_numero: str
    cliente_nombre: str
    fecha_entrada: date
    fecha_salida: date
    noches: int
    precio_noche: float
    total_alojamiento: float
    consumos: List[CuentaConsumoDetalle]
    total_consumos: float
    total_general: float

# ============================================================================
# SCHEMAS AUXILIARES
# ============================================================================

class DisponibilidadRequest(BaseModel):
    fecha_entrada: date
    fecha_salida: date
    habitacion_id: Optional[int] = None

class DisponibilidadResponse(BaseModel):
    disponible: bool
    mensaje: str
    habitaciones_libres: Optional[list] = None
