BEGIN;

-- 1. Tabla de Corrales (HU-36)
CREATE TABLE IF NOT EXISTS corrales (
    id SERIAL PRIMARY KEY,
    rancho_id INT NOT NULL,
    nombre VARCHAR(100) NOT NULL,
    capacidad INT NOT NULL,
    superficie NUMERIC(10, 2),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Tabla de Animales (Actualizada con tipo_identificador y restricción única)
CREATE TABLE IF NOT EXISTS animales (
    id SERIAL PRIMARY KEY,
    rancho_id INT NOT NULL,
    corral_id INT REFERENCES corrales(id) ON DELETE SET NULL,
    identificador VARCHAR(100) NOT NULL,
    tipo_identificador VARCHAR(50) NOT NULL,
    estado VARCHAR(50) DEFAULT 'activo',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_rancho_identificador UNIQUE (rancho_id, identificador)
);

-- 3. Tabla de Movimientos de Corral
CREATE TABLE IF NOT EXISTS movimientos_corral (
    id SERIAL PRIMARY KEY,
    animal_id INT REFERENCES animales(id) ON DELETE CASCADE,
    corral_origen_id INT REFERENCES corrales(id),
    corral_destino_id INT REFERENCES corrales(id),
    fecha_movimiento TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

COMMIT;
