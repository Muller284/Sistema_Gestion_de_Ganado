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

INSERT INTO public.franjas_precio (codigo, nombre, multiplicador, creado_en, modificado_en, creado_por, modificado_por, eliminado_en) VALUES ('A', 'Franja A - Norteamerica, Europa occidental y Oceania', 1.00, '2026-11-18 17:44:54.798566+00', '2026-11-18 17:44:54.798566+00', NULL, NULL, NULL);
INSERT INTO public.franjas_precio (codigo, nombre, multiplicador, creado_en, modificado_en, creado_por, modificado_por, eliminado_en) VALUES ('B', 'Franja B - Cono Sur, Brasil, Mexico y Colombia', 0.60, '2026-11-18 17:44:54.798566+00', '2026-11-18 17:44:54.798566+00', NULL, NULL, NULL);
INSERT INTO public.franjas_precio (codigo, nombre, multiplicador, creado_en, modificado_en, creado_por, modificado_por, eliminado_en) VALUES ('C', 'Franja C - Bolivia, Paraguay, Peru y Centroamerica', 0.40, '2026-11-18 17:44:54.798566+00', '2026-11-18 17:44:54.798566+00', NULL, NULL, NULL);


ALTER TABLE public.franjas_precio ENABLE TRIGGER ALL;

--
-- Data for Name: paises; Type: TABLE DATA; Schema: public; Owner: -
--

ALTER TABLE public.paises DISABLE TRIGGER ALL;

INSERT INTO public.paises (codigo, nombre, idioma, moneda, unidad_peso, unidad_superficie, formato_fecha, zona_horaria, franja_precio_codigo, creado_en, modificado_en, creado_por, modificado_por, eliminado_en, franja_precio) VALUES ('BO', 'Bolivia', 'es', 'BOB', 'kg', 'ha', 'DD/MM/YYYY', 'America/La_Paz', 'C', '2026-11-18 17:44:54.798566+00', '2026-11-18 17:44:54.798566+00', NULL, NULL, NULL, 'Baja');
INSERT INTO public.paises (codigo, nombre, idioma, moneda, unidad_peso, unidad_superficie, formato_fecha, zona_horaria, franja_precio_codigo, creado_en, modificado_en, creado_por, modificado_por, eliminado_en, franja_precio) VALUES ('PY', 'Paraguay', 'es', 'PYG', 'kg', 'ha', 'DD/MM/YYYY', 'America/Asuncion', 'C', '2026-11-18 17:44:54.798566+00', '2026-11-18 17:44:54.798566+00', NULL, NULL, NULL, 'Baja');
INSERT INTO public.paises (codigo, nombre, idioma, moneda, unidad_peso, unidad_superficie, formato_fecha, zona_horaria, franja_precio_codigo, creado_en, modificado_en, creado_por, modificado_por, eliminado_en, franja_precio) VALUES ('PE', 'Peru', 'es', 'PEN', 'kg', 'ha', 'DD/MM/YYYY', 'America/Lima', 'C', '2026-11-18 17:44:54.798566+00', '2026-11-18 17:44:54.798566+00', NULL, NULL, NULL, 'Baja');
INSERT INTO public.paises (codigo, nombre, idioma, moneda, unidad_peso, unidad_superficie, formato_fecha, zona_horaria, franja_precio_codigo, creado_en, modificado_en, creado_por, modificado_por, eliminado_en, franja_precio) VALUES ('CO', 'Colombia', 'es', 'COP', 'kg', 'ha', 'DD/MM/YYYY', 'America/Bogota', 'B', '2026-11-18 17:44:54.798566+00', '2026-11-18 17:44:54.798566+00', NULL, NULL, NULL, 'Baja');
INSERT INTO public.paises (codigo, nombre, idioma, moneda, unidad_peso, unidad_superficie, formato_fecha, zona_horaria, franja_precio_codigo, creado_en, modificado_en, creado_por, modificado_por, eliminado_en, franja_precio) VALUES ('AR', 'Argentina', 'es', 'ARS', 'kg', 'ha', 'DD/MM/YYYY', 'America/Argentina/Buenos_Aires', 'B', '2026-11-18 17:44:54.798566+00', '2026-11-18 17:44:54.798566+00', NULL, NULL, NULL, 'Baja');
INSERT INTO public.paises (codigo, nombre, idioma, moneda, unidad_peso, unidad_superficie, formato_fecha, zona_horaria, franja_precio_codigo, creado_en, modificado_en, creado_por, modificado_por, eliminado_en, franja_precio) VALUES ('BR', 'Brasil', 'es', 'BRL', 'kg', 'ha', 'DD/MM/YYYY', 'America/Sao_Paulo', 'B', '2026-11-18 17:44:54.798566+00', '2026-11-18 17:44:54.798566+00', NULL, NULL, NULL, 'Baja');
INSERT INTO public.paises (codigo, nombre, idioma, moneda, unidad_peso, unidad_superficie, formato_fecha, zona_horaria, franja_precio_codigo, creado_en, modificado_en, creado_por, modificado_por, eliminado_en, franja_precio) VALUES ('MX', 'Mexico', 'es', 'MXN', 'kg', 'ha', 'DD/MM/YYYY', 'America/Mexico_City', 'B', '2026-11-18 17:44:54.798566+00', '2026-11-18 17:44:54.798566+00', NULL, NULL, NULL, 'Baja');
INSERT INTO public.paises (codigo, nombre, idioma, moneda, unidad_peso, unidad_superficie, formato_fecha, zona_horaria, franja_precio_codigo, creado_en, modificado_en, creado_por, modificado_por, eliminado_en, franja_precio) VALUES ('UY', 'Uruguay', 'es', 'UYU', 'kg', 'ha', 'DD/MM/YYYY', 'America/Montevideo', 'B', '2026-11-18 17:44:54.798566+00', '2026-11-18 17:44:54.798566+00', NULL, NULL, NULL, 'Baja');
INSERT INTO public.paises (codigo, nombre, idioma, moneda, unidad_peso, unidad_superficie, formato_fecha, zona_horaria, franja_precio_codigo, creado_en, modificado_en, creado_por, modificado_por, eliminado_en, franja_precio) VALUES ('CL', 'Chile', 'es', 'CLP', 'kg', 'ha', 'DD/MM/YYYY', 'America/Santiago', 'B', '2026-11-18 17:44:54.798566+00', '2026-11-18 17:44:54.798566+00', NULL, NULL, NULL, 'Baja');
INSERT INTO public.paises (codigo, nombre, idioma, moneda, unidad_peso, unidad_superficie, formato_fecha, zona_horaria, franja_precio_codigo, creado_en, modificado_en, creado_por, modificado_por, eliminado_en, franja_precio) VALUES ('US', 'Estados Unidos', 'en', 'USD', 'lb', 'acre', 'MM/DD/YYYY', 'America/Chicago', 'A', '2026-11-18 17:44:54.798566+00', '2026-11-18 17:44:54.798566+00', NULL, NULL, NULL, 'Baja');


ALTER TABLE public.paises ENABLE TRIGGER ALL;

--
-- Data for Name: usuarios; Type: TABLE DATA; Schema: public; Owner: -
--

ALTER TABLE public.usuarios DISABLE TRIGGER ALL;

INSERT INTO public.usuarios (id, nombre, correo, contrasena_hash, correo_verificado, debe_cambiar_contrasena, estado, rancho_id, rol, tipo_colaborador_id, intentos_fallidos, bloqueado_hasta, creado_en, modificado_en, creado_por, modificado_por, eliminado_en, pais_codigo, idioma) VALUES ('a1000000-0000-4000-8000-000000000001', 'Carlos Gutierrez Mendoza', 'carlos.gutierrez@elcerrito.bo', 'scrypt$16384$8$1$AK6L1S+M3zd44oJxvHmChA==$HTqW1TQbd1JkToko/T2reLf9KE6Z9XZ5QzLGjPMbeyc=', true, false, 'activo', 'a0000000-0000-4000-8000-000000000001', 'propietario', NULL, 0, NULL, '2026-11-18 17:44:55.067064+00', '2026-11-18 17:44:55.067064+00', 'a1000000-0000-4000-8000-000000000001', 'a1000000-0000-4000-8000-000000000001', NULL, NULL, NULL);
INSERT INTO public.usuarios (id, nombre, correo, contrasena_hash, correo_verificado, debe_cambiar_contrasena, estado, rancho_id, rol, tipo_colaborador_id, intentos_fallidos, bloqueado_hasta, creado_en, modificado_en, creado_por, modificado_por, eliminado_en, pais_codigo, idioma) VALUES ('a1000000-0000-4000-8000-000000000002', 'Maria Rene Aguilera Paz', 'mrene.aguilera@elcerrito.bo', 'scrypt$16384$8$1$AK6L1S+M3zd44oJxvHmChA==$HTqW1TQbd1JkToko/T2reLf9KE6Z9XZ5QzLGjPMbeyc=', true, false, 'activo', 'a0000000-0000-4000-8000-000000000001', 'socio', NULL, 0, NULL, '2026-11-18 17:44:55.067064+00', '2026-11-18 17:44:55.067064+00', 'a1000000-0000-4000-8000-000000000001', 'a1000000-0000-4000-8000-000000000001', NULL, NULL, NULL);
INSERT INTO public.usuarios (id, nombre, correo, contrasena_hash, correo_verificado, debe_cambiar_contrasena, estado, rancho_id, rol, tipo_colaborador_id, intentos_fallidos, bloqueado_hasta, creado_en, modificado_en, creado_por, modificado_por, eliminado_en, pais_codigo, idioma) VALUES ('a1000000-0000-4000-8000-000000000003', 'Dr. Jorge Soliz Prado', 'jorge.soliz@elcerrito.bo', 'scrypt$16384$8$1$AK6L1S+M3zd44oJxvHmChA==$HTqW1TQbd1JkToko/T2reLf9KE6Z9XZ5QzLGjPMbeyc=', true, false, 'activo', 'a0000000-0000-4000-8000-000000000001', 'colaborador', '11111111-1111-4111-8111-000000000001', 0, NULL, '2026-11-18 17:44:55.067064+00', '2026-11-18 17:44:55.067064+00', 'a1000000-0000-4000-8000-000000000001', 'a1000000-0000-4000-8000-000000000001', NULL, NULL, NULL);
INSERT INTO public.usuarios (id, nombre, correo, contrasena_hash, correo_verificado, debe_cambiar_contrasena, estado, rancho_id, rol, tipo_colaborador_id, intentos_fallidos, bloqueado_hasta, creado_en, modificado_en, creado_por, modificado_por, eliminado_en, pais_codigo, idioma) VALUES ('a1000000-0000-4000-8000-000000000004', 'Roberto Justiniano Saucedo', 'roberto.justiniano@elcerrito.bo', 'scrypt$16384$8$1$AK6L1S+M3zd44oJxvHmChA==$HTqW1TQbd1JkToko/T2reLf9KE6Z9XZ5QzLGjPMbeyc=', true, false, 'activo', 'a0000000-0000-4000-8000-000000000001', 'colaborador', '11111111-1111-4111-8111-000000000002', 0, NULL, '2026-11-18 17:44:55.067064+00', '2026-11-18 17:44:55.067064+00', 'a1000000-0000-4000-8000-000000000001', 'a1000000-0000-4000-8000-000000000001', NULL, NULL, NULL);
INSERT INTO public.usuarios (id, nombre, correo, contrasena_hash, correo_verificado, debe_cambiar_contrasena, estado, rancho_id, rol, tipo_colaborador_id, intentos_fallidos, bloqueado_hasta, creado_en, modificado_en, creado_por, modificado_por, eliminado_en, pais_codigo, idioma) VALUES ('a1000000-0000-4000-8000-000000000005', 'Gonzalo Chavez Roca', 'gonzalo.chavez@elcerrito.bo', 'scrypt$16384$8$1$AK6L1S+M3zd44oJxvHmChA==$HTqW1TQbd1JkToko/T2reLf9KE6Z9XZ5QzLGjPMbeyc=', true, false, 'activo', 'a0000000-0000-4000-8000-000000000001', 'colaborador', '11111111-1111-4111-8111-000000000003', 0, NULL, '2026-11-18 17:44:55.067064+00', '2026-11-18 17:44:55.067064+00', 'a1000000-0000-4000-8000-000000000001', 'a1000000-0000-4000-8000-000000000001', NULL, NULL, NULL);
INSERT INTO public.usuarios (id, nombre, correo, contrasena_hash, correo_verificado, debe_cambiar_contrasena, estado, rancho_id, rol, tipo_colaborador_id, intentos_fallidos, bloqueado_hasta, creado_en, modificado_en, creado_por, modificado_por, eliminado_en, pais_codigo, idioma) VALUES ('a1000000-0000-4000-8000-000000000006', 'Valeria Mercado Vaca', 'valeria.mercado@elcerrito.bo', 'scrypt$16384$8$1$AK6L1S+M3zd44oJxvHmChA==$HTqW1TQbd1JkToko/T2reLf9KE6Z9XZ5QzLGjPMbeyc=', true, false, 'activo', 'a0000000-0000-4000-8000-000000000001', 'colaborador', '11111111-1111-4111-8111-000000000004', 0, NULL, '2026-11-18 17:44:55.067064+00', '2026-11-18 17:44:55.067064+00', 'a1000000-0000-4000-8000-000000000001', 'a1000000-0000-4000-8000-000000000001', NULL, NULL, NULL);
INSERT INTO public.usuarios (id, nombre, correo, contrasena_hash, correo_verificado, debe_cambiar_contrasena, estado, rancho_id, rol, tipo_colaborador_id, intentos_fallidos, bloqueado_hasta, creado_en, modificado_en, creado_por, modificado_por, eliminado_en, pais_codigo, idioma) VALUES ('b1000000-0000-4000-8000-000000000001', 'Fernando Torrico Camacho', 'fernando.torrico@lafloresta.bo', 'scrypt$16384$8$1$AK6L1S+M3zd44oJxvHmChA==$HTqW1TQbd1JkToko/T2reLf9KE6Z9XZ5QzLGjPMbeyc=', true, false, 'activo', 'b0000000-0000-4000-8000-000000000002', 'propietario', NULL, 0, NULL, '2026-11-18 17:44:55.067064+00', '2026-11-18 17:44:55.067064+00', 'b1000000-0000-4000-8000-000000000001', 'b1000000-0000-4000-8000-000000000001', NULL, NULL, NULL);
INSERT INTO public.usuarios (id, nombre, correo, contrasena_hash, correo_verificado, debe_cambiar_contrasena, estado, rancho_id, rol, tipo_colaborador_id, intentos_fallidos, bloqueado_hasta, creado_en, modificado_en, creado_por, modificado_por, eliminado_en, pais_codigo, idioma) VALUES ('b1000000-0000-4000-8000-000000000002', 'Patricia Villarroel Rios', 'patricia.villarroel@lafloresta.bo', 'scrypt$16384$8$1$AK6L1S+M3zd44oJxvHmChA==$HTqW1TQbd1JkToko/T2reLf9KE6Z9XZ5QzLGjPMbeyc=', true, false, 'activo', 'b0000000-0000-4000-8000-000000000002', 'socio', NULL, 0, NULL, '2026-11-18 17:44:55.067064+00', '2026-11-18 17:44:55.067064+00', 'b1000000-0000-4000-8000-000000000001', 'b1000000-0000-4000-8000-000000000001', NULL, NULL, NULL);
INSERT INTO public.usuarios (id, nombre, correo, contrasena_hash, correo_verificado, debe_cambiar_contrasena, estado, rancho_id, rol, tipo_colaborador_id, intentos_fallidos, bloqueado_hasta, creado_en, modificado_en, creado_por, modificado_por, eliminado_en, pais_codigo, idioma) VALUES ('b1000000-0000-4000-8000-000000000003', 'Dra. Lucia Morales Arteaga', 'lucia.morales@lafloresta.bo', 'scrypt$16384$8$1$AK6L1S+M3zd44oJxvHmChA==$HTqW1TQbd1JkToko/T2reLf9KE6Z9XZ5QzLGjPMbeyc=', true, false, 'activo', 'b0000000-0000-4000-8000-000000000002', 'colaborador', '11111111-1111-4111-8111-000000000001', 0, NULL, '2026-11-18 17:44:55.067064+00', '2026-11-18 17:44:55.067064+00', 'b1000000-0000-4000-8000-000000000001', 'b1000000-0000-4000-8000-000000000001', NULL, NULL, NULL);
INSERT INTO public.usuarios (id, nombre, correo, contrasena_hash, correo_verificado, debe_cambiar_contrasena, estado, rancho_id, rol, tipo_colaborador_id, intentos_fallidos, bloqueado_hasta, creado_en, modificado_en, creado_por, modificado_por, eliminado_en, pais_codigo, idioma) VALUES ('b1000000-0000-4000-8000-000000000004', 'Walter Fernandez Claure', 'walter.fernandez@lafloresta.bo', 'scrypt$16384$8$1$AK6L1S+M3zd44oJxvHmChA==$HTqW1TQbd1JkToko/T2reLf9KE6Z9XZ5QzLGjPMbeyc=', true, false, 'activo', 'b0000000-0000-4000-8000-000000000002', 'colaborador', '11111111-1111-4111-8111-000000000002', 0, NULL, '2026-11-18 17:44:55.067064+00', '2026-11-18 17:44:55.067064+00', 'b1000000-0000-4000-8000-000000000001', 'b1000000-0000-4000-8000-000000000001', NULL, NULL, NULL);
INSERT INTO public.usuarios (id, nombre, correo, contrasena_hash, correo_verificado, debe_cambiar_contrasena, estado, rancho_id, rol, tipo_colaborador_id, intentos_fallidos, bloqueado_hasta, creado_en, modificado_en, creado_por, modificado_por, eliminado_en, pais_codigo, idioma) VALUES ('f0000000-0000-4000-8000-000000000001', 'Soporte Central Plataforma Ganado', 'soporte@plataforma.bo', 'scrypt$16384$8$1$AK6L1S+M3zd44oJxvHmChA==$HTqW1TQbd1JkToko/T2reLf9KE6Z9XZ5QzLGjPMbeyc=', true, false, 'activo', NULL, 'admin_plataforma', NULL, 0, NULL, '2026-11-18 17:44:55.067064+00', '2026-11-18 17:44:55.067064+00', 'f0000000-0000-4000-8000-000000000001', 'f0000000-0000-4000-8000-000000000001', NULL, NULL, NULL);
INSERT INTO public.usuarios (id, nombre, correo, contrasena_hash, correo_verificado, debe_cambiar_contrasena, estado, rancho_id, rol, tipo_colaborador_id, intentos_fallidos, bloqueado_hasta, creado_en, modificado_en, creado_por, modificado_por, eliminado_en, pais_codigo, idioma) VALUES ('c1000000-0000-4000-8000-000000000001', 'Ariel Camacho Peredo', 'ariel.camacho@correo.bo', 'scrypt$16384$8$1$AK6L1S+M3zd44oJxvHmChA==$HTqW1TQbd1JkToko/T2reLf9KE6Z9XZ5QzLGjPMbeyc=', true, false, 'activo', NULL, 'propietario', NULL, 0, NULL, '2026-11-18 17:44:55.067064+00', '2026-11-18 17:44:55.067064+00', 'c1000000-0000-4000-8000-000000000001', 'c1000000-0000-4000-8000-000000000001', NULL, NULL, NULL);
INSERT INTO public.usuarios (id, nombre, correo, contrasena_hash, correo_verificado, debe_cambiar_contrasena, estado, rancho_id, rol, tipo_colaborador_id, intentos_fallidos, bloqueado_hasta, creado_en, modificado_en, creado_por, modificado_por, eliminado_en, pais_codigo, idioma) VALUES ('c1000000-0000-4000-8000-000000000002', 'Lucia Mendez Soliz', 'lucia.mendez@correo.bo', 'scrypt$16384$8$1$AK6L1S+M3zd44oJxvHmChA==$HTqW1TQbd1JkToko/T2reLf9KE6Z9XZ5QzLGjPMbeyc=', false, false, 'activo', NULL, 'propietario', NULL, 0, NULL, '2026-11-18 17:44:55.067064+00', '2026-11-18 17:44:55.067064+00', 'c1000000-0000-4000-8000-000000000002', 'c1000000-0000-4000-8000-000000000002', NULL, NULL, NULL);
INSERT INTO public.usuarios (id, nombre, correo, contrasena_hash, correo_verificado, debe_cambiar_contrasena, estado, rancho_id, rol, tipo_colaborador_id, intentos_fallidos, bloqueado_hasta, creado_en, modificado_en, creado_por, modificado_por, eliminado_en, pais_codigo, idioma) VALUES ('c1000000-0000-4000-8000-000000000003', 'Ruben Quispe Mamani', 'ruben.quispe@elcerrito.bo', 'scrypt$16384$8$1$BC9d4mFQrtZ0nYkACIKRyw==$5/wJKm80OOXZWPd+yeeUet5biHEBEEjXa7HikSDAkrM=', true, true, 'activo', 'a0000000-0000-4000-8000-000000000001', 'colaborador', '11111111-1111-4111-8111-000000000002', 0, NULL, '2026-11-18 17:44:55.067064+00', '2026-11-18 17:44:55.067064+00', 'a1000000-0000-4000-8000-000000000001', 'a1000000-0000-4000-8000-000000000001', NULL, NULL, NULL);


ALTER TABLE public.usuarios ENABLE TRIGGER ALL;

--
-- Data for Name: ranchos; Type: TABLE DATA; Schema: public; Owner: -
--

ALTER TABLE public.ranchos DISABLE TRIGGER ALL;

INSERT INTO public.ranchos (id, nombre, departamento, localidad, latitud, longitud, superficie, tipo_produccion, pais_codigo, propietario_id, creado_en, modificado_en, creado_por, modificado_por, eliminado_en, guia_pausada_en) VALUES ('a0000000-0000-4000-8000-000000000001', 'Rancho El Cerrito', 'Santa Cruz', 'Warnes', -17.51470000, -63.16610000, 850.50, 'carne', 'BO', 'a1000000-0000-4000-8000-000000000001', '2026-11-18 17:44:55.067064+00', '2026-11-18 17:44:55.067064+00', 'a1000000-0000-4000-8000-000000000001', 'a1000000-0000-4000-8000-000000000001', NULL, NULL);
INSERT INTO public.ranchos (id, nombre, departamento, localidad, latitud, longitud, superficie, tipo_produccion, pais_codigo, propietario_id, creado_en, modificado_en, creado_por, modificado_por, eliminado_en, guia_pausada_en) VALUES ('b0000000-0000-4000-8000-000000000002', 'Hacienda La Floresta', 'Cochabamba', 'Quillacollo', -17.39350000, -66.27980000, 320.00, 'leche', 'BO', 'b1000000-0000-4000-8000-000000000001', '2026-11-18 17:44:55.067064+00', '2026-11-18 17:44:55.067064+00', 'b1000000-0000-4000-8000-000000000001', 'b1000000-0000-4000-8000-000000000001', NULL, NULL);


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

INSERT INTO public.categorias_animal (codigo, orden, creado_en, modificado_en, creado_por, modificado_por, eliminado_en) VALUES ('ternero', 1, '2026-11-18 17:44:54.884033+00', '2026-11-18 17:44:54.884033+00', NULL, NULL, NULL);
INSERT INTO public.categorias_animal (codigo, orden, creado_en, modificado_en, creado_por, modificado_por, eliminado_en) VALUES ('ternera', 2, '2026-11-18 17:44:54.884033+00', '2026-11-18 17:44:54.884033+00', NULL, NULL, NULL);
INSERT INTO public.categorias_animal (codigo, orden, creado_en, modificado_en, creado_por, modificado_por, eliminado_en) VALUES ('torito', 3, '2026-11-18 17:44:54.884033+00', '2026-11-18 17:44:54.884033+00', NULL, NULL, NULL);
INSERT INTO public.categorias_animal (codigo, orden, creado_en, modificado_en, creado_por, modificado_por, eliminado_en) VALUES ('vaquilla', 4, '2026-11-18 17:44:54.884033+00', '2026-11-18 17:44:54.884033+00', NULL, NULL, NULL);
INSERT INTO public.categorias_animal (codigo, orden, creado_en, modificado_en, creado_por, modificado_por, eliminado_en) VALUES ('novillo', 5, '2026-11-18 17:44:54.884033+00', '2026-11-18 17:44:54.884033+00', NULL, NULL, NULL);
INSERT INTO public.categorias_animal (codigo, orden, creado_en, modificado_en, creado_por, modificado_por, eliminado_en) VALUES ('vaca', 6, '2026-11-18 17:44:54.884033+00', '2026-11-18 17:44:54.884033+00', NULL, NULL, NULL);
INSERT INTO public.categorias_animal (codigo, orden, creado_en, modificado_en, creado_por, modificado_por, eliminado_en) VALUES ('toro', 7, '2026-11-18 17:44:54.884033+00', '2026-11-18 17:44:54.884033+00', NULL, NULL, NULL);
INSERT INTO public.categorias_animal (codigo, orden, creado_en, modificado_en, creado_por, modificado_por, eliminado_en) VALUES ('buey', 8, '2026-11-18 17:44:54.884033+00', '2026-11-18 17:44:54.884033+00', NULL, NULL, NULL);


ALTER TABLE public.categorias_animal ENABLE TRIGGER ALL;

--
-- Data for Name: corrales; Type: TABLE DATA; Schema: public; Owner: -
--

ALTER TABLE public.corrales DISABLE TRIGGER ALL;

INSERT INTO public.corrales (id, rancho_id, nombre, capacidad, superficie_ha, creado_en, modificado_en, creado_por, modificado_por, eliminado_en) VALUES ('cc000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000001', 'Potrero Las Lomas', 20, 25.0000, '2026-11-18 17:44:55.077142+00', '2026-11-18 17:44:55.077142+00', 'a1000000-0000-4000-8000-000000000001', 'a1000000-0000-4000-8000-000000000001', NULL);
INSERT INTO public.corrales (id, rancho_id, nombre, capacidad, superficie_ha, creado_en, modificado_en, creado_por, modificado_por, eliminado_en) VALUES ('cc000000-0000-4000-8000-000000000002', 'a0000000-0000-4000-8000-000000000001', 'Potrero del Río', 10, 12.0000, '2026-11-18 17:44:55.077142+00', '2026-11-18 17:44:55.077142+00', 'a1000000-0000-4000-8000-000000000001', 'a1000000-0000-4000-8000-000000000001', NULL);


ALTER TABLE public.corrales ENABLE TRIGGER ALL;

--
-- Data for Name: animales; Type: TABLE DATA; Schema: public; Owner: -
--

ALTER TABLE public.animales DISABLE TRIGGER ALL;

INSERT INTO public.animales (id, rancho_id, identificador, tipo_identificador, nombre, raza, sexo, categoria_codigo, fecha_nacimiento, origen, corral_id, peso_kg, estado, creado_en, modificado_en, creado_por, modificado_por, eliminado_en) VALUES ('d2000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000002', '0501', 'caravana', 'Blanca', 'Holstein', 'hembra', 'vaca', '2021-01-10', 'comprado', NULL, 540.00, 'activo', '2026-05-20 12:00:00+00', '2026-11-18 17:44:55.077142+00', 'b1000000-0000-4000-8000-000000000001', 'b1000000-0000-4000-8000-000000000001', NULL);
INSERT INTO public.animales (id, rancho_id, identificador, tipo_identificador, nombre, raza, sexo, categoria_codigo, fecha_nacimiento, origen, corral_id, peso_kg, estado, creado_en, modificado_en, creado_por, modificado_por, eliminado_en) VALUES ('d2000000-0000-4000-8000-000000000002', 'b0000000-0000-4000-8000-000000000002', '0502', 'caravana', 'Manchada', 'Girolando', 'hembra', 'vaca', '2020-11-25', 'comprado', NULL, 498.00, 'activo', '2026-05-20 12:05:00+00', '2026-11-18 17:44:55.077142+00', 'b1000000-0000-4000-8000-000000000001', 'b1000000-0000-4000-8000-000000000001', NULL);
INSERT INTO public.animales (id, rancho_id, identificador, tipo_identificador, nombre, raza, sexo, categoria_codigo, fecha_nacimiento, origen, corral_id, peso_kg, estado, creado_en, modificado_en, creado_por, modificado_por, eliminado_en) VALUES ('d1000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000001', '0501', 'caravana', 'Lucera', 'Nelore', 'hembra', 'vaca', '2021-03-14', 'nacido', 'cc000000-0000-4000-8000-000000000001', 468.00, 'activo', '2026-03-02 14:00:00+00', '2026-11-18 17:44:55.077142+00', 'a1000000-0000-4000-8000-000000000001', 'a1000000-0000-4000-8000-000000000001', NULL);
INSERT INTO public.animales (id, rancho_id, identificador, tipo_identificador, nombre, raza, sexo, categoria_codigo, fecha_nacimiento, origen, corral_id, peso_kg, estado, creado_en, modificado_en, creado_por, modificado_por, eliminado_en) VALUES ('d1000000-0000-4000-8000-000000000002', 'a0000000-0000-4000-8000-000000000001', '0502', 'caravana', 'Canela', 'Brahman', 'hembra', 'vaca', '2020-09-02', 'comprado', 'cc000000-0000-4000-8000-000000000001', 455.00, 'activo', '2026-03-02 14:05:00+00', '2026-11-18 17:44:55.077142+00', 'a1000000-0000-4000-8000-000000000001', 'a1000000-0000-4000-8000-000000000001', NULL);
INSERT INTO public.animales (id, rancho_id, identificador, tipo_identificador, nombre, raza, sexo, categoria_codigo, fecha_nacimiento, origen, corral_id, peso_kg, estado, creado_en, modificado_en, creado_por, modificado_por, eliminado_en) VALUES ('d1000000-0000-4000-8000-000000000005', 'a0000000-0000-4000-8000-000000000001', '0505', 'caravana', 'Chispa', 'Nelore', 'hembra', 'ternera', '2026-06-05', 'nacido', 'cc000000-0000-4000-8000-000000000001', 118.00, 'activo', '2026-06-05 22:00:00+00', '2026-11-18 17:44:55.077142+00', 'a1000000-0000-4000-8000-000000000001', 'a1000000-0000-4000-8000-000000000001', NULL);
INSERT INTO public.animales (id, rancho_id, identificador, tipo_identificador, nombre, raza, sexo, categoria_codigo, fecha_nacimiento, origen, corral_id, peso_kg, estado, creado_en, modificado_en, creado_por, modificado_por, eliminado_en) VALUES ('d1000000-0000-4000-8000-000000000006', 'a0000000-0000-4000-8000-000000000001', '0506', 'caravana', 'Sultan', 'Nelore', 'macho', 'toro', '2019-04-18', 'comprado', 'cc000000-0000-4000-8000-000000000001', 805.00, 'activo', '2026-03-02 14:10:00+00', '2026-11-18 17:44:55.077142+00', 'a1000000-0000-4000-8000-000000000001', 'a1000000-0000-4000-8000-000000000001', NULL);
INSERT INTO public.animales (id, rancho_id, identificador, tipo_identificador, nombre, raza, sexo, categoria_codigo, fecha_nacimiento, origen, corral_id, peso_kg, estado, creado_en, modificado_en, creado_por, modificado_por, eliminado_en) VALUES ('d1000000-0000-4000-8000-000000000003', 'a0000000-0000-4000-8000-000000000001', '0503', 'caravana', NULL, 'Nelore', 'macho', 'novillo', '2024-07-20', 'nacido', 'cc000000-0000-4000-8000-000000000002', 402.00, 'activo', '2026-04-15 13:00:00+00', '2026-11-18 17:44:55.077142+00', 'a1000000-0000-4000-8000-000000000001', 'a1000000-0000-4000-8000-000000000001', NULL);
INSERT INTO public.animales (id, rancho_id, identificador, tipo_identificador, nombre, raza, sexo, categoria_codigo, fecha_nacimiento, origen, corral_id, peso_kg, estado, creado_en, modificado_en, creado_por, modificado_por, eliminado_en) VALUES ('d1000000-0000-4000-8000-000000000004', 'a0000000-0000-4000-8000-000000000001', '0504', 'caravana', NULL, 'Mestizo', 'macho', 'novillo', '2024-08-11', 'nacido', 'cc000000-0000-4000-8000-000000000002', 371.00, 'activo', '2026-05-03 13:00:00+00', '2026-11-18 17:44:55.077142+00', 'a1000000-0000-4000-8000-000000000001', 'a1000000-0000-4000-8000-000000000001', NULL);
INSERT INTO public.animales (id, rancho_id, identificador, tipo_identificador, nombre, raza, sexo, categoria_codigo, fecha_nacimiento, origen, corral_id, peso_kg, estado, creado_en, modificado_en, creado_por, modificado_por, eliminado_en) VALUES ('d1000000-0000-4000-8000-000000000007', 'a0000000-0000-4000-8000-000000000001', '0507', 'caravana', NULL, 'Nelore', 'macho', 'novillo', '2024-06-10', 'comprado', NULL, 430.00, 'vendido', '2026-04-15 13:05:00+00', '2026-11-18 17:44:55.077142+00', 'a1000000-0000-4000-8000-000000000001', 'a1000000-0000-4000-8000-000000000001', NULL);


ALTER TABLE public.animales ENABLE TRIGGER ALL;

--
-- Data for Name: productos_sanitarios; Type: TABLE DATA; Schema: public; Owner: -
--

ALTER TABLE public.productos_sanitarios DISABLE TRIGGER ALL;

INSERT INTO public.productos_sanitarios (id, rancho_id, nombre, clave, tipo, laboratorio, dosis, unidad, creado_en, modificado_en, creado_por, modificado_por, eliminado_en) VALUES ('e1000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000001', 'Vacuna antiaftosa', 'vacuna antiaftosa', 'vacuna', 'Biogénesis Bagó', 2.00, 'ml', '2026-11-18 17:44:55.077142+00', '2026-11-18 17:44:55.077142+00', 'a1000000-0000-4000-8000-000000000003', 'a1000000-0000-4000-8000-000000000003', NULL);
INSERT INTO public.productos_sanitarios (id, rancho_id, nombre, clave, tipo, laboratorio, dosis, unidad, creado_en, modificado_en, creado_por, modificado_por, eliminado_en) VALUES ('e1000000-0000-4000-8000-000000000002', 'a0000000-0000-4000-8000-000000000001', 'Brucelosis RB51', 'brucelosis rb51', 'vacuna', NULL, 2.00, 'ml', '2026-11-18 17:44:55.077142+00', '2026-11-18 17:44:55.077142+00', 'a1000000-0000-4000-8000-000000000003', 'a1000000-0000-4000-8000-000000000003', NULL);
INSERT INTO public.productos_sanitarios (id, rancho_id, nombre, clave, tipo, laboratorio, dosis, unidad, creado_en, modificado_en, creado_por, modificado_por, eliminado_en) VALUES ('e1000000-0000-4000-8000-000000000003', 'a0000000-0000-4000-8000-000000000001', 'Ivermectina 1%', 'ivermectina 1%', 'antiparasitario', NULL, 5.00, 'ml', '2026-11-18 17:44:55.077142+00', '2026-11-18 17:44:55.077142+00', 'a1000000-0000-4000-8000-000000000003', 'a1000000-0000-4000-8000-000000000003', NULL);
INSERT INTO public.productos_sanitarios (id, rancho_id, nombre, clave, tipo, laboratorio, dosis, unidad, creado_en, modificado_en, creado_por, modificado_por, eliminado_en) VALUES ('e1000000-0000-4000-8000-000000000004', 'a0000000-0000-4000-8000-000000000001', 'Vitamina ADE', 'vitamina ade', 'vitamina', NULL, NULL, NULL, '2026-11-18 17:44:55.077142+00', '2026-11-18 17:44:55.077142+00', 'a1000000-0000-4000-8000-000000000003', 'a1000000-0000-4000-8000-000000000003', NULL);
INSERT INTO public.productos_sanitarios (id, rancho_id, nombre, clave, tipo, laboratorio, dosis, unidad, creado_en, modificado_en, creado_por, modificado_por, eliminado_en) VALUES ('e2000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000002', 'Vacuna antiaftosa', 'vacuna antiaftosa', 'vacuna', NULL, 2.00, 'ml', '2026-11-18 17:44:55.077142+00', '2026-11-18 17:44:55.077142+00', 'b1000000-0000-4000-8000-000000000003', 'b1000000-0000-4000-8000-000000000003', NULL);


ALTER TABLE public.productos_sanitarios ENABLE TRIGGER ALL;

--
-- Data for Name: esquemas_vacunacion; Type: TABLE DATA; Schema: public; Owner: -
--

ALTER TABLE public.esquemas_vacunacion DISABLE TRIGGER ALL;

INSERT INTO public.esquemas_vacunacion (id, rancho_id, producto_id, nombre, categorias, sexo, edad_minima_meses, edad_maxima_meses, dosis, intervalo_dias, refuerzo_dias, creado_en, modificado_en, creado_por, modificado_por, eliminado_en) VALUES ('e1000000-0000-4000-8000-000000000101', 'a0000000-0000-4000-8000-000000000001', 'e1000000-0000-4000-8000-000000000001', 'Aftosa (todo el rodeo)', NULL, NULL, 0, NULL, 1, NULL, 180, '2026-03-01 00:00:00+00', '2026-11-18 17:44:55.077142+00', 'a1000000-0000-4000-8000-000000000001', 'a1000000-0000-4000-8000-000000000001', NULL);
INSERT INTO public.esquemas_vacunacion (id, rancho_id, producto_id, nombre, categorias, sexo, edad_minima_meses, edad_maxima_meses, dosis, intervalo_dias, refuerzo_dias, creado_en, modificado_en, creado_por, modificado_por, eliminado_en) VALUES ('e1000000-0000-4000-8000-000000000102', 'a0000000-0000-4000-8000-000000000001', 'e1000000-0000-4000-8000-000000000002', 'Brucelosis (terneras)', '{ternera}', 'hembra', 3, 8, 1, NULL, NULL, '2026-03-01 00:00:00+00', '2026-11-18 17:44:55.077142+00', 'a1000000-0000-4000-8000-000000000001', 'a1000000-0000-4000-8000-000000000001', NULL);
INSERT INTO public.esquemas_vacunacion (id, rancho_id, producto_id, nombre, categorias, sexo, edad_minima_meses, edad_maxima_meses, dosis, intervalo_dias, refuerzo_dias, creado_en, modificado_en, creado_por, modificado_por, eliminado_en) VALUES ('e1000000-0000-4000-8000-000000000103', 'a0000000-0000-4000-8000-000000000001', 'e1000000-0000-4000-8000-000000000004', 'Vitamina ADE (vacas)', '{vaca}', 'hembra', 0, NULL, 1, NULL, 120, '2026-03-01 00:00:00+00', '2026-11-18 17:44:55.077142+00', 'a1000000-0000-4000-8000-000000000001', 'a1000000-0000-4000-8000-000000000001', NULL);
INSERT INTO public.esquemas_vacunacion (id, rancho_id, producto_id, nombre, categorias, sexo, edad_minima_meses, edad_maxima_meses, dosis, intervalo_dias, refuerzo_dias, creado_en, modificado_en, creado_por, modificado_por, eliminado_en) VALUES ('e2000000-0000-4000-8000-000000000101', 'b0000000-0000-4000-8000-000000000002', 'e2000000-0000-4000-8000-000000000001', 'Aftosa (todo el rodeo)', NULL, NULL, 0, NULL, 1, NULL, 180, '2026-03-01 00:00:00+00', '2026-11-18 17:44:55.077142+00', 'b1000000-0000-4000-8000-000000000001', 'b1000000-0000-4000-8000-000000000001', NULL);


ALTER TABLE public.esquemas_vacunacion ENABLE TRIGGER ALL;

--
-- Data for Name: aplicaciones_sanitarias; Type: TABLE DATA; Schema: public; Owner: -
--

ALTER TABLE public.aplicaciones_sanitarias DISABLE TRIGGER ALL;

INSERT INTO public.aplicaciones_sanitarias (id, rancho_id, animal_id, producto_id, esquema_id, numero_dosis, fecha, dosis, aplicado_por, observacion, lote_id, creado_en, modificado_en, creado_por, modificado_por, eliminado_en) VALUES ('f1000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000001', 'd1000000-0000-4000-8000-000000000001', 'e1000000-0000-4000-8000-000000000001', 'e1000000-0000-4000-8000-000000000101', 1, '2026-05-12', 2.00, 'a1000000-0000-4000-8000-000000000003', 'Campaña de mayo', 'f1000000-0000-4000-8000-0000000000aa', '2026-11-18 17:44:55.077142+00', '2026-11-18 17:44:55.077142+00', 'a1000000-0000-4000-8000-000000000003', 'a1000000-0000-4000-8000-000000000003', NULL);
INSERT INTO public.aplicaciones_sanitarias (id, rancho_id, animal_id, producto_id, esquema_id, numero_dosis, fecha, dosis, aplicado_por, observacion, lote_id, creado_en, modificado_en, creado_por, modificado_por, eliminado_en) VALUES ('f1000000-0000-4000-8000-000000000002', 'a0000000-0000-4000-8000-000000000001', 'd1000000-0000-4000-8000-000000000002', 'e1000000-0000-4000-8000-000000000001', 'e1000000-0000-4000-8000-000000000101', 1, '2026-05-12', 2.00, 'a1000000-0000-4000-8000-000000000003', 'Campaña de mayo', 'f1000000-0000-4000-8000-0000000000aa', '2026-11-18 17:44:55.077142+00', '2026-11-18 17:44:55.077142+00', 'a1000000-0000-4000-8000-000000000003', 'a1000000-0000-4000-8000-000000000003', NULL);
INSERT INTO public.aplicaciones_sanitarias (id, rancho_id, animal_id, producto_id, esquema_id, numero_dosis, fecha, dosis, aplicado_por, observacion, lote_id, creado_en, modificado_en, creado_por, modificado_por, eliminado_en) VALUES ('f1000000-0000-4000-8000-000000000003', 'a0000000-0000-4000-8000-000000000001', 'd1000000-0000-4000-8000-000000000003', 'e1000000-0000-4000-8000-000000000001', 'e1000000-0000-4000-8000-000000000101', 1, '2026-05-12', 2.00, 'a1000000-0000-4000-8000-000000000003', 'Campaña de mayo', 'f1000000-0000-4000-8000-0000000000aa', '2026-11-18 17:44:55.077142+00', '2026-11-18 17:44:55.077142+00', 'a1000000-0000-4000-8000-000000000003', 'a1000000-0000-4000-8000-000000000003', NULL);
INSERT INTO public.aplicaciones_sanitarias (id, rancho_id, animal_id, producto_id, esquema_id, numero_dosis, fecha, dosis, aplicado_por, observacion, lote_id, creado_en, modificado_en, creado_por, modificado_por, eliminado_en) VALUES ('f1000000-0000-4000-8000-000000000004', 'a0000000-0000-4000-8000-000000000001', 'd1000000-0000-4000-8000-000000000006', 'e1000000-0000-4000-8000-000000000001', 'e1000000-0000-4000-8000-000000000101', 1, '2026-05-12', 2.00, 'a1000000-0000-4000-8000-000000000003', 'Campaña de mayo', 'f1000000-0000-4000-8000-0000000000aa', '2026-11-18 17:44:55.077142+00', '2026-11-18 17:44:55.077142+00', 'a1000000-0000-4000-8000-000000000003', 'a1000000-0000-4000-8000-000000000003', NULL);
INSERT INTO public.aplicaciones_sanitarias (id, rancho_id, animal_id, producto_id, esquema_id, numero_dosis, fecha, dosis, aplicado_por, observacion, lote_id, creado_en, modificado_en, creado_por, modificado_por, eliminado_en) VALUES ('f1000000-0000-4000-8000-000000000005', 'a0000000-0000-4000-8000-000000000001', 'd1000000-0000-4000-8000-000000000004', 'e1000000-0000-4000-8000-000000000001', 'e1000000-0000-4000-8000-000000000101', 1, '2026-04-20', 2.00, 'a1000000-0000-4000-8000-000000000003', NULL, NULL, '2026-11-18 17:44:55.077142+00', '2026-11-18 17:44:55.077142+00', 'a1000000-0000-4000-8000-000000000003', 'a1000000-0000-4000-8000-000000000003', NULL);
INSERT INTO public.aplicaciones_sanitarias (id, rancho_id, animal_id, producto_id, esquema_id, numero_dosis, fecha, dosis, aplicado_por, observacion, lote_id, creado_en, modificado_en, creado_por, modificado_por, eliminado_en) VALUES ('f1000000-0000-4000-8000-000000000007', 'a0000000-0000-4000-8000-000000000001', 'd1000000-0000-4000-8000-000000000001', 'e1000000-0000-4000-8000-000000000004', 'e1000000-0000-4000-8000-000000000103', 1, '2026-10-01', 5.00, 'a1000000-0000-4000-8000-000000000003', NULL, 'f1000000-0000-4000-8000-0000000000bb', '2026-11-18 17:44:55.077142+00', '2026-11-18 17:44:55.077142+00', 'a1000000-0000-4000-8000-000000000003', 'a1000000-0000-4000-8000-000000000003', NULL);
INSERT INTO public.aplicaciones_sanitarias (id, rancho_id, animal_id, producto_id, esquema_id, numero_dosis, fecha, dosis, aplicado_por, observacion, lote_id, creado_en, modificado_en, creado_por, modificado_por, eliminado_en) VALUES ('f1000000-0000-4000-8000-000000000008', 'a0000000-0000-4000-8000-000000000001', 'd1000000-0000-4000-8000-000000000002', 'e1000000-0000-4000-8000-000000000004', 'e1000000-0000-4000-8000-000000000103', 1, '2026-10-01', 5.00, 'a1000000-0000-4000-8000-000000000003', NULL, 'f1000000-0000-4000-8000-0000000000bb', '2026-11-18 17:44:55.077142+00', '2026-11-18 17:44:55.077142+00', 'a1000000-0000-4000-8000-000000000003', 'a1000000-0000-4000-8000-000000000003', NULL);
INSERT INTO public.aplicaciones_sanitarias (id, rancho_id, animal_id, producto_id, esquema_id, numero_dosis, fecha, dosis, aplicado_por, observacion, lote_id, creado_en, modificado_en, creado_por, modificado_por, eliminado_en) VALUES ('f1000000-0000-4000-8000-000000000006', 'a0000000-0000-4000-8000-000000000001', 'd1000000-0000-4000-8000-000000000003', 'e1000000-0000-4000-8000-000000000003', NULL, NULL, '2026-09-30', 8.00, 'a1000000-0000-4000-8000-000000000003', 'Garrapatas', NULL, '2026-11-18 17:44:55.077142+00', '2026-11-18 17:44:55.077142+00', 'a1000000-0000-4000-8000-000000000003', 'a1000000-0000-4000-8000-000000000003', NULL);
INSERT INTO public.aplicaciones_sanitarias (id, rancho_id, animal_id, producto_id, esquema_id, numero_dosis, fecha, dosis, aplicado_por, observacion, lote_id, creado_en, modificado_en, creado_por, modificado_por, eliminado_en) VALUES ('f2000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000002', 'd2000000-0000-4000-8000-000000000001', 'e2000000-0000-4000-8000-000000000001', 'e2000000-0000-4000-8000-000000000101', 1, '2026-06-03', 2.00, 'b1000000-0000-4000-8000-000000000003', NULL, NULL, '2026-11-18 17:44:55.077142+00', '2026-11-18 17:44:55.077142+00', 'b1000000-0000-4000-8000-000000000003', 'b1000000-0000-4000-8000-000000000003', NULL);


ALTER TABLE public.aplicaciones_sanitarias ENABLE TRIGGER ALL;

--
-- Data for Name: cambios_estado_animal; Type: TABLE DATA; Schema: public; Owner: -
--

ALTER TABLE public.cambios_estado_animal DISABLE TRIGGER ALL;

INSERT INTO public.cambios_estado_animal (id, rancho_id, animal_id, estado_anterior, estado_nuevo, fecha, motivo, creado_en, modificado_en, creado_por, modificado_por, eliminado_en) VALUES ('cc000000-0000-4000-8000-000000000101', 'a0000000-0000-4000-8000-000000000001', 'd1000000-0000-4000-8000-000000000007', 'activo', 'vendido', '2026-09-20', 'Venta en la feria de Montero', '2026-11-18 17:44:55.077142+00', '2026-11-18 17:44:55.077142+00', 'a1000000-0000-4000-8000-000000000001', 'a1000000-0000-4000-8000-000000000001', NULL);


ALTER TABLE public.cambios_estado_animal ENABLE TRIGGER ALL;

--
-- Data for Name: configuracion_plataforma; Type: TABLE DATA; Schema: public; Owner: -
--

ALTER TABLE public.configuracion_plataforma DISABLE TRIGGER ALL;

INSERT INTO public.configuracion_plataforma (clave, valor, creado_en, modificado_en, creado_por, modificado_por, eliminado_en) VALUES ('asistente_consultas_mes', NULL, '2026-11-18 17:44:54.973744+00', '2026-11-18 17:44:54.973744+00', NULL, NULL, NULL);
INSERT INTO public.configuracion_plataforma (clave, valor, creado_en, modificado_en, creado_por, modificado_por, eliminado_en) VALUES ('asistente_tope_mensual', NULL, '2026-11-18 17:44:54.973744+00', '2026-11-18 17:44:54.973744+00', NULL, NULL, NULL);


ALTER TABLE public.configuracion_plataforma ENABLE TRIGGER ALL;

--
-- Data for Name: consultas_asistente; Type: TABLE DATA; Schema: public; Owner: -
--

ALTER TABLE public.consultas_asistente DISABLE TRIGGER ALL;



ALTER TABLE public.consultas_asistente ENABLE TRIGGER ALL;

--
-- Data for Name: migraciones_aplicadas; Type: TABLE DATA; Schema: public; Owner: -
--

ALTER TABLE public.migraciones_aplicadas DISABLE TRIGGER ALL;

INSERT INTO public.migraciones_aplicadas (nombre, aplicada_en) VALUES ('001_fase1_esquema_inicial.sql', '2026-11-18 17:44:54.798566+00');
INSERT INTO public.migraciones_aplicadas (nombre, aplicada_en) VALUES ('002_hu06_pais_del_usuario.sql', '2026-11-18 17:44:54.833934+00');
INSERT INTO public.migraciones_aplicadas (nombre, aplicada_en) VALUES ('003_hu14_campos_pais.sql', '2026-11-18 17:44:54.836847+00');
INSERT INTO public.migraciones_aplicadas (nombre, aplicada_en) VALUES ('004_hu16_guia_configuracion.sql', '2026-11-18 17:44:54.847595+00');
INSERT INTO public.migraciones_aplicadas (nombre, aplicada_en) VALUES ('005_hu20_tipos_colaborador.sql', '2026-11-18 17:44:54.85443+00');
INSERT INTO public.migraciones_aplicadas (nombre, aplicada_en) VALUES ('006_hu24_accesos_admin.sql', '2026-11-18 17:44:54.864305+00');
INSERT INTO public.migraciones_aplicadas (nombre, aplicada_en) VALUES ('007_hu25_idioma_del_usuario.sql', '2026-11-18 17:44:54.873826+00');
INSERT INTO public.migraciones_aplicadas (nombre, aplicada_en) VALUES ('008_hu28_hu36_animales_corrales.sql', '2026-11-18 17:44:54.910747+00');
INSERT INTO public.migraciones_aplicadas (nombre, aplicada_en) VALUES ('009_hu28_razas.sql', '2026-11-18 17:44:54.927467+00');
INSERT INTO public.migraciones_aplicadas (nombre, aplicada_en) VALUES ('010_fase3_sanidad_pesajes.sql', '2026-11-18 17:44:54.958247+00');
INSERT INTO public.migraciones_aplicadas (nombre, aplicada_en) VALUES ('011_hu30_orden_paginacion_animales.sql', '2026-11-18 17:44:54.964834+00');
INSERT INTO public.migraciones_aplicadas (nombre, aplicada_en) VALUES ('012_asistente.sql', '2026-11-18 17:44:54.971064+00');
INSERT INTO public.migraciones_aplicadas (nombre, aplicada_en) VALUES ('013_fase4_admin.sql', '2026-11-18 17:44:54.981719+00');


ALTER TABLE public.migraciones_aplicadas ENABLE TRIGGER ALL;

--
-- Data for Name: modulos; Type: TABLE DATA; Schema: public; Owner: -
--

ALTER TABLE public.modulos DISABLE TRIGGER ALL;

INSERT INTO public.modulos (codigo, nombre, orden, creado_en, modificado_en, creado_por, modificado_por, eliminado_en) VALUES ('animales', 'Animales', 1, '2026-11-18 17:44:54.798566+00', '2026-11-18 17:44:54.798566+00', NULL, NULL, NULL);
INSERT INTO public.modulos (codigo, nombre, orden, creado_en, modificado_en, creado_por, modificado_por, eliminado_en) VALUES ('corrales', 'Corrales', 2, '2026-11-18 17:44:54.798566+00', '2026-11-18 17:44:54.798566+00', NULL, NULL, NULL);
INSERT INTO public.modulos (codigo, nombre, orden, creado_en, modificado_en, creado_por, modificado_por, eliminado_en) VALUES ('sanidad', 'Sanidad', 3, '2026-11-18 17:44:54.798566+00', '2026-11-18 17:44:54.798566+00', NULL, NULL, NULL);
INSERT INTO public.modulos (codigo, nombre, orden, creado_en, modificado_en, creado_por, modificado_por, eliminado_en) VALUES ('pesajes', 'Pesajes', 4, '2026-11-18 17:44:54.798566+00', '2026-11-18 17:44:54.798566+00', NULL, NULL, NULL);
INSERT INTO public.modulos (codigo, nombre, orden, creado_en, modificado_en, creado_por, modificado_por, eliminado_en) VALUES ('importacion', 'Importacion', 5, '2026-11-18 17:44:54.798566+00', '2026-11-18 17:44:54.798566+00', NULL, NULL, NULL);
INSERT INTO public.modulos (codigo, nombre, orden, creado_en, modificado_en, creado_por, modificado_por, eliminado_en) VALUES ('almacen', 'Almacen', 6, '2026-11-18 17:44:54.798566+00', '2026-11-18 17:44:54.798566+00', NULL, NULL, NULL);
INSERT INTO public.modulos (codigo, nombre, orden, creado_en, modificado_en, creado_por, modificado_por, eliminado_en) VALUES ('equipo', 'Equipo', 7, '2026-11-18 17:44:54.798566+00', '2026-11-18 17:44:54.798566+00', NULL, NULL, NULL);
INSERT INTO public.modulos (codigo, nombre, orden, creado_en, modificado_en, creado_por, modificado_por, eliminado_en) VALUES ('planes', 'Planes', 8, '2026-11-18 17:44:54.798566+00', '2026-11-18 17:44:54.798566+00', NULL, NULL, NULL);


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

INSERT INTO public.tipos_colaborador (id, rancho_id, nombre, es_predefinido, creado_en, modificado_en, creado_por, modificado_por, eliminado_en) VALUES ('11111111-1111-4111-8111-000000000001', NULL, 'Veterinario', true, '2026-11-18 17:44:54.798566+00', '2026-11-18 17:44:54.798566+00', NULL, NULL, NULL);
INSERT INTO public.tipos_colaborador (id, rancho_id, nombre, es_predefinido, creado_en, modificado_en, creado_por, modificado_por, eliminado_en) VALUES ('11111111-1111-4111-8111-000000000002', NULL, 'Encargado de campo', true, '2026-11-18 17:44:54.798566+00', '2026-11-18 17:44:54.798566+00', NULL, NULL, NULL);
INSERT INTO public.tipos_colaborador (id, rancho_id, nombre, es_predefinido, creado_en, modificado_en, creado_por, modificado_por, eliminado_en) VALUES ('11111111-1111-4111-8111-000000000003', NULL, 'Encargado de almacen', true, '2026-11-18 17:44:54.798566+00', '2026-11-18 17:44:54.798566+00', NULL, NULL, NULL);
INSERT INTO public.tipos_colaborador (id, rancho_id, nombre, es_predefinido, creado_en, modificado_en, creado_por, modificado_por, eliminado_en) VALUES ('11111111-1111-4111-8111-000000000004', NULL, 'Administrativo', true, '2026-11-18 17:44:54.798566+00', '2026-11-18 17:44:54.798566+00', NULL, NULL, NULL);


ALTER TABLE public.tipos_colaborador ENABLE TRIGGER ALL;

--
-- Data for Name: permisos_tipo; Type: TABLE DATA; Schema: public; Owner: -
--

ALTER TABLE public.permisos_tipo DISABLE TRIGGER ALL;

INSERT INTO public.permisos_tipo (id, tipo_colaborador_id, modulo_codigo, puede_ver, puede_editar, creado_en, modificado_en, creado_por, modificado_por, eliminado_en, rancho_id) VALUES ('22222222-2222-4222-8222-000000000001', '11111111-1111-4111-8111-000000000001', 'animales', true, false, '2026-11-18 17:44:54.798566+00', '2026-11-18 17:44:54.798566+00', NULL, NULL, NULL, NULL);
INSERT INTO public.permisos_tipo (id, tipo_colaborador_id, modulo_codigo, puede_ver, puede_editar, creado_en, modificado_en, creado_por, modificado_por, eliminado_en, rancho_id) VALUES ('22222222-2222-4222-8222-000000000002', '11111111-1111-4111-8111-000000000001', 'sanidad', true, true, '2026-11-18 17:44:54.798566+00', '2026-11-18 17:44:54.798566+00', NULL, NULL, NULL, NULL);
INSERT INTO public.permisos_tipo (id, tipo_colaborador_id, modulo_codigo, puede_ver, puede_editar, creado_en, modificado_en, creado_por, modificado_por, eliminado_en, rancho_id) VALUES ('22222222-2222-4222-8222-000000000003', '11111111-1111-4111-8111-000000000001', 'pesajes', true, true, '2026-11-18 17:44:54.798566+00', '2026-11-18 17:44:54.798566+00', NULL, NULL, NULL, NULL);
INSERT INTO public.permisos_tipo (id, tipo_colaborador_id, modulo_codigo, puede_ver, puede_editar, creado_en, modificado_en, creado_por, modificado_por, eliminado_en, rancho_id) VALUES ('22222222-2222-4222-8222-000000000004', '11111111-1111-4111-8111-000000000002', 'animales', true, true, '2026-11-18 17:44:54.798566+00', '2026-11-18 17:44:54.798566+00', NULL, NULL, NULL, NULL);
INSERT INTO public.permisos_tipo (id, tipo_colaborador_id, modulo_codigo, puede_ver, puede_editar, creado_en, modificado_en, creado_por, modificado_por, eliminado_en, rancho_id) VALUES ('22222222-2222-4222-8222-000000000005', '11111111-1111-4111-8111-000000000002', 'corrales', true, true, '2026-11-18 17:44:54.798566+00', '2026-11-18 17:44:54.798566+00', NULL, NULL, NULL, NULL);
INSERT INTO public.permisos_tipo (id, tipo_colaborador_id, modulo_codigo, puede_ver, puede_editar, creado_en, modificado_en, creado_por, modificado_por, eliminado_en, rancho_id) VALUES ('22222222-2222-4222-8222-000000000006', '11111111-1111-4111-8111-000000000002', 'pesajes', true, true, '2026-11-18 17:44:54.798566+00', '2026-11-18 17:44:54.798566+00', NULL, NULL, NULL, NULL);
INSERT INTO public.permisos_tipo (id, tipo_colaborador_id, modulo_codigo, puede_ver, puede_editar, creado_en, modificado_en, creado_por, modificado_por, eliminado_en, rancho_id) VALUES ('22222222-2222-4222-8222-000000000007', '11111111-1111-4111-8111-000000000003', 'almacen', true, true, '2026-11-18 17:44:54.798566+00', '2026-11-18 17:44:54.798566+00', NULL, NULL, NULL, NULL);
INSERT INTO public.permisos_tipo (id, tipo_colaborador_id, modulo_codigo, puede_ver, puede_editar, creado_en, modificado_en, creado_por, modificado_por, eliminado_en, rancho_id) VALUES ('22222222-2222-4222-8222-000000000008', '11111111-1111-4111-8111-000000000004', 'animales', true, false, '2026-11-18 17:44:54.798566+00', '2026-11-18 17:44:54.798566+00', NULL, NULL, NULL, NULL);
INSERT INTO public.permisos_tipo (id, tipo_colaborador_id, modulo_codigo, puede_ver, puede_editar, creado_en, modificado_en, creado_por, modificado_por, eliminado_en, rancho_id) VALUES ('22222222-2222-4222-8222-000000000009', '11111111-1111-4111-8111-000000000004', 'corrales', true, false, '2026-11-18 17:44:54.798566+00', '2026-11-18 17:44:54.798566+00', NULL, NULL, NULL, NULL);
INSERT INTO public.permisos_tipo (id, tipo_colaborador_id, modulo_codigo, puede_ver, puede_editar, creado_en, modificado_en, creado_por, modificado_por, eliminado_en, rancho_id) VALUES ('22222222-2222-4222-8222-000000000010', '11111111-1111-4111-8111-000000000004', 'importacion', true, true, '2026-11-18 17:44:54.798566+00', '2026-11-18 17:44:54.798566+00', NULL, NULL, NULL, NULL);
INSERT INTO public.permisos_tipo (id, tipo_colaborador_id, modulo_codigo, puede_ver, puede_editar, creado_en, modificado_en, creado_por, modificado_por, eliminado_en, rancho_id) VALUES ('22222222-2222-4222-8222-000000000011', '11111111-1111-4111-8111-000000000004', 'equipo', true, false, '2026-11-18 17:44:54.798566+00', '2026-11-18 17:44:54.798566+00', NULL, NULL, NULL, NULL);


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

INSERT INTO public.pesajes (id, rancho_id, animal_id, fecha, peso_kg, observacion, lote_id, creado_en, modificado_en, creado_por, modificado_por, eliminado_en) VALUES ('f1000000-0000-4000-8000-100000000001', 'a0000000-0000-4000-8000-000000000001', 'd1000000-0000-4000-8000-000000000001', '2026-08-01', 455.00, NULL, NULL, '2026-11-18 17:44:55.077142+00', '2026-11-18 17:44:55.077142+00', 'a1000000-0000-4000-8000-000000000004', 'a1000000-0000-4000-8000-000000000004', NULL);
INSERT INTO public.pesajes (id, rancho_id, animal_id, fecha, peso_kg, observacion, lote_id, creado_en, modificado_en, creado_por, modificado_por, eliminado_en) VALUES ('f1000000-0000-4000-8000-100000000002', 'a0000000-0000-4000-8000-000000000001', 'd1000000-0000-4000-8000-000000000001', '2026-09-15', 462.00, NULL, NULL, '2026-11-18 17:44:55.077142+00', '2026-11-18 17:44:55.077142+00', 'a1000000-0000-4000-8000-000000000004', 'a1000000-0000-4000-8000-000000000004', NULL);
INSERT INTO public.pesajes (id, rancho_id, animal_id, fecha, peso_kg, observacion, lote_id, creado_en, modificado_en, creado_por, modificado_por, eliminado_en) VALUES ('f1000000-0000-4000-8000-100000000003', 'a0000000-0000-4000-8000-000000000001', 'd1000000-0000-4000-8000-000000000001', '2026-10-30', 468.00, NULL, NULL, '2026-11-18 17:44:55.077142+00', '2026-11-18 17:44:55.077142+00', 'a1000000-0000-4000-8000-000000000004', 'a1000000-0000-4000-8000-000000000004', NULL);
INSERT INTO public.pesajes (id, rancho_id, animal_id, fecha, peso_kg, observacion, lote_id, creado_en, modificado_en, creado_por, modificado_por, eliminado_en) VALUES ('f1000000-0000-4000-8000-100000000004', 'a0000000-0000-4000-8000-000000000001', 'd1000000-0000-4000-8000-000000000002', '2026-08-01', 447.00, NULL, NULL, '2026-11-18 17:44:55.077142+00', '2026-11-18 17:44:55.077142+00', 'a1000000-0000-4000-8000-000000000004', 'a1000000-0000-4000-8000-000000000004', NULL);
INSERT INTO public.pesajes (id, rancho_id, animal_id, fecha, peso_kg, observacion, lote_id, creado_en, modificado_en, creado_por, modificado_por, eliminado_en) VALUES ('f1000000-0000-4000-8000-100000000005', 'a0000000-0000-4000-8000-000000000001', 'd1000000-0000-4000-8000-000000000002', '2026-09-15', 451.00, NULL, NULL, '2026-11-18 17:44:55.077142+00', '2026-11-18 17:44:55.077142+00', 'a1000000-0000-4000-8000-000000000004', 'a1000000-0000-4000-8000-000000000004', NULL);
INSERT INTO public.pesajes (id, rancho_id, animal_id, fecha, peso_kg, observacion, lote_id, creado_en, modificado_en, creado_por, modificado_por, eliminado_en) VALUES ('f1000000-0000-4000-8000-100000000006', 'a0000000-0000-4000-8000-000000000001', 'd1000000-0000-4000-8000-000000000002', '2026-10-30', 455.00, NULL, NULL, '2026-11-18 17:44:55.077142+00', '2026-11-18 17:44:55.077142+00', 'a1000000-0000-4000-8000-000000000004', 'a1000000-0000-4000-8000-000000000004', NULL);
INSERT INTO public.pesajes (id, rancho_id, animal_id, fecha, peso_kg, observacion, lote_id, creado_en, modificado_en, creado_por, modificado_por, eliminado_en) VALUES ('f1000000-0000-4000-8000-100000000007', 'a0000000-0000-4000-8000-000000000001', 'd1000000-0000-4000-8000-000000000003', '2026-08-01', 352.00, NULL, NULL, '2026-11-18 17:44:55.077142+00', '2026-11-18 17:44:55.077142+00', 'a1000000-0000-4000-8000-000000000004', 'a1000000-0000-4000-8000-000000000004', NULL);
INSERT INTO public.pesajes (id, rancho_id, animal_id, fecha, peso_kg, observacion, lote_id, creado_en, modificado_en, creado_por, modificado_por, eliminado_en) VALUES ('f1000000-0000-4000-8000-100000000008', 'a0000000-0000-4000-8000-000000000001', 'd1000000-0000-4000-8000-000000000003', '2026-09-15', 378.00, NULL, NULL, '2026-11-18 17:44:55.077142+00', '2026-11-18 17:44:55.077142+00', 'a1000000-0000-4000-8000-000000000004', 'a1000000-0000-4000-8000-000000000004', NULL);
INSERT INTO public.pesajes (id, rancho_id, animal_id, fecha, peso_kg, observacion, lote_id, creado_en, modificado_en, creado_por, modificado_por, eliminado_en) VALUES ('f1000000-0000-4000-8000-100000000009', 'a0000000-0000-4000-8000-000000000001', 'd1000000-0000-4000-8000-000000000003', '2026-10-30', 402.00, NULL, NULL, '2026-11-18 17:44:55.077142+00', '2026-11-18 17:44:55.077142+00', 'a1000000-0000-4000-8000-000000000004', 'a1000000-0000-4000-8000-000000000004', NULL);
INSERT INTO public.pesajes (id, rancho_id, animal_id, fecha, peso_kg, observacion, lote_id, creado_en, modificado_en, creado_por, modificado_por, eliminado_en) VALUES ('f1000000-0000-4000-8000-100000000010', 'a0000000-0000-4000-8000-000000000001', 'd1000000-0000-4000-8000-000000000004', '2026-08-01', 341.00, NULL, NULL, '2026-11-18 17:44:55.077142+00', '2026-11-18 17:44:55.077142+00', 'a1000000-0000-4000-8000-000000000004', 'a1000000-0000-4000-8000-000000000004', NULL);
INSERT INTO public.pesajes (id, rancho_id, animal_id, fecha, peso_kg, observacion, lote_id, creado_en, modificado_en, creado_por, modificado_por, eliminado_en) VALUES ('f1000000-0000-4000-8000-100000000011', 'a0000000-0000-4000-8000-000000000001', 'd1000000-0000-4000-8000-000000000004', '2026-09-15', 355.00, NULL, NULL, '2026-11-18 17:44:55.077142+00', '2026-11-18 17:44:55.077142+00', 'a1000000-0000-4000-8000-000000000004', 'a1000000-0000-4000-8000-000000000004', NULL);
INSERT INTO public.pesajes (id, rancho_id, animal_id, fecha, peso_kg, observacion, lote_id, creado_en, modificado_en, creado_por, modificado_por, eliminado_en) VALUES ('f1000000-0000-4000-8000-100000000012', 'a0000000-0000-4000-8000-000000000001', 'd1000000-0000-4000-8000-000000000004', '2026-10-30', 371.00, NULL, NULL, '2026-11-18 17:44:55.077142+00', '2026-11-18 17:44:55.077142+00', 'a1000000-0000-4000-8000-000000000004', 'a1000000-0000-4000-8000-000000000004', NULL);
INSERT INTO public.pesajes (id, rancho_id, animal_id, fecha, peso_kg, observacion, lote_id, creado_en, modificado_en, creado_por, modificado_por, eliminado_en) VALUES ('f1000000-0000-4000-8000-100000000013', 'a0000000-0000-4000-8000-000000000001', 'd1000000-0000-4000-8000-000000000005', '2026-08-01', 71.00, NULL, NULL, '2026-11-18 17:44:55.077142+00', '2026-11-18 17:44:55.077142+00', 'a1000000-0000-4000-8000-000000000004', 'a1000000-0000-4000-8000-000000000004', NULL);
INSERT INTO public.pesajes (id, rancho_id, animal_id, fecha, peso_kg, observacion, lote_id, creado_en, modificado_en, creado_por, modificado_por, eliminado_en) VALUES ('f1000000-0000-4000-8000-100000000014', 'a0000000-0000-4000-8000-000000000001', 'd1000000-0000-4000-8000-000000000005', '2026-09-15', 95.00, NULL, NULL, '2026-11-18 17:44:55.077142+00', '2026-11-18 17:44:55.077142+00', 'a1000000-0000-4000-8000-000000000004', 'a1000000-0000-4000-8000-000000000004', NULL);
INSERT INTO public.pesajes (id, rancho_id, animal_id, fecha, peso_kg, observacion, lote_id, creado_en, modificado_en, creado_por, modificado_por, eliminado_en) VALUES ('f1000000-0000-4000-8000-100000000015', 'a0000000-0000-4000-8000-000000000001', 'd1000000-0000-4000-8000-000000000005', '2026-10-30', 118.00, NULL, NULL, '2026-11-18 17:44:55.077142+00', '2026-11-18 17:44:55.077142+00', 'a1000000-0000-4000-8000-000000000004', 'a1000000-0000-4000-8000-000000000004', NULL);
INSERT INTO public.pesajes (id, rancho_id, animal_id, fecha, peso_kg, observacion, lote_id, creado_en, modificado_en, creado_por, modificado_por, eliminado_en) VALUES ('f1000000-0000-4000-8000-100000000016', 'a0000000-0000-4000-8000-000000000001', 'd1000000-0000-4000-8000-000000000006', '2026-08-01', 798.00, NULL, NULL, '2026-11-18 17:44:55.077142+00', '2026-11-18 17:44:55.077142+00', 'a1000000-0000-4000-8000-000000000004', 'a1000000-0000-4000-8000-000000000004', NULL);
INSERT INTO public.pesajes (id, rancho_id, animal_id, fecha, peso_kg, observacion, lote_id, creado_en, modificado_en, creado_por, modificado_por, eliminado_en) VALUES ('f1000000-0000-4000-8000-100000000017', 'a0000000-0000-4000-8000-000000000001', 'd1000000-0000-4000-8000-000000000006', '2026-09-15', 802.00, NULL, NULL, '2026-11-18 17:44:55.077142+00', '2026-11-18 17:44:55.077142+00', 'a1000000-0000-4000-8000-000000000004', 'a1000000-0000-4000-8000-000000000004', NULL);
INSERT INTO public.pesajes (id, rancho_id, animal_id, fecha, peso_kg, observacion, lote_id, creado_en, modificado_en, creado_por, modificado_por, eliminado_en) VALUES ('f1000000-0000-4000-8000-100000000018', 'a0000000-0000-4000-8000-000000000001', 'd1000000-0000-4000-8000-000000000006', '2026-10-30', 805.00, NULL, NULL, '2026-11-18 17:44:55.077142+00', '2026-11-18 17:44:55.077142+00', 'a1000000-0000-4000-8000-000000000004', 'a1000000-0000-4000-8000-000000000004', NULL);
INSERT INTO public.pesajes (id, rancho_id, animal_id, fecha, peso_kg, observacion, lote_id, creado_en, modificado_en, creado_por, modificado_por, eliminado_en) VALUES ('f2000000-0000-4000-8000-100000000001', 'b0000000-0000-4000-8000-000000000002', 'd2000000-0000-4000-8000-000000000001', '2026-09-01', 532.00, NULL, NULL, '2026-11-18 17:44:55.077142+00', '2026-11-18 17:44:55.077142+00', 'b1000000-0000-4000-8000-000000000001', 'b1000000-0000-4000-8000-000000000001', NULL);
INSERT INTO public.pesajes (id, rancho_id, animal_id, fecha, peso_kg, observacion, lote_id, creado_en, modificado_en, creado_por, modificado_por, eliminado_en) VALUES ('f2000000-0000-4000-8000-100000000002', 'b0000000-0000-4000-8000-000000000002', 'd2000000-0000-4000-8000-000000000001', '2026-10-25', 540.00, NULL, NULL, '2026-11-18 17:44:55.077142+00', '2026-11-18 17:44:55.077142+00', 'b1000000-0000-4000-8000-000000000001', 'b1000000-0000-4000-8000-000000000001', NULL);
INSERT INTO public.pesajes (id, rancho_id, animal_id, fecha, peso_kg, observacion, lote_id, creado_en, modificado_en, creado_por, modificado_por, eliminado_en) VALUES ('f2000000-0000-4000-8000-100000000003', 'b0000000-0000-4000-8000-000000000002', 'd2000000-0000-4000-8000-000000000002', '2026-09-01', 494.00, NULL, NULL, '2026-11-18 17:44:55.077142+00', '2026-11-18 17:44:55.077142+00', 'b1000000-0000-4000-8000-000000000001', 'b1000000-0000-4000-8000-000000000001', NULL);
INSERT INTO public.pesajes (id, rancho_id, animal_id, fecha, peso_kg, observacion, lote_id, creado_en, modificado_en, creado_por, modificado_por, eliminado_en) VALUES ('f2000000-0000-4000-8000-100000000004', 'b0000000-0000-4000-8000-000000000002', 'd2000000-0000-4000-8000-000000000002', '2026-10-25', 498.00, NULL, NULL, '2026-11-18 17:44:55.077142+00', '2026-11-18 17:44:55.077142+00', 'b1000000-0000-4000-8000-000000000001', 'b1000000-0000-4000-8000-000000000001', NULL);
INSERT INTO public.pesajes (id, rancho_id, animal_id, fecha, peso_kg, observacion, lote_id, creado_en, modificado_en, creado_por, modificado_por, eliminado_en) VALUES ('cc000000-0000-4000-8000-000000000201', 'a0000000-0000-4000-8000-000000000001', 'd1000000-0000-4000-8000-000000000007', '2026-08-01', 404.00, NULL, NULL, '2026-11-18 17:44:55.077142+00', '2026-11-18 17:44:55.077142+00', 'a1000000-0000-4000-8000-000000000004', 'a1000000-0000-4000-8000-000000000004', NULL);
INSERT INTO public.pesajes (id, rancho_id, animal_id, fecha, peso_kg, observacion, lote_id, creado_en, modificado_en, creado_por, modificado_por, eliminado_en) VALUES ('cc000000-0000-4000-8000-000000000202', 'a0000000-0000-4000-8000-000000000001', 'd1000000-0000-4000-8000-000000000007', '2026-09-15', 430.00, NULL, NULL, '2026-11-18 17:44:55.077142+00', '2026-11-18 17:44:55.077142+00', 'a1000000-0000-4000-8000-000000000004', 'a1000000-0000-4000-8000-000000000004', NULL);


ALTER TABLE public.pesajes ENABLE TRIGGER ALL;

--
-- Data for Name: razas; Type: TABLE DATA; Schema: public; Owner: -
--

ALTER TABLE public.razas DISABLE TRIGGER ALL;

INSERT INTO public.razas (id, rancho_id, nombre, clave, grupo, orden, creado_en, modificado_en, creado_por, modificado_por, eliminado_en) VALUES ('0d853e77-826a-4939-a576-a22e4a8ccf3a', NULL, 'Angus', 'angus', 'carne', 1, '2026-11-18 17:44:54.913164+00', '2026-11-18 17:44:54.913164+00', NULL, NULL, NULL);
INSERT INTO public.razas (id, rancho_id, nombre, clave, grupo, orden, creado_en, modificado_en, creado_por, modificado_por, eliminado_en) VALUES ('eba33f25-2a8a-4a62-b714-47f090807684', NULL, 'Azul Belga', 'azul belga', 'carne', 2, '2026-11-18 17:44:54.913164+00', '2026-11-18 17:44:54.913164+00', NULL, NULL, NULL);
INSERT INTO public.razas (id, rancho_id, nombre, clave, grupo, orden, creado_en, modificado_en, creado_por, modificado_por, eliminado_en) VALUES ('9dd27a52-cd4e-4e34-a29e-a6dbaff56beb', NULL, 'Beefmaster', 'beefmaster', 'carne', 3, '2026-11-18 17:44:54.913164+00', '2026-11-18 17:44:54.913164+00', NULL, NULL, NULL);
INSERT INTO public.razas (id, rancho_id, nombre, clave, grupo, orden, creado_en, modificado_en, creado_por, modificado_por, eliminado_en) VALUES ('058a8fa4-4558-40f8-8fd9-6d36b0c7497b', NULL, 'Bonsmara', 'bonsmara', 'carne', 4, '2026-11-18 17:44:54.913164+00', '2026-11-18 17:44:54.913164+00', NULL, NULL, NULL);
INSERT INTO public.razas (id, rancho_id, nombre, clave, grupo, orden, creado_en, modificado_en, creado_por, modificado_por, eliminado_en) VALUES ('9b57e963-820b-430d-8262-d47558a688e0', NULL, 'Braford', 'braford', 'carne', 5, '2026-11-18 17:44:54.913164+00', '2026-11-18 17:44:54.913164+00', NULL, NULL, NULL);
INSERT INTO public.razas (id, rancho_id, nombre, clave, grupo, orden, creado_en, modificado_en, creado_por, modificado_por, eliminado_en) VALUES ('d826e12e-c0c7-4f34-badf-2e033cb55f1c', NULL, 'Brahman', 'brahman', 'carne', 6, '2026-11-18 17:44:54.913164+00', '2026-11-18 17:44:54.913164+00', NULL, NULL, NULL);
INSERT INTO public.razas (id, rancho_id, nombre, clave, grupo, orden, creado_en, modificado_en, creado_por, modificado_por, eliminado_en) VALUES ('95a121ef-85cf-486d-bb99-8bc3f09e911b', NULL, 'Brangus', 'brangus', 'carne', 7, '2026-11-18 17:44:54.913164+00', '2026-11-18 17:44:54.913164+00', NULL, NULL, NULL);
INSERT INTO public.razas (id, rancho_id, nombre, clave, grupo, orden, creado_en, modificado_en, creado_por, modificado_por, eliminado_en) VALUES ('db0b3bed-512b-4d50-a024-7c9e4a7a3031', NULL, 'Charolais', 'charolais', 'carne', 8, '2026-11-18 17:44:54.913164+00', '2026-11-18 17:44:54.913164+00', NULL, NULL, NULL);
INSERT INTO public.razas (id, rancho_id, nombre, clave, grupo, orden, creado_en, modificado_en, creado_por, modificado_por, eliminado_en) VALUES ('01486726-423d-4cec-9f8c-2590d040c275', NULL, 'Chianina', 'chianina', 'carne', 9, '2026-11-18 17:44:54.913164+00', '2026-11-18 17:44:54.913164+00', NULL, NULL, NULL);
INSERT INTO public.razas (id, rancho_id, nombre, clave, grupo, orden, creado_en, modificado_en, creado_por, modificado_por, eliminado_en) VALUES ('4b7b43bc-7d9a-419e-9202-8ecb23e9be63', NULL, 'Droughtmaster', 'droughtmaster', 'carne', 10, '2026-11-18 17:44:54.913164+00', '2026-11-18 17:44:54.913164+00', NULL, NULL, NULL);
INSERT INTO public.razas (id, rancho_id, nombre, clave, grupo, orden, creado_en, modificado_en, creado_por, modificado_por, eliminado_en) VALUES ('c5a7da64-b753-49de-a60f-c89a27ebb29e', NULL, 'Galloway', 'galloway', 'carne', 11, '2026-11-18 17:44:54.913164+00', '2026-11-18 17:44:54.913164+00', NULL, NULL, NULL);
INSERT INTO public.razas (id, rancho_id, nombre, clave, grupo, orden, creado_en, modificado_en, creado_por, modificado_por, eliminado_en) VALUES ('a34a9025-b4ea-434c-9f49-0464c296c098', NULL, 'Hereford', 'hereford', 'carne', 12, '2026-11-18 17:44:54.913164+00', '2026-11-18 17:44:54.913164+00', NULL, NULL, NULL);
INSERT INTO public.razas (id, rancho_id, nombre, clave, grupo, orden, creado_en, modificado_en, creado_por, modificado_por, eliminado_en) VALUES ('806d7e70-5886-44dd-a499-5ec0e3606354', NULL, 'Highland', 'highland', 'carne', 13, '2026-11-18 17:44:54.913164+00', '2026-11-18 17:44:54.913164+00', NULL, NULL, NULL);
INSERT INTO public.razas (id, rancho_id, nombre, clave, grupo, orden, creado_en, modificado_en, creado_por, modificado_por, eliminado_en) VALUES ('e64d2680-f171-4014-a7a5-0f11d0c569c1', NULL, 'Indubrasil', 'indubrasil', 'carne', 14, '2026-11-18 17:44:54.913164+00', '2026-11-18 17:44:54.913164+00', NULL, NULL, NULL);
INSERT INTO public.razas (id, rancho_id, nombre, clave, grupo, orden, creado_en, modificado_en, creado_por, modificado_por, eliminado_en) VALUES ('eacaa249-0b02-4c80-8615-028a0a983eb9', NULL, 'Limousin', 'limousin', 'carne', 15, '2026-11-18 17:44:54.913164+00', '2026-11-18 17:44:54.913164+00', NULL, NULL, NULL);
INSERT INTO public.razas (id, rancho_id, nombre, clave, grupo, orden, creado_en, modificado_en, creado_por, modificado_por, eliminado_en) VALUES ('ca0068f4-be1f-4690-b7f2-60f4f2c2a1b3', NULL, 'Marchigiana', 'marchigiana', 'carne', 16, '2026-11-18 17:44:54.913164+00', '2026-11-18 17:44:54.913164+00', NULL, NULL, NULL);
INSERT INTO public.razas (id, rancho_id, nombre, clave, grupo, orden, creado_en, modificado_en, creado_por, modificado_por, eliminado_en) VALUES ('1b94ad00-d20b-4a22-b0b6-65a2c60bfed6', NULL, 'Murray Grey', 'murray grey', 'carne', 17, '2026-11-18 17:44:54.913164+00', '2026-11-18 17:44:54.913164+00', NULL, NULL, NULL);
INSERT INTO public.razas (id, rancho_id, nombre, clave, grupo, orden, creado_en, modificado_en, creado_por, modificado_por, eliminado_en) VALUES ('6cc26f85-ef24-48f5-b6d3-a5776938f662', NULL, 'Nelore', 'nelore', 'carne', 18, '2026-11-18 17:44:54.913164+00', '2026-11-18 17:44:54.913164+00', NULL, NULL, NULL);
INSERT INTO public.razas (id, rancho_id, nombre, clave, grupo, orden, creado_en, modificado_en, creado_por, modificado_por, eliminado_en) VALUES ('b0ff3da4-5dbf-4d72-b82d-19190c14ef18', NULL, 'Piamontesa', 'piamontesa', 'carne', 19, '2026-11-18 17:44:54.913164+00', '2026-11-18 17:44:54.913164+00', NULL, NULL, NULL);
INSERT INTO public.razas (id, rancho_id, nombre, clave, grupo, orden, creado_en, modificado_en, creado_por, modificado_por, eliminado_en) VALUES ('241fe8ef-df86-40db-91a6-49994f16aad6', NULL, 'Red Angus', 'red angus', 'carne', 20, '2026-11-18 17:44:54.913164+00', '2026-11-18 17:44:54.913164+00', NULL, NULL, NULL);
INSERT INTO public.razas (id, rancho_id, nombre, clave, grupo, orden, creado_en, modificado_en, creado_por, modificado_por, eliminado_en) VALUES ('2c692eea-e640-488c-bc7b-8d311c9d4629', NULL, 'Romosinuano', 'romosinuano', 'carne', 21, '2026-11-18 17:44:54.913164+00', '2026-11-18 17:44:54.913164+00', NULL, NULL, NULL);
INSERT INTO public.razas (id, rancho_id, nombre, clave, grupo, orden, creado_en, modificado_en, creado_por, modificado_por, eliminado_en) VALUES ('2a391fe2-456c-41b1-a1fa-38125b3053ec', NULL, 'Rubia de Aquitania', 'rubia de aquitania', 'carne', 22, '2026-11-18 17:44:54.913164+00', '2026-11-18 17:44:54.913164+00', NULL, NULL, NULL);
INSERT INTO public.razas (id, rancho_id, nombre, clave, grupo, orden, creado_en, modificado_en, creado_por, modificado_por, eliminado_en) VALUES ('e17f9a0e-9b95-42b2-ab65-5367ddc78148', NULL, 'Santa Gertrudis', 'santa gertrudis', 'carne', 23, '2026-11-18 17:44:54.913164+00', '2026-11-18 17:44:54.913164+00', NULL, NULL, NULL);
INSERT INTO public.razas (id, rancho_id, nombre, clave, grupo, orden, creado_en, modificado_en, creado_por, modificado_por, eliminado_en) VALUES ('843232d1-74de-415e-89b0-919d83badfd9', NULL, 'Senepol', 'senepol', 'carne', 24, '2026-11-18 17:44:54.913164+00', '2026-11-18 17:44:54.913164+00', NULL, NULL, NULL);
INSERT INTO public.razas (id, rancho_id, nombre, clave, grupo, orden, creado_en, modificado_en, creado_por, modificado_por, eliminado_en) VALUES ('b142be60-d54b-41d0-9dca-15e257d8d142', NULL, 'Shorthorn', 'shorthorn', 'carne', 25, '2026-11-18 17:44:54.913164+00', '2026-11-18 17:44:54.913164+00', NULL, NULL, NULL);
INSERT INTO public.razas (id, rancho_id, nombre, clave, grupo, orden, creado_en, modificado_en, creado_por, modificado_por, eliminado_en) VALUES ('e91536f0-34f3-4f5e-96c1-012bb571709e', NULL, 'Simbrah', 'simbrah', 'carne', 26, '2026-11-18 17:44:54.913164+00', '2026-11-18 17:44:54.913164+00', NULL, NULL, NULL);
INSERT INTO public.razas (id, rancho_id, nombre, clave, grupo, orden, creado_en, modificado_en, creado_por, modificado_por, eliminado_en) VALUES ('50c07e45-3423-47c5-a521-61f7313fd135', NULL, 'Tabapuã', 'tabapua', 'carne', 27, '2026-11-18 17:44:54.913164+00', '2026-11-18 17:44:54.913164+00', NULL, NULL, NULL);
INSERT INTO public.razas (id, rancho_id, nombre, clave, grupo, orden, creado_en, modificado_en, creado_por, modificado_por, eliminado_en) VALUES ('7ca7bd8e-2091-4666-b15c-5b77aa49b129', NULL, 'Wagyu', 'wagyu', 'carne', 28, '2026-11-18 17:44:54.913164+00', '2026-11-18 17:44:54.913164+00', NULL, NULL, NULL);
INSERT INTO public.razas (id, rancho_id, nombre, clave, grupo, orden, creado_en, modificado_en, creado_por, modificado_por, eliminado_en) VALUES ('0232f591-3892-4f05-bad7-ac390e646638', NULL, 'Ayrshire', 'ayrshire', 'leche', 29, '2026-11-18 17:44:54.913164+00', '2026-11-18 17:44:54.913164+00', NULL, NULL, NULL);
INSERT INTO public.razas (id, rancho_id, nombre, clave, grupo, orden, creado_en, modificado_en, creado_por, modificado_por, eliminado_en) VALUES ('cac363e1-378a-4c8a-80a1-0cbcc40add62', NULL, 'Girolando', 'girolando', 'leche', 30, '2026-11-18 17:44:54.913164+00', '2026-11-18 17:44:54.913164+00', NULL, NULL, NULL);
INSERT INTO public.razas (id, rancho_id, nombre, clave, grupo, orden, creado_en, modificado_en, creado_por, modificado_por, eliminado_en) VALUES ('99e01bb8-128c-4504-ade5-adc277658214', NULL, 'Guernsey', 'guernsey', 'leche', 31, '2026-11-18 17:44:54.913164+00', '2026-11-18 17:44:54.913164+00', NULL, NULL, NULL);
INSERT INTO public.razas (id, rancho_id, nombre, clave, grupo, orden, creado_en, modificado_en, creado_por, modificado_por, eliminado_en) VALUES ('db5cb1f0-7789-4d34-8973-0a1b7f32299f', NULL, 'Holstein', 'holstein', 'leche', 32, '2026-11-18 17:44:54.913164+00', '2026-11-18 17:44:54.913164+00', NULL, NULL, NULL);
INSERT INTO public.razas (id, rancho_id, nombre, clave, grupo, orden, creado_en, modificado_en, creado_por, modificado_por, eliminado_en) VALUES ('e263b5eb-a783-42bc-aea0-99d68aada5ab', NULL, 'Jersey', 'jersey', 'leche', 33, '2026-11-18 17:44:54.913164+00', '2026-11-18 17:44:54.913164+00', NULL, NULL, NULL);
INSERT INTO public.razas (id, rancho_id, nombre, clave, grupo, orden, creado_en, modificado_en, creado_por, modificado_por, eliminado_en) VALUES ('d586b0ae-3058-4e54-b894-0369c61619ba', NULL, 'Montbéliarde', 'montbeliarde', 'leche', 34, '2026-11-18 17:44:54.913164+00', '2026-11-18 17:44:54.913164+00', NULL, NULL, NULL);
INSERT INTO public.razas (id, rancho_id, nombre, clave, grupo, orden, creado_en, modificado_en, creado_por, modificado_por, eliminado_en) VALUES ('fc502c3e-e0f4-498c-a1ce-6e2a20bc1705', NULL, 'Pardo Suizo', 'pardo suizo', 'leche', 35, '2026-11-18 17:44:54.913164+00', '2026-11-18 17:44:54.913164+00', NULL, NULL, NULL);
INSERT INTO public.razas (id, rancho_id, nombre, clave, grupo, orden, creado_en, modificado_en, creado_por, modificado_por, eliminado_en) VALUES ('adcd15b0-ecef-4c32-9acd-eb45fe3f4b55', NULL, 'Red Sindhi', 'red sindhi', 'leche', 36, '2026-11-18 17:44:54.913164+00', '2026-11-18 17:44:54.913164+00', NULL, NULL, NULL);
INSERT INTO public.razas (id, rancho_id, nombre, clave, grupo, orden, creado_en, modificado_en, creado_por, modificado_por, eliminado_en) VALUES ('db3a55c4-d3a9-47f1-ba05-c94f540fdffd', NULL, 'Sahiwal', 'sahiwal', 'leche', 37, '2026-11-18 17:44:54.913164+00', '2026-11-18 17:44:54.913164+00', NULL, NULL, NULL);
INSERT INTO public.razas (id, rancho_id, nombre, clave, grupo, orden, creado_en, modificado_en, creado_por, modificado_por, eliminado_en) VALUES ('b344911c-3a5f-4b27-840a-482541bf8344', NULL, 'Criollo', 'criollo', 'doble', 38, '2026-11-18 17:44:54.913164+00', '2026-11-18 17:44:54.913164+00', NULL, NULL, NULL);
INSERT INTO public.razas (id, rancho_id, nombre, clave, grupo, orden, creado_en, modificado_en, creado_por, modificado_por, eliminado_en) VALUES ('c2756ef4-f088-49d5-bd06-82d7dd409739', NULL, 'Fleckvieh', 'fleckvieh', 'doble', 39, '2026-11-18 17:44:54.913164+00', '2026-11-18 17:44:54.913164+00', NULL, NULL, NULL);
INSERT INTO public.razas (id, rancho_id, nombre, clave, grupo, orden, creado_en, modificado_en, creado_por, modificado_por, eliminado_en) VALUES ('0228c2dc-9ff7-4d38-81b0-8e6f19956e35', NULL, 'Guzerá', 'guzera', 'doble', 40, '2026-11-18 17:44:54.913164+00', '2026-11-18 17:44:54.913164+00', NULL, NULL, NULL);
INSERT INTO public.razas (id, rancho_id, nombre, clave, grupo, orden, creado_en, modificado_en, creado_por, modificado_por, eliminado_en) VALUES ('33ff9980-b834-438f-87db-a205cb7feef8', NULL, 'Gyr', 'gyr', 'doble', 41, '2026-11-18 17:44:54.913164+00', '2026-11-18 17:44:54.913164+00', NULL, NULL, NULL);
INSERT INTO public.razas (id, rancho_id, nombre, clave, grupo, orden, creado_en, modificado_en, creado_por, modificado_por, eliminado_en) VALUES ('6c6e3c5d-f7b0-40eb-9fdc-7f1b4d5bcfcf', NULL, 'Mestizo', 'mestizo', 'doble', 42, '2026-11-18 17:44:54.913164+00', '2026-11-18 17:44:54.913164+00', NULL, NULL, NULL);
INSERT INTO public.razas (id, rancho_id, nombre, clave, grupo, orden, creado_en, modificado_en, creado_por, modificado_por, eliminado_en) VALUES ('017a25c3-cea5-4ba6-b2c2-0a983f892586', NULL, 'Normando', 'normando', 'doble', 43, '2026-11-18 17:44:54.913164+00', '2026-11-18 17:44:54.913164+00', NULL, NULL, NULL);
INSERT INTO public.razas (id, rancho_id, nombre, clave, grupo, orden, creado_en, modificado_en, creado_por, modificado_por, eliminado_en) VALUES ('81857016-8840-4fe2-881f-22c8cb267085', NULL, 'Red Poll', 'red poll', 'doble', 44, '2026-11-18 17:44:54.913164+00', '2026-11-18 17:44:54.913164+00', NULL, NULL, NULL);
INSERT INTO public.razas (id, rancho_id, nombre, clave, grupo, orden, creado_en, modificado_en, creado_por, modificado_por, eliminado_en) VALUES ('2d2c7d0b-3ab9-413c-b704-19b6586712f9', NULL, 'Simmental', 'simmental', 'doble', 45, '2026-11-18 17:44:54.913164+00', '2026-11-18 17:44:54.913164+00', NULL, NULL, NULL);


ALTER TABLE public.razas ENABLE TRIGGER ALL;

--
-- Data for Name: registro_auditoria; Type: TABLE DATA; Schema: public; Owner: -
--

ALTER TABLE public.registro_auditoria DISABLE TRIGGER ALL;



ALTER TABLE public.registro_auditoria ENABLE TRIGGER ALL;

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


