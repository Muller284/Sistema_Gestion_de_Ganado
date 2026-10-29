-- ============================================================================
--  SISTEMA DE GESTION DE GANADO
--  Migracion 009 - Catalogo de razas (HU-28, pedido del docente)
--  Responsable: Romina
-- ============================================================================
--
--  La raza se elige de una lista. Hay dos clases de razas:
--    - las del catalogo mundial: rancho_id nulo, con su grupo (carne, leche o
--      doble proposito). Las ven todos los ranchos.
--    - las propias de un rancho: las que alguien escribio en «Otra» y no
--      estaban. Solo las ve ese rancho (HU-03), sin grupo.
--
--  clave es el nombre sin mayusculas, sin acentos y sin espacios de mas: con
--  ella se reconoce que «nelore», «NELORE» y «Nelóre» son la misma raza, y el
--  indice unico impide que un rancho tenga la misma raza dos veces. La calcula
--  el servidor (comun/razas.ts) con la misma regla.
--
--  animales.raza sigue siendo texto: guarda el nombre de la raza tal como esta
--  en esta tabla. Al final se ordenan los datos que ya existian.
-- ============================================================================

BEGIN;

CREATE TABLE razas (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    rancho_id       UUID,
    nombre          VARCHAR(100) NOT NULL CHECK (BTRIM(nombre) <> ''),
    clave           VARCHAR(100) NOT NULL,
    grupo           VARCHAR(10) CHECK (grupo IN ('carne','leche','doble')),
    orden           SMALLINT NOT NULL DEFAULT 0,

    creado_en       TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    modificado_en   TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    creado_por      UUID,
    modificado_por  UUID,
    eliminado_en    TIMESTAMPTZ,

    CONSTRAINT fk_razas_rancho
        FOREIGN KEY (rancho_id) REFERENCES ranchos(id) ON DELETE CASCADE,
    -- Las del catalogo tienen grupo; las propias de un rancho, no.
    CONSTRAINT ck_razas_grupo CHECK ((rancho_id IS NULL) = (grupo IS NOT NULL))
);

-- Una raza no se repite dentro del catalogo ni dentro de un rancho.
CREATE UNIQUE INDEX ux_razas_rancho_clave
    ON razas (COALESCE(rancho_id, '00000000-0000-0000-0000-000000000000'::uuid), clave)
    WHERE eliminado_en IS NULL;

CREATE INDEX ix_razas_rancho ON razas (rancho_id);

CREATE TRIGGER tg_razas_modificado_en
    BEFORE UPDATE ON razas
    FOR EACH ROW EXECUTE FUNCTION fn_tocar_modificado_en();

-- El catalogo mundial: las razas bovinas mas difundidas, por proposito.
INSERT INTO razas (nombre, clave, grupo, orden) VALUES
    ('Angus', 'angus', 'carne', 1),
    ('Azul Belga', 'azul belga', 'carne', 2),
    ('Beefmaster', 'beefmaster', 'carne', 3),
    ('Bonsmara', 'bonsmara', 'carne', 4),
    ('Braford', 'braford', 'carne', 5),
    ('Brahman', 'brahman', 'carne', 6),
    ('Brangus', 'brangus', 'carne', 7),
    ('Charolais', 'charolais', 'carne', 8),
    ('Chianina', 'chianina', 'carne', 9),
    ('Droughtmaster', 'droughtmaster', 'carne', 10),
    ('Galloway', 'galloway', 'carne', 11),
    ('Hereford', 'hereford', 'carne', 12),
    ('Highland', 'highland', 'carne', 13),
    ('Indubrasil', 'indubrasil', 'carne', 14),
    ('Limousin', 'limousin', 'carne', 15),
    ('Marchigiana', 'marchigiana', 'carne', 16),
    ('Murray Grey', 'murray grey', 'carne', 17),
    ('Nelore', 'nelore', 'carne', 18),
    ('Piamontesa', 'piamontesa', 'carne', 19),
    ('Red Angus', 'red angus', 'carne', 20),
    ('Romosinuano', 'romosinuano', 'carne', 21),
    ('Rubia de Aquitania', 'rubia de aquitania', 'carne', 22),
    ('Santa Gertrudis', 'santa gertrudis', 'carne', 23),
    ('Senepol', 'senepol', 'carne', 24),
    ('Shorthorn', 'shorthorn', 'carne', 25),
    ('Simbrah', 'simbrah', 'carne', 26),
    ('Tabapuã', 'tabapua', 'carne', 27),
    ('Wagyu', 'wagyu', 'carne', 28),
    ('Ayrshire', 'ayrshire', 'leche', 29),
    ('Girolando', 'girolando', 'leche', 30),
    ('Guernsey', 'guernsey', 'leche', 31),
    ('Holstein', 'holstein', 'leche', 32),
    ('Jersey', 'jersey', 'leche', 33),
    ('Montbéliarde', 'montbeliarde', 'leche', 34),
    ('Pardo Suizo', 'pardo suizo', 'leche', 35),
    ('Red Sindhi', 'red sindhi', 'leche', 36),
    ('Sahiwal', 'sahiwal', 'leche', 37),
    ('Criollo', 'criollo', 'doble', 38),
    ('Fleckvieh', 'fleckvieh', 'doble', 39),
    ('Guzerá', 'guzera', 'doble', 40),
    ('Gyr', 'gyr', 'doble', 41),
    ('Mestizo', 'mestizo', 'doble', 42),
    ('Normando', 'normando', 'doble', 43),
    ('Red Poll', 'red poll', 'doble', 44),
    ('Simmental', 'simmental', 'doble', 45);

-- Los animales que ya existian: si su raza es del catalogo, queda escrita
-- igual que en el catalogo; si no, pasa a ser una raza propia de su rancho.
UPDATE animales a
   SET raza = r.nombre
  FROM razas r
 WHERE r.rancho_id IS NULL
   AND a.raza IS NOT NULL
   AND r.clave = REGEXP_REPLACE(LOWER(TRANSLATE(BTRIM(a.raza), 'áàäâãéèëêíìïîóòöôõúùüûñçÁÀÄÂÃÉÈËÊÍÌÏÎÓÒÖÔÕÚÙÜÛÑÇ', 'aaaaaeeeeiiiiooooouuuuncAAAAAEEEEIIIIOOOOOUUUUNC')), '\s+', ' ', 'g')
   AND a.raza <> r.nombre;

INSERT INTO razas (rancho_id, nombre, clave)
SELECT DISTINCT ON (a.rancho_id, c.clave) a.rancho_id, BTRIM(a.raza), c.clave
  FROM animales a
 CROSS JOIN LATERAL (
       SELECT REGEXP_REPLACE(LOWER(TRANSLATE(BTRIM(a.raza), 'áàäâãéèëêíìïîóòöôõúùüûñçÁÀÄÂÃÉÈËÊÍÌÏÎÓÒÖÔÕÚÙÜÛÑÇ', 'aaaaaeeeeiiiiooooouuuuncAAAAAEEEEIIIIOOOOOUUUUNC')), '\s+', ' ', 'g') AS clave
       ) c
 WHERE a.raza IS NOT NULL AND BTRIM(a.raza) <> ''
   AND NOT EXISTS (SELECT 1 FROM razas r WHERE r.rancho_id IS NULL AND r.clave = c.clave);

COMMIT;
