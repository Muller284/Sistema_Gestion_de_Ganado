--
-- PostgreSQL database dump
--


-- Dumped from database version 16.15 (Ubuntu 16.15-0ubuntu0.24.04.1)
-- Dumped by pg_dump version 16.15 (Ubuntu 16.15-0ubuntu0.24.04.1)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Data for Name: franjas_precio; Type: TABLE DATA; Schema: public; Owner: -
--

SET SESSION AUTHORIZATION DEFAULT;

ALTER TABLE public.franjas_precio DISABLE TRIGGER ALL;

INSERT INTO public.franjas_precio (codigo, nombre, multiplicador, creado_en, modificado_en, creado_por, modificado_por, eliminado_en) VALUES ('A', 'Franja A - Norteamerica, Europa occidental y Oceania', 1.00, '2026-11-12 16:16:59.932004+00', '2026-11-12 16:16:59.932004+00', NULL, NULL, NULL);
INSERT INTO public.franjas_precio (codigo, nombre, multiplicador, creado_en, modificado_en, creado_por, modificado_por, eliminado_en) VALUES ('B', 'Franja B - Cono Sur, Brasil, Mexico y Colombia', 0.60, '2026-11-12 16:16:59.932004+00', '2026-11-12 16:16:59.932004+00', NULL, NULL, NULL);
INSERT INTO public.franjas_precio (codigo, nombre, multiplicador, creado_en, modificado_en, creado_por, modificado_por, eliminado_en) VALUES ('C', 'Franja C - Bolivia, Paraguay, Peru y Centroamerica', 0.40, '2026-11-12 16:16:59.932004+00', '2026-11-12 16:16:59.932004+00', NULL, NULL, NULL);


ALTER TABLE public.franjas_precio ENABLE TRIGGER ALL;

--
-- Data for Name: paises; Type: TABLE DATA; Schema: public; Owner: -
--

ALTER TABLE public.paises DISABLE TRIGGER ALL;

INSERT INTO public.paises (codigo, nombre, idioma, moneda, unidad_peso, unidad_superficie, formato_fecha, zona_horaria, franja_precio_codigo, creado_en, modificado_en, creado_por, modificado_por, eliminado_en, franja_precio) VALUES ('BO', 'Bolivia', 'es', 'BOB', 'kg', 'ha', 'DD/MM/YYYY', 'America/La_Paz', 'C', '2026-11-12 16:16:59.932004+00', '2026-11-12 16:16:59.932004+00', NULL, NULL, NULL, 'Baja');
INSERT INTO public.paises (codigo, nombre, idioma, moneda, unidad_peso, unidad_superficie, formato_fecha, zona_horaria, franja_precio_codigo, creado_en, modificado_en, creado_por, modificado_por, eliminado_en, franja_precio) VALUES ('PY', 'Paraguay', 'es', 'PYG', 'kg', 'ha', 'DD/MM/YYYY', 'America/Asuncion', 'C', '2026-11-12 16:16:59.932004+00', '2026-11-12 16:16:59.932004+00', NULL, NULL, NULL, 'Baja');
INSERT INTO public.paises (codigo, nombre, idioma, moneda, unidad_peso, unidad_superficie, formato_fecha, zona_horaria, franja_precio_codigo, creado_en, modificado_en, creado_por, modificado_por, eliminado_en, franja_precio) VALUES ('PE', 'Peru', 'es', 'PEN', 'kg', 'ha', 'DD/MM/YYYY', 'America/Lima', 'C', '2026-11-12 16:16:59.932004+00', '2026-11-12 16:16:59.932004+00', NULL, NULL, NULL, 'Baja');
INSERT INTO public.paises (codigo, nombre, idioma, moneda, unidad_peso, unidad_superficie, formato_fecha, zona_horaria, franja_precio_codigo, creado_en, modificado_en, creado_por, modificado_por, eliminado_en, franja_precio) VALUES ('CO', 'Colombia', 'es', 'COP', 'kg', 'ha', 'DD/MM/YYYY', 'America/Bogota', 'B', '2026-11-12 16:16:59.932004+00', '2026-11-12 16:16:59.932004+00', NULL, NULL, NULL, 'Baja');
INSERT INTO public.paises (codigo, nombre, idioma, moneda, unidad_peso, unidad_superficie, formato_fecha, zona_horaria, franja_precio_codigo, creado_en, modificado_en, creado_por, modificado_por, eliminado_en, franja_precio) VALUES ('AR', 'Argentina', 'es', 'ARS', 'kg', 'ha', 'DD/MM/YYYY', 'America/Argentina/Buenos_Aires', 'B', '2026-11-12 16:16:59.932004+00', '2026-11-12 16:16:59.932004+00', NULL, NULL, NULL, 'Baja');
INSERT INTO public.paises (codigo, nombre, idioma, moneda, unidad_peso, unidad_superficie, formato_fecha, zona_horaria, franja_precio_codigo, creado_en, modificado_en, creado_por, modificado_por, eliminado_en, franja_precio) VALUES ('BR', 'Brasil', 'es', 'BRL', 'kg', 'ha', 'DD/MM/YYYY', 'America/Sao_Paulo', 'B', '2026-11-12 16:16:59.932004+00', '2026-11-12 16:16:59.932004+00', NULL, NULL, NULL, 'Baja');
INSERT INTO public.paises (codigo, nombre, idioma, moneda, unidad_peso, unidad_superficie, formato_fecha, zona_horaria, franja_precio_codigo, creado_en, modificado_en, creado_por, modificado_por, eliminado_en, franja_precio) VALUES ('MX', 'Mexico', 'es', 'MXN', 'kg', 'ha', 'DD/MM/YYYY', 'America/Mexico_City', 'B', '2026-11-12 16:16:59.932004+00', '2026-11-12 16:16:59.932004+00', NULL, NULL, NULL, 'Baja');
INSERT INTO public.paises (codigo, nombre, idioma, moneda, unidad_peso, unidad_superficie, formato_fecha, zona_horaria, franja_precio_codigo, creado_en, modificado_en, creado_por, modificado_por, eliminado_en, franja_precio) VALUES ('UY', 'Uruguay', 'es', 'UYU', 'kg', 'ha', 'DD/MM/YYYY', 'America/Montevideo', 'B', '2026-11-12 16:16:59.932004+00', '2026-11-12 16:16:59.932004+00', NULL, NULL, NULL, 'Baja');
INSERT INTO public.paises (codigo, nombre, idioma, moneda, unidad_peso, unidad_superficie, formato_fecha, zona_horaria, franja_precio_codigo, creado_en, modificado_en, creado_por, modificado_por, eliminado_en, franja_precio) VALUES ('CL', 'Chile', 'es', 'CLP', 'kg', 'ha', 'DD/MM/YYYY', 'America/Santiago', 'B', '2026-11-12 16:16:59.932004+00', '2026-11-12 16:16:59.932004+00', NULL, NULL, NULL, 'Baja');
INSERT INTO public.paises (codigo, nombre, idioma, moneda, unidad_peso, unidad_superficie, formato_fecha, zona_horaria, franja_precio_codigo, creado_en, modificado_en, creado_por, modificado_por, eliminado_en, franja_precio) VALUES ('US', 'Estados Unidos', 'en', 'USD', 'lb', 'acre', 'MM/DD/YYYY', 'America/Chicago', 'A', '2026-11-12 16:16:59.932004+00', '2026-11-12 16:16:59.932004+00', NULL, NULL, NULL, 'Baja');


ALTER TABLE public.paises ENABLE TRIGGER ALL;

--
-- Data for Name: usuarios; Type: TABLE DATA; Schema: public; Owner: -
--

ALTER TABLE public.usuarios DISABLE TRIGGER ALL;

INSERT INTO public.usuarios (id, nombre, correo, contrasena_hash, correo_verificado, debe_cambiar_contrasena, estado, rancho_id, rol, tipo_colaborador_id, intentos_fallidos, bloqueado_hasta, creado_en, modificado_en, creado_por, modificado_por, eliminado_en, pais_codigo, idioma) VALUES ('a1000000-0000-4000-8000-000000000001', 'Carlos Gutierrez Mendoza', 'carlos.gutierrez@elcerrito.bo', 'scrypt$16384$8$1$AK6L1S+M3zd44oJxvHmChA==$HTqW1TQbd1JkToko/T2reLf9KE6Z9XZ5QzLGjPMbeyc=', true, false, 'activo', 'a0000000-0000-4000-8000-000000000001', 'propietario', NULL, 0, NULL, '2026-11-12 16:17:00.233832+00', '2026-11-12 16:17:00.233832+00', 'a1000000-0000-4000-8000-000000000001', 'a1000000-0000-4000-8000-000000000001', NULL, NULL, NULL);
INSERT INTO public.usuarios (id, nombre, correo, contrasena_hash, correo_verificado, debe_cambiar_contrasena, estado, rancho_id, rol, tipo_colaborador_id, intentos_fallidos, bloqueado_hasta, creado_en, modificado_en, creado_por, modificado_por, eliminado_en, pais_codigo, idioma) VALUES ('a1000000-0000-4000-8000-000000000002', 'Maria Rene Aguilera Paz', 'mrene.aguilera@elcerrito.bo', 'scrypt$16384$8$1$AK6L1S+M3zd44oJxvHmChA==$HTqW1TQbd1JkToko/T2reLf9KE6Z9XZ5QzLGjPMbeyc=', true, false, 'activo', 'a0000000-0000-4000-8000-000000000001', 'socio', NULL, 0, NULL, '2026-11-12 16:17:00.233832+00', '2026-11-12 16:17:00.233832+00', 'a1000000-0000-4000-8000-000000000001', 'a1000000-0000-4000-8000-000000000001', NULL, NULL, NULL);
INSERT INTO public.usuarios (id, nombre, correo, contrasena_hash, correo_verificado, debe_cambiar_contrasena, estado, rancho_id, rol, tipo_colaborador_id, intentos_fallidos, bloqueado_hasta, creado_en, modificado_en, creado_por, modificado_por, eliminado_en, pais_codigo, idioma) VALUES ('a1000000-0000-4000-8000-000000000003', 'Dr. Jorge Soliz Prado', 'jorge.soliz@elcerrito.bo', 'scrypt$16384$8$1$AK6L1S+M3zd44oJxvHmChA==$HTqW1TQbd1JkToko/T2reLf9KE6Z9XZ5QzLGjPMbeyc=', true, false, 'activo', 'a0000000-0000-4000-8000-000000000001', 'colaborador', '11111111-1111-4111-8111-000000000001', 0, NULL, '2026-11-12 16:17:00.233832+00', '2026-11-12 16:17:00.233832+00', 'a1000000-0000-4000-8000-000000000001', 'a1000000-0000-4000-8000-000000000001', NULL, NULL, NULL);
INSERT INTO public.usuarios (id, nombre, correo, contrasena_hash, correo_verificado, debe_cambiar_contrasena, estado, rancho_id, rol, tipo_colaborador_id, intentos_fallidos, bloqueado_hasta, creado_en, modificado_en, creado_por, modificado_por, eliminado_en, pais_codigo, idioma) VALUES ('a1000000-0000-4000-8000-000000000004', 'Roberto Justiniano Saucedo', 'roberto.justiniano@elcerrito.bo', 'scrypt$16384$8$1$AK6L1S+M3zd44oJxvHmChA==$HTqW1TQbd1JkToko/T2reLf9KE6Z9XZ5QzLGjPMbeyc=', true, false, 'activo', 'a0000000-0000-4000-8000-000000000001', 'colaborador', '11111111-1111-4111-8111-000000000002', 0, NULL, '2026-11-12 16:17:00.233832+00', '2026-11-12 16:17:00.233832+00', 'a1000000-0000-4000-8000-000000000001', 'a1000000-0000-4000-8000-000000000001', NULL, NULL, NULL);
INSERT INTO public.usuarios (id, nombre, correo, contrasena_hash, correo_verificado, debe_cambiar_contrasena, estado, rancho_id, rol, tipo_colaborador_id, intentos_fallidos, bloqueado_hasta, creado_en, modificado_en, creado_por, modificado_por, eliminado_en, pais_codigo, idioma) VALUES ('a1000000-0000-4000-8000-000000000005', 'Gonzalo Chavez Roca', 'gonzalo.chavez@elcerrito.bo', 'scrypt$16384$8$1$AK6L1S+M3zd44oJxvHmChA==$HTqW1TQbd1JkToko/T2reLf9KE6Z9XZ5QzLGjPMbeyc=', true, false, 'activo', 'a0000000-0000-4000-8000-000000000001', 'colaborador', '11111111-1111-4111-8111-000000000003', 0, NULL, '2026-11-12 16:17:00.233832+00', '2026-11-12 16:17:00.233832+00', 'a1000000-0000-4000-8000-000000000001', 'a1000000-0000-4000-8000-000000000001', NULL, NULL, NULL);
INSERT INTO public.usuarios (id, nombre, correo, contrasena_hash, correo_verificado, debe_cambiar_contrasena, estado, rancho_id, rol, tipo_colaborador_id, intentos_fallidos, bloqueado_hasta, creado_en, modificado_en, creado_por, modificado_por, eliminado_en, pais_codigo, idioma) VALUES ('a1000000-0000-4000-8000-000000000006', 'Valeria Mercado Vaca', 'valeria.mercado@elcerrito.bo', 'scrypt$16384$8$1$AK6L1S+M3zd44oJxvHmChA==$HTqW1TQbd1JkToko/T2reLf9KE6Z9XZ5QzLGjPMbeyc=', true, false, 'activo', 'a0000000-0000-4000-8000-000000000001', 'colaborador', '11111111-1111-4111-8111-000000000004', 0, NULL, '2026-11-12 16:17:00.233832+00', '2026-11-12 16:17:00.233832+00', 'a1000000-0000-4000-8000-000000000001', 'a1000000-0000-4000-8000-000000000001', NULL, NULL, NULL);
INSERT INTO public.usuarios (id, nombre, correo, contrasena_hash, correo_verificado, debe_cambiar_contrasena, estado, rancho_id, rol, tipo_colaborador_id, intentos_fallidos, bloqueado_hasta, creado_en, modificado_en, creado_por, modificado_por, eliminado_en, pais_codigo, idioma) VALUES ('b1000000-0000-4000-8000-000000000001', 'Fernando Torrico Camacho', 'fernando.torrico@lafloresta.bo', 'scrypt$16384$8$1$AK6L1S+M3zd44oJxvHmChA==$HTqW1TQbd1JkToko/T2reLf9KE6Z9XZ5QzLGjPMbeyc=', true, false, 'activo', 'b0000000-0000-4000-8000-000000000002', 'propietario', NULL, 0, NULL, '2026-11-12 16:17:00.233832+00', '2026-11-12 16:17:00.233832+00', 'b1000000-0000-4000-8000-000000000001', 'b1000000-0000-4000-8000-000000000001', NULL, NULL, NULL);
INSERT INTO public.usuarios (id, nombre, correo, contrasena_hash, correo_verificado, debe_cambiar_contrasena, estado, rancho_id, rol, tipo_colaborador_id, intentos_fallidos, bloqueado_hasta, creado_en, modificado_en, creado_por, modificado_por, eliminado_en, pais_codigo, idioma) VALUES ('b1000000-0000-4000-8000-000000000002', 'Patricia Villarroel Rios', 'patricia.villarroel@lafloresta.bo', 'scrypt$16384$8$1$AK6L1S+M3zd44oJxvHmChA==$HTqW1TQbd1JkToko/T2reLf9KE6Z9XZ5QzLGjPMbeyc=', true, false, 'activo', 'b0000000-0000-4000-8000-000000000002', 'socio', NULL, 0, NULL, '2026-11-12 16:17:00.233832+00', '2026-11-12 16:17:00.233832+00', 'b1000000-0000-4000-8000-000000000001', 'b1000000-0000-4000-8000-000000000001', NULL, NULL, NULL);
INSERT INTO public.usuarios (id, nombre, correo, contrasena_hash, correo_verificado, debe_cambiar_contrasena, estado, rancho_id, rol, tipo_colaborador_id, intentos_fallidos, bloqueado_hasta, creado_en, modificado_en, creado_por, modificado_por, eliminado_en, pais_codigo, idioma) VALUES ('b1000000-0000-4000-8000-000000000003', 'Dra. Lucia Morales Arteaga', 'lucia.morales@lafloresta.bo', 'scrypt$16384$8$1$AK6L1S+M3zd44oJxvHmChA==$HTqW1TQbd1JkToko/T2reLf9KE6Z9XZ5QzLGjPMbeyc=', true, false, 'activo', 'b0000000-0000-4000-8000-000000000002', 'colaborador', '11111111-1111-4111-8111-000000000001', 0, NULL, '2026-11-12 16:17:00.233832+00', '2026-11-12 16:17:00.233832+00', 'b1000000-0000-4000-8000-000000000001', 'b1000000-0000-4000-8000-000000000001', NULL, NULL, NULL);
INSERT INTO public.usuarios (id, nombre, correo, contrasena_hash, correo_verificado, debe_cambiar_contrasena, estado, rancho_id, rol, tipo_colaborador_id, intentos_fallidos, bloqueado_hasta, creado_en, modificado_en, creado_por, modificado_por, eliminado_en, pais_codigo, idioma) VALUES ('b1000000-0000-4000-8000-000000000004', 'Walter Fernandez Claure', 'walter.fernandez@lafloresta.bo', 'scrypt$16384$8$1$AK6L1S+M3zd44oJxvHmChA==$HTqW1TQbd1JkToko/T2reLf9KE6Z9XZ5QzLGjPMbeyc=', true, false, 'activo', 'b0000000-0000-4000-8000-000000000002', 'colaborador', '11111111-1111-4111-8111-000000000002', 0, NULL, '2026-11-12 16:17:00.233832+00', '2026-11-12 16:17:00.233832+00', 'b1000000-0000-4000-8000-000000000001', 'b1000000-0000-4000-8000-000000000001', NULL, NULL, NULL);
INSERT INTO public.usuarios (id, nombre, correo, contrasena_hash, correo_verificado, debe_cambiar_contrasena, estado, rancho_id, rol, tipo_colaborador_id, intentos_fallidos, bloqueado_hasta, creado_en, modificado_en, creado_por, modificado_por, eliminado_en, pais_codigo, idioma) VALUES ('f0000000-0000-4000-8000-000000000001', 'Soporte Central Plataforma Ganado', 'soporte@plataforma.bo', 'scrypt$16384$8$1$AK6L1S+M3zd44oJxvHmChA==$HTqW1TQbd1JkToko/T2reLf9KE6Z9XZ5QzLGjPMbeyc=', true, false, 'activo', NULL, 'admin_plataforma', NULL, 0, NULL, '2026-11-12 16:17:00.233832+00', '2026-11-12 16:17:00.233832+00', 'f0000000-0000-4000-8000-000000000001', 'f0000000-0000-4000-8000-000000000001', NULL, NULL, NULL);
INSERT INTO public.usuarios (id, nombre, correo, contrasena_hash, correo_verificado, debe_cambiar_contrasena, estado, rancho_id, rol, tipo_colaborador_id, intentos_fallidos, bloqueado_hasta, creado_en, modificado_en, creado_por, modificado_por, eliminado_en, pais_codigo, idioma) VALUES ('c1000000-0000-4000-8000-000000000001', 'Ariel Camacho Peredo', 'ariel.camacho@correo.bo', 'scrypt$16384$8$1$AK6L1S+M3zd44oJxvHmChA==$HTqW1TQbd1JkToko/T2reLf9KE6Z9XZ5QzLGjPMbeyc=', true, false, 'activo', NULL, 'propietario', NULL, 0, NULL, '2026-11-12 16:17:00.233832+00', '2026-11-12 16:17:00.233832+00', 'c1000000-0000-4000-8000-000000000001', 'c1000000-0000-4000-8000-000000000001', NULL, NULL, NULL);
INSERT INTO public.usuarios (id, nombre, correo, contrasena_hash, correo_verificado, debe_cambiar_contrasena, estado, rancho_id, rol, tipo_colaborador_id, intentos_fallidos, bloqueado_hasta, creado_en, modificado_en, creado_por, modificado_por, eliminado_en, pais_codigo, idioma) VALUES ('c1000000-0000-4000-8000-000000000002', 'Lucia Mendez Soliz', 'lucia.mendez@correo.bo', 'scrypt$16384$8$1$AK6L1S+M3zd44oJxvHmChA==$HTqW1TQbd1JkToko/T2reLf9KE6Z9XZ5QzLGjPMbeyc=', false, false, 'activo', NULL, 'propietario', NULL, 0, NULL, '2026-11-12 16:17:00.233832+00', '2026-11-12 16:17:00.233832+00', 'c1000000-0000-4000-8000-000000000002', 'c1000000-0000-4000-8000-000000000002', NULL, NULL, NULL);
INSERT INTO public.usuarios (id, nombre, correo, contrasena_hash, correo_verificado, debe_cambiar_contrasena, estado, rancho_id, rol, tipo_colaborador_id, intentos_fallidos, bloqueado_hasta, creado_en, modificado_en, creado_por, modificado_por, eliminado_en, pais_codigo, idioma) VALUES ('c1000000-0000-4000-8000-000000000003', 'Ruben Quispe Mamani', 'ruben.quispe@elcerrito.bo', 'scrypt$16384$8$1$BC9d4mFQrtZ0nYkACIKRyw==$5/wJKm80OOXZWPd+yeeUet5biHEBEEjXa7HikSDAkrM=', true, true, 'activo', 'a0000000-0000-4000-8000-000000000001', 'colaborador', '11111111-1111-4111-8111-000000000002', 0, NULL, '2026-11-12 16:17:00.233832+00', '2026-11-12 16:17:00.233832+00', 'a1000000-0000-4000-8000-000000000001', 'a1000000-0000-4000-8000-000000000001', NULL, NULL, NULL);


ALTER TABLE public.usuarios ENABLE TRIGGER ALL;

--
-- Data for Name: ranchos; Type: TABLE DATA; Schema: public; Owner: -
--

ALTER TABLE public.ranchos DISABLE TRIGGER ALL;

INSERT INTO public.ranchos (id, nombre, departamento, localidad, latitud, longitud, superficie, tipo_produccion, pais_codigo, propietario_id, creado_en, modificado_en, creado_por, modificado_por, eliminado_en, guia_pausada_en) VALUES ('a0000000-0000-4000-8000-000000000001', 'Rancho El Cerrito', 'Santa Cruz', 'Warnes', -17.51470000, -63.16610000, 850.50, 'carne', 'BO', 'a1000000-0000-4000-8000-000000000001', '2026-11-12 16:17:00.233832+00', '2026-11-12 16:17:00.233832+00', 'a1000000-0000-4000-8000-000000000001', 'a1000000-0000-4000-8000-000000000001', NULL, NULL);
INSERT INTO public.ranchos (id, nombre, departamento, localidad, latitud, longitud, superficie, tipo_produccion, pais_codigo, propietario_id, creado_en, modificado_en, creado_por, modificado_por, eliminado_en, guia_pausada_en) VALUES ('b0000000-0000-4000-8000-000000000002', 'Hacienda La Floresta', 'Cochabamba', 'Quillacollo', -17.39350000, -66.27980000, 320.00, 'leche', 'BO', 'b1000000-0000-4000-8000-000000000001', '2026-11-12 16:17:00.233832+00', '2026-11-12 16:17:00.233832+00', 'b1000000-0000-4000-8000-000000000001', 'b1000000-0000-4000-8000-000000000001', NULL, NULL);


ALTER TABLE public.ranchos ENABLE TRIGGER ALL;

--
-- Data for Name: accesos_admin; Type: TABLE DATA; Schema: public; Owner: -
--

ALTER TABLE public.accesos_admin DISABLE TRIGGER ALL;



ALTER TABLE public.accesos_admin ENABLE TRIGGER ALL;

--
-- Data for Name: categorias_animal; Type: TABLE DATA; Schema: public; Owner: -
--

ALTER TABLE public.categorias_animal DISABLE TRIGGER ALL;

INSERT INTO public.categorias_animal (codigo, orden, creado_en, modificado_en, creado_por, modificado_por, eliminado_en) VALUES ('ternero', 1, '2026-11-12 16:16:59.979468+00', '2026-11-12 16:16:59.979468+00', NULL, NULL, NULL);
INSERT INTO public.categorias_animal (codigo, orden, creado_en, modificado_en, creado_por, modificado_por, eliminado_en) VALUES ('ternera', 2, '2026-11-12 16:16:59.979468+00', '2026-11-12 16:16:59.979468+00', NULL, NULL, NULL);
INSERT INTO public.categorias_animal (codigo, orden, creado_en, modificado_en, creado_por, modificado_por, eliminado_en) VALUES ('torito', 3, '2026-11-12 16:16:59.979468+00', '2026-11-12 16:16:59.979468+00', NULL, NULL, NULL);
INSERT INTO public.categorias_animal (codigo, orden, creado_en, modificado_en, creado_por, modificado_por, eliminado_en) VALUES ('vaquilla', 4, '2026-11-12 16:16:59.979468+00', '2026-11-12 16:16:59.979468+00', NULL, NULL, NULL);
INSERT INTO public.categorias_animal (codigo, orden, creado_en, modificado_en, creado_por, modificado_por, eliminado_en) VALUES ('novillo', 5, '2026-11-12 16:16:59.979468+00', '2026-11-12 16:16:59.979468+00', NULL, NULL, NULL);
INSERT INTO public.categorias_animal (codigo, orden, creado_en, modificado_en, creado_por, modificado_por, eliminado_en) VALUES ('vaca', 6, '2026-11-12 16:16:59.979468+00', '2026-11-12 16:16:59.979468+00', NULL, NULL, NULL);
INSERT INTO public.categorias_animal (codigo, orden, creado_en, modificado_en, creado_por, modificado_por, eliminado_en) VALUES ('toro', 7, '2026-11-12 16:16:59.979468+00', '2026-11-12 16:16:59.979468+00', NULL, NULL, NULL);
INSERT INTO public.categorias_animal (codigo, orden, creado_en, modificado_en, creado_por, modificado_por, eliminado_en) VALUES ('buey', 8, '2026-11-12 16:16:59.979468+00', '2026-11-12 16:16:59.979468+00', NULL, NULL, NULL);


ALTER TABLE public.categorias_animal ENABLE TRIGGER ALL;

--
-- Data for Name: corrales; Type: TABLE DATA; Schema: public; Owner: -
--

ALTER TABLE public.corrales DISABLE TRIGGER ALL;

INSERT INTO public.corrales (id, rancho_id, nombre, capacidad, superficie_ha, creado_en, modificado_en, creado_por, modificado_por, eliminado_en) VALUES ('cc000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000001', 'Potrero Las Lomas', 20, 25.0000, '2026-11-12 16:17:00.245143+00', '2026-11-12 16:17:00.245143+00', 'a1000000-0000-4000-8000-000000000001', 'a1000000-0000-4000-8000-000000000001', NULL);
INSERT INTO public.corrales (id, rancho_id, nombre, capacidad, superficie_ha, creado_en, modificado_en, creado_por, modificado_por, eliminado_en) VALUES ('cc000000-0000-4000-8000-000000000002', 'a0000000-0000-4000-8000-000000000001', 'Potrero del Río', 10, 12.0000, '2026-11-12 16:17:00.245143+00', '2026-11-12 16:17:00.245143+00', 'a1000000-0000-4000-8000-000000000001', 'a1000000-0000-4000-8000-000000000001', NULL);


ALTER TABLE public.corrales ENABLE TRIGGER ALL;

--
-- Data for Name: animales; Type: TABLE DATA; Schema: public; Owner: -
--

ALTER TABLE public.animales DISABLE TRIGGER ALL;

INSERT INTO public.animales (id, rancho_id, identificador, tipo_identificador, nombre, raza, sexo, categoria_codigo, fecha_nacimiento, origen, corral_id, peso_kg, estado, creado_en, modificado_en, creado_por, modificado_por, eliminado_en) VALUES ('d2000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000002', '0501', 'caravana', 'Blanca', 'Holstein', 'hembra', 'vaca', '2021-01-10', 'comprado', NULL, 540.00, 'activo', '2026-05-20 12:00:00+00', '2026-11-12 16:17:00.245143+00', 'b1000000-0000-4000-8000-000000000001', 'b1000000-0000-4000-8000-000000000001', NULL);
INSERT INTO public.animales (id, rancho_id, identificador, tipo_identificador, nombre, raza, sexo, categoria_codigo, fecha_nacimiento, origen, corral_id, peso_kg, estado, creado_en, modificado_en, creado_por, modificado_por, eliminado_en) VALUES ('d2000000-0000-4000-8000-000000000002', 'b0000000-0000-4000-8000-000000000002', '0502', 'caravana', 'Manchada', 'Girolando', 'hembra', 'vaca', '2020-11-25', 'comprado', NULL, 498.00, 'activo', '2026-05-20 12:05:00+00', '2026-11-12 16:17:00.245143+00', 'b1000000-0000-4000-8000-000000000001', 'b1000000-0000-4000-8000-000000000001', NULL);
INSERT INTO public.animales (id, rancho_id, identificador, tipo_identificador, nombre, raza, sexo, categoria_codigo, fecha_nacimiento, origen, corral_id, peso_kg, estado, creado_en, modificado_en, creado_por, modificado_por, eliminado_en) VALUES ('d1000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000001', '0501', 'caravana', 'Lucera', 'Nelore', 'hembra', 'vaca', '2021-03-14', 'nacido', 'cc000000-0000-4000-8000-000000000001', 468.00, 'activo', '2026-03-02 14:00:00+00', '2026-11-12 16:17:00.245143+00', 'a1000000-0000-4000-8000-000000000001', 'a1000000-0000-4000-8000-000000000001', NULL);
INSERT INTO public.animales (id, rancho_id, identificador, tipo_identificador, nombre, raza, sexo, categoria_codigo, fecha_nacimiento, origen, corral_id, peso_kg, estado, creado_en, modificado_en, creado_por, modificado_por, eliminado_en) VALUES ('d1000000-0000-4000-8000-000000000002', 'a0000000-0000-4000-8000-000000000001', '0502', 'caravana', 'Canela', 'Brahman', 'hembra', 'vaca', '2020-09-02', 'comprado', 'cc000000-0000-4000-8000-000000000001', 455.00, 'activo', '2026-03-02 14:05:00+00', '2026-11-12 16:17:00.245143+00', 'a1000000-0000-4000-8000-000000000001', 'a1000000-0000-4000-8000-000000000001', NULL);
INSERT INTO public.animales (id, rancho_id, identificador, tipo_identificador, nombre, raza, sexo, categoria_codigo, fecha_nacimiento, origen, corral_id, peso_kg, estado, creado_en, modificado_en, creado_por, modificado_por, eliminado_en) VALUES ('d1000000-0000-4000-8000-000000000005', 'a0000000-0000-4000-8000-000000000001', '0505', 'caravana', 'Chispa', 'Nelore', 'hembra', 'ternera', '2026-06-05', 'nacido', 'cc000000-0000-4000-8000-000000000001', 118.00, 'activo', '2026-06-05 22:00:00+00', '2026-11-12 16:17:00.245143+00', 'a1000000-0000-4000-8000-000000000001', 'a1000000-0000-4000-8000-000000000001', NULL);
INSERT INTO public.animales (id, rancho_id, identificador, tipo_identificador, nombre, raza, sexo, categoria_codigo, fecha_nacimiento, origen, corral_id, peso_kg, estado, creado_en, modificado_en, creado_por, modificado_por, eliminado_en) VALUES ('d1000000-0000-4000-8000-000000000006', 'a0000000-0000-4000-8000-000000000001', '0506', 'caravana', 'Sultan', 'Nelore', 'macho', 'toro', '2019-04-18', 'comprado', 'cc000000-0000-4000-8000-000000000001', 805.00, 'activo', '2026-03-02 14:10:00+00', '2026-11-12 16:17:00.245143+00', 'a1000000-0000-4000-8000-000000000001', 'a1000000-0000-4000-8000-000000000001', NULL);
INSERT INTO public.animales (id, rancho_id, identificador, tipo_identificador, nombre, raza, sexo, categoria_codigo, fecha_nacimiento, origen, corral_id, peso_kg, estado, creado_en, modificado_en, creado_por, modificado_por, eliminado_en) VALUES ('d1000000-0000-4000-8000-000000000003', 'a0000000-0000-4000-8000-000000000001', '0503', 'caravana', NULL, 'Nelore', 'macho', 'novillo', '2024-07-20', 'nacido', 'cc000000-0000-4000-8000-000000000002', 402.00, 'activo', '2026-04-15 13:00:00+00', '2026-11-12 16:17:00.245143+00', 'a1000000-0000-4000-8000-000000000001', 'a1000000-0000-4000-8000-000000000001', NULL);
INSERT INTO public.animales (id, rancho_id, identificador, tipo_identificador, nombre, raza, sexo, categoria_codigo, fecha_nacimiento, origen, corral_id, peso_kg, estado, creado_en, modificado_en, creado_por, modificado_por, eliminado_en) VALUES ('d1000000-0000-4000-8000-000000000004', 'a0000000-0000-4000-8000-000000000001', '0504', 'caravana', NULL, 'Mestizo', 'macho', 'novillo', '2024-08-11', 'nacido', 'cc000000-0000-4000-8000-000000000002', 371.00, 'activo', '2026-05-03 13:00:00+00', '2026-11-12 16:17:00.245143+00', 'a1000000-0000-4000-8000-000000000001', 'a1000000-0000-4000-8000-000000000001', NULL);
INSERT INTO public.animales (id, rancho_id, identificador, tipo_identificador, nombre, raza, sexo, categoria_codigo, fecha_nacimiento, origen, corral_id, peso_kg, estado, creado_en, modificado_en, creado_por, modificado_por, eliminado_en) VALUES ('d1000000-0000-4000-8000-000000000007', 'a0000000-0000-4000-8000-000000000001', '0507', 'caravana', NULL, 'Nelore', 'macho', 'novillo', '2024-06-10', 'comprado', NULL, 430.00, 'vendido', '2026-04-15 13:05:00+00', '2026-11-12 16:17:00.245143+00', 'a1000000-0000-4000-8000-000000000001', 'a1000000-0000-4000-8000-000000000001', NULL);


ALTER TABLE public.animales ENABLE TRIGGER ALL;

--
-- Data for Name: productos_sanitarios; Type: TABLE DATA; Schema: public; Owner: -
--

ALTER TABLE public.productos_sanitarios DISABLE TRIGGER ALL;

INSERT INTO public.productos_sanitarios (id, rancho_id, nombre, clave, tipo, laboratorio, dosis, unidad, creado_en, modificado_en, creado_por, modificado_por, eliminado_en) VALUES ('e1000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000001', 'Vacuna antiaftosa', 'vacuna antiaftosa', 'vacuna', 'Biogénesis Bagó', 2.00, 'ml', '2026-11-12 16:17:00.245143+00', '2026-11-12 16:17:00.245143+00', 'a1000000-0000-4000-8000-000000000003', 'a1000000-0000-4000-8000-000000000003', NULL);
INSERT INTO public.productos_sanitarios (id, rancho_id, nombre, clave, tipo, laboratorio, dosis, unidad, creado_en, modificado_en, creado_por, modificado_por, eliminado_en) VALUES ('e1000000-0000-4000-8000-000000000002', 'a0000000-0000-4000-8000-000000000001', 'Brucelosis RB51', 'brucelosis rb51', 'vacuna', NULL, 2.00, 'ml', '2026-11-12 16:17:00.245143+00', '2026-11-12 16:17:00.245143+00', 'a1000000-0000-4000-8000-000000000003', 'a1000000-0000-4000-8000-000000000003', NULL);
INSERT INTO public.productos_sanitarios (id, rancho_id, nombre, clave, tipo, laboratorio, dosis, unidad, creado_en, modificado_en, creado_por, modificado_por, eliminado_en) VALUES ('e1000000-0000-4000-8000-000000000003', 'a0000000-0000-4000-8000-000000000001', 'Ivermectina 1%', 'ivermectina 1%', 'antiparasitario', NULL, 5.00, 'ml', '2026-11-12 16:17:00.245143+00', '2026-11-12 16:17:00.245143+00', 'a1000000-0000-4000-8000-000000000003', 'a1000000-0000-4000-8000-000000000003', NULL);
INSERT INTO public.productos_sanitarios (id, rancho_id, nombre, clave, tipo, laboratorio, dosis, unidad, creado_en, modificado_en, creado_por, modificado_por, eliminado_en) VALUES ('e1000000-0000-4000-8000-000000000004', 'a0000000-0000-4000-8000-000000000001', 'Vitamina ADE', 'vitamina ade', 'vitamina', NULL, NULL, NULL, '2026-11-12 16:17:00.245143+00', '2026-11-12 16:17:00.245143+00', 'a1000000-0000-4000-8000-000000000003', 'a1000000-0000-4000-8000-000000000003', NULL);
INSERT INTO public.productos_sanitarios (id, rancho_id, nombre, clave, tipo, laboratorio, dosis, unidad, creado_en, modificado_en, creado_por, modificado_por, eliminado_en) VALUES ('e2000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000002', 'Vacuna antiaftosa', 'vacuna antiaftosa', 'vacuna', NULL, 2.00, 'ml', '2026-11-12 16:17:00.245143+00', '2026-11-12 16:17:00.245143+00', 'b1000000-0000-4000-8000-000000000003', 'b1000000-0000-4000-8000-000000000003', NULL);


ALTER TABLE public.productos_sanitarios ENABLE TRIGGER ALL;

--
-- Data for Name: esquemas_vacunacion; Type: TABLE DATA; Schema: public; Owner: -
--

ALTER TABLE public.esquemas_vacunacion DISABLE TRIGGER ALL;

INSERT INTO public.esquemas_vacunacion (id, rancho_id, producto_id, nombre, categorias, sexo, edad_minima_meses, edad_maxima_meses, dosis, intervalo_dias, refuerzo_dias, creado_en, modificado_en, creado_por, modificado_por, eliminado_en) VALUES ('e1000000-0000-4000-8000-000000000101', 'a0000000-0000-4000-8000-000000000001', 'e1000000-0000-4000-8000-000000000001', 'Aftosa (todo el rodeo)', NULL, NULL, 0, NULL, 1, NULL, 180, '2026-03-01 00:00:00+00', '2026-11-12 16:17:00.245143+00', 'a1000000-0000-4000-8000-000000000001', 'a1000000-0000-4000-8000-000000000001', NULL);
INSERT INTO public.esquemas_vacunacion (id, rancho_id, producto_id, nombre, categorias, sexo, edad_minima_meses, edad_maxima_meses, dosis, intervalo_dias, refuerzo_dias, creado_en, modificado_en, creado_por, modificado_por, eliminado_en) VALUES ('e1000000-0000-4000-8000-000000000102', 'a0000000-0000-4000-8000-000000000001', 'e1000000-0000-4000-8000-000000000002', 'Brucelosis (terneras)', '{ternera}', 'hembra', 3, 8, 1, NULL, NULL, '2026-03-01 00:00:00+00', '2026-11-12 16:17:00.245143+00', 'a1000000-0000-4000-8000-000000000001', 'a1000000-0000-4000-8000-000000000001', NULL);
INSERT INTO public.esquemas_vacunacion (id, rancho_id, producto_id, nombre, categorias, sexo, edad_minima_meses, edad_maxima_meses, dosis, intervalo_dias, refuerzo_dias, creado_en, modificado_en, creado_por, modificado_por, eliminado_en) VALUES ('e1000000-0000-4000-8000-000000000103', 'a0000000-0000-4000-8000-000000000001', 'e1000000-0000-4000-8000-000000000004', 'Vitamina ADE (vacas)', '{vaca}', 'hembra', 0, NULL, 1, NULL, 120, '2026-03-01 00:00:00+00', '2026-11-12 16:17:00.245143+00', 'a1000000-0000-4000-8000-000000000001', 'a1000000-0000-4000-8000-000000000001', NULL);
INSERT INTO public.esquemas_vacunacion (id, rancho_id, producto_id, nombre, categorias, sexo, edad_minima_meses, edad_maxima_meses, dosis, intervalo_dias, refuerzo_dias, creado_en, modificado_en, creado_por, modificado_por, eliminado_en) VALUES ('e2000000-0000-4000-8000-000000000101', 'b0000000-0000-4000-8000-000000000002', 'e2000000-0000-4000-8000-000000000001', 'Aftosa (todo el rodeo)', NULL, NULL, 0, NULL, 1, NULL, 180, '2026-03-01 00:00:00+00', '2026-11-12 16:17:00.245143+00', 'b1000000-0000-4000-8000-000000000001', 'b1000000-0000-4000-8000-000000000001', NULL);


ALTER TABLE public.esquemas_vacunacion ENABLE TRIGGER ALL;

--
-- Data for Name: aplicaciones_sanitarias; Type: TABLE DATA; Schema: public; Owner: -
--

ALTER TABLE public.aplicaciones_sanitarias DISABLE TRIGGER ALL;

INSERT INTO public.aplicaciones_sanitarias (id, rancho_id, animal_id, producto_id, esquema_id, numero_dosis, fecha, dosis, aplicado_por, observacion, lote_id, creado_en, modificado_en, creado_por, modificado_por, eliminado_en) VALUES ('f1000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000001', 'd1000000-0000-4000-8000-000000000001', 'e1000000-0000-4000-8000-000000000001', 'e1000000-0000-4000-8000-000000000101', 1, '2026-05-12', 2.00, 'a1000000-0000-4000-8000-000000000003', 'Campaña de mayo', 'f1000000-0000-4000-8000-0000000000aa', '2026-11-12 16:17:00.245143+00', '2026-11-12 16:17:00.245143+00', 'a1000000-0000-4000-8000-000000000003', 'a1000000-0000-4000-8000-000000000003', NULL);
INSERT INTO public.aplicaciones_sanitarias (id, rancho_id, animal_id, producto_id, esquema_id, numero_dosis, fecha, dosis, aplicado_por, observacion, lote_id, creado_en, modificado_en, creado_por, modificado_por, eliminado_en) VALUES ('f1000000-0000-4000-8000-000000000002', 'a0000000-0000-4000-8000-000000000001', 'd1000000-0000-4000-8000-000000000002', 'e1000000-0000-4000-8000-000000000001', 'e1000000-0000-4000-8000-000000000101', 1, '2026-05-12', 2.00, 'a1000000-0000-4000-8000-000000000003', 'Campaña de mayo', 'f1000000-0000-4000-8000-0000000000aa', '2026-11-12 16:17:00.245143+00', '2026-11-12 16:17:00.245143+00', 'a1000000-0000-4000-8000-000000000003', 'a1000000-0000-4000-8000-000000000003', NULL);
INSERT INTO public.aplicaciones_sanitarias (id, rancho_id, animal_id, producto_id, esquema_id, numero_dosis, fecha, dosis, aplicado_por, observacion, lote_id, creado_en, modificado_en, creado_por, modificado_por, eliminado_en) VALUES ('f1000000-0000-4000-8000-000000000003', 'a0000000-0000-4000-8000-000000000001', 'd1000000-0000-4000-8000-000000000003', 'e1000000-0000-4000-8000-000000000001', 'e1000000-0000-4000-8000-000000000101', 1, '2026-05-12', 2.00, 'a1000000-0000-4000-8000-000000000003', 'Campaña de mayo', 'f1000000-0000-4000-8000-0000000000aa', '2026-11-12 16:17:00.245143+00', '2026-11-12 16:17:00.245143+00', 'a1000000-0000-4000-8000-000000000003', 'a1000000-0000-4000-8000-000000000003', NULL);
INSERT INTO public.aplicaciones_sanitarias (id, rancho_id, animal_id, producto_id, esquema_id, numero_dosis, fecha, dosis, aplicado_por, observacion, lote_id, creado_en, modificado_en, creado_por, modificado_por, eliminado_en) VALUES ('f1000000-0000-4000-8000-000000000004', 'a0000000-0000-4000-8000-000000000001', 'd1000000-0000-4000-8000-000000000006', 'e1000000-0000-4000-8000-000000000001', 'e1000000-0000-4000-8000-000000000101', 1, '2026-05-12', 2.00, 'a1000000-0000-4000-8000-000000000003', 'Campaña de mayo', 'f1000000-0000-4000-8000-0000000000aa', '2026-11-12 16:17:00.245143+00', '2026-11-12 16:17:00.245143+00', 'a1000000-0000-4000-8000-000000000003', 'a1000000-0000-4000-8000-000000000003', NULL);
INSERT INTO public.aplicaciones_sanitarias (id, rancho_id, animal_id, producto_id, esquema_id, numero_dosis, fecha, dosis, aplicado_por, observacion, lote_id, creado_en, modificado_en, creado_por, modificado_por, eliminado_en) VALUES ('f1000000-0000-4000-8000-000000000005', 'a0000000-0000-4000-8000-000000000001', 'd1000000-0000-4000-8000-000000000004', 'e1000000-0000-4000-8000-000000000001', 'e1000000-0000-4000-8000-000000000101', 1, '2026-04-20', 2.00, 'a1000000-0000-4000-8000-000000000003', NULL, NULL, '2026-11-12 16:17:00.245143+00', '2026-11-12 16:17:00.245143+00', 'a1000000-0000-4000-8000-000000000003', 'a1000000-0000-4000-8000-000000000003', NULL);
INSERT INTO public.aplicaciones_sanitarias (id, rancho_id, animal_id, producto_id, esquema_id, numero_dosis, fecha, dosis, aplicado_por, observacion, lote_id, creado_en, modificado_en, creado_por, modificado_por, eliminado_en) VALUES ('f1000000-0000-4000-8000-000000000007', 'a0000000-0000-4000-8000-000000000001', 'd1000000-0000-4000-8000-000000000001', 'e1000000-0000-4000-8000-000000000004', 'e1000000-0000-4000-8000-000000000103', 1, '2026-10-01', 5.00, 'a1000000-0000-4000-8000-000000000003', NULL, 'f1000000-0000-4000-8000-0000000000bb', '2026-11-12 16:17:00.245143+00', '2026-11-12 16:17:00.245143+00', 'a1000000-0000-4000-8000-000000000003', 'a1000000-0000-4000-8000-000000000003', NULL);
INSERT INTO public.aplicaciones_sanitarias (id, rancho_id, animal_id, producto_id, esquema_id, numero_dosis, fecha, dosis, aplicado_por, observacion, lote_id, creado_en, modificado_en, creado_por, modificado_por, eliminado_en) VALUES ('f1000000-0000-4000-8000-000000000008', 'a0000000-0000-4000-8000-000000000001', 'd1000000-0000-4000-8000-000000000002', 'e1000000-0000-4000-8000-000000000004', 'e1000000-0000-4000-8000-000000000103', 1, '2026-10-01', 5.00, 'a1000000-0000-4000-8000-000000000003', NULL, 'f1000000-0000-4000-8000-0000000000bb', '2026-11-12 16:17:00.245143+00', '2026-11-12 16:17:00.245143+00', 'a1000000-0000-4000-8000-000000000003', 'a1000000-0000-4000-8000-000000000003', NULL);
INSERT INTO public.aplicaciones_sanitarias (id, rancho_id, animal_id, producto_id, esquema_id, numero_dosis, fecha, dosis, aplicado_por, observacion, lote_id, creado_en, modificado_en, creado_por, modificado_por, eliminado_en) VALUES ('f1000000-0000-4000-8000-000000000006', 'a0000000-0000-4000-8000-000000000001', 'd1000000-0000-4000-8000-000000000003', 'e1000000-0000-4000-8000-000000000003', NULL, NULL, '2026-09-30', 8.00, 'a1000000-0000-4000-8000-000000000003', 'Garrapatas', NULL, '2026-11-12 16:17:00.245143+00', '2026-11-12 16:17:00.245143+00', 'a1000000-0000-4000-8000-000000000003', 'a1000000-0000-4000-8000-000000000003', NULL);
INSERT INTO public.aplicaciones_sanitarias (id, rancho_id, animal_id, producto_id, esquema_id, numero_dosis, fecha, dosis, aplicado_por, observacion, lote_id, creado_en, modificado_en, creado_por, modificado_por, eliminado_en) VALUES ('f2000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000002', 'd2000000-0000-4000-8000-000000000001', 'e2000000-0000-4000-8000-000000000001', 'e2000000-0000-4000-8000-000000000101', 1, '2026-06-03', 2.00, 'b1000000-0000-4000-8000-000000000003', NULL, NULL, '2026-11-12 16:17:00.245143+00', '2026-11-12 16:17:00.245143+00', 'b1000000-0000-4000-8000-000000000003', 'b1000000-0000-4000-8000-000000000003', NULL);


ALTER TABLE public.aplicaciones_sanitarias ENABLE TRIGGER ALL;

--
-- Data for Name: cambios_estado_animal; Type: TABLE DATA; Schema: public; Owner: -
--

ALTER TABLE public.cambios_estado_animal DISABLE TRIGGER ALL;

INSERT INTO public.cambios_estado_animal (id, rancho_id, animal_id, estado_anterior, estado_nuevo, fecha, motivo, creado_en, modificado_en, creado_por, modificado_por, eliminado_en) VALUES ('cc000000-0000-4000-8000-000000000101', 'a0000000-0000-4000-8000-000000000001', 'd1000000-0000-4000-8000-000000000007', 'activo', 'vendido', '2026-09-20', 'Venta en la feria de Montero', '2026-11-12 16:17:00.245143+00', '2026-11-12 16:17:00.245143+00', 'a1000000-0000-4000-8000-000000000001', 'a1000000-0000-4000-8000-000000000001', NULL);


ALTER TABLE public.cambios_estado_animal ENABLE TRIGGER ALL;

--
-- Data for Name: consultas_asistente; Type: TABLE DATA; Schema: public; Owner: -
--

ALTER TABLE public.consultas_asistente DISABLE TRIGGER ALL;



ALTER TABLE public.consultas_asistente ENABLE TRIGGER ALL;

--
-- Data for Name: migraciones_aplicadas; Type: TABLE DATA; Schema: public; Owner: -
--

ALTER TABLE public.migraciones_aplicadas DISABLE TRIGGER ALL;

INSERT INTO public.migraciones_aplicadas (nombre, aplicada_en) VALUES ('001_fase1_esquema_inicial.sql', '2026-11-12 16:16:59.932004+00');
INSERT INTO public.migraciones_aplicadas (nombre, aplicada_en) VALUES ('002_hu06_pais_del_usuario.sql', '2026-11-12 16:16:59.958923+00');
INSERT INTO public.migraciones_aplicadas (nombre, aplicada_en) VALUES ('003_hu14_campos_pais.sql', '2026-11-12 16:16:59.963308+00');
INSERT INTO public.migraciones_aplicadas (nombre, aplicada_en) VALUES ('004_hu16_guia_configuracion.sql', '2026-11-12 16:16:59.966993+00');
INSERT INTO public.migraciones_aplicadas (nombre, aplicada_en) VALUES ('005_hu20_tipos_colaborador.sql', '2026-11-12 16:16:59.972371+00');
INSERT INTO public.migraciones_aplicadas (nombre, aplicada_en) VALUES ('006_hu24_accesos_admin.sql', '2026-11-12 16:16:59.976752+00');
INSERT INTO public.migraciones_aplicadas (nombre, aplicada_en) VALUES ('007_hu25_idioma_del_usuario.sql', '2026-11-12 16:16:59.978468+00');
INSERT INTO public.migraciones_aplicadas (nombre, aplicada_en) VALUES ('008_hu28_hu36_animales_corrales.sql', '2026-11-12 16:16:59.991056+00');
INSERT INTO public.migraciones_aplicadas (nombre, aplicada_en) VALUES ('009_hu28_razas.sql', '2026-11-12 16:16:59.997194+00');
INSERT INTO public.migraciones_aplicadas (nombre, aplicada_en) VALUES ('010_fase3_sanidad_pesajes.sql', '2026-11-12 16:17:00.014763+00');
INSERT INTO public.migraciones_aplicadas (nombre, aplicada_en) VALUES ('011_hu30_orden_paginacion_animales.sql', '2026-11-12 16:17:00.019324+00');
INSERT INTO public.migraciones_aplicadas (nombre, aplicada_en) VALUES ('012_asistente.sql', '2026-11-12 16:17:00.023603+00');


ALTER TABLE public.migraciones_aplicadas ENABLE TRIGGER ALL;

--
-- Data for Name: modulos; Type: TABLE DATA; Schema: public; Owner: -
--

ALTER TABLE public.modulos DISABLE TRIGGER ALL;

INSERT INTO public.modulos (codigo, nombre, orden, creado_en, modificado_en, creado_por, modificado_por, eliminado_en) VALUES ('animales', 'Animales', 1, '2026-11-12 16:16:59.932004+00', '2026-11-12 16:16:59.932004+00', NULL, NULL, NULL);
INSERT INTO public.modulos (codigo, nombre, orden, creado_en, modificado_en, creado_por, modificado_por, eliminado_en) VALUES ('corrales', 'Corrales', 2, '2026-11-12 16:16:59.932004+00', '2026-11-12 16:16:59.932004+00', NULL, NULL, NULL);
INSERT INTO public.modulos (codigo, nombre, orden, creado_en, modificado_en, creado_por, modificado_por, eliminado_en) VALUES ('sanidad', 'Sanidad', 3, '2026-11-12 16:16:59.932004+00', '2026-11-12 16:16:59.932004+00', NULL, NULL, NULL);
INSERT INTO public.modulos (codigo, nombre, orden, creado_en, modificado_en, creado_por, modificado_por, eliminado_en) VALUES ('pesajes', 'Pesajes', 4, '2026-11-12 16:16:59.932004+00', '2026-11-12 16:16:59.932004+00', NULL, NULL, NULL);
INSERT INTO public.modulos (codigo, nombre, orden, creado_en, modificado_en, creado_por, modificado_por, eliminado_en) VALUES ('importacion', 'Importacion', 5, '2026-11-12 16:16:59.932004+00', '2026-11-12 16:16:59.932004+00', NULL, NULL, NULL);
INSERT INTO public.modulos (codigo, nombre, orden, creado_en, modificado_en, creado_por, modificado_por, eliminado_en) VALUES ('almacen', 'Almacen', 6, '2026-11-12 16:16:59.932004+00', '2026-11-12 16:16:59.932004+00', NULL, NULL, NULL);
INSERT INTO public.modulos (codigo, nombre, orden, creado_en, modificado_en, creado_por, modificado_por, eliminado_en) VALUES ('equipo', 'Equipo', 7, '2026-11-12 16:16:59.932004+00', '2026-11-12 16:16:59.932004+00', NULL, NULL, NULL);
INSERT INTO public.modulos (codigo, nombre, orden, creado_en, modificado_en, creado_por, modificado_por, eliminado_en) VALUES ('planes', 'Planes', 8, '2026-11-12 16:16:59.932004+00', '2026-11-12 16:16:59.932004+00', NULL, NULL, NULL);


ALTER TABLE public.modulos ENABLE TRIGGER ALL;

--
-- Data for Name: movimientos_corral; Type: TABLE DATA; Schema: public; Owner: -
--

ALTER TABLE public.movimientos_corral DISABLE TRIGGER ALL;



ALTER TABLE public.movimientos_corral ENABLE TRIGGER ALL;

--
-- Data for Name: pasos_guia; Type: TABLE DATA; Schema: public; Owner: -
--

ALTER TABLE public.pasos_guia DISABLE TRIGGER ALL;



ALTER TABLE public.pasos_guia ENABLE TRIGGER ALL;

--
-- Data for Name: tipos_colaborador; Type: TABLE DATA; Schema: public; Owner: -
--

ALTER TABLE public.tipos_colaborador DISABLE TRIGGER ALL;

INSERT INTO public.tipos_colaborador (id, rancho_id, nombre, es_predefinido, creado_en, modificado_en, creado_por, modificado_por, eliminado_en) VALUES ('11111111-1111-4111-8111-000000000001', NULL, 'Veterinario', true, '2026-11-12 16:16:59.932004+00', '2026-11-12 16:16:59.932004+00', NULL, NULL, NULL);
INSERT INTO public.tipos_colaborador (id, rancho_id, nombre, es_predefinido, creado_en, modificado_en, creado_por, modificado_por, eliminado_en) VALUES ('11111111-1111-4111-8111-000000000002', NULL, 'Encargado de campo', true, '2026-11-12 16:16:59.932004+00', '2026-11-12 16:16:59.932004+00', NULL, NULL, NULL);
INSERT INTO public.tipos_colaborador (id, rancho_id, nombre, es_predefinido, creado_en, modificado_en, creado_por, modificado_por, eliminado_en) VALUES ('11111111-1111-4111-8111-000000000003', NULL, 'Encargado de almacen', true, '2026-11-12 16:16:59.932004+00', '2026-11-12 16:16:59.932004+00', NULL, NULL, NULL);
INSERT INTO public.tipos_colaborador (id, rancho_id, nombre, es_predefinido, creado_en, modificado_en, creado_por, modificado_por, eliminado_en) VALUES ('11111111-1111-4111-8111-000000000004', NULL, 'Administrativo', true, '2026-11-12 16:16:59.932004+00', '2026-11-12 16:16:59.932004+00', NULL, NULL, NULL);


ALTER TABLE public.tipos_colaborador ENABLE TRIGGER ALL;

--
-- Data for Name: permisos_tipo; Type: TABLE DATA; Schema: public; Owner: -
--

ALTER TABLE public.permisos_tipo DISABLE TRIGGER ALL;

INSERT INTO public.permisos_tipo (id, tipo_colaborador_id, modulo_codigo, puede_ver, puede_editar, creado_en, modificado_en, creado_por, modificado_por, eliminado_en, rancho_id) VALUES ('22222222-2222-4222-8222-000000000001', '11111111-1111-4111-8111-000000000001', 'animales', true, false, '2026-11-12 16:16:59.932004+00', '2026-11-12 16:16:59.932004+00', NULL, NULL, NULL, NULL);
INSERT INTO public.permisos_tipo (id, tipo_colaborador_id, modulo_codigo, puede_ver, puede_editar, creado_en, modificado_en, creado_por, modificado_por, eliminado_en, rancho_id) VALUES ('22222222-2222-4222-8222-000000000002', '11111111-1111-4111-8111-000000000001', 'sanidad', true, true, '2026-11-12 16:16:59.932004+00', '2026-11-12 16:16:59.932004+00', NULL, NULL, NULL, NULL);
INSERT INTO public.permisos_tipo (id, tipo_colaborador_id, modulo_codigo, puede_ver, puede_editar, creado_en, modificado_en, creado_por, modificado_por, eliminado_en, rancho_id) VALUES ('22222222-2222-4222-8222-000000000003', '11111111-1111-4111-8111-000000000001', 'pesajes', true, true, '2026-11-12 16:16:59.932004+00', '2026-11-12 16:16:59.932004+00', NULL, NULL, NULL, NULL);
INSERT INTO public.permisos_tipo (id, tipo_colaborador_id, modulo_codigo, puede_ver, puede_editar, creado_en, modificado_en, creado_por, modificado_por, eliminado_en, rancho_id) VALUES ('22222222-2222-4222-8222-000000000004', '11111111-1111-4111-8111-000000000002', 'animales', true, true, '2026-11-12 16:16:59.932004+00', '2026-11-12 16:16:59.932004+00', NULL, NULL, NULL, NULL);
INSERT INTO public.permisos_tipo (id, tipo_colaborador_id, modulo_codigo, puede_ver, puede_editar, creado_en, modificado_en, creado_por, modificado_por, eliminado_en, rancho_id) VALUES ('22222222-2222-4222-8222-000000000005', '11111111-1111-4111-8111-000000000002', 'corrales', true, true, '2026-11-12 16:16:59.932004+00', '2026-11-12 16:16:59.932004+00', NULL, NULL, NULL, NULL);
INSERT INTO public.permisos_tipo (id, tipo_colaborador_id, modulo_codigo, puede_ver, puede_editar, creado_en, modificado_en, creado_por, modificado_por, eliminado_en, rancho_id) VALUES ('22222222-2222-4222-8222-000000000006', '11111111-1111-4111-8111-000000000002', 'pesajes', true, true, '2026-11-12 16:16:59.932004+00', '2026-11-12 16:16:59.932004+00', NULL, NULL, NULL, NULL);
INSERT INTO public.permisos_tipo (id, tipo_colaborador_id, modulo_codigo, puede_ver, puede_editar, creado_en, modificado_en, creado_por, modificado_por, eliminado_en, rancho_id) VALUES ('22222222-2222-4222-8222-000000000007', '11111111-1111-4111-8111-000000000003', 'almacen', true, true, '2026-11-12 16:16:59.932004+00', '2026-11-12 16:16:59.932004+00', NULL, NULL, NULL, NULL);
INSERT INTO public.permisos_tipo (id, tipo_colaborador_id, modulo_codigo, puede_ver, puede_editar, creado_en, modificado_en, creado_por, modificado_por, eliminado_en, rancho_id) VALUES ('22222222-2222-4222-8222-000000000008', '11111111-1111-4111-8111-000000000004', 'animales', true, false, '2026-11-12 16:16:59.932004+00', '2026-11-12 16:16:59.932004+00', NULL, NULL, NULL, NULL);
INSERT INTO public.permisos_tipo (id, tipo_colaborador_id, modulo_codigo, puede_ver, puede_editar, creado_en, modificado_en, creado_por, modificado_por, eliminado_en, rancho_id) VALUES ('22222222-2222-4222-8222-000000000009', '11111111-1111-4111-8111-000000000004', 'corrales', true, false, '2026-11-12 16:16:59.932004+00', '2026-11-12 16:16:59.932004+00', NULL, NULL, NULL, NULL);
INSERT INTO public.permisos_tipo (id, tipo_colaborador_id, modulo_codigo, puede_ver, puede_editar, creado_en, modificado_en, creado_por, modificado_por, eliminado_en, rancho_id) VALUES ('22222222-2222-4222-8222-000000000010', '11111111-1111-4111-8111-000000000004', 'importacion', true, true, '2026-11-12 16:16:59.932004+00', '2026-11-12 16:16:59.932004+00', NULL, NULL, NULL, NULL);
INSERT INTO public.permisos_tipo (id, tipo_colaborador_id, modulo_codigo, puede_ver, puede_editar, creado_en, modificado_en, creado_por, modificado_por, eliminado_en, rancho_id) VALUES ('22222222-2222-4222-8222-000000000011', '11111111-1111-4111-8111-000000000004', 'equipo', true, false, '2026-11-12 16:16:59.932004+00', '2026-11-12 16:16:59.932004+00', NULL, NULL, NULL, NULL);


ALTER TABLE public.permisos_tipo ENABLE TRIGGER ALL;

--
-- Data for Name: permisos_usuario; Type: TABLE DATA; Schema: public; Owner: -
--

ALTER TABLE public.permisos_usuario DISABLE TRIGGER ALL;



ALTER TABLE public.permisos_usuario ENABLE TRIGGER ALL;

--
-- Data for Name: pesajes; Type: TABLE DATA; Schema: public; Owner: -
--

ALTER TABLE public.pesajes DISABLE TRIGGER ALL;

INSERT INTO public.pesajes (id, rancho_id, animal_id, fecha, peso_kg, observacion, lote_id, creado_en, modificado_en, creado_por, modificado_por, eliminado_en) VALUES ('f1000000-0000-4000-8000-100000000001', 'a0000000-0000-4000-8000-000000000001', 'd1000000-0000-4000-8000-000000000001', '2026-08-01', 455.00, NULL, NULL, '2026-11-12 16:17:00.245143+00', '2026-11-12 16:17:00.245143+00', 'a1000000-0000-4000-8000-000000000004', 'a1000000-0000-4000-8000-000000000004', NULL);
INSERT INTO public.pesajes (id, rancho_id, animal_id, fecha, peso_kg, observacion, lote_id, creado_en, modificado_en, creado_por, modificado_por, eliminado_en) VALUES ('f1000000-0000-4000-8000-100000000002', 'a0000000-0000-4000-8000-000000000001', 'd1000000-0000-4000-8000-000000000001', '2026-09-15', 462.00, NULL, NULL, '2026-11-12 16:17:00.245143+00', '2026-11-12 16:17:00.245143+00', 'a1000000-0000-4000-8000-000000000004', 'a1000000-0000-4000-8000-000000000004', NULL);
INSERT INTO public.pesajes (id, rancho_id, animal_id, fecha, peso_kg, observacion, lote_id, creado_en, modificado_en, creado_por, modificado_por, eliminado_en) VALUES ('f1000000-0000-4000-8000-100000000003', 'a0000000-0000-4000-8000-000000000001', 'd1000000-0000-4000-8000-000000000001', '2026-10-30', 468.00, NULL, NULL, '2026-11-12 16:17:00.245143+00', '2026-11-12 16:17:00.245143+00', 'a1000000-0000-4000-8000-000000000004', 'a1000000-0000-4000-8000-000000000004', NULL);
INSERT INTO public.pesajes (id, rancho_id, animal_id, fecha, peso_kg, observacion, lote_id, creado_en, modificado_en, creado_por, modificado_por, eliminado_en) VALUES ('f1000000-0000-4000-8000-100000000004', 'a0000000-0000-4000-8000-000000000001', 'd1000000-0000-4000-8000-000000000002', '2026-08-01', 447.00, NULL, NULL, '2026-11-12 16:17:00.245143+00', '2026-11-12 16:17:00.245143+00', 'a1000000-0000-4000-8000-000000000004', 'a1000000-0000-4000-8000-000000000004', NULL);
INSERT INTO public.pesajes (id, rancho_id, animal_id, fecha, peso_kg, observacion, lote_id, creado_en, modificado_en, creado_por, modificado_por, eliminado_en) VALUES ('f1000000-0000-4000-8000-100000000005', 'a0000000-0000-4000-8000-000000000001', 'd1000000-0000-4000-8000-000000000002', '2026-09-15', 451.00, NULL, NULL, '2026-11-12 16:17:00.245143+00', '2026-11-12 16:17:00.245143+00', 'a1000000-0000-4000-8000-000000000004', 'a1000000-0000-4000-8000-000000000004', NULL);
INSERT INTO public.pesajes (id, rancho_id, animal_id, fecha, peso_kg, observacion, lote_id, creado_en, modificado_en, creado_por, modificado_por, eliminado_en) VALUES ('f1000000-0000-4000-8000-100000000006', 'a0000000-0000-4000-8000-000000000001', 'd1000000-0000-4000-8000-000000000002', '2026-10-30', 455.00, NULL, NULL, '2026-11-12 16:17:00.245143+00', '2026-11-12 16:17:00.245143+00', 'a1000000-0000-4000-8000-000000000004', 'a1000000-0000-4000-8000-000000000004', NULL);
INSERT INTO public.pesajes (id, rancho_id, animal_id, fecha, peso_kg, observacion, lote_id, creado_en, modificado_en, creado_por, modificado_por, eliminado_en) VALUES ('f1000000-0000-4000-8000-100000000007', 'a0000000-0000-4000-8000-000000000001', 'd1000000-0000-4000-8000-000000000003', '2026-08-01', 352.00, NULL, NULL, '2026-11-12 16:17:00.245143+00', '2026-11-12 16:17:00.245143+00', 'a1000000-0000-4000-8000-000000000004', 'a1000000-0000-4000-8000-000000000004', NULL);
INSERT INTO public.pesajes (id, rancho_id, animal_id, fecha, peso_kg, observacion, lote_id, creado_en, modificado_en, creado_por, modificado_por, eliminado_en) VALUES ('f1000000-0000-4000-8000-100000000008', 'a0000000-0000-4000-8000-000000000001', 'd1000000-0000-4000-8000-000000000003', '2026-09-15', 378.00, NULL, NULL, '2026-11-12 16:17:00.245143+00', '2026-11-12 16:17:00.245143+00', 'a1000000-0000-4000-8000-000000000004', 'a1000000-0000-4000-8000-000000000004', NULL);
INSERT INTO public.pesajes (id, rancho_id, animal_id, fecha, peso_kg, observacion, lote_id, creado_en, modificado_en, creado_por, modificado_por, eliminado_en) VALUES ('f1000000-0000-4000-8000-100000000009', 'a0000000-0000-4000-8000-000000000001', 'd1000000-0000-4000-8000-000000000003', '2026-10-30', 402.00, NULL, NULL, '2026-11-12 16:17:00.245143+00', '2026-11-12 16:17:00.245143+00', 'a1000000-0000-4000-8000-000000000004', 'a1000000-0000-4000-8000-000000000004', NULL);
INSERT INTO public.pesajes (id, rancho_id, animal_id, fecha, peso_kg, observacion, lote_id, creado_en, modificado_en, creado_por, modificado_por, eliminado_en) VALUES ('f1000000-0000-4000-8000-100000000010', 'a0000000-0000-4000-8000-000000000001', 'd1000000-0000-4000-8000-000000000004', '2026-08-01', 341.00, NULL, NULL, '2026-11-12 16:17:00.245143+00', '2026-11-12 16:17:00.245143+00', 'a1000000-0000-4000-8000-000000000004', 'a1000000-0000-4000-8000-000000000004', NULL);
INSERT INTO public.pesajes (id, rancho_id, animal_id, fecha, peso_kg, observacion, lote_id, creado_en, modificado_en, creado_por, modificado_por, eliminado_en) VALUES ('f1000000-0000-4000-8000-100000000011', 'a0000000-0000-4000-8000-000000000001', 'd1000000-0000-4000-8000-000000000004', '2026-09-15', 355.00, NULL, NULL, '2026-11-12 16:17:00.245143+00', '2026-11-12 16:17:00.245143+00', 'a1000000-0000-4000-8000-000000000004', 'a1000000-0000-4000-8000-000000000004', NULL);
INSERT INTO public.pesajes (id, rancho_id, animal_id, fecha, peso_kg, observacion, lote_id, creado_en, modificado_en, creado_por, modificado_por, eliminado_en) VALUES ('f1000000-0000-4000-8000-100000000012', 'a0000000-0000-4000-8000-000000000001', 'd1000000-0000-4000-8000-000000000004', '2026-10-30', 371.00, NULL, NULL, '2026-11-12 16:17:00.245143+00', '2026-11-12 16:17:00.245143+00', 'a1000000-0000-4000-8000-000000000004', 'a1000000-0000-4000-8000-000000000004', NULL);
INSERT INTO public.pesajes (id, rancho_id, animal_id, fecha, peso_kg, observacion, lote_id, creado_en, modificado_en, creado_por, modificado_por, eliminado_en) VALUES ('f1000000-0000-4000-8000-100000000013', 'a0000000-0000-4000-8000-000000000001', 'd1000000-0000-4000-8000-000000000005', '2026-08-01', 71.00, NULL, NULL, '2026-11-12 16:17:00.245143+00', '2026-11-12 16:17:00.245143+00', 'a1000000-0000-4000-8000-000000000004', 'a1000000-0000-4000-8000-000000000004', NULL);
INSERT INTO public.pesajes (id, rancho_id, animal_id, fecha, peso_kg, observacion, lote_id, creado_en, modificado_en, creado_por, modificado_por, eliminado_en) VALUES ('f1000000-0000-4000-8000-100000000014', 'a0000000-0000-4000-8000-000000000001', 'd1000000-0000-4000-8000-000000000005', '2026-09-15', 95.00, NULL, NULL, '2026-11-12 16:17:00.245143+00', '2026-11-12 16:17:00.245143+00', 'a1000000-0000-4000-8000-000000000004', 'a1000000-0000-4000-8000-000000000004', NULL);
INSERT INTO public.pesajes (id, rancho_id, animal_id, fecha, peso_kg, observacion, lote_id, creado_en, modificado_en, creado_por, modificado_por, eliminado_en) VALUES ('f1000000-0000-4000-8000-100000000015', 'a0000000-0000-4000-8000-000000000001', 'd1000000-0000-4000-8000-000000000005', '2026-10-30', 118.00, NULL, NULL, '2026-11-12 16:17:00.245143+00', '2026-11-12 16:17:00.245143+00', 'a1000000-0000-4000-8000-000000000004', 'a1000000-0000-4000-8000-000000000004', NULL);
INSERT INTO public.pesajes (id, rancho_id, animal_id, fecha, peso_kg, observacion, lote_id, creado_en, modificado_en, creado_por, modificado_por, eliminado_en) VALUES ('f1000000-0000-4000-8000-100000000016', 'a0000000-0000-4000-8000-000000000001', 'd1000000-0000-4000-8000-000000000006', '2026-08-01', 798.00, NULL, NULL, '2026-11-12 16:17:00.245143+00', '2026-11-12 16:17:00.245143+00', 'a1000000-0000-4000-8000-000000000004', 'a1000000-0000-4000-8000-000000000004', NULL);
INSERT INTO public.pesajes (id, rancho_id, animal_id, fecha, peso_kg, observacion, lote_id, creado_en, modificado_en, creado_por, modificado_por, eliminado_en) VALUES ('f1000000-0000-4000-8000-100000000017', 'a0000000-0000-4000-8000-000000000001', 'd1000000-0000-4000-8000-000000000006', '2026-09-15', 802.00, NULL, NULL, '2026-11-12 16:17:00.245143+00', '2026-11-12 16:17:00.245143+00', 'a1000000-0000-4000-8000-000000000004', 'a1000000-0000-4000-8000-000000000004', NULL);
INSERT INTO public.pesajes (id, rancho_id, animal_id, fecha, peso_kg, observacion, lote_id, creado_en, modificado_en, creado_por, modificado_por, eliminado_en) VALUES ('f1000000-0000-4000-8000-100000000018', 'a0000000-0000-4000-8000-000000000001', 'd1000000-0000-4000-8000-000000000006', '2026-10-30', 805.00, NULL, NULL, '2026-11-12 16:17:00.245143+00', '2026-11-12 16:17:00.245143+00', 'a1000000-0000-4000-8000-000000000004', 'a1000000-0000-4000-8000-000000000004', NULL);
INSERT INTO public.pesajes (id, rancho_id, animal_id, fecha, peso_kg, observacion, lote_id, creado_en, modificado_en, creado_por, modificado_por, eliminado_en) VALUES ('f2000000-0000-4000-8000-100000000001', 'b0000000-0000-4000-8000-000000000002', 'd2000000-0000-4000-8000-000000000001', '2026-09-01', 532.00, NULL, NULL, '2026-11-12 16:17:00.245143+00', '2026-11-12 16:17:00.245143+00', 'b1000000-0000-4000-8000-000000000001', 'b1000000-0000-4000-8000-000000000001', NULL);
INSERT INTO public.pesajes (id, rancho_id, animal_id, fecha, peso_kg, observacion, lote_id, creado_en, modificado_en, creado_por, modificado_por, eliminado_en) VALUES ('f2000000-0000-4000-8000-100000000002', 'b0000000-0000-4000-8000-000000000002', 'd2000000-0000-4000-8000-000000000001', '2026-10-25', 540.00, NULL, NULL, '2026-11-12 16:17:00.245143+00', '2026-11-12 16:17:00.245143+00', 'b1000000-0000-4000-8000-000000000001', 'b1000000-0000-4000-8000-000000000001', NULL);
INSERT INTO public.pesajes (id, rancho_id, animal_id, fecha, peso_kg, observacion, lote_id, creado_en, modificado_en, creado_por, modificado_por, eliminado_en) VALUES ('f2000000-0000-4000-8000-100000000003', 'b0000000-0000-4000-8000-000000000002', 'd2000000-0000-4000-8000-000000000002', '2026-09-01', 494.00, NULL, NULL, '2026-11-12 16:17:00.245143+00', '2026-11-12 16:17:00.245143+00', 'b1000000-0000-4000-8000-000000000001', 'b1000000-0000-4000-8000-000000000001', NULL);
INSERT INTO public.pesajes (id, rancho_id, animal_id, fecha, peso_kg, observacion, lote_id, creado_en, modificado_en, creado_por, modificado_por, eliminado_en) VALUES ('f2000000-0000-4000-8000-100000000004', 'b0000000-0000-4000-8000-000000000002', 'd2000000-0000-4000-8000-000000000002', '2026-10-25', 498.00, NULL, NULL, '2026-11-12 16:17:00.245143+00', '2026-11-12 16:17:00.245143+00', 'b1000000-0000-4000-8000-000000000001', 'b1000000-0000-4000-8000-000000000001', NULL);
INSERT INTO public.pesajes (id, rancho_id, animal_id, fecha, peso_kg, observacion, lote_id, creado_en, modificado_en, creado_por, modificado_por, eliminado_en) VALUES ('cc000000-0000-4000-8000-000000000201', 'a0000000-0000-4000-8000-000000000001', 'd1000000-0000-4000-8000-000000000007', '2026-08-01', 404.00, NULL, NULL, '2026-11-12 16:17:00.245143+00', '2026-11-12 16:17:00.245143+00', 'a1000000-0000-4000-8000-000000000004', 'a1000000-0000-4000-8000-000000000004', NULL);
INSERT INTO public.pesajes (id, rancho_id, animal_id, fecha, peso_kg, observacion, lote_id, creado_en, modificado_en, creado_por, modificado_por, eliminado_en) VALUES ('cc000000-0000-4000-8000-000000000202', 'a0000000-0000-4000-8000-000000000001', 'd1000000-0000-4000-8000-000000000007', '2026-09-15', 430.00, NULL, NULL, '2026-11-12 16:17:00.245143+00', '2026-11-12 16:17:00.245143+00', 'a1000000-0000-4000-8000-000000000004', 'a1000000-0000-4000-8000-000000000004', NULL);


ALTER TABLE public.pesajes ENABLE TRIGGER ALL;

--
-- Data for Name: razas; Type: TABLE DATA; Schema: public; Owner: -
--

ALTER TABLE public.razas DISABLE TRIGGER ALL;

INSERT INTO public.razas (id, rancho_id, nombre, clave, grupo, orden, creado_en, modificado_en, creado_por, modificado_por, eliminado_en) VALUES ('01ef26ae-2093-4bb2-b497-b8502db20abe', NULL, 'Angus', 'angus', 'carne', 1, '2026-11-12 16:16:59.992045+00', '2026-11-12 16:16:59.992045+00', NULL, NULL, NULL);
INSERT INTO public.razas (id, rancho_id, nombre, clave, grupo, orden, creado_en, modificado_en, creado_por, modificado_por, eliminado_en) VALUES ('478277bc-b687-4963-8662-cc962bc81f8a', NULL, 'Azul Belga', 'azul belga', 'carne', 2, '2026-11-12 16:16:59.992045+00', '2026-11-12 16:16:59.992045+00', NULL, NULL, NULL);
INSERT INTO public.razas (id, rancho_id, nombre, clave, grupo, orden, creado_en, modificado_en, creado_por, modificado_por, eliminado_en) VALUES ('292fce96-cd58-4a65-be41-ec6060a65ee5', NULL, 'Beefmaster', 'beefmaster', 'carne', 3, '2026-11-12 16:16:59.992045+00', '2026-11-12 16:16:59.992045+00', NULL, NULL, NULL);
INSERT INTO public.razas (id, rancho_id, nombre, clave, grupo, orden, creado_en, modificado_en, creado_por, modificado_por, eliminado_en) VALUES ('7d7bcd4a-9b1b-4eb1-a90a-a1299f2fb215', NULL, 'Bonsmara', 'bonsmara', 'carne', 4, '2026-11-12 16:16:59.992045+00', '2026-11-12 16:16:59.992045+00', NULL, NULL, NULL);
INSERT INTO public.razas (id, rancho_id, nombre, clave, grupo, orden, creado_en, modificado_en, creado_por, modificado_por, eliminado_en) VALUES ('9a02169d-ccff-41f1-bb81-6f8c205d7322', NULL, 'Braford', 'braford', 'carne', 5, '2026-11-12 16:16:59.992045+00', '2026-11-12 16:16:59.992045+00', NULL, NULL, NULL);
INSERT INTO public.razas (id, rancho_id, nombre, clave, grupo, orden, creado_en, modificado_en, creado_por, modificado_por, eliminado_en) VALUES ('b7acaf2c-bbf1-4bca-8f30-18f8a2a91070', NULL, 'Brahman', 'brahman', 'carne', 6, '2026-11-12 16:16:59.992045+00', '2026-11-12 16:16:59.992045+00', NULL, NULL, NULL);
INSERT INTO public.razas (id, rancho_id, nombre, clave, grupo, orden, creado_en, modificado_en, creado_por, modificado_por, eliminado_en) VALUES ('6c49e860-2810-43f6-a832-e625c2d474b6', NULL, 'Brangus', 'brangus', 'carne', 7, '2026-11-12 16:16:59.992045+00', '2026-11-12 16:16:59.992045+00', NULL, NULL, NULL);
INSERT INTO public.razas (id, rancho_id, nombre, clave, grupo, orden, creado_en, modificado_en, creado_por, modificado_por, eliminado_en) VALUES ('726d4874-082d-43b6-8165-e7c34496f729', NULL, 'Charolais', 'charolais', 'carne', 8, '2026-11-12 16:16:59.992045+00', '2026-11-12 16:16:59.992045+00', NULL, NULL, NULL);
INSERT INTO public.razas (id, rancho_id, nombre, clave, grupo, orden, creado_en, modificado_en, creado_por, modificado_por, eliminado_en) VALUES ('7f059c5c-a32d-4e44-81f3-670b5971d47b', NULL, 'Chianina', 'chianina', 'carne', 9, '2026-11-12 16:16:59.992045+00', '2026-11-12 16:16:59.992045+00', NULL, NULL, NULL);
INSERT INTO public.razas (id, rancho_id, nombre, clave, grupo, orden, creado_en, modificado_en, creado_por, modificado_por, eliminado_en) VALUES ('5f63aa59-baec-4449-9d5e-7e6610043e5a', NULL, 'Droughtmaster', 'droughtmaster', 'carne', 10, '2026-11-12 16:16:59.992045+00', '2026-11-12 16:16:59.992045+00', NULL, NULL, NULL);
INSERT INTO public.razas (id, rancho_id, nombre, clave, grupo, orden, creado_en, modificado_en, creado_por, modificado_por, eliminado_en) VALUES ('6e52f2e5-37b2-4dff-a218-4715238544b8', NULL, 'Galloway', 'galloway', 'carne', 11, '2026-11-12 16:16:59.992045+00', '2026-11-12 16:16:59.992045+00', NULL, NULL, NULL);
INSERT INTO public.razas (id, rancho_id, nombre, clave, grupo, orden, creado_en, modificado_en, creado_por, modificado_por, eliminado_en) VALUES ('c0d02576-07fa-4f4e-b5ff-45c64484e25c', NULL, 'Hereford', 'hereford', 'carne', 12, '2026-11-12 16:16:59.992045+00', '2026-11-12 16:16:59.992045+00', NULL, NULL, NULL);
INSERT INTO public.razas (id, rancho_id, nombre, clave, grupo, orden, creado_en, modificado_en, creado_por, modificado_por, eliminado_en) VALUES ('9eeed214-4635-484e-9a01-dd753f1006c6', NULL, 'Highland', 'highland', 'carne', 13, '2026-11-12 16:16:59.992045+00', '2026-11-12 16:16:59.992045+00', NULL, NULL, NULL);
INSERT INTO public.razas (id, rancho_id, nombre, clave, grupo, orden, creado_en, modificado_en, creado_por, modificado_por, eliminado_en) VALUES ('844f16f9-1aee-446d-85c2-cab55bec4c63', NULL, 'Indubrasil', 'indubrasil', 'carne', 14, '2026-11-12 16:16:59.992045+00', '2026-11-12 16:16:59.992045+00', NULL, NULL, NULL);
INSERT INTO public.razas (id, rancho_id, nombre, clave, grupo, orden, creado_en, modificado_en, creado_por, modificado_por, eliminado_en) VALUES ('dadac2db-b3ba-41b2-a35c-fbd0dee5aa2c', NULL, 'Limousin', 'limousin', 'carne', 15, '2026-11-12 16:16:59.992045+00', '2026-11-12 16:16:59.992045+00', NULL, NULL, NULL);
INSERT INTO public.razas (id, rancho_id, nombre, clave, grupo, orden, creado_en, modificado_en, creado_por, modificado_por, eliminado_en) VALUES ('97bda41b-a352-4227-92fe-fd2220b03218', NULL, 'Marchigiana', 'marchigiana', 'carne', 16, '2026-11-12 16:16:59.992045+00', '2026-11-12 16:16:59.992045+00', NULL, NULL, NULL);
INSERT INTO public.razas (id, rancho_id, nombre, clave, grupo, orden, creado_en, modificado_en, creado_por, modificado_por, eliminado_en) VALUES ('d2156735-ffdf-42ba-8c2f-d08a11986244', NULL, 'Murray Grey', 'murray grey', 'carne', 17, '2026-11-12 16:16:59.992045+00', '2026-11-12 16:16:59.992045+00', NULL, NULL, NULL);
INSERT INTO public.razas (id, rancho_id, nombre, clave, grupo, orden, creado_en, modificado_en, creado_por, modificado_por, eliminado_en) VALUES ('4caf5c4e-a34f-422e-ba05-01579cc70d2b', NULL, 'Nelore', 'nelore', 'carne', 18, '2026-11-12 16:16:59.992045+00', '2026-11-12 16:16:59.992045+00', NULL, NULL, NULL);
INSERT INTO public.razas (id, rancho_id, nombre, clave, grupo, orden, creado_en, modificado_en, creado_por, modificado_por, eliminado_en) VALUES ('10b97174-17f1-4356-935b-3ec5667c36e7', NULL, 'Piamontesa', 'piamontesa', 'carne', 19, '2026-11-12 16:16:59.992045+00', '2026-11-12 16:16:59.992045+00', NULL, NULL, NULL);
INSERT INTO public.razas (id, rancho_id, nombre, clave, grupo, orden, creado_en, modificado_en, creado_por, modificado_por, eliminado_en) VALUES ('24bd2d22-e3cd-4457-bcfd-b88300b1c6d3', NULL, 'Red Angus', 'red angus', 'carne', 20, '2026-11-12 16:16:59.992045+00', '2026-11-12 16:16:59.992045+00', NULL, NULL, NULL);
INSERT INTO public.razas (id, rancho_id, nombre, clave, grupo, orden, creado_en, modificado_en, creado_por, modificado_por, eliminado_en) VALUES ('da9ef514-8ade-44d2-a623-98796fb76c1d', NULL, 'Romosinuano', 'romosinuano', 'carne', 21, '2026-11-12 16:16:59.992045+00', '2026-11-12 16:16:59.992045+00', NULL, NULL, NULL);
INSERT INTO public.razas (id, rancho_id, nombre, clave, grupo, orden, creado_en, modificado_en, creado_por, modificado_por, eliminado_en) VALUES ('3e57d45a-e055-4e26-99b4-c953d90588b9', NULL, 'Rubia de Aquitania', 'rubia de aquitania', 'carne', 22, '2026-11-12 16:16:59.992045+00', '2026-11-12 16:16:59.992045+00', NULL, NULL, NULL);
INSERT INTO public.razas (id, rancho_id, nombre, clave, grupo, orden, creado_en, modificado_en, creado_por, modificado_por, eliminado_en) VALUES ('0c998694-62ac-4f53-9356-48585d6d1763', NULL, 'Santa Gertrudis', 'santa gertrudis', 'carne', 23, '2026-11-12 16:16:59.992045+00', '2026-11-12 16:16:59.992045+00', NULL, NULL, NULL);
INSERT INTO public.razas (id, rancho_id, nombre, clave, grupo, orden, creado_en, modificado_en, creado_por, modificado_por, eliminado_en) VALUES ('9e083812-6512-481b-82bc-3ce2c9f8de3e', NULL, 'Senepol', 'senepol', 'carne', 24, '2026-11-12 16:16:59.992045+00', '2026-11-12 16:16:59.992045+00', NULL, NULL, NULL);
INSERT INTO public.razas (id, rancho_id, nombre, clave, grupo, orden, creado_en, modificado_en, creado_por, modificado_por, eliminado_en) VALUES ('fda9ef08-42a9-44e5-8f06-cf96d25e991a', NULL, 'Shorthorn', 'shorthorn', 'carne', 25, '2026-11-12 16:16:59.992045+00', '2026-11-12 16:16:59.992045+00', NULL, NULL, NULL);
INSERT INTO public.razas (id, rancho_id, nombre, clave, grupo, orden, creado_en, modificado_en, creado_por, modificado_por, eliminado_en) VALUES ('b40c3cb8-91a6-460b-8780-60e8416eb138', NULL, 'Simbrah', 'simbrah', 'carne', 26, '2026-11-12 16:16:59.992045+00', '2026-11-12 16:16:59.992045+00', NULL, NULL, NULL);
INSERT INTO public.razas (id, rancho_id, nombre, clave, grupo, orden, creado_en, modificado_en, creado_por, modificado_por, eliminado_en) VALUES ('257ddeb7-c717-49ee-b0a6-e9d6b4bf1ada', NULL, 'Tabapuã', 'tabapua', 'carne', 27, '2026-11-12 16:16:59.992045+00', '2026-11-12 16:16:59.992045+00', NULL, NULL, NULL);
INSERT INTO public.razas (id, rancho_id, nombre, clave, grupo, orden, creado_en, modificado_en, creado_por, modificado_por, eliminado_en) VALUES ('b224436a-31ab-4b47-8ebf-8e926d289019', NULL, 'Wagyu', 'wagyu', 'carne', 28, '2026-11-12 16:16:59.992045+00', '2026-11-12 16:16:59.992045+00', NULL, NULL, NULL);
INSERT INTO public.razas (id, rancho_id, nombre, clave, grupo, orden, creado_en, modificado_en, creado_por, modificado_por, eliminado_en) VALUES ('1c23a1c0-354a-4c13-8215-bcaba08b8593', NULL, 'Ayrshire', 'ayrshire', 'leche', 29, '2026-11-12 16:16:59.992045+00', '2026-11-12 16:16:59.992045+00', NULL, NULL, NULL);
INSERT INTO public.razas (id, rancho_id, nombre, clave, grupo, orden, creado_en, modificado_en, creado_por, modificado_por, eliminado_en) VALUES ('5aab42e7-9e4b-4656-9e7d-2097d8428e37', NULL, 'Girolando', 'girolando', 'leche', 30, '2026-11-12 16:16:59.992045+00', '2026-11-12 16:16:59.992045+00', NULL, NULL, NULL);
INSERT INTO public.razas (id, rancho_id, nombre, clave, grupo, orden, creado_en, modificado_en, creado_por, modificado_por, eliminado_en) VALUES ('dc23f63a-b309-440c-bb3b-05009a5a931a', NULL, 'Guernsey', 'guernsey', 'leche', 31, '2026-11-12 16:16:59.992045+00', '2026-11-12 16:16:59.992045+00', NULL, NULL, NULL);
INSERT INTO public.razas (id, rancho_id, nombre, clave, grupo, orden, creado_en, modificado_en, creado_por, modificado_por, eliminado_en) VALUES ('8bac315b-ef2b-48e2-8a44-d443d69aaed2', NULL, 'Holstein', 'holstein', 'leche', 32, '2026-11-12 16:16:59.992045+00', '2026-11-12 16:16:59.992045+00', NULL, NULL, NULL);
INSERT INTO public.razas (id, rancho_id, nombre, clave, grupo, orden, creado_en, modificado_en, creado_por, modificado_por, eliminado_en) VALUES ('db71898b-9677-4db9-87aa-2e4a90b51142', NULL, 'Jersey', 'jersey', 'leche', 33, '2026-11-12 16:16:59.992045+00', '2026-11-12 16:16:59.992045+00', NULL, NULL, NULL);
INSERT INTO public.razas (id, rancho_id, nombre, clave, grupo, orden, creado_en, modificado_en, creado_por, modificado_por, eliminado_en) VALUES ('34e90852-6721-4a8d-8acf-6cc8cafd8df3', NULL, 'Montbéliarde', 'montbeliarde', 'leche', 34, '2026-11-12 16:16:59.992045+00', '2026-11-12 16:16:59.992045+00', NULL, NULL, NULL);
INSERT INTO public.razas (id, rancho_id, nombre, clave, grupo, orden, creado_en, modificado_en, creado_por, modificado_por, eliminado_en) VALUES ('201c23d9-1c97-4264-8e43-6d234ab814a7', NULL, 'Pardo Suizo', 'pardo suizo', 'leche', 35, '2026-11-12 16:16:59.992045+00', '2026-11-12 16:16:59.992045+00', NULL, NULL, NULL);
INSERT INTO public.razas (id, rancho_id, nombre, clave, grupo, orden, creado_en, modificado_en, creado_por, modificado_por, eliminado_en) VALUES ('2196d055-c0de-4b37-8c01-497f85555705', NULL, 'Red Sindhi', 'red sindhi', 'leche', 36, '2026-11-12 16:16:59.992045+00', '2026-11-12 16:16:59.992045+00', NULL, NULL, NULL);
INSERT INTO public.razas (id, rancho_id, nombre, clave, grupo, orden, creado_en, modificado_en, creado_por, modificado_por, eliminado_en) VALUES ('19db3c1d-4928-4c4e-a918-3afae9c230a9', NULL, 'Sahiwal', 'sahiwal', 'leche', 37, '2026-11-12 16:16:59.992045+00', '2026-11-12 16:16:59.992045+00', NULL, NULL, NULL);
INSERT INTO public.razas (id, rancho_id, nombre, clave, grupo, orden, creado_en, modificado_en, creado_por, modificado_por, eliminado_en) VALUES ('e890c3d5-3b3e-45f1-b1ef-17c4e8ebc6e2', NULL, 'Criollo', 'criollo', 'doble', 38, '2026-11-12 16:16:59.992045+00', '2026-11-12 16:16:59.992045+00', NULL, NULL, NULL);
INSERT INTO public.razas (id, rancho_id, nombre, clave, grupo, orden, creado_en, modificado_en, creado_por, modificado_por, eliminado_en) VALUES ('6bdc02fa-5fdd-4b20-af0f-a9b1a2a63245', NULL, 'Fleckvieh', 'fleckvieh', 'doble', 39, '2026-11-12 16:16:59.992045+00', '2026-11-12 16:16:59.992045+00', NULL, NULL, NULL);
INSERT INTO public.razas (id, rancho_id, nombre, clave, grupo, orden, creado_en, modificado_en, creado_por, modificado_por, eliminado_en) VALUES ('3f1148ee-e284-4727-9b3a-ff64faf680cb', NULL, 'Guzerá', 'guzera', 'doble', 40, '2026-11-12 16:16:59.992045+00', '2026-11-12 16:16:59.992045+00', NULL, NULL, NULL);
INSERT INTO public.razas (id, rancho_id, nombre, clave, grupo, orden, creado_en, modificado_en, creado_por, modificado_por, eliminado_en) VALUES ('d50f5d3b-5fce-47b1-874b-fb5e800faf76', NULL, 'Gyr', 'gyr', 'doble', 41, '2026-11-12 16:16:59.992045+00', '2026-11-12 16:16:59.992045+00', NULL, NULL, NULL);
INSERT INTO public.razas (id, rancho_id, nombre, clave, grupo, orden, creado_en, modificado_en, creado_por, modificado_por, eliminado_en) VALUES ('3ee82ad0-176e-4fdf-bf92-ac776ff4b6fb', NULL, 'Mestizo', 'mestizo', 'doble', 42, '2026-11-12 16:16:59.992045+00', '2026-11-12 16:16:59.992045+00', NULL, NULL, NULL);
INSERT INTO public.razas (id, rancho_id, nombre, clave, grupo, orden, creado_en, modificado_en, creado_por, modificado_por, eliminado_en) VALUES ('31b0670b-f00b-4b19-81be-1d9fc2957190', NULL, 'Normando', 'normando', 'doble', 43, '2026-11-12 16:16:59.992045+00', '2026-11-12 16:16:59.992045+00', NULL, NULL, NULL);
INSERT INTO public.razas (id, rancho_id, nombre, clave, grupo, orden, creado_en, modificado_en, creado_por, modificado_por, eliminado_en) VALUES ('9e9e472d-dab2-4399-8c29-7833be7283ae', NULL, 'Red Poll', 'red poll', 'doble', 44, '2026-11-12 16:16:59.992045+00', '2026-11-12 16:16:59.992045+00', NULL, NULL, NULL);
INSERT INTO public.razas (id, rancho_id, nombre, clave, grupo, orden, creado_en, modificado_en, creado_por, modificado_por, eliminado_en) VALUES ('224199c0-c647-493f-8e2c-547087011f79', NULL, 'Simmental', 'simmental', 'doble', 45, '2026-11-12 16:16:59.992045+00', '2026-11-12 16:16:59.992045+00', NULL, NULL, NULL);


ALTER TABLE public.razas ENABLE TRIGGER ALL;

--
-- Data for Name: sesiones; Type: TABLE DATA; Schema: public; Owner: -
--

ALTER TABLE public.sesiones DISABLE TRIGGER ALL;



ALTER TABLE public.sesiones ENABLE TRIGGER ALL;

--
-- Data for Name: tokens; Type: TABLE DATA; Schema: public; Owner: -
--

ALTER TABLE public.tokens DISABLE TRIGGER ALL;



ALTER TABLE public.tokens ENABLE TRIGGER ALL;

--
-- PostgreSQL database dump complete
--


