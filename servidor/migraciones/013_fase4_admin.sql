-- ============================================================================
--  SISTEMA DE GESTION DE GANADO
--  Migracion 013 - Panel de administracion de la plataforma (fase 4)
--  Responsable: Aaron
-- ============================================================================
--
--  Dos tablas para operar la plataforma sin tocar la base (RF-56 a RF-62,
--  RNF-04 y RNF-11). Los planes, la suscripcion y el cobro quedan para una
--  version futura (DECISIONES.md, punto 50), asi que aca no hay nada de eso.
--
--  registro_auditoria (RF-62)
--    Que hizo cada Admin y cuando: entrar y salir de un rancho, suspender o
--    reactivar una cuenta, mandar un enlace para cambiar la contraseña,
--    cambiar el catalogo de razas o la configuracion. Las filas no se editan
--    ni se borran. detalle guarda lo propio de cada accion (el motivo, el
--    valor de antes y el de despues).
--
--  configuracion_plataforma (RNF-04, RNF-11)
--    Valores que el Admin cambia desde un formulario. Por ahora, las cuotas
--    del asistente: consultas por usuario al mes y el tope general de la
--    plataforma al mes. Sin valor (NULL) vale lo del .env, o sin tope.
-- ============================================================================

BEGIN;

CREATE TABLE registro_auditoria (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_id        UUID NOT NULL,
    accion          VARCHAR(40) NOT NULL,
    -- Sobre quien o que: un rancho, un usuario, una raza o una clave de configuracion.
    rancho_id       UUID,
    usuario_id      UUID,
    objeto          VARCHAR(150),
    detalle         JSONB NOT NULL DEFAULT '{}'::jsonb,

    creado_en       TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    modificado_en   TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    creado_por      UUID,
    modificado_por  UUID,
    eliminado_en    TIMESTAMPTZ,

    -- Las semillas borran y vuelven a crear el Admin y los ranchos de prueba.
    CONSTRAINT fk_auditoria_admin
        FOREIGN KEY (admin_id) REFERENCES usuarios(id) ON DELETE CASCADE,
    CONSTRAINT fk_auditoria_rancho
        FOREIGN KEY (rancho_id) REFERENCES ranchos(id) ON DELETE SET NULL,
    CONSTRAINT fk_auditoria_usuario
        FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE SET NULL,
    CONSTRAINT ck_auditoria_accion CHECK (accion IN (
        'soporte_entrada', 'soporte_salida',
        'cuenta_suspendida', 'cuenta_reactivada', 'contrasena_enlace',
        'raza_creada', 'raza_editada', 'raza_desactivada', 'raza_reactivada',
        'configuracion'
    ))
);

CREATE INDEX ix_auditoria_fecha ON registro_auditoria (creado_en DESC);
CREATE INDEX ix_auditoria_rancho ON registro_auditoria (rancho_id, creado_en DESC);

CREATE TRIGGER tg_registro_auditoria_modificado_en
    BEFORE UPDATE ON registro_auditoria
    FOR EACH ROW EXECUTE FUNCTION fn_tocar_modificado_en();

-- Los accesos de soporte que ya habia (HU-24) entran al registro.
INSERT INTO registro_auditoria (admin_id, accion, rancho_id, objeto, detalle, creado_en, creado_por)
SELECT a.admin_id, 'soporte_entrada', a.rancho_id, r.nombre,
       jsonb_build_object('motivo', a.motivo, 'acceso_id', a.id), a.entrado_en, a.admin_id
  FROM accesos_admin a
  JOIN ranchos r ON r.id = a.rancho_id
 WHERE a.eliminado_en IS NULL;

INSERT INTO registro_auditoria (admin_id, accion, rancho_id, objeto, detalle, creado_en, creado_por)
SELECT a.admin_id, 'soporte_salida', a.rancho_id, r.nombre,
       jsonb_build_object('acceso_id', a.id), a.salido_en, a.admin_id
  FROM accesos_admin a
  JOIN ranchos r ON r.id = a.rancho_id
 WHERE a.eliminado_en IS NULL AND a.salido_en IS NOT NULL;

CREATE TABLE configuracion_plataforma (
    clave           VARCHAR(60) PRIMARY KEY,
    valor           INTEGER CHECK (valor IS NULL OR valor > 0),

    creado_en       TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    modificado_en   TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    creado_por      UUID,
    modificado_por  UUID,
    eliminado_en    TIMESTAMPTZ
);

CREATE TRIGGER tg_configuracion_plataforma_modificado_en
    BEFORE UPDATE ON configuracion_plataforma
    FOR EACH ROW EXECUTE FUNCTION fn_tocar_modificado_en();

INSERT INTO configuracion_plataforma (clave, valor) VALUES
    ('asistente_consultas_mes', NULL),
    ('asistente_tope_mensual', NULL);

-- El tablero cuenta consultas del mes de toda la plataforma.
CREATE INDEX ix_consultas_asistente_fecha ON consultas_asistente (creado_en);

COMMIT;
