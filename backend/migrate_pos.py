"""
Script para agregar tablas de POS (Productos y Consumos)
"""
import sqlite3

conn = sqlite3.connect('puente_hotel.db')
cursor = conn.cursor()

# Crear tabla productos si no existe
cursor.execute('''
    CREATE TABLE IF NOT EXISTS productos (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nombre VARCHAR(100) NOT NULL,
        precio REAL NOT NULL,
        activo INTEGER DEFAULT 1
    )
''')

# Crear tabla consumos si no existe
cursor.execute('''
    CREATE TABLE IF NOT EXISTS consumos (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        reserva_id INTEGER NOT NULL,
        producto_id INTEGER NOT NULL,
        cantidad INTEGER DEFAULT 1,
        precio_unitario REAL NOT NULL,
        fecha_consumo DATE DEFAULT CURRENT_DATE,
        FOREIGN KEY (reserva_id) REFERENCES reservas(id),
        FOREIGN KEY (producto_id) REFERENCES productos(id)
    )
''')

# Insertar productos de ejemplo si la tabla está vacía
cursor.execute('SELECT COUNT(*) FROM productos')
if cursor.fetchone()[0] == 0:
    productos_ejemplo = [
        ('Coca-Cola', 35.00),
        ('Agua Mineral', 25.00),
        ('Cerveza', 50.00),
        ('Papas Fritas', 40.00),
        ('Chocolate', 30.00),
        ('Café', 35.00),
        ('Jugo de Naranja', 40.00),
        ('Sandwich', 60.00),
        ('Pizza Personal', 120.00),
        ('Lavandería - Camisa', 80.00),
        ('Lavandería - Pantalón', 100.00),
        ('Servicio a Habitación', 50.00),
    ]
    cursor.executemany('INSERT INTO productos (nombre, precio) VALUES (?, ?)', productos_ejemplo)
    print(f"✅ Se insertaron {len(productos_ejemplo)} productos de ejemplo")

conn.commit()
conn.close()

print("✅ Migración POS completada exitosamente")
print("   - Tabla 'productos' creada/verificada")
print("   - Tabla 'consumos' creada/verificada")
