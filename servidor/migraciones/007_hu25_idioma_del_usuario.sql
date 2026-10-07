-- ============================================================================
--  SISTEMA DE GESTION DE GANADO
--  Migracion 007 - Idioma elegido por cada persona (HU-25)
--  Responsable: Aaron
-- ============================================================================
--
--  Criterio 2 de HU-25: "El idioma se toma del pais elegido y se puede
--  cambiar."
--
--  idioma nulo   la persona no eligio: se usa el de su pais (paises.idioma)
--                y, si no tiene pais propio (socios y colaboradores), el del
--                pais de su rancho.
--  idioma 'en'   lo eligio en Mi perfil y gana sobre el del pais.
--
--  No lleva llave hacia una tabla de idiomas a proposito: los idiomas son los
--  archivos de la carpeta idiomas/ (criterio 3), y el servidor valida el
--  codigo contra esos archivos. Sumar un idioma no toca la base.
--
--  paises.idioma tenia 'es-BO' como valor por defecto (migracion 003); los
--  paises del catalogo ya traen 'es' o 'en'. Se normaliza a dos letras.
-- ============================================================================

BEGIN;

ALTER TABLE usuarios ADD COLUMN idioma VARCHAR(10);

UPDATE paises SET idioma = LOWER(SPLIT_PART(idioma, '-', 1)) WHERE idioma LIKE '%-%';
ALTER TABLE paises ALTER COLUMN idioma SET DEFAULT 'es';

COMMIT;
