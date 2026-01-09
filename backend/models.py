"""
Puente Hotel - Database Models
Arquitectura: SQLAlchemy + SQLite
Regla crítica: El precio se guarda en la reserva, no solo en la habitación
"""

from sqlalchemy import create_engine, Column, Integer, String, Float, Date, DateTime, Enum, ForeignKey
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship
from enum import Enum as PyEnum
from datetime import date, datetime

Base = declarative_base()

# ============================================================================
# ENUMS (Tipos de Datos con Opciones Limitadas)
# ============================================================================

class TipoHabitacion(PyEnum):
    SIMPLE = "SIMPLE"
    DOBLE = "DOBLE"
    SUITE = "SUITE"

class EstadoHabitacion(PyEnum):
    DISPONIBLE = "DISPONIBLE"
    OCUPADA = "OCUPADA"
    LIMPIEZA = "LIMPIEZA"
    MANTENIMIENTO = "MANTENIMIENTO"

class EstadoReserva(PyEnum):
    PENDIENTE = "PENDIENTE"
    CHECKIN = "CHECKIN"
    CHECKOUT = "CHECKOUT"
    CANCELADA = "CANCELADA"
    FINALIZADA = "FINALIZADA"  # Nueva: para checkout completado

# ============================================================================
# TABLE: Habitaciones
# ============================================================================

class Habitacion(Base):
    __tablename__ = "habitaciones"
    
    id = Column(Integer, primary_key=True)
    numero = Column(String, unique=True, nullable=False)  # Ej: '101', '202'
    tipo = Column(Enum(TipoHabitacion), nullable=False)
    precio_base = Column(Float, nullable=False)
    estado = Column(Enum(EstadoHabitacion), nullable=False, default=EstadoHabitacion.DISPONIBLE)
    
    # Relación con Reservas
    reservas = relationship("Reserva", back_populates="habitacion")
    
    def __repr__(self):
        return f"<Habitacion {self.numero} ({self.tipo.value})>"

# ============================================================================
# TABLE: Clientes
# ============================================================================

class Cliente(Base):
    __tablename__ = "clientes"
    
    id = Column(Integer, primary_key=True)
    dni = Column(String, unique=True, nullable=False, index=True)
    nombre_completo = Column(String, nullable=False)
    email = Column(String, nullable=False)
    telefono = Column(String, nullable=True)  # Teléfono de contacto
    
    # Relación con Reservas
    reservas = relationship("Reserva", back_populates="cliente")
    
    def __repr__(self):
        return f"<Cliente {self.nombre_completo} (DNI: {self.dni})>"

# ============================================================================
# TABLE: Reservas
# ============================================================================

class Reserva(Base):
    __tablename__ = "reservas"
    
    id = Column(Integer, primary_key=True)
    habitacion_id = Column(Integer, ForeignKey("habitaciones.id"), nullable=False)
    cliente_id = Column(Integer, ForeignKey("clientes.id"), nullable=False)
    fecha_entrada = Column(Date, nullable=False)
    fecha_salida = Column(Date, nullable=False)
    precio_total = Column(Float, nullable=False)  # ⚠️ CRÍTICO: Se calcula al crear la reserva
    estado = Column(Enum(EstadoReserva), nullable=False, default=EstadoReserva.PENDIENTE)
    checkin_timestamp = Column(DateTime, nullable=True)  # Hora exacta del check-in
    checkout_timestamp = Column(DateTime, nullable=True)  # Hora exacta del check-out
    
    # Relaciones
    habitacion = relationship("Habitacion", back_populates="reservas")
    cliente = relationship("Cliente", back_populates="reservas")
    consumos = relationship("Consumo", back_populates="reserva", cascade="all, delete-orphan")
    
    def __repr__(self):
        return f"<Reserva {self.id}: {self.habitacion.numero} ({self.fecha_entrada} a {self.fecha_salida})>"

# ============================================================================
# TABLE: Productos (Minibar/Kiosco)
# ============================================================================

class Producto(Base):
    __tablename__ = "productos"
    
    id = Column(Integer, primary_key=True)
    nombre = Column(String, nullable=False, unique=True)
    precio = Column(Float, nullable=False)
    activo = Column(Integer, default=1)  # 1=activo, 0=inactivo
    
    # Relación con Consumos
    consumos = relationship("Consumo", back_populates="producto")
    
    def __repr__(self):
        return f"<Producto {self.nombre} (${self.precio})>"

# ============================================================================
# TABLE: Consumos (Gastos extras de cada reserva)
# ============================================================================

class Consumo(Base):
    __tablename__ = "consumos"
    
    id = Column(Integer, primary_key=True)
    reserva_id = Column(Integer, ForeignKey("reservas.id"), nullable=False)
    producto_id = Column(Integer, ForeignKey("productos.id"), nullable=False)
    cantidad = Column(Integer, nullable=False, default=1)
    precio_unitario = Column(Float, nullable=False)  # Precio al momento del consumo
    fecha_consumo = Column(Date, nullable=False)
    
    # Relaciones
    reserva = relationship("Reserva", back_populates="consumos")
    producto = relationship("Producto", back_populates="consumos")
    
    def __repr__(self):
        return f"<Consumo {self.cantidad}x {self.producto.nombre} - Reserva {self.reserva_id}>"

# ============================================================================
# DATABASE ENGINE
# ============================================================================

# Crear la base de datos (SQLite local)
DATABASE_URL = "sqlite:///./puente_hotel.db"
engine = create_engine(DATABASE_URL, echo=False)

def init_db():
    """Crear todas las tablas en la base de datos"""
    Base.metadata.create_all(bind=engine)

if __name__ == "__main__":
    init_db()
    print("✓ Base de datos inicializada correctamente")
