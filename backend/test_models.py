"""
Puente Hotel - Script de Prueba
Verifica que el modelo de datos funciona correctamente y crea la BD
"""

from sqlalchemy.orm import sessionmaker
from models import init_db, engine, Habitacion, Cliente, Reserva
from models import TipoHabitacion, EstadoHabitacion, EstadoReserva
from logic import check_availability, calcular_precio_total, crear_reserva
from datetime import date, timedelta

# ============================================================================
# PASO 1: Inicializar la base de datos
# ============================================================================

print("=" * 70)
print("PASO 1: Inicializando base de datos...")
print("=" * 70)

init_db()
print("✓ Base de datos creada/sincronizada correctamente")

# ============================================================================
# PASO 2: Crear sesión y datos de prueba
# ============================================================================

print("\n" + "=" * 70)
print("PASO 2: Insertando datos de prueba...")
print("=" * 70)

Session = sessionmaker(bind=engine)
db = Session()

# Limpiar datos anteriores (si existen)
db.query(Reserva).delete()
db.query(Cliente).delete()
db.query(Habitacion).delete()
db.commit()

# Crear habitaciones
hab_101 = Habitacion(numero="101", tipo=TipoHabitacion.SIMPLE, precio_base=50.0)
hab_102 = Habitacion(numero="102", tipo=TipoHabitacion.DOBLE, precio_base=75.0)
hab_103 = Habitacion(numero="103", tipo=TipoHabitacion.SUITE, precio_base=150.0)

db.add_all([hab_101, hab_102, hab_103])
db.commit()
print("✓ 3 habitaciones creadas (101, 102, 103)")

# Crear clientes
cli_1 = Cliente(dni="12345678", nombre_completo="Juan García", email="juan@example.com")
cli_2 = Cliente(dni="87654321", nombre_completo="María López", email="maria@example.com")

db.add_all([cli_1, cli_2])
db.commit()
print("✓ 2 clientes creados")

# ============================================================================
# PASO 3: Probar la lógica de disponibilidad
# ============================================================================

print("\n" + "=" * 70)
print("PASO 3: Probando lógica de disponibilidad...")
print("=" * 70)

# Crear una reserva de prueba
hoy = date.today()
fecha_entrada = hoy + timedelta(days=5)
fecha_salida = hoy + timedelta(days=10)

print(f"\nBúsqueda: {fecha_entrada} a {fecha_salida}")

# Buscar habitaciones disponibles
disponibles = check_availability(db, fecha_entrada, fecha_salida)
print(f"✓ Habitaciones disponibles: {len(disponibles)}")
for hab in disponibles:
    print(f"  - {hab.numero} ({hab.tipo.value}) - ${hab.precio_base}/noche")

# ============================================================================
# PASO 4: Crear una reserva (debe ser exitosa)
# ============================================================================

print("\n" + "=" * 70)
print("PASO 4: Creando primera reserva...")
print("=" * 70)

resultado = crear_reserva(db, cli_1.id, hab_101.id, fecha_entrada, fecha_salida)
print(f"✓ Reserva creada: {resultado['reserva']}")

# ============================================================================
# PASO 5: Intentar crear una reserva conflictiva (debe fallar)
# ============================================================================

print("\n" + "=" * 70)
print("PASO 5: Intentando crear reserva conflictiva (debe fallar)...")
print("=" * 70)

# Intentar reservar la MISMA habitación en fechas que se solapan
fecha_entrada_solapada = hoy + timedelta(days=6)  # Está dentro del rango 5-10
fecha_salida_solapada = hoy + timedelta(days=12)

resultado_conflicto = crear_reserva(db, cli_2.id, hab_101.id, fecha_entrada_solapada, fecha_salida_solapada)
print(f"✓ Error esperado: {resultado_conflicto['error']}")
print(f"  Mensaje: {resultado_conflicto['message']}")
print(f"  HTTP Code: {resultado_conflicto['http_code']}")

# ============================================================================
# PASO 6: Crear una reserva en habitación diferente (debe ser exitosa)
# ============================================================================

print("\n" + "=" * 70)
print("PASO 6: Creando reserva en habitación diferente...")
print("=" * 70)

resultado2 = crear_reserva(db, cli_2.id, hab_102.id, fecha_entrada_solapada, fecha_salida_solapada)
print(f"✓ Segunda reserva creada: {resultado2['reserva']}")

# ============================================================================
# RESUMEN
# ============================================================================

print("\n" + "=" * 70)
print("RESUMEN DE PRUEBAS")
print("=" * 70)

# Contar registros
total_habitaciones = db.query(Habitacion).count()
total_clientes = db.query(Cliente).count()
total_reservas = db.query(Reserva).count()

print(f"✓ Habitaciones en BD: {total_habitaciones}")
print(f"✓ Clientes en BD: {total_clientes}")
print(f"✓ Reservas en BD: {total_reservas}")

print("\n✅ TODAS LAS PRUEBAS COMPLETADAS EXITOSAMENTE")
print("✅ Base de datos 'puente_hotel.db' creada en backend/")

db.close()
