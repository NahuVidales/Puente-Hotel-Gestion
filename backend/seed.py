"""
Puente Hotel - Seed Data
Script para crear datos iniciales en la base de datos
Ejecutar solo una vez: python seed.py
"""

from sqlalchemy.orm import sessionmaker
from models import init_db, engine, Habitacion, Cliente
from models import TipoHabitacion

print("="*70)
print("CREANDO DATOS INICIALES (SEED DATA)")
print("="*70)

# Inicializar base de datos
init_db()
print("\n✓ Base de datos inicializada")

# Crear sesión
Session = sessionmaker(bind=engine)
db = Session()

# Limpiar datos existentes
print("\n[LIMPIEZA] Eliminando datos existentes...")
db.query(Habitacion).delete()
db.query(Cliente).delete()
db.commit()
print("✓ Base de datos limpiada")

# ============================================================================
# CREAR 25 HABITACIONES
# ============================================================================

print("\n[PASO 1] Creando 25 habitaciones...")

habitaciones = [
    # SIMPLE (1-10): 10 habitaciones a $50-60
    Habitacion(numero="1", tipo="SIMPLE", precio_base=50.0, estado="DISPONIBLE"),
    Habitacion(numero="2", tipo="SIMPLE", precio_base=50.0, estado="DISPONIBLE"),
    Habitacion(numero="3", tipo="SIMPLE", precio_base=55.0, estado="DISPONIBLE"),
    Habitacion(numero="4", tipo="SIMPLE", precio_base=50.0, estado="DISPONIBLE"),
    Habitacion(numero="5", tipo="SIMPLE", precio_base=55.0, estado="DISPONIBLE"),
    Habitacion(numero="6", tipo="SIMPLE", precio_base=50.0, estado="DISPONIBLE"),
    Habitacion(numero="7", tipo="SIMPLE", precio_base=55.0, estado="DISPONIBLE"),
    Habitacion(numero="8", tipo="SIMPLE", precio_base=50.0, estado="DISPONIBLE"),
    Habitacion(numero="9", tipo="SIMPLE", precio_base=55.0, estado="DISPONIBLE"),
    Habitacion(numero="10", tipo="SIMPLE", precio_base=60.0, estado="DISPONIBLE"),
    
    # DOBLE (11-20): 10 habitaciones a $80-95
    Habitacion(numero="11", tipo="DOBLE", precio_base=80.0, estado="DISPONIBLE"),
    Habitacion(numero="12", tipo="DOBLE", precio_base=85.0, estado="DISPONIBLE"),
    Habitacion(numero="13", tipo="DOBLE", precio_base=80.0, estado="DISPONIBLE"),
    Habitacion(numero="14", tipo="DOBLE", precio_base=90.0, estado="DISPONIBLE"),
    Habitacion(numero="15", tipo="DOBLE", precio_base=80.0, estado="DISPONIBLE"),
    Habitacion(numero="16", tipo="DOBLE", precio_base=85.0, estado="DISPONIBLE"),
    Habitacion(numero="17", tipo="DOBLE", precio_base=95.0, estado="DISPONIBLE"),
    Habitacion(numero="18", tipo="DOBLE", precio_base=80.0, estado="DISPONIBLE"),
    Habitacion(numero="19", tipo="DOBLE", precio_base=85.0, estado="DISPONIBLE"),
    Habitacion(numero="20", tipo="DOBLE", precio_base=90.0, estado="DISPONIBLE"),
    
    # SUITE (21-25): 5 habitaciones a $150-180
    Habitacion(numero="21", tipo="SUITE", precio_base=150.0, estado="DISPONIBLE"),
    Habitacion(numero="22", tipo="SUITE", precio_base=160.0, estado="DISPONIBLE"),
    Habitacion(numero="23", tipo="SUITE", precio_base=150.0, estado="DISPONIBLE"),
    Habitacion(numero="24", tipo="SUITE", precio_base=180.0, estado="DISPONIBLE"),
    Habitacion(numero="25", tipo="SUITE", precio_base=170.0, estado="DISPONIBLE"),
]

for hab in habitaciones:
    db.add(hab)

db.commit()
print("✓ 10 habitaciones creadas:")
print("  - 3 Simples ($50-55/noche)")
print("  - 4 Dobles ($80-90/noche)")
print("  - 3 Suites ($150-160/noche)")

# ============================================================================
# CREAR 5 CLIENTES
# ============================================================================

print("\n[PASO 2] Creando 5 clientes de prueba...")

clientes = [
    Cliente(dni="12345678A", nombre_completo="Juan García López", email="juan@example.com"),
    Cliente(dni="87654321B", nombre_completo="María Rodríguez Martín", email="maria@example.com"),
    Cliente(dni="11223344C", nombre_completo="Carlos Fernández Ruiz", email="carlos@example.com"),
    Cliente(dni="55667788D", nombre_completo="Ana Martínez González", email="ana@example.com"),
    Cliente(dni="99887766E", nombre_completo="Pedro López Sánchez", email="pedro@example.com"),
]

for cli in clientes:
    db.add(cli)

db.commit()
print("✓ 5 clientes creados")

# ============================================================================
# RESUMEN
# ============================================================================

print("\n" + "="*70)
print("✅ DATOS INICIALES CREADOS EXITOSAMENTE")
print("="*70)

total_hab = db.query(Habitacion).count()
total_cli = db.query(Cliente).count()

print(f"\nResumen:")
print(f"  • Habitaciones: {total_hab}")
print(f"  • Clientes: {total_cli}")
print(f"\nAhora ejecuta: uvicorn main:app --reload")
print(f"Servidor en: http://localhost:8000/docs")
print("\n")

db.close()
