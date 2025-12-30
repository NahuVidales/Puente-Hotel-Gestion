import sqlite3

conn = sqlite3.connect('puente_hotel.db')
cursor = conn.cursor()

try:
    cursor.execute('ALTER TABLE clientes ADD COLUMN telefono TEXT')
    conn.commit()
    print('✅ Columna telefono agregada correctamente')
except Exception as e:
    print(f'Info: {e}')

conn.close()
