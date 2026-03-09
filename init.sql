-- ============================================================
-- PetCenter - Script de inicialización de base de datos
-- ============================================================

-- Tabla: usuarios
CREATE TABLE IF NOT EXISTS usuarios (
  id        SERIAL PRIMARY KEY,
  nombre    TEXT NOT NULL,
  email     TEXT UNIQUE NOT NULL,
  password  TEXT NOT NULL,
  rol       TEXT NOT NULL DEFAULT 'usuario' CHECK (rol IN ('usuario', 'admin')),
  creado_en TIMESTAMPTZ DEFAULT NOW()
);

-- Tabla: raza
CREATE TABLE IF NOT EXISTS raza (
  id       SERIAL PRIMARY KEY,
  nombre   TEXT NOT NULL,
  especie  TEXT NOT NULL CHECK (especie IN ('perro', 'gato', 'otro'))
);

-- Tabla: mascotas
CREATE TABLE IF NOT EXISTS mascotas (
  id             SERIAL PRIMARY KEY,
  nombre         TEXT NOT NULL,
  edad_meses     INT NOT NULL,
  genero         TEXT NOT NULL CHECK (genero IN ('macho', 'hembra')),
  raza_id        INT REFERENCES raza(id),
  estado         TEXT NOT NULL DEFAULT 'disponible' CHECK (estado IN ('disponible', 'en_proceso', 'adoptado')),
  descripcion    TEXT,
  fecha_ingreso  DATE NOT NULL DEFAULT CURRENT_DATE
);

-- Tabla: solicitudes
CREATE TABLE IF NOT EXISTS solicitudes (
  id                SERIAL PRIMARY KEY,
  usuario_id        INT REFERENCES usuarios(id),
  mascota_id        INT REFERENCES mascotas(id),
  estado            TEXT NOT NULL DEFAULT 'pendiente' CHECK (estado IN ('pendiente', 'aprobada', 'rechazada')),
  fecha_solicitud   TIMESTAMPTZ DEFAULT NOW(),
  comentarios_admin TEXT
);

-- ============================================================
-- Datos de ejemplo
-- ============================================================

INSERT INTO raza (nombre, especie) VALUES
  ('Labrador', 'perro'),
  ('Golden Retriever', 'perro'),
  ('Siamés', 'gato'),
  ('Persa', 'gato'),
  ('Beagle', 'perro');

INSERT INTO mascotas (nombre, edad_meses, genero, raza_id, estado, descripcion, fecha_ingreso) VALUES
  ('Max',    12, 'macho',  1, 'disponible', 'Perro juguetón y amigable',  '2024-01-15'),
  ('Luna',    8, 'hembra', 3, 'disponible', 'Gata tranquila y cariñosa',  '2024-02-20'),
  ('Rocky',  24, 'macho',  5, 'disponible', 'Muy activo, le gusta correr','2024-03-10'),
  ('Mia',     6, 'hembra', 4, 'en_proceso', 'Gatita juguetona',           '2024-03-25'),
  ('Bruno',  18, 'macho',  2, 'disponible', 'Excelente con niños',        '2024-04-01');

INSERT INTO usuarios (nombre, email, password, rol) VALUES
  ('Admin PetCenter', 'admin@petcenter.com', 'admin123', 'admin'),
  ('Juan Pérez',      'juan@mail.com',       'juan123',  'usuario');

-- Vista que une mascotas con razas (útil para PostgREST)
CREATE OR REPLACE VIEW mascotas_detalle AS
  SELECT
    m.id,
    m.nombre,
    m.edad_meses,
    m.genero,
    m.estado,
    m.descripcion,
    m.fecha_ingreso,
    r.id       AS raza_id,
    r.nombre   AS raza_nombre,
    r.especie  AS raza_especie
  FROM mascotas m
  LEFT JOIN raza r ON m.raza_id = r.id;