// =====================================================================
// Tarea 4 - Big Data (UNAD) | Caso de uso: Logs de una aplicación web
// Script 2: consultas (CRUD, filtros/operadores, join y agregaciones)
// Ejecutar después del script 1:  mongosh 02_consultas.js
// Sugerencia: copie cada bloque en mongosh o Compass y tome el pantallazo.
// =====================================================================
db = db.getSiblingDB("logs_aplicacion");
function titulo(t) { print("\n==================== " + t + " ===================="); }

// ---------------------------------------------------------------------
// A. CONSULTAS BÁSICAS (CRUD)
// ---------------------------------------------------------------------
titulo("A1. INSERCIÓN - insertOne de un nuevo log");
printjson(db.logs.insertOne({
  fecha: new Date("2026-11-01T08:30:00Z"), nivel: "ERROR", servicio_id: "pagos", usuario_id: "U005",
  metodo: "POST", endpoint: "/api/pagos/procesar", codigo_http: 503, tiempo_respuesta_ms: 5200,
  mensaje: "Pasarela bancaria sin respuesta", ip: "190.85.10.20",
  etiquetas: ["pagos", "post", "incidente", "lento"],
  contexto: { navegador: "Chrome", sistema_operativo: "Android", version_app: "3.3.0" },
  traza: { excepcion: "TimeoutException", linea: 128 }
}));

titulo("A2. SELECCIÓN - find de los logs del servicio de pagos (proyección)");
printjson(db.logs.find(
  { servicio_id: "pagos" },
  { _id: 0, fecha: 1, nivel: 1, endpoint: 1, codigo_http: 1, tiempo_respuesta_ms: 1 }
).sort({ fecha: -1 }).limit(5).toArray());

titulo("A3. SELECCIÓN - findOne de un usuario");
printjson(db.usuarios.findOne({ _id: "U005" }));

titulo("A4. ACTUALIZACIÓN - updateOne: cambio de plan del usuario U005");
printjson(db.usuarios.updateOne({ _id: "U005" }, { $set: { plan: "empresarial" } }));
printjson(db.usuarios.findOne({ _id: "U005" }, { nombre: 1, plan: 1 }));

titulo("A5. ACTUALIZACIÓN - updateMany: marcar los ERROR como pendientes de revisión");
printjson(db.logs.updateMany({ nivel: "ERROR" }, { $set: { revisado: false }, $inc: { prioridad: 1 } }));

titulo("A6. ELIMINACIÓN - deleteOne del log insertado en A1");
printjson(db.logs.deleteOne({ mensaje: "Pasarela bancaria sin respuesta" }));

titulo("A7. ELIMINACIÓN - deleteMany de logs DEBUG anteriores al 5 de octubre");
printjson(db.logs.deleteMany({ nivel: "DEBUG", fecha: { $lt: new Date("2026-10-05T00:00:00Z") } }));
print("Logs restantes: " + db.logs.countDocuments());

// ---------------------------------------------------------------------
// B. CONSULTAS CON FILTROS Y OPERADORES
// ---------------------------------------------------------------------
titulo("B1. Operadores de comparación ($gt): respuestas mayores a 2 segundos");
printjson(db.logs.find({ tiempo_respuesta_ms: { $gt: 2000 } },
  { _id: 0, servicio_id: 1, endpoint: 1, tiempo_respuesta_ms: 1 }).sort({ tiempo_respuesta_ms: -1 }).limit(5).toArray());

titulo("B2. Operadores $in y $gte/$lte: WARN o ERROR entre el 10 y el 15 de octubre");
printjson(db.logs.find({
  nivel: { $in: ["WARN", "ERROR"] },
  fecha: { $gte: new Date("2026-10-10T00:00:00Z"), $lte: new Date("2026-10-15T23:59:59Z") }
}, { _id: 0, fecha: 1, nivel: 1, servicio_id: 1, mensaje: 1 }).sort({ fecha: 1 }).toArray());

titulo("B3. Operadores lógicos ($or / $and): errores HTTP 5xx o lentos en pagos");
printjson(db.logs.find({
  $or: [
    { codigo_http: { $gte: 500 } },
    { $and: [{ servicio_id: "pagos" }, { tiempo_respuesta_ms: { $gt: 1000 } }] }
  ]
}, { _id: 0, servicio_id: 1, codigo_http: 1, tiempo_respuesta_ms: 1 }).limit(8).toArray());

titulo("B4. Expresión regular ($regex) y campo anidado: endpoints de productos desde iOS");
printjson(db.logs.find(
  { endpoint: { $regex: "^/api/productos" }, "contexto.sistema_operativo": "iOS" },
  { _id: 0, endpoint: 1, "contexto.sistema_operativo": 1, "contexto.navegador": 1 }).toArray());

titulo("B5. Arreglos ($all) y $exists: logs con etiquetas 'incidente' y 'lento' que tienen traza");
printjson(db.logs.find(
  { etiquetas: { $all: ["incidente", "lento"] }, traza: { $exists: true } },
  { _id: 0, servicio_id: 1, "traza.excepcion": 1, tiempo_respuesta_ms: 1 }).limit(5).toArray());

titulo("B6. JOIN ($lookup): errores con los datos del servicio y del usuario");
printjson(db.logs.aggregate([
  { $match: { nivel: "ERROR", usuario_id: { $ne: null } } },
  { $lookup: { from: "servicios", localField: "servicio_id", foreignField: "_id", as: "servicio" } },
  { $lookup: { from: "usuarios",  localField: "usuario_id",  foreignField: "_id", as: "usuario" } },
  { $unwind: "$servicio" },
  { $unwind: "$usuario" },
  { $project: { _id: 0, fecha: 1, mensaje: 1, codigo_http: 1,
                servicio: "$servicio.nombre", equipo: "$servicio.equipo",
                usuario: "$usuario.nombre", ciudad: "$usuario.ciudad", plan: "$usuario.plan" } },
  { $sort: { fecha: -1 } },
  { $limit: 5 }
]).toArray());

// ---------------------------------------------------------------------
// C. CONSULTAS DE AGREGACIÓN (contar, sumar, promediar, etc.)
// ---------------------------------------------------------------------
titulo("C1. CONTAR - total de logs y total de errores");
print("Total de logs: " + db.logs.countDocuments());
print("Total de ERROR: " + db.logs.countDocuments({ nivel: "ERROR" }));

titulo("C2. CONTAR por grupo - cantidad de logs por nivel");
printjson(db.logs.aggregate([
  { $group: { _id: "$nivel", cantidad: { $sum: 1 } } },
  { $sort: { cantidad: -1 } }
]).toArray());

titulo("C3. SUMAR - tiempo total de respuesta (segundos) por servicio");
printjson(db.logs.aggregate([
  { $group: { _id: "$servicio_id", tiempo_total_s: { $sum: { $divide: ["$tiempo_respuesta_ms", 1000] } }, solicitudes: { $sum: 1 } } },
  { $project: { tiempo_total_s: { $round: ["$tiempo_total_s", 2] }, solicitudes: 1 } },
  { $sort: { tiempo_total_s: -1 } }
]).toArray());

titulo("C4. PROMEDIAR - tiempo promedio, mínimo y máximo por servicio");
printjson(db.logs.aggregate([
  { $group: { _id: "$servicio_id",
              promedio_ms: { $avg: "$tiempo_respuesta_ms" },
              minimo_ms: { $min: "$tiempo_respuesta_ms" },
              maximo_ms: { $max: "$tiempo_respuesta_ms" } } },
  { $project: { promedio_ms: { $round: ["$promedio_ms", 1] }, minimo_ms: 1, maximo_ms: 1 } },
  { $sort: { promedio_ms: -1 } }
]).toArray());

titulo("C5. Tasa de error (%) por servicio con nombre del servicio ($lookup)");
printjson(db.logs.aggregate([
  { $group: { _id: "$servicio_id", total: { $sum: 1 },
              errores: { $sum: { $cond: [{ $eq: ["$nivel", "ERROR"] }, 1, 0] } } } },
  { $lookup: { from: "servicios", localField: "_id", foreignField: "_id", as: "s" } },
  { $project: { _id: 0, servicio: { $first: "$s.nombre" }, total: 1, errores: 1,
                tasa_error_pct: { $round: [{ $multiply: [{ $divide: ["$errores", "$total"] }, 100] }, 1] } } },
  { $sort: { tasa_error_pct: -1 } }
]).toArray());

titulo("C6. Actividad por semana del mes (logs y tiempo promedio)");
printjson(db.logs.aggregate([
  { $group: { _id: { $week: "$fecha" }, logs: { $sum: 1 }, promedio_ms: { $avg: "$tiempo_respuesta_ms" } } },
  { $project: { semana: "$_id", _id: 0, logs: 1, promedio_ms: { $round: ["$promedio_ms", 0] } } },
  { $sort: { semana: 1 } }
]).toArray());

titulo("C7. Usuarios con más eventos y su ciudad (top 5)");
printjson(db.logs.aggregate([
  { $match: { usuario_id: { $ne: null } } },
  { $group: { _id: "$usuario_id", eventos: { $sum: 1 } } },
  { $sort: { eventos: -1 } },
  { $limit: 5 },
  { $lookup: { from: "usuarios", localField: "_id", foreignField: "_id", as: "u" } },
  { $project: { _id: 0, usuario: { $first: "$u.nombre" }, ciudad: { $first: "$u.ciudad" }, eventos: 1 } }
]).toArray());

titulo("C8. Errores por tipo de excepción");
printjson(db.logs.aggregate([
  { $match: { traza: { $exists: true } } },
  { $group: { _id: "$traza.excepcion", ocurrencias: { $sum: 1 } } },
  { $sort: { ocurrencias: -1 } }
]).toArray());
