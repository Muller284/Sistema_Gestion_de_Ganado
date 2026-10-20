-- ============================================================================
--  SISTEMA DE GESTION DE GANADO
--  Migracion 009 - Indices para ordenar y paginar el listado de animales
--  Responsable: Brian
-- ============================================================================
--
--  HU-30  El orden y la paginacion se resuelven en la base (ORDER BY ...
--         LIMIT/OFFSET), no en el navegador. Con miles de animales, cada
--         pagina tiene que salir sin recorrer y ordenar la tabla entera.
--
--  Todas las consultas del listado filtran por rancho_id, asi que cada
--  indice empieza por rancho_id y sigue por la columna de orden. El orden por
--  identificador ya lo cubre ux_animales_rancho_identificador (008) para los
--  vigentes; aca se suma uno general para cuando se piden tambien las bajas.
--
--  No se tocan tablas: solo indices. No hay datos que migrar.
-- ============================================================================

BEGIN;

CREATE INDEX IF NOT EXISTS ix_animales_listado_identificador
    ON animales (rancho_id, identificador, id);

CREATE INDEX IF NOT EXISTS ix_animales_listado_nombre
    ON animales (rancho_id, nombre);

CREATE INDEX IF NOT EXISTS ix_animales_listado_nacimiento
    ON animales (rancho_id, fecha_nacimiento);

CREATE INDEX IF NOT EXISTS ix_animales_listado_peso
    ON animales (rancho_id, peso_kg);

CREATE INDEX IF NOT EXISTS ix_animales_listado_creado
    ON animales (rancho_id, creado_en);

COMMIT;
