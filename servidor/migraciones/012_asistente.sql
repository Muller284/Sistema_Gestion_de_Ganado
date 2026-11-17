-- ============================================================================
--  SISTEMA DE GESTION DE GANADO
--  Migracion 012 - Asistente con inteligencia artificial (fase 5)
--  Responsable: Aaron
-- ============================================================================
--
--  RF-38 a RF-42. consultas_asistente guarda cada pregunta respondida: sirve
--  de historial (ConsultaAsistente del modelo de datos) y para contar la
--  cuota del mes (ConsumoAsistente): las consultas de un usuario en el mes
--  se cuentan aca, sin una tabla aparte que mantener sincronizada.
--
--  herramientas guarda que herramientas uso el modelo para responder, para
--  poder revisar despues de donde salio cada respuesta.
--
--  Las reglas de siempre: identificador generado en el servidor, autoria,
--  marca de modificacion y baja logica (RNF-06, RNF-09), y el rancho en la
--  referencia al usuario para no mezclar ranchos (HU-03).
-- ============================================================================

BEGIN;

CREATE TABLE consultas_asistente (
    id              UUID PRIMARY KEY,
    rancho_id       UUID NOT NULL,
    usuario_id      UUID NOT NULL,
    pregunta        VARCHAR(500) NOT NULL CHECK (BTRIM(pregunta) <> ''),
    respuesta       TEXT NOT NULL,
    herramientas    TEXT[] NOT NULL DEFAULT '{}',

    creado_en       TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    modificado_en   TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    creado_por      UUID,
    modificado_por  UUID,
    eliminado_en    TIMESTAMPTZ,

    CONSTRAINT fk_consultas_asistente_rancho
        FOREIGN KEY (rancho_id) REFERENCES ranchos(id) ON DELETE CASCADE,
    CONSTRAINT fk_consultas_asistente_usuario
        FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
);

-- La cuota se cuenta por usuario y por mes.
CREATE INDEX ix_consultas_asistente_usuario_fecha
    ON consultas_asistente (usuario_id, creado_en)
    WHERE eliminado_en IS NULL;

CREATE TRIGGER tg_consultas_asistente_modificado_en
    BEFORE UPDATE ON consultas_asistente
    FOR EACH ROW EXECUTE FUNCTION fn_tocar_modificado_en();

COMMIT;
