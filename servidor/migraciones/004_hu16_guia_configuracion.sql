-- ============================================================================
--  SISTEMA DE GESTION DE GANADO
--  Migracion 004 - Guia de configuracion inicial (HU-16)
--  Responsable: Aaron
-- ============================================================================
--
--  La guia tiene cuatro pasos fijos: animales, corrales, vacunas y equipo.
--  Lo que se guarda aca es lo que NO se puede deducir de los datos:
--    - si el propietario ya abrio un paso (para mostrarlo "en curso"),
--    - si lo dio por terminado,
--    - si dejo la guia en pausa para retomarla despues.
--
--  Que un paso tenga datos (hay animales, hay integrantes en el equipo) se
--  calcula al consultar, no se copia aca: dos fuentes para el mismo dato
--  terminan diciendo cosas distintas.
--
--  ON DELETE CASCADE: si se borra el rancho (las semillas lo hacen en cada
--  corrida), sus pasos se van con el. Sin esto, sembrar.js fallaria.
-- ============================================================================

BEGIN;

CREATE TABLE pasos_guia (
    id              UUID PRIMARY KEY,
    rancho_id       UUID NOT NULL,
    paso            VARCHAR(20) NOT NULL
                    CHECK (paso IN ('animales','corrales','vacunas','equipo')),
    visitado_en     TIMESTAMPTZ,
    completado_en   TIMESTAMPTZ,

    creado_en       TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    modificado_en   TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    creado_por      UUID,
    modificado_por  UUID,
    eliminado_en    TIMESTAMPTZ,

    CONSTRAINT fk_pasos_guia_rancho
        FOREIGN KEY (rancho_id) REFERENCES ranchos(id) ON DELETE CASCADE
);

-- Un rancho tiene una sola fila por paso.
CREATE UNIQUE INDEX ux_pasos_guia_rancho_paso ON pasos_guia (rancho_id, paso);

CREATE TRIGGER tg_pasos_guia_modificado_en
    BEFORE UPDATE ON pasos_guia
    FOR EACH ROW EXECUTE FUNCTION fn_tocar_modificado_en();

-- "Seguir despues": la guia se esconde del panel pero no se pierde nada.
ALTER TABLE ranchos ADD COLUMN guia_pausada_en TIMESTAMPTZ;

COMMIT;
