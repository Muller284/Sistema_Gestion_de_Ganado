-- ============================================================================
--  SISTEMA DE GESTION DE GANADO
--  Migracion 002 - El pais vive en la ficha del usuario (HU-06)
--  Responsable: Aaron
-- ============================================================================
--
--  POR QUE HACE FALTA
--  HU-06 pide que el formulario de registro incluya el pais, y HU-14 pide que
--  el pais defina idioma, moneda y unidades. El propietario elige su pais al
--  registrarse, ANTES de tener rancho, asi que el dato no puede vivir solo en
--  ranchos.pais_codigo: en ese momento todavia no hay rancho.
--
--  La columna es anulable a proposito: los usuarios que ya existen no tienen
--  pais, y los socios y colaboradores lo heredan del rancho mientras HU-14 no
--  diga otra cosa.
--
--  NOTA PARA BRIAN. El modelo de datos es tuyo. Esta columna la necesita
--  HU-06 y la va a usar HU-14, que es tuya. Si preferis resolverlo de otra
--  forma, se cambia con una migracion 003; las migraciones no se editan una
--  vez subidas.
-- ============================================================================

BEGIN;

ALTER TABLE usuarios
    ADD COLUMN IF NOT EXISTS pais_codigo CHAR(2);

ALTER TABLE usuarios
    DROP CONSTRAINT IF EXISTS fk_usuarios_pais;

ALTER TABLE usuarios
    ADD CONSTRAINT fk_usuarios_pais
        FOREIGN KEY (pais_codigo) REFERENCES paises(codigo);

COMMENT ON COLUMN usuarios.pais_codigo IS
    'Pais elegido al registrarse (HU-06). Define idioma, moneda y unidades (HU-14).';

INSERT INTO migraciones_aplicadas (nombre)
VALUES ('002_hu06_pais_del_usuario.sql')
ON CONFLICT (nombre) DO NOTHING;

COMMIT;
