"""
Puente Hotel - CRUD Operations
Funciones para crear, leer, actualizar y borrar datos de la base de datos
"""

from sqlalchemy.orm import Session
from datetime import date
from models import Habitacion, Cliente, Reserva, Producto, Consumo
from models import EstadoHabitacion, EstadoReserva
from schemas import HabitacionCreate, ClienteCreate, ReservaCreate, ProductoCreate, ConsumoCreate
import schemas

# ============================================================================
# FUNCIONES: HABITACIONES
# ============================================================================

def create_habitacion(db: Session, habitacion: HabitacionCreate) -> Habitacion:
    """
    Crea una nueva habitación en la base de datos.
    
    Args:
        db: Sesión de base de datos
        habitacion: Datos de la habitación a crear
    
    Returns:
        Objeto Habitacion creado
    """
    db_habitacion = Habitacion(
        numero=habitacion.numero,
        tipo=habitacion.tipo,
        precio_base=habitacion.precio_base,
        estado=habitacion.estado or "DISPONIBLE"
    )
    db.add(db_habitacion)
    db.commit()
    db.refresh(db_habitacion)
    return db_habitacion

def get_habitacion(db: Session, habitacion_id: int) -> Habitacion:
    """Obtiene una habitación por su ID"""
    return db.query(Habitacion).filter(Habitacion.id == habitacion_id).first()

def get_habitaciones(db: Session) -> list[dict]:
    """
    Obtiene todas las habitaciones con información de reservas activas y futuras.
    
    LÓGICA CRÍTICA MEJORADA:
    El estado visual se CALCULA SIEMPRE basándose en fechas, NUNCA en el campo estado de BD.
    
    Para cada habitación:
    1. Si estado en BD es MANTENIMIENTO/LIMPIEZA → Respeta ese estado (decisión manual)
    2. Si hay reserva activa HOY (entrada <= HOY < salida) → Fuerza OCUPADA (calculado)
    3. Si NO hay reserva activa → Fuerza DISPONIBLE (calculado)
    
    Esto evita que las habitaciones se queden rojas por error histórico.
    
    Returns:
        Lista de diccionarios con estructura enriquecida
    """
    from datetime import date as date_class
    
    todas_habitaciones = db.query(Habitacion).all()
    resultado = []
    hoy = date_class.today()
    
    print(f"[DEBUG] get_habitaciones - Fecha de hoy: {hoy}")
    
    for habitacion in todas_habitaciones:
        # 1. Buscar si existe una reserva EN CHECKIN para HOY (huésped ya llegó)
        reserva_checkin = db.query(Reserva).filter(
            Reserva.habitacion_id == habitacion.id,
            Reserva.estado == EstadoReserva.CHECKIN,
            Reserva.fecha_entrada <= hoy,
            Reserva.fecha_salida > hoy
        ).first()
        
        # 2. Buscar si hay una reserva PENDIENTE para HOY (huésped por llegar)
        reserva_pendiente_hoy = db.query(Reserva).filter(
            Reserva.habitacion_id == habitacion.id,
            Reserva.estado == EstadoReserva.PENDIENTE,
            Reserva.fecha_entrada <= hoy,
            Reserva.fecha_salida > hoy
        ).first()
        
        # 3. Buscar próximas reservas FUTURAS (después de hoy) que no estén canceladas
        reservas_futuras = db.query(Reserva).filter(
            Reserva.habitacion_id == habitacion.id,
            Reserva.estado.in_([EstadoReserva.PENDIENTE, EstadoReserva.CHECKIN]),
            Reserva.fecha_entrada > hoy
        ).order_by(Reserva.fecha_entrada.asc()).all()
        
        # Construir diccionario base
        # Convertir enums a strings para la respuesta JSON
        tipo_str = habitacion.tipo.value if hasattr(habitacion.tipo, 'value') else str(habitacion.tipo)
        estado_str = habitacion.estado.value if hasattr(habitacion.estado, 'value') else str(habitacion.estado)
        
        hab_dict = {
            "id": habitacion.id,
            "numero": habitacion.numero,
            "tipo": tipo_str,
            "precio_base": habitacion.precio_base,
            "estado": estado_str,  # Valor inicial, puede ser sobrescrito
            "reserva_actual_id": None,
            "reserva_actual_inicio": None,
            "reserva_actual_fin": None,
            "nombre_cliente": None,
            "proximas_reservas": []
        }
        
        # ===============================================================
        # LÓGICA DE ESTADO VISUAL (Calculado, NO del campo BD)
        # ===============================================================
        
        # Obtener el valor del estado como string para comparación
        estado_actual = habitacion.estado.value if hasattr(habitacion.estado, 'value') else str(habitacion.estado)
        
        # PASO 1: Respetar estados manuales de mantenimiento/limpieza
        if estado_actual in ['MANTENIMIENTO', 'LIMPIEZA']:
            # Respetar la decisión manual del staff
            print(f"[DEBUG] Habitación {habitacion.numero}: {estado_actual} (manual del staff)")
        # PASO 2: Si hay reserva en CHECKIN hoy, la habitación está OCUPADA
        elif reserva_checkin:
            hab_dict["estado"] = 'OCUPADA'  # ← Huésped ya llegó
            hab_dict["reserva_actual_id"] = reserva_checkin.id
            hab_dict["reserva_actual_inicio"] = str(reserva_checkin.fecha_entrada)
            hab_dict["reserva_actual_fin"] = str(reserva_checkin.fecha_salida)
            if reserva_checkin.cliente:
                hab_dict["nombre_cliente"] = reserva_checkin.cliente.nombre_completo
            print(f"[DEBUG] Habitación {habitacion.numero}: OCUPADA (CHECKIN del {reserva_checkin.fecha_entrada} al {reserva_checkin.fecha_salida})")
        # PASO 3: Si hay reserva PENDIENTE hoy, mostrar como RESERVADA (esperando llegada)
        elif reserva_pendiente_hoy:
            hab_dict["estado"] = 'RESERVADA'  # ← Esperando que llegue el huésped
            hab_dict["reserva_actual_id"] = reserva_pendiente_hoy.id
            hab_dict["reserva_actual_inicio"] = str(reserva_pendiente_hoy.fecha_entrada)
            hab_dict["reserva_actual_fin"] = str(reserva_pendiente_hoy.fecha_salida)
            if reserva_pendiente_hoy.cliente:
                hab_dict["nombre_cliente"] = reserva_pendiente_hoy.cliente.nombre_completo
            print(f"[DEBUG] Habitación {habitacion.numero}: RESERVADA (pendiente check-in)")
        # PASO 4: Si NO hay reserva activa, está DISPONIBLE
        else:
            hab_dict["estado"] = 'DISPONIBLE'  # ← Sin huéspedes
            print(f"[DEBUG] Habitación {habitacion.numero}: DISPONIBLE (sin reserva activa)")
        
        # Agregar próximas reservas
        for reserva_futura in reservas_futuras:
            reserva_info = {
                "fecha_entrada": str(reserva_futura.fecha_entrada),
                "fecha_salida": str(reserva_futura.fecha_salida),
                "nombre_cliente": reserva_futura.cliente.nombre_completo if reserva_futura.cliente else "Cliente desconocido"
            }
            hab_dict["proximas_reservas"].append(reserva_info)
            print(f"[DEBUG]   └─ Próxima: {reserva_info['nombre_cliente']} ({reserva_futura.fecha_entrada} - {reserva_futura.fecha_salida})")
        
        resultado.append(hab_dict)
    
    return resultado

def update_habitacion_estado(db: Session, habitacion_id: int, nuevo_estado: str) -> Habitacion:
    """Actualiza el estado de una habitación"""
    habitacion = get_habitacion(db, habitacion_id)
    if habitacion:
        habitacion.estado = nuevo_estado
        db.commit()
        db.refresh(habitacion)
    return habitacion

def update_habitacion(db: Session, habitacion_id: int, habitacion_data: HabitacionCreate) -> Habitacion:
    """
    Actualiza todos los datos de una habitación existente.
    
    Args:
        db: Sesión de base de datos
        habitacion_id: ID de la habitación a actualizar
        habitacion_data: Nuevos datos de la habitación
    
    Returns:
        Habitación actualizada
    
    Raises:
        ValueError: Si la habitación no existe
    """
    habitacion = get_habitacion(db, habitacion_id)
    if not habitacion:
        raise ValueError(f"Habitación con ID {habitacion_id} no encontrada")
    
    habitacion.numero = habitacion_data.numero
    habitacion.tipo = habitacion_data.tipo
    habitacion.precio_base = habitacion_data.precio_base
    habitacion.estado = habitacion_data.estado
    
    db.commit()
    db.refresh(habitacion)
    return habitacion

# ============================================================================
# FUNCIONES: CLIENTES
# ============================================================================

def create_cliente(db: Session, cliente: ClienteCreate) -> Cliente:
    """
    Crea un nuevo cliente en la base de datos.
    
    Args:
        db: Sesión de base de datos
        cliente: Datos del cliente a crear
    
    Returns:
        Objeto Cliente creado
    """
    db_cliente = Cliente(
        dni=cliente.dni,
        nombre_completo=cliente.nombre_completo,
        email=cliente.email,
        telefono=cliente.telefono
    )
    db.add(db_cliente)
    db.commit()
    db.refresh(db_cliente)
    return db_cliente

def get_cliente(db: Session, cliente_id: int) -> Cliente:
    """Obtiene un cliente por su ID"""
    return db.query(Cliente).filter(Cliente.id == cliente_id).first()

def get_cliente_por_dni(db: Session, dni: str) -> Cliente:
    """Obtiene un cliente por su DNI"""
    return db.query(Cliente).filter(Cliente.dni == dni).first()

def get_clientes(db: Session) -> list[Cliente]:
    """Obtiene todos los clientes"""
    return db.query(Cliente).all()

def update_cliente(db: Session, cliente_id: int, cliente_data: ClienteCreate) -> Cliente:
    """
    Actualiza los datos de un cliente existente.
    
    Args:
        db: Sesión de base de datos
        cliente_id: ID del cliente a actualizar
        cliente_data: Nuevos datos del cliente
    
    Returns:
        Cliente actualizado
    
    Raises:
        ValueError: Si el cliente no existe
    """
    cliente = get_cliente(db, cliente_id)
    if not cliente:
        raise ValueError(f"Cliente con ID {cliente_id} no encontrado")
    
    cliente.dni = cliente_data.dni
    cliente.nombre_completo = cliente_data.nombre_completo
    cliente.email = cliente_data.email
    cliente.telefono = cliente_data.telefono
    
    db.commit()
    db.refresh(cliente)
    return cliente

# ============================================================================
# FUNCIÓN CRÍTICA: VERIFICAR DISPONIBILIDAD
# ============================================================================

def check_availability(
    db: Session,
    habitacion_id: int,
    fecha_entrada: date,
    fecha_salida: date
) -> bool:
    """
    FUNCIÓN CRÍTICA: Verifica si una habitación está disponible en un rango de fechas.
    
    LÓGICA DE SOLAPAMIENTO:
    Una habitación está OCUPADA si existe una reserva confirmada donde:
    (Reserva.fecha_entrada < nueva_fecha_salida) AND 
    (Reserva.fecha_salida > nueva_fecha_entrada)
    
    Args:
        db: Sesión de base de datos
        habitacion_id: ID de la habitación a verificar
        fecha_entrada: Fecha de entrada solicitada
        fecha_salida: Fecha de salida solicitada
    
    Returns:
        True si la habitación está disponible
        False si la habitación está ocupada
    
    Ejemplo:
        - Habitación 101 reservada: 5 de Diciembre a 10 de Diciembre
        - Nueva solicitud: 6 a 9 de Diciembre → OCUPADA (se solapa)
        - Nueva solicitud: 10 a 15 de Diciembre → DISPONIBLE (comienza cuando termina la anterior)
        - Nueva solicitud: 1 a 5 de Diciembre → DISPONIBLE (termina cuando comienza la anterior)
    """
    
    # Buscar si existe una reserva que se solape
    reserva_solapada = db.query(Reserva).filter(
        Reserva.habitacion_id == habitacion_id,
        Reserva.estado != EstadoReserva.CANCELADA,  # Ignorar reservas canceladas
        # FÓRMULA DE SOLAPAMIENTO:
        Reserva.fecha_entrada < fecha_salida,
        Reserva.fecha_salida > fecha_entrada
    ).first()
    
    # Si NO hay solapamiento, la habitación está disponible
    return reserva_solapada is None

def get_habitaciones_disponibles(
    db: Session,
    fecha_entrada: date,
    fecha_salida: date
) -> list[Habitacion]:
    """
    Obtiene todas las habitaciones disponibles en un rango de fechas.
    
    Args:
        db: Sesión de base de datos
        fecha_entrada: Fecha de entrada
        fecha_salida: Fecha de salida
    
    Returns:
        Lista de habitaciones disponibles
    """
    habitaciones = get_habitaciones(db)
    disponibles = []
    
    for hab in habitaciones:
        if check_availability(db, hab.id, fecha_entrada, fecha_salida):
            disponibles.append(hab)
    
    return disponibles

# ============================================================================
# FUNCIONES: RESERVAS
# ============================================================================

def actualizar_reservas_vencidas(db: Session) -> int:
    """
    Actualiza automáticamente las reservas en CHECKIN cuya fecha de salida ya pasó.
    Las marca como FINALIZADA.
    
    NOTA: Las reservas PENDIENTES NO se cancelan automáticamente ya que no hay
    sistema de check-in implementado. El usuario debe cancelarlas manualmente si es necesario.
    
    Returns:
        Número de reservas actualizadas
    """
    from datetime import date as date_class
    hoy = date_class.today()
    contador = 0
    
    # Solo actualizar reservas en CHECKIN cuya fecha de salida ya pasó → FINALIZADA
    reservas_vencidas = db.query(Reserva).filter(
        Reserva.estado == EstadoReserva.CHECKIN,
        Reserva.fecha_salida < hoy
    ).all()
    
    for reserva in reservas_vencidas:
        reserva.estado = EstadoReserva.FINALIZADA
        print(f"[AUTO] Reserva #{reserva.id} marcada como FINALIZADA (fecha salida: {reserva.fecha_salida})")
        contador += 1
    
    if contador > 0:
        db.commit()
        print(f"[AUTO] Total de {contador} reservas actualizadas automáticamente")
    
    return contador

def create_reserva(
    db: Session,
    reserva: ReservaCreate,
    precio_total: float
) -> Reserva:
    """
    Crea una nueva reserva en la base de datos.
    
    IMPORTANTE: Esta función NO verifica disponibilidad.
    La disponibilidad debe ser verificada ANTES de llamar a esta función
    (Eso se hace en main.py con check_availability).
    
    Args:
        db: Sesión de base de datos
        reserva: Datos de la reserva a crear
        precio_total: Precio total ya calculado
    
    Returns:
        Objeto Reserva creado
    """
    db_reserva = Reserva(
        habitacion_id=reserva.habitacion_id,
        cliente_id=reserva.cliente_id,
        fecha_entrada=reserva.fecha_entrada,
        fecha_salida=reserva.fecha_salida,
        precio_total=precio_total,
        estado=EstadoReserva.PENDIENTE
    )
    db.add(db_reserva)
    db.commit()
    db.refresh(db_reserva)
    return db_reserva

def get_reserva(db: Session, reserva_id: int) -> Reserva:
    """Obtiene una reserva por su ID"""
    return db.query(Reserva).filter(Reserva.id == reserva_id).first()

def get_reservas(
    db: Session,
    fecha_inicio: date = None,
    fecha_fin: date = None,
    cliente_id: int = None,
    habitacion_id: int = None
) -> list[Reserva]:
    """
    Obtiene reservas con filtros opcionales.
    
    Args:
        db: Sesión de base de datos
        fecha_inicio: Filtrar por fecha de entrada >= fecha_inicio
        fecha_fin: Filtrar por fecha de salida <= fecha_fin
        cliente_id: Filtrar por cliente específico
        habitacion_id: Filtrar por habitación específica
    
    Returns:
        Lista de reservas que cumplen los criterios
    """
    query = db.query(Reserva)
    
    if fecha_inicio:
        query = query.filter(Reserva.fecha_entrada >= fecha_inicio)
    
    if fecha_fin:
        query = query.filter(Reserva.fecha_salida <= fecha_fin)
    
    if cliente_id:
        query = query.filter(Reserva.cliente_id == cliente_id)
    
    if habitacion_id:
        query = query.filter(Reserva.habitacion_id == habitacion_id)
    
    return query.all()

def get_reservas_por_cliente(db: Session, cliente_id: int) -> list[Reserva]:
    """Obtiene todas las reservas de un cliente"""
    return get_reservas(db, cliente_id=cliente_id)

def get_reservas_por_habitacion(db: Session, habitacion_id: int) -> list[Reserva]:
    """Obtiene todas las reservas de una habitación"""
    return get_reservas(db, habitacion_id=habitacion_id)

def get_reservas_historial(db: Session):
    """Obtiene reservas finalizadas o canceladas para el historial, ordenadas por las más recientes primero"""
    reservas = db.query(Reserva).filter(
        Reserva.estado.in_(['FINALIZADA', 'CANCELADA', 'CHECKOUT'])
    ).order_by(Reserva.id.desc()).all()
    
    resultado = []
    for reserva in reservas:
        resultado.append({
            "id": reserva.id,
            "habitacion_id": reserva.habitacion_id,
            "cliente_id": reserva.cliente_id,
            "fecha_entrada": reserva.fecha_entrada,
            "fecha_salida": reserva.fecha_salida,
            "precio_total": reserva.precio_total,
            "estado": reserva.estado.value if hasattr(reserva.estado, 'value') else reserva.estado,
            "cliente_nombre": reserva.cliente.nombre_completo if reserva.cliente else "Desconocido",
            "cliente_dni": reserva.cliente.dni if reserva.cliente else "",
            "habitacion_numero": reserva.habitacion.numero if reserva.habitacion else "N/A"
        })
    return resultado

def checkout_reserva(db: Session, reserva_id: int):
    """
    Realiza el checkout de una reserva.
    Si es checkout anticipado, ajusta la fecha de salida a hoy.
    """
    reserva = db.query(Reserva).filter(Reserva.id == reserva_id).first()
    if not reserva:
        return None
    
    hoy = date.today()
    
    # Si checkout es antes de la fecha de salida prevista, ajustar
    if reserva.fecha_salida > hoy:
        # Calcular el precio por noche ORIGINAL (con el que se registró la reserva)
        noches_originales = (reserva.fecha_salida - reserva.fecha_entrada).days
        if noches_originales < 1:
            noches_originales = 1
        precio_noche_original = reserva.precio_total / noches_originales
        
        reserva.fecha_salida = hoy
        # Recalcular precio con el precio por noche ORIGINAL
        noches = (hoy - reserva.fecha_entrada).days
        if noches < 1:
            noches = 1
        reserva.precio_total = noches * precio_noche_original
    
    # Cambiar estado a FINALIZADA
    reserva.estado = EstadoReserva.FINALIZADA
    
    # Liberar la habitación (cambiar estado a DISPONIBLE)
    if reserva.habitacion:
        reserva.habitacion.estado = EstadoHabitacion.DISPONIBLE
    
    db.commit()
    db.refresh(reserva)
    return reserva

# ============================================================================
# FUNCIONES: ELIMINACIÓN
# ============================================================================

def delete_habitacion(db: Session, habitacion_id: int) -> bool:
    """
    Elimina una habitación si no tiene reservas asociadas.
    
    Args:
        db: Sesión de base de datos
        habitacion_id: ID de la habitación a eliminar
    
    Returns:
        True si se eliminó correctamente
    
    Raises:
        ValueError: Si la habitación no existe o tiene reservas
    """
    habitacion = get_habitacion(db, habitacion_id)
    if not habitacion:
        raise ValueError(f"Habitación con ID {habitacion_id} no encontrada")
    
    # Verificar que no tenga reservas (activas o futuras)
    reservas = db.query(Reserva).filter(
        Reserva.habitacion_id == habitacion_id,
        Reserva.estado != EstadoReserva.CANCELADA
    ).count()
    
    if reservas > 0:
        raise ValueError(f"No se puede eliminar: la habitación tiene {reservas} reserva(s) asociada(s)")
    
    db.delete(habitacion)
    db.commit()
    return True

def delete_reserva(db: Session, reserva_id: int) -> bool:
    """
    Elimina una reserva.
    
    Args:
        db: Sesión de base de datos
        reserva_id: ID de la reserva a eliminar
    
    Returns:
        True si se eliminó correctamente
    
    Raises:
        ValueError: Si la reserva no existe
    """
    reserva = get_reserva(db, reserva_id)
    if not reserva:
        raise ValueError(f"Reserva con ID {reserva_id} no encontrada")
    
    db.delete(reserva)
    db.commit()
    return True

def cancelar_reserva(db: Session, reserva_id: int) -> dict:
    """
    Cancela una reserva (cambia estado a CANCELADA).
    No elimina la reserva, solo cambia su estado para que aparezca en historial.
    
    Args:
        db: Sesión de base de datos
        reserva_id: ID de la reserva a cancelar
    
    Returns:
        Diccionario con información de la cancelación
    """
    reserva = get_reserva(db, reserva_id)
    if not reserva:
        return None
    
    # No permitir cancelar si ya está en CHECKIN, FINALIZADA o CANCELADA
    if reserva.estado in [EstadoReserva.CHECKIN, EstadoReserva.FINALIZADA, EstadoReserva.CANCELADA]:
        return None
    
    # Cambiar estado a CANCELADA
    reserva.estado = EstadoReserva.CANCELADA
    
    db.commit()
    db.refresh(reserva)
    
    return {
        "mensaje": "Reserva cancelada correctamente",
        "reserva_id": reserva.id,
        "estado": reserva.estado.value,
        "cliente": reserva.cliente.nombre_completo if reserva.cliente else "N/A",
        "habitacion": reserva.habitacion.numero if reserva.habitacion else "N/A"
    }

def delete_cliente(db: Session, cliente_id: int) -> bool:
    """
    Elimina un cliente si no tiene reservas activas.
    
    Args:
        db: Sesión de base de datos
        cliente_id: ID del cliente a eliminar
    
    Returns:
        True si se eliminó correctamente
    
    Raises:
        ValueError: Si el cliente no existe o tiene reservas activas
    """
    cliente = get_cliente(db, cliente_id)
    if not cliente:
        raise ValueError(f"Cliente con ID {cliente_id} no encontrado")
    
    # Verificar que no tenga reservas activas (no canceladas)
    reservas_activas = db.query(Reserva).filter(
        Reserva.cliente_id == cliente_id,
        Reserva.estado != EstadoReserva.CANCELADA
    ).count()
    
    if reservas_activas > 0:
        raise ValueError(f"No se puede eliminar: el cliente tiene {reservas_activas} reserva(s) activa(s)")
    
    db.delete(cliente)
    db.commit()
    return True

def update_reserva_estado(db: Session, reserva_id: int, nuevo_estado: str) -> Reserva:
    """
    Actualiza el estado de una reserva.
    
    Estados válidos: PENDIENTE, CHECKIN, CHECKOUT, CANCELADA
    
    Args:
        db: Sesión de base de datos
        reserva_id: ID de la reserva
        nuevo_estado: Nuevo estado
    
    Returns:
        Objeto Reserva actualizado
    """
    reserva = get_reserva(db, reserva_id)
    if reserva:
        reserva.estado = nuevo_estado
        db.commit()
        db.refresh(reserva)
    return reserva

def calcular_precio_total(
    db: Session,
    habitacion_id: int,
    fecha_entrada: date,
    fecha_salida: date
) -> float:
    """
    Calcula el precio total de una reserva.
    
    Fórmula: (fecha_salida - fecha_entrada).days * precio_base
    
    Args:
        db: Sesión de base de datos
        habitacion_id: ID de la habitación
        fecha_entrada: Fecha de entrada
        fecha_salida: Fecha de salida
    
    Returns:
        Precio total
    
    Raises:
        ValueError: Si la habitación no existe o las fechas son inválidas
    """
    habitacion = get_habitacion(db, habitacion_id)
    if not habitacion:
        raise ValueError(f"Habitación con ID {habitacion_id} no encontrada")
    
    dias = (fecha_salida - fecha_entrada).days
    if dias <= 0:
        raise ValueError("La fecha de salida debe ser posterior a la de entrada")
    
    return dias * habitacion.precio_base

def get_habitaciones_por_fecha(db: Session, fecha_objetivo: date):
    """
    Obtiene todas las habitaciones con su estado en una fecha específica (Máquina del Tiempo).
    
    LÓGICA CRÍTICA MEJORADA:
    El estado visual se CALCULA SIEMPRE basándose en fechas, NUNCA en el campo estado de BD.
    
    Para cada habitación en fecha_objetivo:
    1. Si estado en BD es MANTENIMIENTO/LIMPIEZA → Respeta ese estado (decisión manual)
    2. Si hay reserva activa EN esa fecha (entrada <= fecha < salida) → Fuerza OCUPADA
    3. Si NO hay reserva activa → Fuerza DISPONIBLE
    4. Busca reservas futuras DESPUÉS de fecha_objetivo
    
    Args:
        db: Sesión de base de datos
        fecha_objetivo: Fecha a consultar (date)
    
    Returns:
        Lista de diccionarios con estructura compatible con HabitacionDetalle
    """
    from datetime import date as date_class
    
    todas_habitaciones = db.query(Habitacion).all()
    resultado = []
    
    print(f"[DEBUG] get_habitaciones_por_fecha - Fecha objetivo: {fecha_objetivo}")
    
    for habitacion in todas_habitaciones:
        # 1. Buscar si existe una reserva activa EN fecha_objetivo
        # Solo contar PENDIENTE y CHECKIN (no FINALIZADA ni CANCELADA)
        reserva_en_fecha = db.query(Reserva).filter(
            Reserva.habitacion_id == habitacion.id,
            Reserva.estado.in_([EstadoReserva.PENDIENTE, EstadoReserva.CHECKIN]),
            Reserva.fecha_entrada <= fecha_objetivo,
            Reserva.fecha_salida > fecha_objetivo
        ).first()
        
        # 2. Buscar próximas reservas DESPUÉS de fecha_objetivo
        # Solo contar PENDIENTE (no FINALIZADA ni CANCELADA)
        reservas_futuras = db.query(Reserva).filter(
            Reserva.habitacion_id == habitacion.id,
            Reserva.estado == EstadoReserva.PENDIENTE,
            Reserva.fecha_entrada > fecha_objetivo
        ).order_by(Reserva.fecha_entrada.asc()).all()
        
        # Construir diccionario base
        # Convertir enums a strings para la respuesta JSON
        tipo_str = habitacion.tipo.value if hasattr(habitacion.tipo, 'value') else str(habitacion.tipo)
        estado_str = habitacion.estado.value if hasattr(habitacion.estado, 'value') else str(habitacion.estado)
        
        hab_dict = {
            "id": habitacion.id,
            "numero": habitacion.numero,
            "tipo": tipo_str,
            "precio_base": habitacion.precio_base,
            "estado": estado_str,  # Valor inicial, puede ser sobrescrito
            "reserva_actual_id": None,
            "reserva_actual_inicio": None,
            "reserva_actual_fin": None,
            "nombre_cliente": None,
            "proximas_reservas": []
        }
        
        # ===============================================================
        # LÓGICA DE ESTADO VISUAL (Calculado, NO del campo BD)
        # ===============================================================
        
        # Obtener el valor del estado como string para comparación
        estado_actual = habitacion.estado.value if hasattr(habitacion.estado, 'value') else str(habitacion.estado)
        
        # PASO 1: Respetar estados manuales de mantenimiento
        if estado_actual in ['MANTENIMIENTO', 'LIMPIEZA']:
            # Respetar la decisión manual del staff
            print(f"[DEBUG] Habitación {habitacion.numero} en {fecha_objetivo}: {estado_actual} (manual del staff)")
        # PASO 2: Si hay reserva EN fecha_objetivo, forzar estado a OCUPADA
        elif reserva_en_fecha:
            hab_dict["estado"] = 'OCUPADA'  # ← FORZADO por cálculo
            hab_dict["reserva_actual_id"] = reserva_en_fecha.id
            hab_dict["reserva_actual_inicio"] = str(reserva_en_fecha.fecha_entrada)
            hab_dict["reserva_actual_fin"] = str(reserva_en_fecha.fecha_salida)
            if reserva_en_fecha.cliente:
                hab_dict["nombre_cliente"] = reserva_en_fecha.cliente.nombre_completo
            print(f"[DEBUG] Habitación {habitacion.numero} en {fecha_objetivo}: OCUPADA ({reserva_en_fecha.cliente.nombre_completo if reserva_en_fecha.cliente else 'Desconocido'})")
        # PASO 3: Si NO hay reserva EN fecha_objetivo, forzar estado a DISPONIBLE
        else:
            hab_dict["estado"] = 'DISPONIBLE'  # ← FORZADO, ignora BD
            print(f"[DEBUG] Habitación {habitacion.numero} en {fecha_objetivo}: DISPONIBLE")
        
        # Agregar próximas reservas después de la fecha objetivo
        for reserva_futura in reservas_futuras:
            reserva_info = {
                "fecha_entrada": str(reserva_futura.fecha_entrada),
                "fecha_salida": str(reserva_futura.fecha_salida),
                "nombre_cliente": reserva_futura.cliente.nombre_completo if reserva_futura.cliente else "Cliente desconocido"
            }
            hab_dict["proximas_reservas"].append(reserva_info)
            print(f"[DEBUG]   └─ Próxima: {reserva_info['nombre_cliente']} ({reserva_futura.fecha_entrada} - {reserva_futura.fecha_salida})")
        
        resultado.append(hab_dict)
    
    return resultado
# ===================== PRODUCTOS =====================

def create_producto(db: Session, producto: ProductoCreate):
    db_producto = Producto(
        nombre=producto.nombre,
        precio=producto.precio,
        activo=producto.activo if producto.activo is not None else True
    )
    db.add(db_producto)
    db.commit()
    db.refresh(db_producto)
    return db_producto

def get_productos(db: Session, solo_activos: bool = False):
    query = db.query(Producto)
    if solo_activos:
        query = query.filter(Producto.activo == True)
    return query.order_by(Producto.nombre).all()

def get_producto(db: Session, producto_id: int):
    return db.query(Producto).filter(Producto.id == producto_id).first()

def update_producto(db: Session, producto_id: int, producto: ProductoCreate):
    db_producto = db.query(Producto).filter(Producto.id == producto_id).first()
    if db_producto:
        db_producto.nombre = producto.nombre
        db_producto.precio = producto.precio
        db_producto.activo = producto.activo if producto.activo is not None else db_producto.activo
        db.commit()
        db.refresh(db_producto)
    return db_producto

def delete_producto(db: Session, producto_id: int):
    db_producto = db.query(Producto).filter(Producto.id == producto_id).first()
    if db_producto:
        db.delete(db_producto)
        db.commit()
        return True
    return False

# ===================== CONSUMOS =====================

def registrar_consumo(db: Session, reserva_id: int, producto_id: int, cantidad: int = 1):
    reserva = db.query(Reserva).filter(Reserva.id == reserva_id).first()
    if not reserva:
        return None
    
    producto = db.query(Producto).filter(Producto.id == producto_id).first()
    if not producto or not producto.activo:
        return None
    
    db_consumo = Consumo(
        reserva_id=reserva_id,
        producto_id=producto_id,
        cantidad=cantidad,
        precio_unitario=producto.precio,
        fecha_consumo=date.today()
    )
    db.add(db_consumo)
    db.commit()
    db.refresh(db_consumo)
    return db_consumo

def get_consumos_reserva(db: Session, reserva_id: int):
    return db.query(Consumo).filter(Consumo.reserva_id == reserva_id).order_by(Consumo.fecha_consumo).all()

def delete_consumo(db: Session, consumo_id: int):
    db_consumo = db.query(Consumo).filter(Consumo.id == consumo_id).first()
    if db_consumo:
        db.delete(db_consumo)
        db.commit()
        return True
    return False

def get_cuenta_reserva(db: Session, reserva_id: int):
    reserva = db.query(Reserva).filter(Reserva.id == reserva_id).first()
    if not reserva:
        return None
    
    noches = (reserva.fecha_salida - reserva.fecha_entrada).days
    if noches < 1:
        noches = 1
    
    habitacion = reserva.habitacion
    # Usar el precio_total de la reserva (precio con el que se registró)
    # en lugar del precio_base actual de la habitación
    total_alojamiento = reserva.precio_total
    precio_noche = total_alojamiento / noches if noches > 0 else total_alojamiento
    
    consumos = db.query(Consumo).filter(Consumo.reserva_id == reserva_id).all()
    
    consumos_detalle = []
    total_consumos = 0
    
    for consumo in consumos:
        subtotal = consumo.cantidad * consumo.precio_unitario
        total_consumos += subtotal
        consumos_detalle.append({
            "id": consumo.id,
            "producto_nombre": consumo.producto.nombre if consumo.producto else "Producto eliminado",
            "cantidad": consumo.cantidad,
            "precio_unitario": consumo.precio_unitario,
            "subtotal": subtotal,
            "fecha": consumo.fecha_consumo
        })
    
    return {
        "reserva_id": reserva_id,
        "habitacion_numero": habitacion.numero if habitacion else "N/A",
        "cliente_nombre": reserva.cliente.nombre_completo if reserva.cliente else "Cliente desconocido",
        "fecha_entrada": reserva.fecha_entrada,
        "fecha_salida": reserva.fecha_salida,
        "noches": noches,
        "precio_noche": precio_noche,
        "total_alojamiento": total_alojamiento,
        "consumos": consumos_detalle,
        "total_consumos": total_consumos,
        "total_general": total_alojamiento + total_consumos
    }

# ============================================================================
# FUNCIONES: CHECK-IN
# ============================================================================

def get_llegadas_hoy(db: Session) -> list:
    """
    Obtiene todas las reservas con llegada programada para HOY que están en estado PENDIENTE.
    Incluye datos del cliente y habitación para mostrar en la lista.
    """
    from datetime import date as date_class
    hoy = date_class.today()
    
    reservas = db.query(Reserva).filter(
        Reserva.fecha_entrada == hoy,
        Reserva.estado == EstadoReserva.PENDIENTE
    ).all()
    
    resultado = []
    for reserva in reservas:
        habitacion = reserva.habitacion
        cliente = reserva.cliente
        resultado.append({
            "id": reserva.id,
            "cliente_id": reserva.cliente_id,
            "cliente_nombre": cliente.nombre_completo if cliente else "N/A",
            "cliente_dni": cliente.dni if cliente else "N/A",
            "cliente_email": cliente.email if cliente else "",
            "cliente_telefono": cliente.telefono if cliente else "",
            "habitacion_id": reserva.habitacion_id,
            "habitacion_numero": habitacion.numero if habitacion else "N/A",
            "habitacion_tipo": habitacion.tipo.value if habitacion else "N/A",
            "habitacion_estado": habitacion.estado.value if habitacion else "N/A",
            "fecha_entrada": reserva.fecha_entrada,
            "fecha_salida": reserva.fecha_salida,
            "precio_total": reserva.precio_total,
            "noches": (reserva.fecha_salida - reserva.fecha_entrada).days,
            "estado": reserva.estado.value
        })
    
    return resultado

def buscar_reservas_checkin(db: Session, query: str) -> list:
    """
    Busca reservas PENDIENTES por:
    - Apellido/Nombre del cliente
    - DNI del cliente
    - ID de reserva
    """
    from datetime import date as date_class
    
    # Intentar buscar por ID de reserva si es número
    try:
        reserva_id = int(query)
        reserva = db.query(Reserva).filter(
            Reserva.id == reserva_id,
            Reserva.estado == EstadoReserva.PENDIENTE
        ).first()
        if reserva:
            return [_reserva_a_dict_checkin(reserva)]
    except ValueError:
        pass
    
    # Buscar por nombre o DNI
    reservas = db.query(Reserva).join(Cliente).filter(
        Reserva.estado == EstadoReserva.PENDIENTE,
        (Cliente.nombre_completo.ilike(f"%{query}%")) | 
        (Cliente.dni.ilike(f"%{query}%"))
    ).all()
    
    return [_reserva_a_dict_checkin(r) for r in reservas]

def _reserva_a_dict_checkin(reserva: Reserva) -> dict:
    """Helper para convertir reserva a diccionario para check-in"""
    habitacion = reserva.habitacion
    cliente = reserva.cliente
    return {
        "id": reserva.id,
        "cliente_id": reserva.cliente_id,
        "cliente_nombre": cliente.nombre_completo if cliente else "N/A",
        "cliente_dni": cliente.dni if cliente else "N/A",
        "cliente_email": cliente.email if cliente else "",
        "cliente_telefono": cliente.telefono if cliente else "",
        "habitacion_id": reserva.habitacion_id,
        "habitacion_numero": habitacion.numero if habitacion else "N/A",
        "habitacion_tipo": habitacion.tipo.value if habitacion else "N/A",
        "habitacion_estado": habitacion.estado.value if habitacion else "N/A",
        "fecha_entrada": reserva.fecha_entrada,
        "fecha_salida": reserva.fecha_salida,
        "precio_total": reserva.precio_total,
        "noches": (reserva.fecha_salida - reserva.fecha_entrada).days,
        "estado": reserva.estado.value
    }

def realizar_checkin(db: Session, reserva_id: int, datos_cliente = None) -> dict:
    """
    Realiza el check-in de una reserva:
    1. Verifica que la reserva esté en estado PENDIENTE
    2. Actualiza datos del cliente si se proporcionan
    3. Cambia estado de la reserva a CHECKIN
    4. Cambia estado de la habitación a OCUPADA
    5. Registra el timestamp del check-in
    """
    from datetime import datetime
    
    reserva = db.query(Reserva).filter(Reserva.id == reserva_id).first()
    if not reserva or reserva.estado != EstadoReserva.PENDIENTE:
        return None
    
    # Verificar que la habitación no esté en MANTENIMIENTO o LIMPIEZA
    habitacion = reserva.habitacion
    if habitacion and habitacion.estado in [EstadoHabitacion.MANTENIMIENTO, EstadoHabitacion.LIMPIEZA]:
        return {"error": f"La habitación está en {habitacion.estado.value}"}
    
    # Actualizar datos del cliente si se proporcionan
    if datos_cliente:
        cliente = reserva.cliente
        if cliente:
            if datos_cliente.email:
                cliente.email = datos_cliente.email
            if datos_cliente.telefono:
                cliente.telefono = datos_cliente.telefono
            if datos_cliente.nombre_completo:
                cliente.nombre_completo = datos_cliente.nombre_completo
    
    # Cambiar estado de la reserva a CHECKIN
    reserva.estado = EstadoReserva.CHECKIN
    reserva.checkin_timestamp = datetime.now()
    
    # Cambiar estado de la habitación a OCUPADA
    habitacion = reserva.habitacion
    if habitacion:
        habitacion.estado = EstadoHabitacion.OCUPADA
    
    db.commit()
    db.refresh(reserva)
    
    return {
        "mensaje": "Check-in realizado correctamente",
        "reserva_id": reserva.id,
        "habitacion": habitacion.numero if habitacion else "N/A",
        "cliente": reserva.cliente.nombre_completo if reserva.cliente else "N/A",
        "checkin_timestamp": reserva.checkin_timestamp.isoformat() if reserva.checkin_timestamp else None,
        "fecha_salida": reserva.fecha_salida.isoformat()
    }

def get_habitaciones_disponibles_checkin(db: Session) -> list:
    """
    Obtiene habitaciones que están DISPONIBLES para reasignación durante check-in.
    Solo muestra habitaciones con estado DISPONIBLE (limpias y libres).
    """
    habitaciones = db.query(Habitacion).filter(
        Habitacion.estado == EstadoHabitacion.DISPONIBLE
    ).all()
    
    return [{
        "id": h.id,
        "numero": h.numero,
        "tipo": h.tipo.value,
        "precio_base": h.precio_base,
        "estado": h.estado.value
    } for h in habitaciones]

def cambiar_habitacion_reserva(db: Session, reserva_id: int, nueva_habitacion_id: int) -> dict:
    """
    Cambia la habitación asignada a una reserva (antes del check-in).
    Recalcula el precio si es necesario.
    """
    reserva = db.query(Reserva).filter(Reserva.id == reserva_id).first()
    if not reserva or reserva.estado != EstadoReserva.PENDIENTE:
        return None
    
    nueva_habitacion = db.query(Habitacion).filter(Habitacion.id == nueva_habitacion_id).first()
    if not nueva_habitacion or nueva_habitacion.estado != EstadoHabitacion.DISPONIBLE:
        return None
    
    habitacion_anterior = reserva.habitacion
    
    # Calcular nuevo precio
    noches = (reserva.fecha_salida - reserva.fecha_entrada).days
    if noches < 1:
        noches = 1
    nuevo_precio = nueva_habitacion.precio_base * noches
    
    # Actualizar reserva
    reserva.habitacion_id = nueva_habitacion_id
    reserva.precio_total = nuevo_precio
    
    db.commit()
    db.refresh(reserva)
    
    return {
        "mensaje": "Habitación cambiada correctamente",
        "reserva_id": reserva.id,
        "habitacion_anterior": habitacion_anterior.numero if habitacion_anterior else "N/A",
        "habitacion_nueva": nueva_habitacion.numero,
        "precio_anterior": reserva.precio_total,
        "precio_nuevo": nuevo_precio
    }
