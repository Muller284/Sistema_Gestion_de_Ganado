-- ============================================================================
--  SISTEMA DE GESTION DE GANADO
--  Migracion 003 - Campos de configuracion regional por pais (HU-14)
--  Responsable: Brian Aranibar
-- ============================================================================

BEGIN;

-- Agregamos las columnas que pide la HU-14 a la tabla paises que ya existe
ALTER TABLE paises
    ADD COLUMN IF NOT EXISTS idioma VARCHAR(10) DEFAULT 'es-BO',
    ADD COLUMN IF NOT EXISTS moneda VARCHAR(10) DEFAULT 'BOB',
    ADD COLUMN IF NOT EXISTS unidad_peso VARCHAR(10) DEFAULT 'kg',
    ADD COLUMN IF NOT EXISTS unidad_superficie VARCHAR(20) DEFAULT 'hectárea',
    ADD COLUMN IF NOT EXISTS formato_fecha VARCHAR(20) DEFAULT 'DD/MM/YYYY',
    ADD COLUMN IF NOT EXISTS zona_horaria VARCHAR(50) DEFAULT 'America/La_Paz',
    ADD COLUMN IF NOT EXISTS franja_precio VARCHAR(20) DEFAULT 'Baja';

-- Documentamos el proposito
COMMENT ON COLUMN paises.moneda IS 'Define la moneda del pais segun HU-14';
COMMENT ON COLUMN paises.idioma IS 'Define el idioma del pais segun HU-14';

-- Registramos que esta migracion ya se ejecuto para que no se repita
INSERT INTO migraciones_aplicadas (nombre)
VALUES ('003_hu14_campos_pais.sql')
ON CONFLICT (nombre) DO NOTHING;

COMMIT;