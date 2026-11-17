-- ============================================================================
--  SISTEMA DE GESTION DE GANADO
--  Script simple: el nucleo del modelo (rancho, corrales, animales, pesajes)
--  con datos de ejemplo. Es el que va copiado en el manual tecnico.
--
--  Es una version RESUMIDA para leer y probar en cualquier PostgreSQL: crea
--  todo dentro de un esquema aparte (ganado_demo) y no toca las tablas del
--  sistema. El modelo completo esta en 01_esquema.sql y los datos de prueba
--  completos en 02_datos_ejemplo.sql (los mismos que cargan las migraciones y
--  las semillas de servidor/).
--
--  Uso:  psql -U ganado_usuario -d gestion_ganado -f 03_script_simple.sql
-- ============================================================================

BEGIN;

DROP SCHEMA IF EXISTS ganado_demo CASCADE;
CREATE SCHEMA ganado_demo;
SET search_path TO ganado_demo;

-- Cada tabla lleva el rancho, autoria y baja logica, como en el sistema.
CREATE TABLE ranchos (
    id            UUID PRIMARY KEY,
    nombre        VARCHAR(120) NOT NULL,
    superficie    NUMERIC(12,2),
    creado_en     TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    eliminado_en  TIMESTAMPTZ
);

CREATE TABLE corrales (
    id            UUID PRIMARY KEY,
    rancho_id     UUID NOT NULL REFERENCES ranchos(id),
    nombre        VARCHAR(80) NOT NULL,
    capacidad     INTEGER CHECK (capacidad > 0),
    superficie_ha NUMERIC(10,4),
    creado_en     TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    eliminado_en  TIMESTAMPTZ,
    UNIQUE (id, rancho_id)
);

CREATE TABLE animales (
    id               UUID PRIMARY KEY,
    rancho_id        UUID NOT NULL REFERENCES ranchos(id),
    identificador    VARCHAR(50) NOT NULL,
    sexo             VARCHAR(10) NOT NULL CHECK (sexo IN ('macho', 'hembra')),
    categoria_codigo VARCHAR(20) NOT NULL,
    fecha_nacimiento DATE,
    corral_id        UUID,
    peso_kg          NUMERIC(10,2),
    estado           VARCHAR(20) NOT NULL DEFAULT 'activo'
                     CHECK (estado IN ('activo', 'vendido', 'muerto', 'archivado')),
    creado_en        TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    eliminado_en     TIMESTAMPTZ,
    UNIQUE (id, rancho_id),
    -- El corral tiene que ser del mismo rancho (aislamiento en la base).
    FOREIGN KEY (corral_id, rancho_id) REFERENCES corrales(id, rancho_id)
);

-- La caravana es unica dentro del rancho, entre los animales vigentes.
CREATE UNIQUE INDEX ux_animales_identificador
    ON animales (rancho_id, identificador) WHERE eliminado_en IS NULL;

CREATE TABLE pesajes (
    id           UUID PRIMARY KEY,
    rancho_id    UUID NOT NULL,
    animal_id    UUID NOT NULL,
    fecha        DATE NOT NULL,
    peso_kg      NUMERIC(10,2) NOT NULL CHECK (peso_kg > 0),
    eliminado_en TIMESTAMPTZ,
    FOREIGN KEY (animal_id, rancho_id) REFERENCES animales(id, rancho_id)
);

-- Datos de ejemplo -------------------------------------------------------------
INSERT INTO ranchos (id, nombre, superficie) VALUES
  ('a0000000-0000-4000-8000-000000000001', 'Rancho El Cerrito', 850.50);

INSERT INTO corrales (id, rancho_id, nombre, capacidad, superficie_ha) VALUES
  ('cc000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000001', 'Potrero Las Lomas', 20, 25),
  ('cc000000-0000-4000-8000-000000000002', 'a0000000-0000-4000-8000-000000000001', 'Potrero del Río', 10, 12);

INSERT INTO animales (id, rancho_id, identificador, sexo, categoria_codigo, fecha_nacimiento, corral_id, peso_kg) VALUES
  ('d1000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000001', '0501', 'hembra', 'vaca',    '2021-03-14', 'cc000000-0000-4000-8000-000000000001', 468),
  ('d1000000-0000-4000-8000-000000000003', 'a0000000-0000-4000-8000-000000000001', '0503', 'macho',  'novillo', '2024-07-20', 'cc000000-0000-4000-8000-000000000002', 402),
  ('d1000000-0000-4000-8000-000000000004', 'a0000000-0000-4000-8000-000000000001', '0504', 'macho',  'novillo', '2024-08-11', 'cc000000-0000-4000-8000-000000000002', 371);

INSERT INTO pesajes (id, rancho_id, animal_id, fecha, peso_kg) VALUES
  ('f1000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000001', 'd1000000-0000-4000-8000-000000000003', '2026-09-15', 378),
  ('f1000000-0000-4000-8000-000000000002', 'a0000000-0000-4000-8000-000000000001', 'd1000000-0000-4000-8000-000000000003', '2026-10-30', 402);

COMMIT;

-- Consulta de ejemplo: animales por corral y ganancia diaria entre pesajes.
SELECT c.nombre AS corral, COUNT(a.id) AS animales
  FROM ganado_demo.corrales c
  LEFT JOIN ganado_demo.animales a ON a.corral_id = c.id AND a.eliminado_en IS NULL
 GROUP BY c.nombre;

SELECT a.identificador,
       ROUND((MAX(p.peso_kg) - MIN(p.peso_kg)) / NULLIF(MAX(p.fecha) - MIN(p.fecha), 0), 3) AS ganancia_kg_dia
  FROM ganado_demo.pesajes p
  JOIN ganado_demo.animales a ON a.id = p.animal_id
 GROUP BY a.identificador;
