"""
Limpia la base de datos de reservas
"""
from models import engine, Reserva
from sqlalchemy.orm import sessionmaker

Session = sessionmaker(bind=engine)
db = Session()

# Eliminar todas las reservas
db.query(Reserva).delete()
db.commit()

print("✅ Todas las reservas fueron eliminadas")
