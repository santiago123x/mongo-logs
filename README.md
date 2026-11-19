# Almacenamiento y consultas en MongoDB: logs de una aplicación web

Proyecto de la **Tarea 4 – Almacenamiento y Consultas de Datos en Big Data** (Big Data, UNAD).

El repositorio contiene dos scripts para `mongosh` que construyen una base de datos documental con los registros (*logs*) de una aplicación web de comercio electrónico y luego ejecutan consultas de distinto nivel sobre ella: operaciones CRUD, filtros con operadores, joins y agregaciones.

## Caso de uso

Una tienda en línea está dividida en seis microservicios (autenticación, catálogo, carrito, pagos, envíos y notificaciones). Cada solicitud que atiende la aplicación genera un log con su nivel de severidad, el endpoint consultado, el código HTTP, el tiempo de respuesta y, si hubo un error, la traza de la excepción. MongoDB resulta adecuado porque los logs son semiestructurados: los eventos `ERROR` tienen un campo `traza` que los demás no tienen, y el contexto del cliente es un subdocumento anidado.

## Estructura del repositorio

```
Tarea4-MongoDB-Logs/
├── README.md
├── .gitignore
├── scripts/
│   ├── 01_crear_bd_e_insertar.js   # crea la base, las colecciones e inserta los datos
│   └── 02_consultas.js             # consultas A (CRUD), B (filtros) y C (agregaciones)
└── docs/
    └── salida_esperada.txt         # salida de referencia del script 02
```

## Requisitos

- MongoDB 4.4 o superior (local o en MongoDB Atlas).
- [`mongosh`](https://www.mongodb.com/docs/mongodb-shell/install/) instalado. Como alternativa, MongoDB Compass con la pestaña **MONGOSH** permite pegar el contenido de cada script.

## Cómo ejecutarlo

Desde la raíz del repositorio, con MongoDB corriendo en `localhost:27017`:

```bash
mongosh scripts/01_crear_bd_e_insertar.js
mongosh scripts/02_consultas.js
```

Si usa Atlas u otro servidor, pase la cadena de conexión antes del archivo:

```bash
mongosh "mongodb+srv://<usuario>:<clave>@<cluster>/" scripts/01_crear_bd_e_insertar.js
```

El orden importa: el script 2 depende de los datos que crea el script 1.

> **Nota sobre la repetición.** El script 1 borra la base `logs_aplicacion` y la crea de nuevo, por lo que puede ejecutarse cuantas veces se quiera. El script 2, en cambio, **modifica y elimina datos** (secciones A1 a A7). Si lo ejecuta una segunda vez sin volver a correr el script 1, los resultados ya no coincidirán con `docs/salida_esperada.txt`. Para repetir la práctica, ejecute siempre primero el script 1.

## Modelo de datos

La base `logs_aplicacion` tiene tres colecciones y 146 documentos en total.

| Colección   | Documentos | Descripción |
|-------------|-----------:|-------------|
| `servicios` | 6   | Microservicios de la aplicación: nombre, equipo responsable, lenguaje, versión y servidor (subdocumento con `host` y `region`). |
| `usuarios`  | 20  | Usuarios que generan actividad: nombre, email, ciudad, plan (`gratuito`, `premium`, `empresarial`), rol y fecha de registro. |
| `logs`      | 120 | Eventos de la aplicación (ver campos abajo). |

Campos principales de un documento en `logs`:

| Campo | Tipo | Ejemplo |
|-------|------|---------|
| `fecha` | Date | `2026-10-14T08:30:00Z` |
| `nivel` | String | `INFO`, `DEBUG`, `WARN` o `ERROR` |
| `servicio_id` | String (referencia a `servicios._id`) | `"pagos"` |
| `usuario_id` | String o `null` (referencia a `usuarios._id`) | `"U005"` |
| `metodo`, `endpoint` | String | `"POST"`, `"/api/pagos/procesar"` |
| `codigo_http` | Number | `503` |
| `tiempo_respuesta_ms` | Number | `5200` |
| `etiquetas` | Array | `["pagos", "post", "incidente", "lento"]` |
| `contexto` | Subdocumento | `{ navegador, sistema_operativo, version_app }` |
| `traza` | Subdocumento (solo en `ERROR`) | `{ excepcion, linea }` |

Los datos de `logs` se generan con un generador pseudoaleatorio de **semilla fija** (`2026`), de modo que cada ejecución del script 1 produce exactamente los mismos documentos. Además, el script crea dos índices: `{ fecha: -1 }` y `{ servicio_id: 1, nivel: 1 }`.

## Consultas incluidas (`02_consultas.js`)

Cada bloque imprime un título (`A1`, `B3`, `C5`, etc.) para ubicarlo fácilmente en la salida.

**A. Operaciones básicas (CRUD)**

- A1: inserción con `insertOne`.
- A2 y A3: selección con `find` (con proyección, orden y límite) y `findOne`.
- A4 y A5: actualización con `updateOne` y `updateMany` (`$set`, `$inc`).
- A6 y A7: eliminación con `deleteOne` y `deleteMany`.

**B. Filtros y operadores**

- B1: comparación (`$gt`).
- B2: pertenencia y rangos (`$in`, `$gte`, `$lte`) sobre fechas.
- B3: lógicos (`$or`, `$and`).
- B4: expresiones regulares (`$regex`) y campos anidados.
- B5: arreglos y existencia de campos (`$all`, `$exists`).
- B6: join entre tres colecciones con `$lookup`.

**C. Agregaciones**

- C1 y C2: conteo total y por nivel.
- C3: suma del tiempo de respuesta por servicio.
- C4: promedio, mínimo y máximo por servicio.
- C5: tasa de error (%) por servicio.
- C6: actividad por semana.
- C7: usuarios con más eventos.
- C8: errores por tipo de excepción.

## Verificar el resultado

El archivo `docs/salida_esperada.txt` contiene lo que imprime el script 2 sobre una base recién creada. Para compararlo:

```bash
mongosh scripts/01_crear_bd_e_insertar.js
mongosh scripts/02_consultas.js > salida_obtenida.txt
```

Los identificadores `ObjectId` que aparecen en A1 cambian en cada ejecución, así que es normal que esa línea difiera; el resto debe coincidir.
