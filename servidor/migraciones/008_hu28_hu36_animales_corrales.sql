-- ============================================================================
--  SISTEMA DE GESTION DE GANADO
--  Migracion 008 - Corrales, ficha del animal, estados y movimientos
--  Responsable: Romina
-- ============================================================================
--
--  HU-36  corrales: nombre unico en el rancho, capacidad y superficie opcionales.
--  HU-28  ficha del animal: raza, sexo, categoria (de un catalogo), fecha de
--         nacimiento, origen y corral (opcional).
--  HU-33  estado del animal: activo, vendido, muerto o archivado, con fecha y
--         motivo de cada cambio.
--  HU-34  baja logica: todas las tablas llevan eliminado_en.
--  HU-39  movimientos entre corrales: origen, destino, fecha y quien.
--  HU-26  unidades: el peso se guarda siempre en kilos y la superficie en
--         hectareas. La pantalla convierte a libras o acres segun el pais.
--
--  La tabla animales tambien la necesita el registro de HU-27 (Brian): el
--  identificador, su tipo y el indice unico por rancho ya estan aca, con los
--  mismos criterios que pidio la revision del Sprint 2.
--
--  ON DELETE CASCADE hacia ranchos: las semillas borran y recrean los ranchos
--  en cada corrida (igual que pasos_guia en la 004).
-- ============================================================================

BEGIN;


-- ----------------------------------------------------------------------------
--  Catalogo de categorias (HU-28: "se elige de un catalogo, no se escribe").
--  El nombre visible sale de idiomas/, por eso aca solo va el codigo.
-- ----------------------------------------------------------------------------
CREATE TABLE categorias_animal (
    codigo          VARCHAR(30) PRIMARY KEY,
    orden           SMALLINT NOT NULL DEFAULT 0,

    creado_en       TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    modificado_en   TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    creado_por      UUID,
    modificado_por  UUID,
    eliminado_en    TIMESTAMPTZ
);

INSERT INTO categorias_animal (codigo, orden) VALUES
    ('ternero',  1),
    ('ternera',  2),
    ('torito',   3),
    ('vaquilla', 4),
    ('novillo',  5),
    ('vaca',     6),
    ('toro',     7),
    ('buey',     8);


-- ----------------------------------------------------------------------------
--  corrales (HU-36)
-- ----------------------------------------------------------------------------
CREATE TABLE corrales (
    id              UUID PRIMARY KEY,
    rancho_id       UUID NOT NULL,
    nombre          VARCHAR(100) NOT NULL,
    -- Opcional: sin capacidad no hay aviso de sobrepoblacion.
    capacidad       INTEGER CHECK (capacidad > 0),
    -- Siempre en hectareas (HU-26).
    superficie_ha   NUMERIC(12,4) CHECK (superficie_ha > 0),

    creado_en       TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    modificado_en   TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    creado_por      UUID,
    modificado_por  UUID,
    eliminado_en    TIMESTAMPTZ,

    CONSTRAINT fk_corrales_rancho
        FOREIGN KEY (rancho_id) REFERENCES ranchos(id) ON DELETE CASCADE
);

-- El nombre es unico dentro del rancho, sin importar mayusculas, entre los
-- vigentes: un corral dado de baja libera su nombre (como el correo, decision 7).
CREATE UNIQUE INDEX ux_corrales_rancho_nombre
    ON corrales (rancho_id, LOWER(nombre))
    WHERE eliminado_en IS NULL;

CREATE TRIGGER tg_corrales_modificado_en
    BEFORE UPDATE ON corrales
    FOR EACH ROW EXECUTE FUNCTION fn_tocar_modificado_en();


-- ----------------------------------------------------------------------------
--  animales (HU-27, HU-28, HU-33)
-- ----------------------------------------------------------------------------
CREATE TABLE animales (
    id                  UUID PRIMARY KEY,
    rancho_id           UUID NOT NULL,
    identificador       VARCHAR(50) NOT NULL CHECK (BTRIM(identificador) <> ''),
    tipo_identificador  VARCHAR(20) NOT NULL DEFAULT 'caravana'
                        CHECK (tipo_identificador IN ('caravana','interno','rfid')),
    nombre              VARCHAR(100),
    raza                VARCHAR(100),
    sexo                VARCHAR(10) NOT NULL CHECK (sexo IN ('macho','hembra')),
    categoria_codigo    VARCHAR(30),
    fecha_nacimiento    DATE,
    origen              VARCHAR(20) CHECK (origen IN ('nacido','comprado','otro')),
    -- Opcional: los animales se cargan antes que los corrales (HU-28).
    -- Solo lo cambia un movimiento (HU-39), nunca un UPDATE suelto.
    corral_id           UUID,
    -- Siempre en kilos (HU-26).
    peso_kg             NUMERIC(10,2) CHECK (peso_kg > 0),
    estado              VARCHAR(20) NOT NULL DEFAULT 'activo'
                        CHECK (estado IN ('activo','vendido','muerto','archivado')),

    creado_en       TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    modificado_en   TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    creado_por      UUID,
    modificado_por  UUID,
    eliminado_en    TIMESTAMPTZ,

    CONSTRAINT fk_animales_rancho
        FOREIGN KEY (rancho_id) REFERENCES ranchos(id) ON DELETE CASCADE,
    CONSTRAINT fk_animales_categoria
        FOREIGN KEY (categoria_codigo) REFERENCES categorias_animal(codigo),
    CONSTRAINT fk_animales_corral
        FOREIGN KEY (corral_id) REFERENCES corrales(id)
);

-- Dos animales vigentes del mismo rancho no comparten identificador. En
-- ranchos distintos si (HU-27). El indice lo garantiza aunque lleguen dos
-- altas a la vez.
CREATE UNIQUE INDEX ux_animales_rancho_identificador
    ON animales (rancho_id, identificador)
    WHERE eliminado_en IS NULL;

CREATE INDEX ix_animales_rancho_estado ON animales (rancho_id, estado);
CREATE INDEX ix_animales_corral ON animales (corral_id);

CREATE TRIGGER tg_animales_modificado_en
    BEFORE UPDATE ON animales
    FOR EACH ROW EXECUTE FUNCTION fn_tocar_modificado_en();


-- ----------------------------------------------------------------------------
--  cambios_estado_animal (HU-33: "registra la fecha y el motivo")
-- ----------------------------------------------------------------------------
CREATE TABLE cambios_estado_animal (
    id                  UUID PRIMARY KEY,
    rancho_id           UUID NOT NULL,
    animal_id           UUID NOT NULL,
    estado_anterior     VARCHAR(20) NOT NULL,
    estado_nuevo        VARCHAR(20) NOT NULL
                        CHECK (estado_nuevo IN ('activo','vendido','muerto','archivado')),
    fecha               DATE NOT NULL,
    motivo              VARCHAR(500) NOT NULL CHECK (BTRIM(motivo) <> ''),

    creado_en       TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    modificado_en   TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    creado_por      UUID,
    modificado_por  UUID,
    eliminado_en    TIMESTAMPTZ,

    CONSTRAINT fk_cambios_estado_rancho
        FOREIGN KEY (rancho_id) REFERENCES ranchos(id) ON DELETE CASCADE,
    CONSTRAINT fk_cambios_estado_animal
        FOREIGN KEY (animal_id) REFERENCES animales(id) ON DELETE CASCADE
);

CREATE INDEX ix_cambios_estado_animal ON cambios_estado_animal (animal_id, creado_en);

CREATE TRIGGER tg_cambios_estado_animal_modificado_en
    BEFORE UPDATE ON cambios_estado_animal
    FOR EACH ROW EXECUTE FUNCTION fn_tocar_modificado_en();


-- ----------------------------------------------------------------------------
--  movimientos_corral (HU-39)
--  Origen nulo: el animal entra a su primer corral. Destino nulo: sale de
--  todos. Quien lo registro es creado_por.
-- ----------------------------------------------------------------------------
CREATE TABLE movimientos_corral (
    id                  UUID PRIMARY KEY,
    rancho_id           UUID NOT NULL,
    animal_id           UUID NOT NULL,
    corral_origen_id    UUID,
    corral_destino_id   UUID,
    fecha               TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    creado_en       TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    modificado_en   TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    creado_por      UUID NOT NULL,
    modificado_por  UUID,
    eliminado_en    TIMESTAMPTZ,

    CONSTRAINT fk_movimientos_rancho
        FOREIGN KEY (rancho_id) REFERENCES ranchos(id) ON DELETE CASCADE,
    CONSTRAINT fk_movimientos_animal
        FOREIGN KEY (animal_id) REFERENCES animales(id) ON DELETE CASCADE,
    CONSTRAINT fk_movimientos_origen
        FOREIGN KEY (corral_origen_id) REFERENCES corrales(id),
    CONSTRAINT fk_movimientos_destino
        FOREIGN KEY (corral_destino_id) REFERENCES corrales(id),
    CONSTRAINT ck_movimientos_cambia_algo CHECK (
        corral_origen_id IS DISTINCT FROM corral_destino_id
    )
);

CREATE INDEX ix_movimientos_animal ON movimientos_corral (animal_id, fecha);

CREATE TRIGGER tg_movimientos_corral_modificado_en
    BEFORE UPDATE ON movimientos_corral
    FOR EACH ROW EXECUTE FUNCTION fn_tocar_modificado_en();

COMMIT;
