-- ============================================================================
--  SISTEMA DE GESTION DE GANADO
--  Migracion 005 - Tipos de colaborador (HU-20)
--  Responsable: Aaron
-- ============================================================================
--
--  EL PROBLEMA
--  Los cuatro tipos predefinidos (veterinario, encargado de campo, encargado
--  de almacen y administrativo) son globales: rancho_id nulo, una sola fila
--  para todos los ranchos. Sus permisos por defecto tambien. Si un
--  propietario le cambiara los permisos al veterinario directamente sobre
--  esas filas, se los cambiaria al veterinario de TODOS los ranchos. Eso
--  rompe el aislamiento (HU-03).
--
--  LA SOLUCION
--  permisos_tipo gana una columna rancho_id:
--    rancho_id nulo       los permisos por defecto de un tipo predefinido.
--    rancho_id de un      la version de ese rancho: o un tipo propio, o un
--    rancho               predefinido que el propietario ajusto.
--
--  Regla para saber que puede hacer un tipo dentro de un rancho:
--    si el rancho tiene filas propias para ese tipo, valen esas;
--    si no, valen las de por defecto.
--  Al ajustar un tipo se guardan las ocho filas (una por modulo), aunque sea
--  sin acceso: asi "lo ajusto y le saco todo" no se confunde con "nunca lo
--  ajusto".
--
--  Esa regla vive en un solo lugar: la vista permisos_tipo_vigentes. HU-19
--  (permisos por modulo, Brian) la puede usar tal cual para decidir si una
--  persona ve o edita un modulo, sumandole lo de permisos_usuario.
--
--  Restablecer un predefinido = dar de baja logica sus filas del rancho.
--  Nada se borra de verdad (RNF-09).
--
--  ON DELETE CASCADE en el rancho: las semillas borran los ranchos de prueba
--  en cada corrida, igual que en la migracion 004.
-- ============================================================================

BEGIN;

ALTER TABLE permisos_tipo
    ADD COLUMN rancho_id UUID;

ALTER TABLE permisos_tipo
    ADD CONSTRAINT fk_permisos_tipo_rancho
        FOREIGN KEY (rancho_id) REFERENCES ranchos(id) ON DELETE CASCADE;

-- Los tipos propios que ya existieran: sus permisos son de su rancho.
UPDATE permisos_tipo p
   SET rancho_id = t.rancho_id
  FROM tipos_colaborador t
 WHERE t.id = p.tipo_colaborador_id
   AND t.rancho_id IS NOT NULL
   AND p.rancho_id IS NULL;

-- Un modulo por tipo y por rancho. El indice anterior no sabia de ranchos.
DROP INDEX ux_permisos_tipo;
CREATE UNIQUE INDEX ux_permisos_tipo
    ON permisos_tipo (
        tipo_colaborador_id,
        modulo_codigo,
        COALESCE(rancho_id, '00000000-0000-0000-0000-000000000000'::uuid)
    )
    WHERE eliminado_en IS NULL;

CREATE INDEX ix_permisos_tipo_rancho
    ON permisos_tipo (rancho_id, tipo_colaborador_id)
    WHERE eliminado_en IS NULL;

-- Lo que puede cada tipo dentro de cada rancho, ya resuelto.
-- Una fila por rancho, tipo y modulo con acceso (o sin acceso, si se ajusto).
CREATE VIEW permisos_tipo_vigentes AS
    -- Tipos propios y predefinidos ajustados por el rancho.
    SELECT p.rancho_id,
           p.tipo_colaborador_id,
           p.modulo_codigo,
           p.puede_ver,
           p.puede_editar,
           TRUE AS ajustado
      FROM permisos_tipo p
     WHERE p.eliminado_en IS NULL
       AND p.rancho_id IS NOT NULL
    UNION ALL
    -- Predefinidos que el rancho no toco: los de por defecto.
    SELECT r.id AS rancho_id,
           p.tipo_colaborador_id,
           p.modulo_codigo,
           p.puede_ver,
           p.puede_editar,
           FALSE AS ajustado
      FROM permisos_tipo p
     CROSS JOIN ranchos r
     WHERE p.eliminado_en IS NULL
       AND p.rancho_id IS NULL
       AND r.eliminado_en IS NULL
       AND NOT EXISTS (
           SELECT 1
             FROM permisos_tipo propio
            WHERE propio.rancho_id = r.id
              AND propio.tipo_colaborador_id = p.tipo_colaborador_id
              AND propio.eliminado_en IS NULL
       );

COMMIT;
