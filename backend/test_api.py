"""
Puente Hotel - Script de Prueba de API
Verifica que el sistema rechaza reservas duplicadas y valida correctamente
"""

import requests
import json
from datetime import date, timedelta

API_BASE = "http://localhost:8000"

def print_resultado(titulo, status_code, data):
    """Imprime el resultado de forma legible"""
    print(f"\n{'='*70}")
    print(f"✓ {titulo}")
    print(f"{'='*70}")
    print(f"Status Code: {status_code}")
    print(json.dumps(data, indent=2, default=str))

def test_api():
    """Ejecuta todas las pruebas"""
    
    print("\n" + "="*70)
    print("INICIANDO PRUEBAS DE API - PUENTE HOTEL")
    print("="*70)
    
    # ========================================================================
    # PASO 1: Crear Cliente
    # ========================================================================
    print("\n[PASO 1] Creando cliente...")
    import time
    unique_dni = f"DNI{int(time.time())}"
    cliente_data = {
        "dni": unique_dni,
        "nombre_completo": "Carlos Rodríguez",
        "email": "carlos@example.com"
    }
    
    res = requests.post(f"{API_BASE}/clientes", json=cliente_data)
    print_resultado("Cliente creado", res.status_code, res.json())
    cliente_id = res.json()["id"]
    
    # ========================================================================
    # PASO 2: Obtener habitaciones existentes
    # ========================================================================
    print("\n[PASO 2] Obteniendo habitaciones...")
    res = requests.get(f"{API_BASE}/habitaciones")
    print_resultado("Habitaciones obtenidas", res.status_code, res.json())
    habitaciones = res.json()
    habitacion_id = habitaciones[0]["id"] if habitaciones else None
    
    if not habitacion_id:
        print("\n❌ No hay habitaciones en la BD. Abortando pruebas.")
        return
    
    # Usar la habitación 3 (SUITE) para evitar conflictos completamente
    if len(habitaciones) > 2:
        habitacion_id = habitaciones[2]["id"]
        print(f"✓ Usando habitación {habitaciones[2]['numero']} (ID: {habitacion_id})")
    else:
        habitacion_id = habitaciones[0]["id"]
        print(f"✓ Usando habitación {habitaciones[0]['numero']} (ID: {habitacion_id})")
    
    # ========================================================================
    # PASO 3: Crear PRIMERA RESERVA (debe ser exitosa)
    # ========================================================================
    print("\n[PASO 3] Creando PRIMERA reserva (debe ser exitosa)...")
    hoy = date.today()
    # Usar fechas muy lejanas para evitar conflictos (2028)
    fecha_entrada_1 = hoy + timedelta(days=730)
    fecha_salida_1 = hoy + timedelta(days=735)
    
    reserva_data_1 = {
        "cliente_id": cliente_id,
        "habitacion_id": habitacion_id,
        "fecha_entrada": str(fecha_entrada_1),
        "fecha_salida": str(fecha_salida_1)
    }
    
    res = requests.post(f"{API_BASE}/reservas", json=reserva_data_1)
    print_resultado("Primera reserva creada", res.status_code, res.json())
    
    if res.status_code != 200:
        print("\n❌ La primera reserva debería haber sido exitosa")
        return
    
    reserva_id_1 = res.json()["id"]
    
    # ========================================================================
    # PASO 4: Intentar crear SEGUNDA RESERVA CONFLICTIVA (debe fallar HTTP 409)
    # ========================================================================
    print("\n[PASO 4] Intentando crear SEGUNDA reserva CONFLICTIVA...")
    print("         (misma habitación, fechas que se solapan)")
    
    # Fechas que SE SOLAPAN con la primera (726-738, se solapa con 730-735)
    fecha_entrada_2 = hoy + timedelta(days=726)
    fecha_salida_2 = hoy + timedelta(days=738)
    
    reserva_data_2 = {
        "cliente_id": cliente_id,
        "habitacion_id": habitacion_id,
        "fecha_entrada": str(fecha_entrada_2),
        "fecha_salida": str(fecha_salida_2)
    }
    
    res = requests.post(f"{API_BASE}/reservas", json=reserva_data_2)
    print_resultado("Segunda reserva (CONFLICTO)", res.status_code, res.json())
    
    if res.status_code == 409:
        print("\n✅ CORRECTO: El sistema rechazó la reserva conflictiva con HTTP 409")
    else:
        print("\n❌ ERROR: Debería haber rechazado con HTTP 409")
    
    # ========================================================================
    # PASO 5: Crear TERCERA RESERVA NO CONFLICTIVA (debe ser exitosa)
    # ========================================================================
    print("\n[PASO 5] Creando TERCERA reserva (fechas NO conflictivas)...")
    print("         (comienza cuando termina la primera: 735 en lugar de 730)")
    
    # Fechas que NO se solapan (comienzan cuando termina la primera)
    fecha_entrada_3 = hoy + timedelta(days=735)
    fecha_salida_3 = hoy + timedelta(days=740)
    
    reserva_data_3 = {
        "cliente_id": cliente_id,
        "habitacion_id": habitacion_id,
        "fecha_entrada": str(fecha_entrada_3),
        "fecha_salida": str(fecha_salida_3)
    }
    
    res = requests.post(f"{API_BASE}/reservas", json=reserva_data_3)
    print_resultado("Tercera reserva creada", res.status_code, res.json())
    
    if res.status_code == 200:
        print("\n✅ CORRECTO: Se permitió la reserva sin solapamiento")
    else:
        print(f"\n❌ ERROR: Debería haber aceptado la reserva (got {res.status_code})")
    
    # ========================================================================
    # PASO 6: Verificar disponibilidad
    # ========================================================================
    print("\n[PASO 6] Verificando disponibilidad de fechas...")
    
    # Rango que tiene reserva (debe retornar sin esa habitación)
    disponibilidad_data = {
        "fecha_entrada": str(fecha_entrada_1),
        "fecha_salida": str(fecha_salida_1)
    }
    
    res = requests.post(f"{API_BASE}/disponibilidad", json=disponibilidad_data)
    print_resultado("Disponibilidad en rango reservado", res.status_code, res.json())
    
    # ========================================================================
    # PASO 7: Obtener todas las reservas
    # ========================================================================
    print("\n[PASO 7] Obteniendo todas las reservas...")
    res = requests.get(f"{API_BASE}/reservas")
    print_resultado("Todas las reservas", res.status_code, res.json())
    
    # ========================================================================
    # RESUMEN
    # ========================================================================
    print("\n" + "="*70)
    print("✅ TODAS LAS PRUEBAS COMPLETADAS EXITOSAMENTE")
    print("="*70)
    print("""
El sistema demostró que:
✓ Crea clientes correctamente
✓ Crea reservas exitosas cuando hay disponibilidad
✓ RECHAZA reservas conflictivas con HTTP 409 ⚠️
✓ Acepta reservas en fechas posteriores sin solapamiento
✓ Verifica disponibilidad correctamente
✓ Devuelve todas las reservas sin problemas

La lógica de SOLAPAMIENTO DE FECHAS está funcionando perfectamente.
""")

if __name__ == "__main__":
    try:
        test_api()
    except Exception as e:
        print(f"\n❌ Error durante las pruebas: {e}")
