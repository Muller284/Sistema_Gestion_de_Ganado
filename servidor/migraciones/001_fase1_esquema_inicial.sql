-- ============================================================================
--  SISTEMA DE GESTION DE GANADO
--  Migracion 001 - Esquema inicial de la Fase 1
--
--  Contiene las ocho entidades propias de la Fase 1 segun el modelo de datos
--  aprobado (modelo_datos.png) y el documento de Division en fases, mas tres
--  tablas de apoyo que las historias HU-07, HU-09, HU-11 y HU-12 necesitan
--  para poder construirse en el Sprint 1.
--
--  Convenciones aplicadas (Guia de arranque tecnico, punto 6):
--    - Tablas en minuscula y plural, columnas en minuscula y singular.
--    - id de tipo uuid, generado en el cliente, nunca autoincremental.
--    - Toda tabla lleva creado_en, modificado_en, creado_por, modificado_por
--      y eliminado_en.
--    - Toda baja es logica: se llena eliminado_en, nunca se ejecuta DELETE.
--
--  Esta migracion no se edita una vez integrada en main. Cualquier correccion
--  posterior entra como 002_*.sql.
-- ============================================================================

BEGIN; 

-- ----------------------------------------------------------------------------
--  Funcion de apoyo: mantiene modificado_en al dia en cada UPDATE.
--  Ver DECISIONES.md, decision 5.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_tocar_modificado_en()
RETURNS TRIGGER AS $$
BEGIN
    NEW.modificado_en = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;


-- ============================================================================
--  1. franjas_precio
--     Franja de precio a la que pertenece cada pais.
-- ============================================================================
CREATE TABLE franjas_precio (
    codigo          VARCHAR(10) PRIMARY KEY,
    nombre          VARCHAR(100) NOT NULL,
    multiplicador   NUMERIC(5,2) NOT NULL CHECK (multiplicador > 0),

    creado_en       TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    modificado_en   TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    creado_por      UUID,
    modificado_por  UUID,
    eliminado_en    TIMESTAMPTZ
);

COMMENT ON TABLE franjas_precio IS
    'Franjas de precio regionales. El codigo es la clave natural (DECISIONES.md, decision 2).';


-- ============================================================================
--  2. paises
--     Configuracion regional: idioma, moneda, unidades, formato y zona horaria.
-- ============================================================================
CREATE TABLE paises (
    codigo                  VARCHAR(10) PRIMARY KEY,
    nombre                  VARCHAR(100) NOT NULL,
    idioma                  VARCHAR(10)  NOT NULL CHECK (idioma IN ('es','en')),
    moneda                  VARCHAR(10)  NOT NULL,
    unidad_peso             VARCHAR(20)  NOT NULL CHECK (unidad_peso IN ('kg','lb')),
    unidad_superficie       VARCHAR(20)  NOT NULL CHECK (unidad_superficie IN ('ha','acre')),
    formato_fecha           VARCHAR(20)  NOT NULL,
    zona_horaria            VARCHAR(50)  NOT NULL,
    franja_precio_codigo    VARCHAR(10)  NOT NULL,

    creado_en       TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    modificado_en   TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    creado_por      UUID,
    modificado_por  UUID,
    eliminado_en    TIMESTAMPTZ,

    CONSTRAINT fk_paises_franja_precio
        FOREIGN KEY (franja_precio_codigo) REFERENCES franjas_precio(codigo)
);

CREATE INDEX ix_paises_franja_precio ON paises (franja_precio_codigo);


-- ============================================================================
--  3. modulos
--     Modulos funcionales sobre los que se otorgan permisos (HU-19).
-- ============================================================================
CREATE TABLE modulos (
    codigo          VARCHAR(50) PRIMARY KEY,
    nombre          VARCHAR(100) NOT NULL,
    orden           SMALLINT NOT NULL DEFAULT 0,

    creado_en       TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    modificado_en   TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    creado_por      UUID,
    modificado_por  UUID,
    eliminado_en    TIMESTAMPTZ
);


-- ============================================================================
--  4. usuarios
--     Identidad de la persona en la plataforma. Cada usuario pertenece a un
--     unico rancho: rancho_id, rol y tipo_colaborador_id viven aca, no en una
--     tabla intermedia (HU-13 y modelo de datos aprobado).
--
--     rancho_id es NULO a proposito: el propietario se registra (HU-06) antes
--     de crear su rancho (HU-15). Ver DECISIONES.md, decision 3.
-- ============================================================================
CREATE TABLE usuarios (
    id                      UUID PRIMARY KEY,
    nombre                  VARCHAR(150) NOT NULL,
    correo                  VARCHAR(150) NOT NULL,
    contrasena_hash         VARCHAR(255) NOT NULL,
    correo_verificado       BOOLEAN NOT NULL DEFAULT FALSE,
    debe_cambiar_contrasena BOOLEAN NOT NULL DEFAULT TRUE,
    estado                  VARCHAR(20) NOT NULL DEFAULT 'activo'
                            CHECK (estado IN ('activo','suspendido')),

    rancho_id               UUID,
    rol                     VARCHAR(20) NOT NULL
                            CHECK (rol IN ('admin_plataforma','propietario','socio','colaborador')),
    tipo_colaborador_id     UUID,

    -- Bloqueo por intentos fallidos (HU-11)
    intentos_fallidos       SMALLINT NOT NULL DEFAULT 0,
    bloqueado_hasta         TIMESTAMPTZ,

    creado_en       TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    modificado_en   TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    creado_por      UUID,
    modificado_por  UUID,
    eliminado_en    TIMESTAMPTZ,

    -- Un colaborador siempre tiene tipo; los demas roles nunca lo tienen.
    CONSTRAINT ck_usuarios_tipo_solo_colaborador CHECK (
        (rol = 'colaborador' AND tipo_colaborador_id IS NOT NULL)
        OR (rol <> 'colaborador' AND tipo_colaborador_id IS NULL)
    ),
    -- El admin de plataforma no pertenece a ningun rancho.
    CONSTRAINT ck_usuarios_admin_sin_rancho CHECK (
        rol <> 'admin_plataforma' OR rancho_id IS NULL
    )
);

-- El correo es unico en toda la plataforma (HU-13), sin distinguir mayusculas.
-- Solo entre los usuarios vigentes: un correo dado de baja se puede reutilizar.
CREATE UNIQUE INDEX ux_usuarios_correo
    ON usuarios (LOWER(correo))
    WHERE eliminado_en IS NULL;

CREATE INDEX ix_usuarios_rancho ON usuarios (rancho_id) WHERE eliminado_en IS NULL;
CREATE INDEX ix_usuarios_tipo_colaborador ON usuarios (tipo_colaborador_id);


-- ============================================================================
--  5. ranchos
--     Unidad principal del sistema y raiz del aislamiento de datos (HU-03).
-- ============================================================================
CREATE TABLE ranchos (
    id                  UUID PRIMARY KEY,
    nombre              VARCHAR(150) NOT NULL,
    departamento        VARCHAR(100) NOT NULL,
    localidad           VARCHAR(100) NOT NULL,
    latitud             NUMERIC(10,8),
    longitud            NUMERIC(11,8),
    superficie          NUMERIC(12,2) NOT NULL CHECK (superficie > 0),
    tipo_produccion     VARCHAR(20) NOT NULL
                        CHECK (tipo_produccion IN ('carne','leche','mixto')),
    pais_codigo         VARCHAR(10) NOT NULL,
    propietario_id      UUID NOT NULL,

    creado_en       TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    modificado_en   TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    creado_por      UUID,
    modificado_por  UUID,
    eliminado_en    TIMESTAMPTZ,

    CONSTRAINT fk_ranchos_pais
        FOREIGN KEY (pais_codigo) REFERENCES paises(codigo),
    CONSTRAINT fk_ranchos_propietario
        FOREIGN KEY (propietario_id) REFERENCES usuarios(id),
    -- La latitud y la longitud son opcionales, pero van juntas o no van.
    CONSTRAINT ck_ranchos_ubicacion_completa CHECK (
        (latitud IS NULL AND longitud IS NULL)
        OR (latitud IS NOT NULL AND longitud IS NOT NULL)
    )
);

-- Una cuenta maneja un solo rancho (HU-15): nadie es propietario de dos.
CREATE UNIQUE INDEX ux_ranchos_propietario
    ON ranchos (propietario_id)
    WHERE eliminado_en IS NULL;

CREATE INDEX ix_ranchos_pais ON ranchos (pais_codigo);

-- La llave de usuarios hacia ranchos se agrega ahora, porque las dos tablas
-- se referencian entre si y una tiene que crearse primero.
ALTER TABLE usuarios
    ADD CONSTRAINT fk_usuarios_rancho
    FOREIGN KEY (rancho_id) REFERENCES ranchos(id);


-- ============================================================================
--  6. tipos_colaborador
--     Tipos predefinidos del sistema (rancho_id nulo) y tipos propios de cada
--     rancho (HU-20).
-- ============================================================================
CREATE TABLE tipos_colaborador (
    id              UUID PRIMARY KEY,
    rancho_id       UUID,
    nombre          VARCHAR(100) NOT NULL,
    es_predefinido  BOOLEAN NOT NULL DEFAULT FALSE,

    creado_en       TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    modificado_en   TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    creado_por      UUID,
    modificado_por  UUID,
    eliminado_en    TIMESTAMPTZ,

    CONSTRAINT fk_tipos_colaborador_rancho
        FOREIGN KEY (rancho_id) REFERENCES ranchos(id),
    -- Un tipo predefinido es global; uno propio pertenece a un rancho.
    CONSTRAINT ck_tipos_colaborador_ambito CHECK (
        (es_predefinido = TRUE AND rancho_id IS NULL)
        OR (es_predefinido = FALSE AND rancho_id IS NOT NULL)
    )
);

CREATE INDEX ix_tipos_colaborador_rancho
    ON tipos_colaborador (rancho_id) WHERE eliminado_en IS NULL;

-- El nombre del tipo es unico dentro del rancho.
CREATE UNIQUE INDEX ux_tipos_colaborador_nombre_rancho
    ON tipos_colaborador (rancho_id, LOWER(nombre))
    WHERE eliminado_en IS NULL AND rancho_id IS NOT NULL;

CREATE UNIQUE INDEX ux_tipos_colaborador_nombre_global
    ON tipos_colaborador (LOWER(nombre))
    WHERE eliminado_en IS NULL AND rancho_id IS NULL;

ALTER TABLE usuarios
    ADD CONSTRAINT fk_usuarios_tipo_colaborador
    FOREIGN KEY (tipo_colaborador_id) REFERENCES tipos_colaborador(id);


-- ============================================================================
--  7. permisos_tipo
--     Que puede ver y editar, por modulo, cada tipo de colaborador (HU-19).
-- ============================================================================
CREATE TABLE permisos_tipo (
    id                  UUID PRIMARY KEY,
    tipo_colaborador_id UUID NOT NULL,
    modulo_codigo       VARCHAR(50) NOT NULL,
    puede_ver           BOOLEAN NOT NULL DEFAULT FALSE,
    puede_editar        BOOLEAN NOT NULL DEFAULT FALSE,

    creado_en       TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    modificado_en   TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    creado_por      UUID,
    modificado_por  UUID,
    eliminado_en    TIMESTAMPTZ,

    CONSTRAINT fk_permisos_tipo_tipo_colaborador
        FOREIGN KEY (tipo_colaborador_id) REFERENCES tipos_colaborador(id),
    CONSTRAINT fk_permisos_tipo_modulo
        FOREIGN KEY (modulo_codigo) REFERENCES modulos(codigo),
    -- No se puede editar lo que no se puede ver.
    CONSTRAINT ck_permisos_tipo_editar_implica_ver CHECK (
        puede_editar = FALSE OR puede_ver = TRUE
    )
);

CREATE UNIQUE INDEX ux_permisos_tipo
    ON permisos_tipo (tipo_colaborador_id, modulo_codigo)
    WHERE eliminado_en IS NULL;


-- ============================================================================
--  8. permisos_usuario
--     Permisos por modulo otorgados a una persona en particular, por encima de
--     los que le da su tipo (HU-19).
-- ============================================================================
CREATE TABLE permisos_usuario (
    id              UUID PRIMARY KEY,
    usuario_id      UUID NOT NULL,
    modulo_codigo   VARCHAR(50) NOT NULL,
    puede_ver       BOOLEAN NOT NULL DEFAULT FALSE,
    puede_editar    BOOLEAN NOT NULL DEFAULT FALSE,

    creado_en       TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    modificado_en   TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    creado_por      UUID,
    modificado_por  UUID,
    eliminado_en    TIMESTAMPTZ,

    CONSTRAINT fk_permisos_usuario_usuario
        FOREIGN KEY (usuario_id) REFERENCES usuarios(id),
    CONSTRAINT fk_permisos_usuario_modulo
        FOREIGN KEY (modulo_codigo) REFERENCES modulos(codigo),
    CONSTRAINT ck_permisos_usuario_editar_implica_ver CHECK (
        puede_editar = FALSE OR puede_ver = TRUE
    )
);

CREATE UNIQUE INDEX ux_permisos_usuario
    ON permisos_usuario (usuario_id, modulo_codigo)
    WHERE eliminado_en IS NULL;


-- ============================================================================
--  TABLAS DE APOYO
--  No son entidades del modelo de negocio, pero sin ellas no se pueden
--  construir cuatro historias comprometidas en el Sprint 1.
--  Ver DECISIONES.md, decision 4.
-- ============================================================================

-- ---------------------------------------------------------------------------
--  tokens - verificacion de correo (HU-07) y recuperacion de contrasena (HU-09)
--  Se guarda el hash del token, nunca el token en claro.
-- ---------------------------------------------------------------------------
CREATE TABLE tokens (
    id              UUID PRIMARY KEY,
    usuario_id      UUID NOT NULL,
    tipo            VARCHAR(30) NOT NULL
                    CHECK (tipo IN ('verificacion_correo','recuperacion_contrasena')),
    token_hash      VARCHAR(255) NOT NULL,
    expira_en       TIMESTAMPTZ NOT NULL,
    usado_en        TIMESTAMPTZ,

    creado_en       TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    modificado_en   TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    creado_por      UUID,
    modificado_por  UUID,
    eliminado_en    TIMESTAMPTZ,

    CONSTRAINT fk_tokens_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
);

CREATE UNIQUE INDEX ux_tokens_hash ON tokens (token_hash);
CREATE INDEX ix_tokens_usuario_tipo ON tokens (usuario_id, tipo) WHERE usado_en IS NULL;


-- ---------------------------------------------------------------------------
--  sesiones - token de refresco revocable (HU-12)
-- ---------------------------------------------------------------------------
CREATE TABLE sesiones (
    id                      UUID PRIMARY KEY,
    usuario_id              UUID NOT NULL,
    token_refresco_hash     VARCHAR(255) NOT NULL,
    expira_en               TIMESTAMPTZ NOT NULL,
    revocada_en             TIMESTAMPTZ,
    ultimo_uso_en           TIMESTAMPTZ,
    agente_usuario          VARCHAR(255),

    creado_en       TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    modificado_en   TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    creado_por      UUID,
    modificado_por  UUID,
    eliminado_en    TIMESTAMPTZ,

    CONSTRAINT fk_sesiones_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
);

CREATE UNIQUE INDEX ux_sesiones_token ON sesiones (token_refresco_hash);
CREATE INDEX ix_sesiones_usuario ON sesiones (usuario_id) WHERE revocada_en IS NULL;


-- ---------------------------------------------------------------------------
--  migraciones_aplicadas - registro de que migraciones ya corrieron
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS migraciones_aplicadas (
    nombre      VARCHAR(200) PRIMARY KEY,
    aplicada_en TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);


-- ============================================================================
--  DISPARADORES DE modificado_en
-- ============================================================================
DO $$
DECLARE
    t TEXT;
BEGIN
    FOREACH t IN ARRAY ARRAY[
        'franjas_precio','paises','modulos','usuarios','ranchos',
        'tipos_colaborador','permisos_tipo','permisos_usuario',
        'tokens','sesiones'
    ] LOOP
        EXECUTE format(
            'CREATE TRIGGER tg_%1$s_modificado_en
             BEFORE UPDATE ON %1$s
             FOR EACH ROW EXECUTE FUNCTION fn_tocar_modificado_en()', t);
    END LOOP;
END $$;


-- ============================================================================
--  DATOS DE CATALOGO
--  No son datos de prueba (eso es HU-04): sin estas filas no se puede abrir
--  el formulario de registro ni el de creacion de rancho.
-- ============================================================================

INSERT INTO franjas_precio (codigo, nombre, multiplicador) VALUES
    ('A', 'Franja A - Norteamerica, Europa occidental y Oceania', 1.00),
    ('B', 'Franja B - Cono Sur, Brasil, Mexico y Colombia',        0.60),
    ('C', 'Franja C - Bolivia, Paraguay, Peru y Centroamerica',    0.40);

INSERT INTO paises
    (codigo, nombre, idioma, moneda, unidad_peso, unidad_superficie, formato_fecha, zona_horaria, franja_precio_codigo)
VALUES
    ('BO', 'Bolivia',        'es', 'BOB', 'kg', 'ha',   'DD/MM/YYYY', 'America/La_Paz',        'C'),
    ('PY', 'Paraguay',       'es', 'PYG', 'kg', 'ha',   'DD/MM/YYYY', 'America/Asuncion',      'C'),
    ('PE', 'Peru',           'es', 'PEN', 'kg', 'ha',   'DD/MM/YYYY', 'America/Lima',          'C'),

    ('CO', 'Colombia',       'es', 'COP', 'kg', 'ha',   'DD/MM/YYYY', 'America/Bogota',        'B'),
    ('AR', 'Argentina',      'es', 'ARS', 'kg', 'ha',   'DD/MM/YYYY', 'America/Argentina/Buenos_Aires', 'B'),
    ('BR', 'Brasil',         'es', 'BRL', 'kg', 'ha',   'DD/MM/YYYY', 'America/Sao_Paulo',     'B'),
    ('MX', 'Mexico',         'es', 'MXN', 'kg', 'ha',   'DD/MM/YYYY', 'America/Mexico_City',   'B'),
    ('UY', 'Uruguay',        'es', 'UYU', 'kg', 'ha',   'DD/MM/YYYY', 'America/Montevideo',    'B'),
    ('CL', 'Chile',          'es', 'CLP', 'kg', 'ha',   'DD/MM/YYYY', 'America/Santiago',      'B'),
    ('US', 'Estados Unidos', 'en', 'USD', 'lb', 'acre', 'MM/DD/YYYY', 'America/Chicago',       'A');

INSERT INTO modulos (codigo, nombre, orden) VALUES
    ('animales',   'Animales',   1),
    ('corrales',   'Corrales',   2),
    ('sanidad',    'Sanidad',    3),
    ('pesajes',    'Pesajes',    4),
    ('importacion','Importacion',5),
    ('almacen',    'Almacen',    6),
    ('equipo',     'Equipo',     7),
    ('planes',     'Planes',     8);

-- Los cuatro tipos de colaborador predefinidos (HU-20). Los identificadores
-- son fijos a proposito, para que las semillas y las pruebas puedan
-- referenciarlos sin consultarlos primero.
INSERT INTO tipos_colaborador (id, rancho_id, nombre, es_predefinido) VALUES
    ('11111111-1111-4111-8111-000000000001', NULL, 'Veterinario',           TRUE),
    ('11111111-1111-4111-8111-000000000002', NULL, 'Encargado de campo',    TRUE),
    ('11111111-1111-4111-8111-000000000003', NULL, 'Encargado de almacen',  TRUE),
    ('11111111-1111-4111-8111-000000000004', NULL, 'Administrativo',        TRUE);

-- Permisos por defecto de cada tipo predefinido.
-- El propietario los puede cambiar despues; esto es solo el punto de partida.
INSERT INTO permisos_tipo (id, tipo_colaborador_id, modulo_codigo, puede_ver, puede_editar) VALUES
    -- Veterinario: sanidad y pesajes, mas los animales para ubicarlos.
    ('22222222-2222-4222-8222-000000000001','11111111-1111-4111-8111-000000000001','animales', TRUE,  FALSE),
    ('22222222-2222-4222-8222-000000000002','11111111-1111-4111-8111-000000000001','sanidad',  TRUE,  TRUE),
    ('22222222-2222-4222-8222-000000000003','11111111-1111-4111-8111-000000000001','pesajes',  TRUE,  TRUE),
    -- Encargado de campo: animales y corrales.
    ('22222222-2222-4222-8222-000000000004','11111111-1111-4111-8111-000000000002','animales', TRUE,  TRUE),
    ('22222222-2222-4222-8222-000000000005','11111111-1111-4111-8111-000000000002','corrales', TRUE,  TRUE),
    ('22222222-2222-4222-8222-000000000006','11111111-1111-4111-8111-000000000002','pesajes',  TRUE,  TRUE),
    -- Encargado de almacen: solo almacen.
    ('22222222-2222-4222-8222-000000000007','11111111-1111-4111-8111-000000000003','almacen',  TRUE,  TRUE),
    -- Administrativo: mira casi todo, edita importacion y equipo.
    ('22222222-2222-4222-8222-000000000008','11111111-1111-4111-8111-000000000004','animales',    TRUE, FALSE),
    ('22222222-2222-4222-8222-000000000009','11111111-1111-4111-8111-000000000004','corrales',    TRUE, FALSE),
    ('22222222-2222-4222-8222-000000000010','11111111-1111-4111-8111-000000000004','importacion', TRUE, TRUE),
    ('22222222-2222-4222-8222-000000000011','11111111-1111-4111-8111-000000000004','equipo',      TRUE, FALSE);

INSERT INTO migraciones_aplicadas (nombre) VALUES ('001_fase1_esquema_inicial.sql');

COMMIT;
