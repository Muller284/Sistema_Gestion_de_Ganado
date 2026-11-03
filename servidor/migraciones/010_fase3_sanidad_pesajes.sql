-- ============================================================================
--  SISTEMA DE GESTION DE GANADO
--  Migracion 010 - Sanidad y pesajes (fase 3, Sprint 4)
--  Responsable: Aaron
-- ============================================================================
--
--  HU-46  productos_sanitarios: el catalogo de cada rancho (vacunas,
--         antiparasitarios, vitaminas, antibioticos u otros).
--  HU-47  esquemas_vacunacion: que producto, a que animales, desde que edad,
--         cuantas dosis, cada cuantos dias y si tiene refuerzo periodico.
--  HU-48  aplicaciones_sanitarias: cada dosis aplicada, con quien la aplico.
--  HU-49  la aplicacion masiva comparte lote_id entre todas sus filas.
--  HU-53  pesajes: el peso de un animal en una fecha, siempre en kilos (HU-26).
--
--  Las reglas de siempre: identificador generado en el cliente, autoria,
--  marca de modificacion y baja logica en todas las tablas (RNF-06, RNF-09).
--
--  Aislamiento (HU-03) tambien en la base: las referencias entre tablas van
--  con el rancho incluido, (animal_id, rancho_id) -> animales(id, rancho_id).
--  Asi una aplicacion o un pesaje no puede apuntar a un animal, un producto o
--  un esquema de otro rancho, aunque el servidor tuviera un error.
--
--  ON DELETE CASCADE hacia ranchos y animales: las semillas borran y recrean
--  los ranchos en cada corrida.
-- ============================================================================

BEGIN;

-- Para las referencias con el rancho incluido. id ya es unico; esto solo le
-- da a la base algo a que apuntar.
ALTER TABLE animales ADD CONSTRAINT ux_animales_id_rancho UNIQUE (id, rancho_id);


-- ----------------------------------------------------------------------------
--  productos_sanitarios (HU-46)
-- ----------------------------------------------------------------------------
CREATE TABLE productos_sanitarios (
    id              UUID PRIMARY KEY,
    rancho_id       UUID NOT NULL,
    nombre          VARCHAR(120) NOT NULL CHECK (BTRIM(nombre) <> ''),
    -- Nombre sin mayusculas, sin acentos y sin espacios de mas: con ella
    -- «Aftosa» y «aftósa» son el mismo producto. La calcula el servidor.
    clave           VARCHAR(120) NOT NULL,
    tipo            VARCHAR(20) NOT NULL
                    CHECK (tipo IN ('vacuna','antiparasitario','vitamina','antibiotico','otro')),
    laboratorio     VARCHAR(120),
    -- Dosis por animal, opcional, con su unidad.
    dosis           NUMERIC(10,2) CHECK (dosis > 0),
    unidad          VARCHAR(10) CHECK (unidad IN ('ml','g','mg','dosis')),

    creado_en       TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    modificado_en   TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    creado_por      UUID,
    modificado_por  UUID,
    eliminado_en    TIMESTAMPTZ,

    CONSTRAINT fk_productos_rancho
        FOREIGN KEY (rancho_id) REFERENCES ranchos(id) ON DELETE CASCADE,
    CONSTRAINT ux_productos_id_rancho UNIQUE (id, rancho_id),
    -- La dosis y su unidad van juntas.
    CONSTRAINT ck_productos_dosis_unidad CHECK ((dosis IS NULL) = (unidad IS NULL))
);

-- No se repite el nombre entre los vigentes del rancho.
CREATE UNIQUE INDEX ux_productos_rancho_clave
    ON productos_sanitarios (rancho_id, clave)
    WHERE eliminado_en IS NULL;

CREATE TRIGGER tg_productos_sanitarios_modificado_en
    BEFORE UPDATE ON productos_sanitarios
    FOR EACH ROW EXECUTE FUNCTION fn_tocar_modificado_en();


-- ----------------------------------------------------------------------------
--  esquemas_vacunacion (HU-47)
--
--  A quien se aplica: categorias (nulo = todas), sexo (nulo = los dos) y un
--  rango de edad en meses, con la misma cuenta que las reglas de categoria.
--  Cuando: la primera dosis al cumplir edad_minima_meses; las siguientes,
--  intervalo_dias despues de la anterior; despues de la ultima, si hay
--  refuerzo, cada refuerzo_dias. El calendario (HU-50) lo calcula con esto.
-- ----------------------------------------------------------------------------
CREATE TABLE esquemas_vacunacion (
    id                  UUID PRIMARY KEY,
    rancho_id           UUID NOT NULL,
    producto_id         UUID NOT NULL,
    nombre              VARCHAR(120) NOT NULL CHECK (BTRIM(nombre) <> ''),
    categorias          VARCHAR(30)[],
    sexo                VARCHAR(10) CHECK (sexo IN ('macho','hembra')),
    edad_minima_meses   SMALLINT NOT NULL DEFAULT 0 CHECK (edad_minima_meses >= 0),
    edad_maxima_meses   SMALLINT CHECK (edad_maxima_meses >= 0),
    dosis               SMALLINT NOT NULL CHECK (dosis BETWEEN 1 AND 10),
    intervalo_dias      SMALLINT CHECK (intervalo_dias > 0),
    refuerzo_dias       SMALLINT CHECK (refuerzo_dias > 0),

    creado_en       TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    modificado_en   TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    creado_por      UUID,
    modificado_por  UUID,
    eliminado_en    TIMESTAMPTZ,

    CONSTRAINT fk_esquemas_rancho
        FOREIGN KEY (rancho_id) REFERENCES ranchos(id) ON DELETE CASCADE,
    CONSTRAINT fk_esquemas_producto
        FOREIGN KEY (producto_id, rancho_id) REFERENCES productos_sanitarios(id, rancho_id) ON DELETE CASCADE,
    CONSTRAINT ux_esquemas_id_rancho UNIQUE (id, rancho_id),
    -- Con mas de una dosis hace falta saber cada cuanto.
    CONSTRAINT ck_esquemas_intervalo CHECK (dosis = 1 OR intervalo_dias IS NOT NULL),
    CONSTRAINT ck_esquemas_edades CHECK (edad_maxima_meses IS NULL OR edad_maxima_meses >= edad_minima_meses)
);

CREATE INDEX ix_esquemas_rancho ON esquemas_vacunacion (rancho_id) WHERE eliminado_en IS NULL;

CREATE TRIGGER tg_esquemas_vacunacion_modificado_en
    BEFORE UPDATE ON esquemas_vacunacion
    FOR EACH ROW EXECUTE FUNCTION fn_tocar_modificado_en();


-- ----------------------------------------------------------------------------
--  aplicaciones_sanitarias (HU-48, HU-49)
--  aplicado_por: el colaborador que la aplico, que puede no ser quien la
--  registra (creado_por). Sin clave foranea a usuarios, como creado_por,
--  para que las semillas puedan borrar y recrear los usuarios.
-- ----------------------------------------------------------------------------
CREATE TABLE aplicaciones_sanitarias (
    id              UUID PRIMARY KEY,
    rancho_id       UUID NOT NULL,
    animal_id       UUID NOT NULL,
    producto_id     UUID NOT NULL,
    -- Opcional: una aplicacion puede no ser parte de un esquema.
    esquema_id      UUID,
    numero_dosis    SMALLINT CHECK (numero_dosis BETWEEN 1 AND 10),
    fecha           DATE NOT NULL,
    dosis           NUMERIC(10,2) CHECK (dosis > 0),
    aplicado_por    UUID NOT NULL,
    observacion     VARCHAR(500),
    -- Las filas de una misma aplicacion masiva comparten lote.
    lote_id         UUID,

    creado_en       TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    modificado_en   TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    creado_por      UUID,
    modificado_por  UUID,
    eliminado_en    TIMESTAMPTZ,

    CONSTRAINT fk_aplicaciones_rancho
        FOREIGN KEY (rancho_id) REFERENCES ranchos(id) ON DELETE CASCADE,
    CONSTRAINT fk_aplicaciones_animal
        FOREIGN KEY (animal_id, rancho_id) REFERENCES animales(id, rancho_id) ON DELETE CASCADE,
    CONSTRAINT fk_aplicaciones_producto
        FOREIGN KEY (producto_id, rancho_id) REFERENCES productos_sanitarios(id, rancho_id) ON DELETE CASCADE,
    CONSTRAINT fk_aplicaciones_esquema
        FOREIGN KEY (esquema_id, rancho_id) REFERENCES esquemas_vacunacion(id, rancho_id) ON DELETE CASCADE,
    -- El numero de dosis solo tiene sentido dentro de un esquema.
    CONSTRAINT ck_aplicaciones_dosis_esquema CHECK (numero_dosis IS NULL OR esquema_id IS NOT NULL)
);

CREATE INDEX ix_aplicaciones_animal ON aplicaciones_sanitarias (animal_id, fecha) WHERE eliminado_en IS NULL;
CREATE INDEX ix_aplicaciones_esquema ON aplicaciones_sanitarias (esquema_id, animal_id) WHERE eliminado_en IS NULL;
CREATE INDEX ix_aplicaciones_rancho_fecha ON aplicaciones_sanitarias (rancho_id, fecha) WHERE eliminado_en IS NULL;

CREATE TRIGGER tg_aplicaciones_sanitarias_modificado_en
    BEFORE UPDATE ON aplicaciones_sanitarias
    FOR EACH ROW EXECUTE FUNCTION fn_tocar_modificado_en();


-- ----------------------------------------------------------------------------
--  pesajes (HU-53)
--  Un pesaje por animal y por dia entre los vigentes: la ganancia diaria
--  (HU-54) divide por los dias entre dos pesajes y no puede dividir por cero.
-- ----------------------------------------------------------------------------
CREATE TABLE pesajes (
    id              UUID PRIMARY KEY,
    rancho_id       UUID NOT NULL,
    animal_id       UUID NOT NULL,
    fecha           DATE NOT NULL,
    -- Siempre en kilos (HU-26).
    peso_kg         NUMERIC(10,2) NOT NULL CHECK (peso_kg > 0),
    observacion     VARCHAR(500),
    lote_id         UUID,

    creado_en       TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    modificado_en   TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    creado_por      UUID,
    modificado_por  UUID,
    eliminado_en    TIMESTAMPTZ,

    CONSTRAINT fk_pesajes_rancho
        FOREIGN KEY (rancho_id) REFERENCES ranchos(id) ON DELETE CASCADE,
    CONSTRAINT fk_pesajes_animal
        FOREIGN KEY (animal_id, rancho_id) REFERENCES animales(id, rancho_id) ON DELETE CASCADE
);

CREATE UNIQUE INDEX ux_pesajes_animal_fecha
    ON pesajes (animal_id, fecha)
    WHERE eliminado_en IS NULL;

CREATE INDEX ix_pesajes_rancho_fecha ON pesajes (rancho_id, fecha) WHERE eliminado_en IS NULL;

CREATE TRIGGER tg_pesajes_modificado_en
    BEFORE UPDATE ON pesajes
    FOR EACH ROW EXECUTE FUNCTION fn_tocar_modificado_en();

COMMIT;
