-- ============================================================================
--  SISTEMA DE GESTION DE GANADO
--  Semillas 001 - Juego de datos de prueba para la Fase 1 (HU-04)
--  Responsable: Romina (Control de Calidad)
--
--  Cumple con los criterios de aceptacion de HU-04 y soporte a HU-03:
--    1. Carga al menos dos ranchos distintos para verificar el aislamiento.
--    2. Incluye usuarios de los cuatro roles ('admin_plataforma', 'propietario',
--       'socio', 'colaborador').
--    3. Incluye los cuatro tipos de colaborador predefinidos (Veterinario,
--       Encargado de campo, Encargado de almacen, Administrativo).
--    4. Datos verosimiles de la region (Warnes en Santa Cruz y Quillacollo en
--       Cochabamba; nombres de personas reales; sin datos ficticios tipo 'test').
--    5. Respeta el orden de insercion estricto por dependencias circulares:
--       Propietario (rancho nulo) -> Rancho -> Update Propietario -> Socios/Colaboradores.
-- ============================================================================

BEGIN;

-- ----------------------------------------------------------------------------
--  LIMPIEZA PREVIA (permite re-ejecutar las semillas cuantas veces sea necesario)
-- ----------------------------------------------------------------------------
DELETE FROM sesiones WHERE usuario_id IN (
    'a1000000-0000-4000-8000-000000000001', 'a1000000-0000-4000-8000-000000000002',
    'a1000000-0000-4000-8000-000000000003', 'a1000000-0000-4000-8000-000000000004',
    'a1000000-0000-4000-8000-000000000005', 'a1000000-0000-4000-8000-000000000006',
    'b1000000-0000-4000-8000-000000000001', 'b1000000-0000-4000-8000-000000000002',
    'b1000000-0000-4000-8000-000000000003', 'b1000000-0000-4000-8000-000000000004',
    'f0000000-0000-4000-8000-000000000001'
);

DELETE FROM tokens WHERE usuario_id IN (
    'a1000000-0000-4000-8000-000000000001', 'a1000000-0000-4000-8000-000000000002',
    'a1000000-0000-4000-8000-000000000003', 'a1000000-0000-4000-8000-000000000004',
    'a1000000-0000-4000-8000-000000000005', 'a1000000-0000-4000-8000-000000000006',
    'b1000000-0000-4000-8000-000000000001', 'b1000000-0000-4000-8000-000000000002',
    'b1000000-0000-4000-8000-000000000003', 'b1000000-0000-4000-8000-000000000004',
    'f0000000-0000-4000-8000-000000000001'
);

-- Romper temporalmente la FK circular para limpiar en re-ejecuciones
UPDATE usuarios SET rancho_id = NULL WHERE rancho_id IN (
    'a0000000-0000-4000-8000-000000000001',
    'b0000000-0000-4000-8000-000000000002'
);

DELETE FROM usuarios WHERE id IN (
    'a1000000-0000-4000-8000-000000000002', 'a1000000-0000-4000-8000-000000000003',
    'a1000000-0000-4000-8000-000000000004', 'a1000000-0000-4000-8000-000000000005',
    'a1000000-0000-4000-8000-000000000006',
    'b1000000-0000-4000-8000-000000000002', 'b1000000-0000-4000-8000-000000000003',
    'b1000000-0000-4000-8000-000000000004'
);

DELETE FROM ranchos WHERE id IN (
    'a0000000-0000-4000-8000-000000000001',
    'b0000000-0000-4000-8000-000000000002'
);

DELETE FROM usuarios WHERE id IN (
    'a1000000-0000-4000-8000-000000000001',
    'b1000000-0000-4000-8000-000000000001',
    'f0000000-0000-4000-8000-000000000001'
);


-- ============================================================================
--  1. RANCHO A: 'Rancho El Cerrito' (Warnes, Santa Cruz) - Carne
-- ============================================================================

-- Paso 1.1: Insertar el usuario Propietario con rancho_id en NULL (orden HU-06 -> HU-15)
INSERT INTO usuarios (
    id, nombre, correo, contrasena_hash, correo_verificado, debe_cambiar_contrasena,
    estado, rancho_id, rol, tipo_colaborador_id, creado_por, modificado_por
) VALUES (
    'a1000000-0000-4000-8000-000000000001',
    'Carlos Gutierrez Mendoza',
    'carlos.gutierrez@elcerrito.bo',
    '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy',
    TRUE,
    FALSE,
    'activo',
    NULL,
    'propietario',
    NULL,
    'a1000000-0000-4000-8000-000000000001',
    'a1000000-0000-4000-8000-000000000001'
);

-- Paso 1.2: Insertar el Rancho El Cerrito apuntando al propietario existente
INSERT INTO ranchos (
    id, nombre, departamento, localidad, latitud, longitud, superficie,
    tipo_produccion, pais_codigo, propietario_id, creado_por, modificado_por
) VALUES (
    'a0000000-0000-4000-8000-000000000001',
    'Rancho El Cerrito',
    'Santa Cruz',
    'Warnes',
    -17.51470000,
    -63.16610000,
    850.50,
    'carne',
    'BO',
    'a1000000-0000-4000-8000-000000000001',
    'a1000000-0000-4000-8000-000000000001',
    'a1000000-0000-4000-8000-000000000001'
);

-- Paso 1.3: Asignar el rancho_id al propietario
UPDATE usuarios
SET rancho_id = 'a0000000-0000-4000-8000-000000000001'
WHERE id = 'a1000000-0000-4000-8000-000000000001';

-- Paso 1.4: Insertar Socios y Colaboradores para Rancho El Cerrito
INSERT INTO usuarios (
    id, nombre, correo, contrasena_hash, correo_verificado, debe_cambiar_contrasena,
    estado, rancho_id, rol, tipo_colaborador_id, creado_por, modificado_por
) VALUES
    -- Socio
    ('a1000000-0000-4000-8000-000000000002', 'Maria Rene Aguilera Paz', 'mrene.aguilera@elcerrito.bo',
     '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', TRUE, FALSE, 'activo',
     'a0000000-0000-4000-8000-000000000001', 'socio', NULL,
     'a1000000-0000-4000-8000-000000000001', 'a1000000-0000-4000-8000-000000000001'),

    -- Colaborador 1: Veterinario
    ('a1000000-0000-4000-8000-000000000003', 'Dr. Jorge Soliz Prado', 'jorge.soliz@elcerrito.bo',
     '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', TRUE, FALSE, 'activo',
     'a0000000-0000-4000-8000-000000000001', 'colaborador', '11111111-1111-4111-8111-000000000001',
     'a1000000-0000-4000-8000-000000000001', 'a1000000-0000-4000-8000-000000000001'),

    -- Colaborador 2: Encargado de campo
    ('a1000000-0000-4000-8000-000000000004', 'Roberto Justiniano Saucedo', 'roberto.justiniano@elcerrito.bo',
     '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', TRUE, FALSE, 'activo',
     'a0000000-0000-4000-8000-000000000001', 'colaborador', '11111111-1111-4111-8111-000000000002',
     'a1000000-0000-4000-8000-000000000001', 'a1000000-0000-4000-8000-000000000001'),

    -- Colaborador 3: Encargado de almacen
    ('a1000000-0000-4000-8000-000000000005', 'Gonzalo Chavez Roca', 'gonzalo.chavez@elcerrito.bo',
     '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', TRUE, FALSE, 'activo',
     'a0000000-0000-4000-8000-000000000001', 'colaborador', '11111111-1111-4111-8111-000000000003',
     'a1000000-0000-4000-8000-000000000001', 'a1000000-0000-4000-8000-000000000001'),

    -- Colaborador 4: Administrativo
    ('a1000000-0000-4000-8000-000000000006', 'Valeria Mercado Vaca', 'valeria.mercado@elcerrito.bo',
     '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', TRUE, FALSE, 'activo',
     'a0000000-0000-4000-8000-000000000001', 'colaborador', '11111111-1111-4111-8111-000000000004',
     'a1000000-0000-4000-8000-000000000001', 'a1000000-0000-4000-8000-000000000001');


-- ============================================================================
--  2. RANCHO B: 'Hacienda La Floresta' (Quillacollo, Cochabamba) - Leche
-- ============================================================================

-- Paso 2.1: Propietario con rancho_id NULL
INSERT INTO usuarios (
    id, nombre, correo, contrasena_hash, correo_verificado, debe_cambiar_contrasena,
    estado, rancho_id, rol, tipo_colaborador_id, creado_por, modificado_por
) VALUES (
    'b1000000-0000-4000-8000-000000000001',
    'Fernando Torrico Camacho',
    'fernando.torrico@lafloresta.bo',
    '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy',
    TRUE,
    FALSE,
    'activo',
    NULL,
    'propietario',
    NULL,
    'b1000000-0000-4000-8000-000000000001',
    'b1000000-0000-4000-8000-000000000001'
);

-- Paso 2.2: Insertar Rancho La Floresta
INSERT INTO ranchos (
    id, nombre, departamento, localidad, latitud, longitud, superficie,
    tipo_produccion, pais_codigo, propietario_id, creado_por, modificado_por
) VALUES (
    'b0000000-0000-4000-8000-000000000002',
    'Hacienda La Floresta',
    'Cochabamba',
    'Quillacollo',
    -17.39350000,
    -66.27980000,
    320.00,
    'leche',
    'BO',
    'b1000000-0000-4000-8000-000000000001',
    'b1000000-0000-4000-8000-000000000001',
    'b1000000-0000-4000-8000-000000000001'
);

-- Paso 2.3: Asignar rancho_id al propietario de La Floresta
UPDATE usuarios
SET rancho_id = 'b0000000-0000-4000-8000-000000000002'
WHERE id = 'b1000000-0000-4000-8000-000000000001';

-- Paso 2.4: Insertar Socios y Colaboradores para Hacienda La Floresta
INSERT INTO usuarios (
    id, nombre, correo, contrasena_hash, correo_verificado, debe_cambiar_contrasena,
    estado, rancho_id, rol, tipo_colaborador_id, creado_por, modificado_por
) VALUES
    -- Socio
    ('b1000000-0000-4000-8000-000000000002', 'Patricia Villarroel Rios', 'patricia.villarroel@lafloresta.bo',
     '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', TRUE, FALSE, 'activo',
     'b0000000-0000-4000-8000-000000000002', 'socio', NULL,
     'b1000000-0000-4000-8000-000000000001', 'b1000000-0000-4000-8000-000000000001'),

    -- Colaborador 1: Veterinario
    ('b1000000-0000-4000-8000-000000000003', 'Dra. Lucia Morales Arteaga', 'lucia.morales@lafloresta.bo',
     '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', TRUE, FALSE, 'activo',
     'b0000000-0000-4000-8000-000000000002', 'colaborador', '11111111-1111-4111-8111-000000000001',
     'b1000000-0000-4000-8000-000000000001', 'b1000000-0000-4000-8000-000000000001'),

    -- Colaborador 2: Encargado de campo
    ('b1000000-0000-4000-8000-000000000004', 'Walter Fernandez Claure', 'walter.fernandez@lafloresta.bo',
     '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', TRUE, FALSE, 'activo',
     'b0000000-0000-4000-8000-000000000002', 'colaborador', '11111111-1111-4111-8111-000000000002',
     'b1000000-0000-4000-8000-000000000001', 'b1000000-0000-4000-8000-000000000001');


-- ============================================================================
--  3. USUARIO ADMIN DE PLATAFORMA (HU-24)
--     Sin rancho_id (cumple ck_usuarios_admin_sin_rancho)
-- ============================================================================
INSERT INTO usuarios (
    id, nombre, correo, contrasena_hash, correo_verificado, debe_cambiar_contrasena,
    estado, rancho_id, rol, tipo_colaborador_id, creado_por, modificado_por
) VALUES (
    'f0000000-0000-4000-8000-000000000001',
    'Soporte Central Plataforma Ganado',
    'soporte@plataforma.bo',
    '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy',
    TRUE,
    FALSE,
    'activo',
    NULL,
    'admin_plataforma',
    NULL,
    'f0000000-0000-4000-8000-000000000001',
    'f0000000-0000-4000-8000-000000000001'
);

COMMIT;
