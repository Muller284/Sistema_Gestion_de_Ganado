-- ============================================================================
--  SISTEMA DE GESTION DE GANADO
--  Migracion 006 - Accesos del Admin de plataforma a los ranchos (HU-24)
--  Responsable: Aaron
-- ============================================================================
--
--  El Admin de plataforma no pertenece a ningun rancho (rancho_id nulo, ver
--  ck_usuarios_admin_sin_rancho). Para dar soporte entra a uno: elige el
--  rancho, escribe por que, y desde ese momento ve y opera ese rancho como lo
--  haria el propietario.
--
--  Criterio 3 de HU-24: "Cada acceso del Admin a un rancho queda registrado."
--  Cada entrada es una fila de esta tabla, con el motivo, cuando entro y
--  cuando salio. Sin una fila abierta, el servidor no le deja ver nada del
--  rancho: no hay forma de entrar sin quedar registrado.
--
--  Un acceso vence solo a las 8 horas (lo controla el servidor): si el Admin
--  se olvida de salir, no queda una puerta abierta para siempre.
--
--  Las filas no se borran ni se editan, salvo para cerrar el acceso.
-- ============================================================================

BEGIN;

CREATE TABLE accesos_admin (
    id              UUID PRIMARY KEY,
    admin_id        UUID NOT NULL,
    rancho_id       UUID NOT NULL,
    motivo          VARCHAR(300) NOT NULL,
    entrado_en      TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    salido_en       TIMESTAMPTZ,

    creado_en       TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    modificado_en   TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    creado_por      UUID,
    modificado_por  UUID,
    eliminado_en    TIMESTAMPTZ,

    CONSTRAINT fk_accesos_admin_admin
        FOREIGN KEY (admin_id) REFERENCES usuarios(id),
    -- Las semillas borran los ranchos de prueba en cada corrida.
    CONSTRAINT fk_accesos_admin_rancho
        FOREIGN KEY (rancho_id) REFERENCES ranchos(id) ON DELETE CASCADE,
    CONSTRAINT ck_accesos_admin_salida
        CHECK (salido_en IS NULL OR salido_en >= entrado_en)
);

CREATE INDEX ix_accesos_admin_abiertos
    ON accesos_admin (admin_id, rancho_id)
    WHERE salido_en IS NULL;

CREATE INDEX ix_accesos_admin_rancho
    ON accesos_admin (rancho_id, entrado_en DESC);

CREATE TRIGGER tg_accesos_admin_modificado_en
    BEFORE UPDATE ON accesos_admin
    FOR EACH ROW EXECUTE FUNCTION fn_tocar_modificado_en();

COMMIT;
