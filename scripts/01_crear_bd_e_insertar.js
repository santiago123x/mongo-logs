// =====================================================================
// Tarea 4 - Big Data (UNAD) | Caso de uso: Logs de una aplicación web
// Script 1: creación de la base de datos, colecciones e inserción de datos
// Ejecutar:  mongosh 01_crear_bd_e_insertar.js
// =====================================================================

db = db.getSiblingDB("logs_aplicacion");
db.dropDatabase(); // deja la base limpia para poder repetir la práctica

// ---------------------------------------------------------------------
// 1. Colección "servicios": microservicios que componen la aplicación
// ---------------------------------------------------------------------
db.createCollection("servicios");
db.servicios.insertMany([
  { _id: "auth",      nombre: "Servicio de autenticación", equipo: "Seguridad",  lenguaje: "Node.js", version: "2.4.1", servidor: { host: "srv-auth-01",  region: "us-east-1" } },
  { _id: "catalogo",  nombre: "Catálogo de productos",     equipo: "Producto",   lenguaje: "Python",  version: "1.9.0", servidor: { host: "srv-cat-01",   region: "us-east-1" } },
  { _id: "carrito",   nombre: "Carrito de compras",        equipo: "Ventas",     lenguaje: "Java",    version: "3.1.2", servidor: { host: "srv-cart-01",  region: "sa-east-1" } },
  { _id: "pagos",     nombre: "Pasarela de pagos",         equipo: "Finanzas",   lenguaje: "Java",    version: "5.0.3", servidor: { host: "srv-pay-01",   region: "sa-east-1" } },
  { _id: "envios",    nombre: "Gestión de envíos",         equipo: "Logística",  lenguaje: "Go",      version: "1.2.7", servidor: { host: "srv-ship-01",  region: "us-east-1" } },
  { _id: "notif",     nombre: "Notificaciones",            equipo: "Plataforma", lenguaje: "Node.js", version: "0.8.5", servidor: { host: "srv-notif-01", region: "sa-east-1" } }
]);

// ---------------------------------------------------------------------
// 2. Colección "usuarios": usuarios que generan actividad en la app
// ---------------------------------------------------------------------
const nombres  = ["Ana Torres","Luis Gómez","María Rojas","Carlos Pérez","Laura Díaz","Andrés Ruiz","Sofía Castro","Julián Mora",
                  "Valentina Ríos","Diego Herrera","Camila Vargas","Felipe Ortiz","Daniela León","Mateo Silva","Paula Medina",
                  "Sebastián Cruz","Natalia Suárez","Tomás Ramírez","Isabella Peña","Juan Molina"];
const ciudades = ["Bogotá","Medellín","Cali","Barranquilla","Bucaramanga","Pereira","Cartagena","Manizales"];
const planes   = ["gratuito","premium","empresarial"];
const usuarios = nombres.map((n, i) => ({
  _id: "U" + String(i + 1).padStart(3, "0"),
  nombre: n,
  email: n.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(" ", ".") + "@correo.com",
  ciudad: ciudades[i % ciudades.length],
  plan: planes[i % planes.length],
  rol: i < 2 ? "administrador" : "cliente",
  fecha_registro: new Date(Date.UTC(2025, i % 12, (i % 27) + 1))
}));
db.usuarios.insertMany(usuarios);

// ---------------------------------------------------------------------
// 3. Colección "logs": 120 eventos generados por la aplicación
//    (generador pseudoaleatorio con semilla fija => siempre los mismos datos)
// ---------------------------------------------------------------------
let semilla = 2026;
function azar() { semilla = (semilla * 16807) % 2147483647; return (semilla - 1) / 2147483646; }
function elegir(lista) { return lista[Math.floor(azar() * lista.length)]; }

const endpoints = {
  auth:     [["POST", "/api/login"], ["POST", "/api/logout"], ["POST", "/api/registro"]],
  catalogo: [["GET", "/api/productos"], ["GET", "/api/productos/buscar"], ["GET", "/api/categorias"]],
  carrito:  [["POST", "/api/carrito/agregar"], ["DELETE", "/api/carrito/quitar"], ["GET", "/api/carrito"]],
  pagos:    [["POST", "/api/pagos/procesar"], ["GET", "/api/pagos/estado"]],
  envios:   [["POST", "/api/envios/crear"], ["GET", "/api/envios/rastreo"]],
  notif:    [["POST", "/api/notificaciones/email"], ["POST", "/api/notificaciones/push"]]
};
const mensajes = {
  INFO:  ["Solicitud procesada correctamente", "Usuario autenticado", "Consulta ejecutada", "Operación completada"],
  DEBUG: ["Parámetros de entrada validados", "Consulta a caché realizada", "Token verificado"],
  WARN:  ["Tiempo de respuesta elevado", "Reintento de conexión a la base de datos", "Uso de memoria superior al 80 %"],
  ERROR: ["Tiempo de espera agotado con el proveedor", "Error interno del servidor", "Credenciales inválidas", "Servicio externo no disponible"]
};
const navegadores = ["Chrome", "Firefox", "Safari", "Edge"];
const sistemas    = ["Windows", "Android", "iOS", "macOS", "Linux"];
const servIds     = Object.keys(endpoints);

const logs = [];
for (let i = 0; i < 120; i++) {
  const servicio = elegir(servIds);
  const [metodo, endpoint] = elegir(endpoints[servicio]);
  const r = azar();
  const nivel = r < 0.55 ? "INFO" : r < 0.70 ? "DEBUG" : r < 0.85 ? "WARN" : "ERROR";
  let codigo = 200, tiempo = Math.round(40 + azar() * 260);
  if (nivel === "WARN")  { tiempo = Math.round(800 + azar() * 1700); codigo = elegir([200, 200, 429]); }
  if (nivel === "ERROR") { tiempo = Math.round(300 + azar() * 4700); codigo = elegir([500, 502, 503, 401, 404]); }
  if (metodo === "POST" && codigo === 200) codigo = 201;
  const fecha = new Date(Date.UTC(2026, 9, 1 + Math.floor(azar() * 31), Math.floor(azar() * 24), Math.floor(azar() * 60), Math.floor(azar() * 60)));
  const etiquetas = [servicio, metodo.toLowerCase()];
  if (nivel === "ERROR") etiquetas.push("incidente");
  if (tiempo > 1000)     etiquetas.push("lento");
  const log = {
    fecha: fecha,
    nivel: nivel,
    servicio_id: servicio,
    usuario_id: azar() < 0.9 ? "U" + String(1 + Math.floor(azar() * 20)).padStart(3, "0") : null,
    metodo: metodo,
    endpoint: endpoint,
    codigo_http: codigo,
    tiempo_respuesta_ms: tiempo,
    mensaje: elegir(mensajes[nivel]),
    ip: "190.85." + Math.floor(azar() * 255) + "." + Math.floor(azar() * 255),
    etiquetas: etiquetas,
    contexto: { navegador: elegir(navegadores), sistema_operativo: elegir(sistemas), version_app: elegir(["3.2.0", "3.2.1", "3.3.0"]) }
  };
  if (nivel === "ERROR") log.traza = { excepcion: elegir(["TimeoutException", "NullPointerException", "ConnectionRefused", "AuthError"]), linea: Math.floor(azar() * 500) };
  logs.push(log);
}
db.logs.insertMany(logs);

// Índices para acelerar las consultas más frecuentes
db.logs.createIndex({ fecha: -1 });
db.logs.createIndex({ servicio_id: 1, nivel: 1 });

print("Base de datos: " + db.getName());
print("servicios: " + db.servicios.countDocuments() + " documentos");
print("usuarios:  " + db.usuarios.countDocuments() + " documentos");
print("logs:      " + db.logs.countDocuments() + " documentos");
print("TOTAL:     " + (db.servicios.countDocuments() + db.usuarios.countDocuments() + db.logs.countDocuments()) + " documentos");
