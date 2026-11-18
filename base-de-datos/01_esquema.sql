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
-- Name: fn_tocar_modificado_en(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_tocar_modificado_en() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.modificado_en = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$;


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: accesos_admin; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.accesos_admin (
    id uuid NOT NULL,
    admin_id uuid NOT NULL,
    rancho_id uuid NOT NULL,
    motivo character varying(300) NOT NULL,
    entrado_en timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    salido_en timestamp with time zone,
    creado_en timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    modificado_en timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    creado_por uuid,
    modificado_por uuid,
    eliminado_en timestamp with time zone,
    CONSTRAINT ck_accesos_admin_salida CHECK (((salido_en IS NULL) OR (salido_en >= entrado_en)))
);


--
-- Name: animales; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.animales (
    id uuid NOT NULL,
    rancho_id uuid NOT NULL,
    identificador character varying(50) NOT NULL,
    tipo_identificador character varying(20) DEFAULT 'caravana'::character varying NOT NULL,
    nombre character varying(100),
    raza character varying(100),
    sexo character varying(10) NOT NULL,
    categoria_codigo character varying(30),
    fecha_nacimiento date,
    origen character varying(20),
    corral_id uuid,
    peso_kg numeric(10,2),
    estado character varying(20) DEFAULT 'activo'::character varying NOT NULL,
    creado_en timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    modificado_en timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    creado_por uuid,
    modificado_por uuid,
    eliminado_en timestamp with time zone,
    CONSTRAINT animales_estado_check CHECK (((estado)::text = ANY ((ARRAY['activo'::character varying, 'vendido'::character varying, 'muerto'::character varying, 'archivado'::character varying])::text[]))),
    CONSTRAINT animales_identificador_check CHECK ((btrim((identificador)::text) <> ''::text)),
    CONSTRAINT animales_origen_check CHECK (((origen)::text = ANY ((ARRAY['nacido'::character varying, 'comprado'::character varying, 'otro'::character varying])::text[]))),
    CONSTRAINT animales_peso_kg_check CHECK ((peso_kg > (0)::numeric)),
    CONSTRAINT animales_sexo_check CHECK (((sexo)::text = ANY ((ARRAY['macho'::character varying, 'hembra'::character varying])::text[]))),
    CONSTRAINT animales_tipo_identificador_check CHECK (((tipo_identificador)::text = ANY ((ARRAY['caravana'::character varying, 'interno'::character varying, 'rfid'::character varying])::text[])))
);


--
-- Name: aplicaciones_sanitarias; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.aplicaciones_sanitarias (
    id uuid NOT NULL,
    rancho_id uuid NOT NULL,
    animal_id uuid NOT NULL,
    producto_id uuid NOT NULL,
    esquema_id uuid,
    numero_dosis smallint,
    fecha date NOT NULL,
    dosis numeric(10,2),
    aplicado_por uuid NOT NULL,
    observacion character varying(500),
    lote_id uuid,
    creado_en timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    modificado_en timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    creado_por uuid,
    modificado_por uuid,
    eliminado_en timestamp with time zone,
    CONSTRAINT aplicaciones_sanitarias_dosis_check CHECK ((dosis > (0)::numeric)),
    CONSTRAINT aplicaciones_sanitarias_numero_dosis_check CHECK (((numero_dosis >= 1) AND (numero_dosis <= 10))),
    CONSTRAINT ck_aplicaciones_dosis_esquema CHECK (((numero_dosis IS NULL) OR (esquema_id IS NOT NULL)))
);


--
-- Name: cambios_estado_animal; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.cambios_estado_animal (
    id uuid NOT NULL,
    rancho_id uuid NOT NULL,
    animal_id uuid NOT NULL,
    estado_anterior character varying(20) NOT NULL,
    estado_nuevo character varying(20) NOT NULL,
    fecha date NOT NULL,
    motivo character varying(500) NOT NULL,
    creado_en timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    modificado_en timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    creado_por uuid,
    modificado_por uuid,
    eliminado_en timestamp with time zone,
    CONSTRAINT cambios_estado_animal_estado_nuevo_check CHECK (((estado_nuevo)::text = ANY ((ARRAY['activo'::character varying, 'vendido'::character varying, 'muerto'::character varying, 'archivado'::character varying])::text[]))),
    CONSTRAINT cambios_estado_animal_motivo_check CHECK ((btrim((motivo)::text) <> ''::text))
);


--
-- Name: categorias_animal; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.categorias_animal (
    codigo character varying(30) NOT NULL,
    orden smallint DEFAULT 0 NOT NULL,
    creado_en timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    modificado_en timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    creado_por uuid,
    modificado_por uuid,
    eliminado_en timestamp with time zone
);


--
-- Name: configuracion_plataforma; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.configuracion_plataforma (
    clave character varying(60) NOT NULL,
    valor integer,
    creado_en timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    modificado_en timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    creado_por uuid,
    modificado_por uuid,
    eliminado_en timestamp with time zone,
    CONSTRAINT configuracion_plataforma_valor_check CHECK (((valor IS NULL) OR (valor > 0)))
);


--
-- Name: consultas_asistente; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.consultas_asistente (
    id uuid NOT NULL,
    rancho_id uuid NOT NULL,
    usuario_id uuid NOT NULL,
    pregunta character varying(500) NOT NULL,
    respuesta text NOT NULL,
    herramientas text[] DEFAULT '{}'::text[] NOT NULL,
    creado_en timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    modificado_en timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    creado_por uuid,
    modificado_por uuid,
    eliminado_en timestamp with time zone,
    CONSTRAINT consultas_asistente_pregunta_check CHECK ((btrim((pregunta)::text) <> ''::text))
);


--
-- Name: corrales; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.corrales (
    id uuid NOT NULL,
    rancho_id uuid NOT NULL,
    nombre character varying(100) NOT NULL,
    capacidad integer,
    superficie_ha numeric(12,4),
    creado_en timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    modificado_en timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    creado_por uuid,
    modificado_por uuid,
    eliminado_en timestamp with time zone,
    CONSTRAINT corrales_capacidad_check CHECK ((capacidad > 0)),
    CONSTRAINT corrales_superficie_ha_check CHECK ((superficie_ha > (0)::numeric))
);


--
-- Name: esquemas_vacunacion; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.esquemas_vacunacion (
    id uuid NOT NULL,
    rancho_id uuid NOT NULL,
    producto_id uuid NOT NULL,
    nombre character varying(120) NOT NULL,
    categorias character varying(30)[],
    sexo character varying(10),
    edad_minima_meses smallint DEFAULT 0 NOT NULL,
    edad_maxima_meses smallint,
    dosis smallint NOT NULL,
    intervalo_dias smallint,
    refuerzo_dias smallint,
    creado_en timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    modificado_en timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    creado_por uuid,
    modificado_por uuid,
    eliminado_en timestamp with time zone,
    CONSTRAINT ck_esquemas_edades CHECK (((edad_maxima_meses IS NULL) OR (edad_maxima_meses >= edad_minima_meses))),
    CONSTRAINT ck_esquemas_intervalo CHECK (((dosis = 1) OR (intervalo_dias IS NOT NULL))),
    CONSTRAINT esquemas_vacunacion_dosis_check CHECK (((dosis >= 1) AND (dosis <= 10))),
    CONSTRAINT esquemas_vacunacion_edad_maxima_meses_check CHECK ((edad_maxima_meses >= 0)),
    CONSTRAINT esquemas_vacunacion_edad_minima_meses_check CHECK ((edad_minima_meses >= 0)),
    CONSTRAINT esquemas_vacunacion_intervalo_dias_check CHECK ((intervalo_dias > 0)),
    CONSTRAINT esquemas_vacunacion_nombre_check CHECK ((btrim((nombre)::text) <> ''::text)),
    CONSTRAINT esquemas_vacunacion_refuerzo_dias_check CHECK ((refuerzo_dias > 0)),
    CONSTRAINT esquemas_vacunacion_sexo_check CHECK (((sexo)::text = ANY ((ARRAY['macho'::character varying, 'hembra'::character varying])::text[])))
);


--
-- Name: franjas_precio; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.franjas_precio (
    codigo character varying(10) NOT NULL,
    nombre character varying(100) NOT NULL,
    multiplicador numeric(5,2) NOT NULL,
    creado_en timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    modificado_en timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    creado_por uuid,
    modificado_por uuid,
    eliminado_en timestamp with time zone,
    CONSTRAINT franjas_precio_multiplicador_check CHECK ((multiplicador > (0)::numeric))
);


--
-- Name: TABLE franjas_precio; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.franjas_precio IS 'Franjas de precio regionales. El codigo es la clave natural (DECISIONES.md, decision 2).';


--
-- Name: migraciones_aplicadas; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.migraciones_aplicadas (
    nombre character varying(200) NOT NULL,
    aplicada_en timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: modulos; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.modulos (
    codigo character varying(50) NOT NULL,
    nombre character varying(100) NOT NULL,
    orden smallint DEFAULT 0 NOT NULL,
    creado_en timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    modificado_en timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    creado_por uuid,
    modificado_por uuid,
    eliminado_en timestamp with time zone
);


--
-- Name: movimientos_corral; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.movimientos_corral (
    id uuid NOT NULL,
    rancho_id uuid NOT NULL,
    animal_id uuid NOT NULL,
    corral_origen_id uuid,
    corral_destino_id uuid,
    fecha timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    creado_en timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    modificado_en timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    creado_por uuid NOT NULL,
    modificado_por uuid,
    eliminado_en timestamp with time zone,
    CONSTRAINT ck_movimientos_cambia_algo CHECK ((corral_origen_id IS DISTINCT FROM corral_destino_id))
);


--
-- Name: paises; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.paises (
    codigo character varying(10) NOT NULL,
    nombre character varying(100) NOT NULL,
    idioma character varying(10) DEFAULT 'es'::character varying NOT NULL,
    moneda character varying(10) NOT NULL,
    unidad_peso character varying(20) NOT NULL,
    unidad_superficie character varying(20) NOT NULL,
    formato_fecha character varying(20) NOT NULL,
    zona_horaria character varying(50) NOT NULL,
    franja_precio_codigo character varying(10) NOT NULL,
    creado_en timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    modificado_en timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    creado_por uuid,
    modificado_por uuid,
    eliminado_en timestamp with time zone,
    franja_precio character varying(20) DEFAULT 'Baja'::character varying,
    CONSTRAINT paises_idioma_check CHECK (((idioma)::text = ANY ((ARRAY['es'::character varying, 'en'::character varying])::text[]))),
    CONSTRAINT paises_unidad_peso_check CHECK (((unidad_peso)::text = ANY ((ARRAY['kg'::character varying, 'lb'::character varying])::text[]))),
    CONSTRAINT paises_unidad_superficie_check CHECK (((unidad_superficie)::text = ANY ((ARRAY['ha'::character varying, 'acre'::character varying])::text[])))
);


--
-- Name: COLUMN paises.idioma; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.paises.idioma IS 'Define el idioma del pais segun HU-14';


--
-- Name: COLUMN paises.moneda; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.paises.moneda IS 'Define la moneda del pais segun HU-14';


--
-- Name: pasos_guia; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.pasos_guia (
    id uuid NOT NULL,
    rancho_id uuid NOT NULL,
    paso character varying(20) NOT NULL,
    visitado_en timestamp with time zone,
    completado_en timestamp with time zone,
    creado_en timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    modificado_en timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    creado_por uuid,
    modificado_por uuid,
    eliminado_en timestamp with time zone,
    CONSTRAINT pasos_guia_paso_check CHECK (((paso)::text = ANY ((ARRAY['animales'::character varying, 'corrales'::character varying, 'vacunas'::character varying, 'equipo'::character varying])::text[])))
);


--
-- Name: permisos_tipo; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.permisos_tipo (
    id uuid NOT NULL,
    tipo_colaborador_id uuid NOT NULL,
    modulo_codigo character varying(50) NOT NULL,
    puede_ver boolean DEFAULT false NOT NULL,
    puede_editar boolean DEFAULT false NOT NULL,
    creado_en timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    modificado_en timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    creado_por uuid,
    modificado_por uuid,
    eliminado_en timestamp with time zone,
    rancho_id uuid,
    CONSTRAINT ck_permisos_tipo_editar_implica_ver CHECK (((puede_editar = false) OR (puede_ver = true)))
);


--
-- Name: ranchos; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ranchos (
    id uuid NOT NULL,
    nombre character varying(150) NOT NULL,
    departamento character varying(100) NOT NULL,
    localidad character varying(100) NOT NULL,
    latitud numeric(10,8),
    longitud numeric(11,8),
    superficie numeric(12,2) NOT NULL,
    tipo_produccion character varying(20) NOT NULL,
    pais_codigo character varying(10) NOT NULL,
    propietario_id uuid NOT NULL,
    creado_en timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    modificado_en timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    creado_por uuid,
    modificado_por uuid,
    eliminado_en timestamp with time zone,
    guia_pausada_en timestamp with time zone,
    CONSTRAINT ck_ranchos_ubicacion_completa CHECK ((((latitud IS NULL) AND (longitud IS NULL)) OR ((latitud IS NOT NULL) AND (longitud IS NOT NULL)))),
    CONSTRAINT ranchos_superficie_check CHECK ((superficie > (0)::numeric)),
    CONSTRAINT ranchos_tipo_produccion_check CHECK (((tipo_produccion)::text = ANY ((ARRAY['carne'::character varying, 'leche'::character varying, 'mixto'::character varying])::text[])))
);


--
-- Name: permisos_tipo_vigentes; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.permisos_tipo_vigentes AS
 SELECT p.rancho_id,
    p.tipo_colaborador_id,
    p.modulo_codigo,
    p.puede_ver,
    p.puede_editar,
    true AS ajustado
   FROM public.permisos_tipo p
  WHERE ((p.eliminado_en IS NULL) AND (p.rancho_id IS NOT NULL))
UNION ALL
 SELECT r.id AS rancho_id,
    p.tipo_colaborador_id,
    p.modulo_codigo,
    p.puede_ver,
    p.puede_editar,
    false AS ajustado
   FROM (public.permisos_tipo p
     CROSS JOIN public.ranchos r)
  WHERE ((p.eliminado_en IS NULL) AND (p.rancho_id IS NULL) AND (r.eliminado_en IS NULL) AND (NOT (EXISTS ( SELECT 1
           FROM public.permisos_tipo propio
          WHERE ((propio.rancho_id = r.id) AND (propio.tipo_colaborador_id = p.tipo_colaborador_id) AND (propio.eliminado_en IS NULL))))));


--
-- Name: permisos_usuario; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.permisos_usuario (
    id uuid NOT NULL,
    usuario_id uuid NOT NULL,
    modulo_codigo character varying(50) NOT NULL,
    puede_ver boolean DEFAULT false NOT NULL,
    puede_editar boolean DEFAULT false NOT NULL,
    creado_en timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    modificado_en timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    creado_por uuid,
    modificado_por uuid,
    eliminado_en timestamp with time zone,
    CONSTRAINT ck_permisos_usuario_editar_implica_ver CHECK (((puede_editar = false) OR (puede_ver = true)))
);


--
-- Name: pesajes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.pesajes (
    id uuid NOT NULL,
    rancho_id uuid NOT NULL,
    animal_id uuid NOT NULL,
    fecha date NOT NULL,
    peso_kg numeric(10,2) NOT NULL,
    observacion character varying(500),
    lote_id uuid,
    creado_en timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    modificado_en timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    creado_por uuid,
    modificado_por uuid,
    eliminado_en timestamp with time zone,
    CONSTRAINT pesajes_peso_kg_check CHECK ((peso_kg > (0)::numeric))
);


--
-- Name: productos_sanitarios; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.productos_sanitarios (
    id uuid NOT NULL,
    rancho_id uuid NOT NULL,
    nombre character varying(120) NOT NULL,
    clave character varying(120) NOT NULL,
    tipo character varying(20) NOT NULL,
    laboratorio character varying(120),
    dosis numeric(10,2),
    unidad character varying(10),
    creado_en timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    modificado_en timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    creado_por uuid,
    modificado_por uuid,
    eliminado_en timestamp with time zone,
    CONSTRAINT ck_productos_dosis_unidad CHECK (((dosis IS NULL) = (unidad IS NULL))),
    CONSTRAINT productos_sanitarios_dosis_check CHECK ((dosis > (0)::numeric)),
    CONSTRAINT productos_sanitarios_nombre_check CHECK ((btrim((nombre)::text) <> ''::text)),
    CONSTRAINT productos_sanitarios_tipo_check CHECK (((tipo)::text = ANY ((ARRAY['vacuna'::character varying, 'antiparasitario'::character varying, 'vitamina'::character varying, 'antibiotico'::character varying, 'otro'::character varying])::text[]))),
    CONSTRAINT productos_sanitarios_unidad_check CHECK (((unidad)::text = ANY ((ARRAY['ml'::character varying, 'g'::character varying, 'mg'::character varying, 'dosis'::character varying])::text[])))
);


--
-- Name: razas; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.razas (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    rancho_id uuid,
    nombre character varying(100) NOT NULL,
    clave character varying(100) NOT NULL,
    grupo character varying(10),
    orden smallint DEFAULT 0 NOT NULL,
    creado_en timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    modificado_en timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    creado_por uuid,
    modificado_por uuid,
    eliminado_en timestamp with time zone,
    CONSTRAINT ck_razas_grupo CHECK (((rancho_id IS NULL) = (grupo IS NOT NULL))),
    CONSTRAINT razas_grupo_check CHECK (((grupo)::text = ANY ((ARRAY['carne'::character varying, 'leche'::character varying, 'doble'::character varying])::text[]))),
    CONSTRAINT razas_nombre_check CHECK ((btrim((nombre)::text) <> ''::text))
);


--
-- Name: registro_auditoria; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.registro_auditoria (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    admin_id uuid NOT NULL,
    accion character varying(40) NOT NULL,
    rancho_id uuid,
    usuario_id uuid,
    objeto character varying(150),
    detalle jsonb DEFAULT '{}'::jsonb NOT NULL,
    creado_en timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    modificado_en timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    creado_por uuid,
    modificado_por uuid,
    eliminado_en timestamp with time zone,
    CONSTRAINT ck_auditoria_accion CHECK (((accion)::text = ANY ((ARRAY['soporte_entrada'::character varying, 'soporte_salida'::character varying, 'cuenta_suspendida'::character varying, 'cuenta_reactivada'::character varying, 'contrasena_enlace'::character varying, 'raza_creada'::character varying, 'raza_editada'::character varying, 'raza_desactivada'::character varying, 'raza_reactivada'::character varying, 'configuracion'::character varying])::text[])))
);


--
-- Name: sesiones; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sesiones (
    id uuid NOT NULL,
    usuario_id uuid NOT NULL,
    token_refresco_hash character varying(255) NOT NULL,
    expira_en timestamp with time zone NOT NULL,
    revocada_en timestamp with time zone,
    ultimo_uso_en timestamp with time zone,
    agente_usuario character varying(255),
    creado_en timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    modificado_en timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    creado_por uuid,
    modificado_por uuid,
    eliminado_en timestamp with time zone
);


--
-- Name: tipos_colaborador; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.tipos_colaborador (
    id uuid NOT NULL,
    rancho_id uuid,
    nombre character varying(100) NOT NULL,
    es_predefinido boolean DEFAULT false NOT NULL,
    creado_en timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    modificado_en timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    creado_por uuid,
    modificado_por uuid,
    eliminado_en timestamp with time zone,
    CONSTRAINT ck_tipos_colaborador_ambito CHECK ((((es_predefinido = true) AND (rancho_id IS NULL)) OR ((es_predefinido = false) AND (rancho_id IS NOT NULL))))
);


--
-- Name: tokens; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.tokens (
    id uuid NOT NULL,
    usuario_id uuid NOT NULL,
    tipo character varying(30) NOT NULL,
    token_hash character varying(255) NOT NULL,
    expira_en timestamp with time zone NOT NULL,
    usado_en timestamp with time zone,
    creado_en timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    modificado_en timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    creado_por uuid,
    modificado_por uuid,
    eliminado_en timestamp with time zone,
    CONSTRAINT tokens_tipo_check CHECK (((tipo)::text = ANY ((ARRAY['verificacion_correo'::character varying, 'recuperacion_contrasena'::character varying])::text[])))
);


--
-- Name: usuarios; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.usuarios (
    id uuid NOT NULL,
    nombre character varying(150) NOT NULL,
    correo character varying(150) NOT NULL,
    contrasena_hash character varying(255) NOT NULL,
    correo_verificado boolean DEFAULT false NOT NULL,
    debe_cambiar_contrasena boolean DEFAULT true NOT NULL,
    estado character varying(20) DEFAULT 'activo'::character varying NOT NULL,
    rancho_id uuid,
    rol character varying(20) NOT NULL,
    tipo_colaborador_id uuid,
    intentos_fallidos smallint DEFAULT 0 NOT NULL,
    bloqueado_hasta timestamp with time zone,
    creado_en timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    modificado_en timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    creado_por uuid,
    modificado_por uuid,
    eliminado_en timestamp with time zone,
    pais_codigo character(2),
    idioma character varying(10),
    CONSTRAINT ck_usuarios_admin_sin_rancho CHECK ((((rol)::text <> 'admin_plataforma'::text) OR (rancho_id IS NULL))),
    CONSTRAINT ck_usuarios_tipo_solo_colaborador CHECK (((((rol)::text = 'colaborador'::text) AND (tipo_colaborador_id IS NOT NULL)) OR (((rol)::text <> 'colaborador'::text) AND (tipo_colaborador_id IS NULL)))),
    CONSTRAINT usuarios_estado_check CHECK (((estado)::text = ANY ((ARRAY['activo'::character varying, 'suspendido'::character varying])::text[]))),
    CONSTRAINT usuarios_rol_check CHECK (((rol)::text = ANY ((ARRAY['admin_plataforma'::character varying, 'propietario'::character varying, 'socio'::character varying, 'colaborador'::character varying])::text[])))
);


--
-- Name: COLUMN usuarios.pais_codigo; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.usuarios.pais_codigo IS 'Pais elegido al registrarse (HU-06). Define idioma, moneda y unidades (HU-14).';


--
-- Name: accesos_admin accesos_admin_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.accesos_admin
    ADD CONSTRAINT accesos_admin_pkey PRIMARY KEY (id);


--
-- Name: animales animales_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.animales
    ADD CONSTRAINT animales_pkey PRIMARY KEY (id);


--
-- Name: aplicaciones_sanitarias aplicaciones_sanitarias_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.aplicaciones_sanitarias
    ADD CONSTRAINT aplicaciones_sanitarias_pkey PRIMARY KEY (id);


--
-- Name: cambios_estado_animal cambios_estado_animal_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cambios_estado_animal
    ADD CONSTRAINT cambios_estado_animal_pkey PRIMARY KEY (id);


--
-- Name: categorias_animal categorias_animal_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.categorias_animal
    ADD CONSTRAINT categorias_animal_pkey PRIMARY KEY (codigo);


--
-- Name: configuracion_plataforma configuracion_plataforma_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.configuracion_plataforma
    ADD CONSTRAINT configuracion_plataforma_pkey PRIMARY KEY (clave);


--
-- Name: consultas_asistente consultas_asistente_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.consultas_asistente
    ADD CONSTRAINT consultas_asistente_pkey PRIMARY KEY (id);


--
-- Name: corrales corrales_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.corrales
    ADD CONSTRAINT corrales_pkey PRIMARY KEY (id);


--
-- Name: esquemas_vacunacion esquemas_vacunacion_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.esquemas_vacunacion
    ADD CONSTRAINT esquemas_vacunacion_pkey PRIMARY KEY (id);


--
-- Name: franjas_precio franjas_precio_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.franjas_precio
    ADD CONSTRAINT franjas_precio_pkey PRIMARY KEY (codigo);


--
-- Name: migraciones_aplicadas migraciones_aplicadas_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.migraciones_aplicadas
    ADD CONSTRAINT migraciones_aplicadas_pkey PRIMARY KEY (nombre);


--
-- Name: modulos modulos_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.modulos
    ADD CONSTRAINT modulos_pkey PRIMARY KEY (codigo);


--
-- Name: movimientos_corral movimientos_corral_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.movimientos_corral
    ADD CONSTRAINT movimientos_corral_pkey PRIMARY KEY (id);


--
-- Name: paises paises_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.paises
    ADD CONSTRAINT paises_pkey PRIMARY KEY (codigo);


--
-- Name: pasos_guia pasos_guia_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pasos_guia
    ADD CONSTRAINT pasos_guia_pkey PRIMARY KEY (id);


--
-- Name: permisos_tipo permisos_tipo_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.permisos_tipo
    ADD CONSTRAINT permisos_tipo_pkey PRIMARY KEY (id);


--
-- Name: permisos_usuario permisos_usuario_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.permisos_usuario
    ADD CONSTRAINT permisos_usuario_pkey PRIMARY KEY (id);


--
-- Name: pesajes pesajes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pesajes
    ADD CONSTRAINT pesajes_pkey PRIMARY KEY (id);


--
-- Name: productos_sanitarios productos_sanitarios_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.productos_sanitarios
    ADD CONSTRAINT productos_sanitarios_pkey PRIMARY KEY (id);


--
-- Name: ranchos ranchos_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ranchos
    ADD CONSTRAINT ranchos_pkey PRIMARY KEY (id);


--
-- Name: razas razas_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.razas
    ADD CONSTRAINT razas_pkey PRIMARY KEY (id);


--
-- Name: registro_auditoria registro_auditoria_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.registro_auditoria
    ADD CONSTRAINT registro_auditoria_pkey PRIMARY KEY (id);


--
-- Name: sesiones sesiones_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sesiones
    ADD CONSTRAINT sesiones_pkey PRIMARY KEY (id);


--
-- Name: tipos_colaborador tipos_colaborador_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tipos_colaborador
    ADD CONSTRAINT tipos_colaborador_pkey PRIMARY KEY (id);


--
-- Name: tokens tokens_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tokens
    ADD CONSTRAINT tokens_pkey PRIMARY KEY (id);


--
-- Name: usuarios usuarios_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.usuarios
    ADD CONSTRAINT usuarios_pkey PRIMARY KEY (id);


--
-- Name: animales ux_animales_id_rancho; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.animales
    ADD CONSTRAINT ux_animales_id_rancho UNIQUE (id, rancho_id);


--
-- Name: esquemas_vacunacion ux_esquemas_id_rancho; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.esquemas_vacunacion
    ADD CONSTRAINT ux_esquemas_id_rancho UNIQUE (id, rancho_id);


--
-- Name: productos_sanitarios ux_productos_id_rancho; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.productos_sanitarios
    ADD CONSTRAINT ux_productos_id_rancho UNIQUE (id, rancho_id);


--
-- Name: ix_accesos_admin_abiertos; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_accesos_admin_abiertos ON public.accesos_admin USING btree (admin_id, rancho_id) WHERE (salido_en IS NULL);


--
-- Name: ix_accesos_admin_rancho; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_accesos_admin_rancho ON public.accesos_admin USING btree (rancho_id, entrado_en DESC);


--
-- Name: ix_animales_corral; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_animales_corral ON public.animales USING btree (corral_id);


--
-- Name: ix_animales_listado_creado; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_animales_listado_creado ON public.animales USING btree (rancho_id, creado_en);


--
-- Name: ix_animales_listado_identificador; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_animales_listado_identificador ON public.animales USING btree (rancho_id, identificador, id);


--
-- Name: ix_animales_listado_nacimiento; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_animales_listado_nacimiento ON public.animales USING btree (rancho_id, fecha_nacimiento);


--
-- Name: ix_animales_listado_nombre; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_animales_listado_nombre ON public.animales USING btree (rancho_id, nombre);


--
-- Name: ix_animales_listado_peso; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_animales_listado_peso ON public.animales USING btree (rancho_id, peso_kg);


--
-- Name: ix_animales_rancho_estado; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_animales_rancho_estado ON public.animales USING btree (rancho_id, estado);


--
-- Name: ix_aplicaciones_animal; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_aplicaciones_animal ON public.aplicaciones_sanitarias USING btree (animal_id, fecha) WHERE (eliminado_en IS NULL);


--
-- Name: ix_aplicaciones_esquema; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_aplicaciones_esquema ON public.aplicaciones_sanitarias USING btree (esquema_id, animal_id) WHERE (eliminado_en IS NULL);


--
-- Name: ix_aplicaciones_rancho_fecha; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_aplicaciones_rancho_fecha ON public.aplicaciones_sanitarias USING btree (rancho_id, fecha) WHERE (eliminado_en IS NULL);


--
-- Name: ix_auditoria_fecha; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_auditoria_fecha ON public.registro_auditoria USING btree (creado_en DESC);


--
-- Name: ix_auditoria_rancho; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_auditoria_rancho ON public.registro_auditoria USING btree (rancho_id, creado_en DESC);


--
-- Name: ix_cambios_estado_animal; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_cambios_estado_animal ON public.cambios_estado_animal USING btree (animal_id, creado_en);


--
-- Name: ix_consultas_asistente_fecha; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_consultas_asistente_fecha ON public.consultas_asistente USING btree (creado_en);


--
-- Name: ix_consultas_asistente_usuario_fecha; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_consultas_asistente_usuario_fecha ON public.consultas_asistente USING btree (usuario_id, creado_en) WHERE (eliminado_en IS NULL);


--
-- Name: ix_esquemas_rancho; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_esquemas_rancho ON public.esquemas_vacunacion USING btree (rancho_id) WHERE (eliminado_en IS NULL);


--
-- Name: ix_movimientos_animal; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_movimientos_animal ON public.movimientos_corral USING btree (animal_id, fecha);


--
-- Name: ix_paises_franja_precio; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_paises_franja_precio ON public.paises USING btree (franja_precio_codigo);


--
-- Name: ix_permisos_tipo_rancho; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_permisos_tipo_rancho ON public.permisos_tipo USING btree (rancho_id, tipo_colaborador_id) WHERE (eliminado_en IS NULL);


--
-- Name: ix_pesajes_rancho_fecha; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_pesajes_rancho_fecha ON public.pesajes USING btree (rancho_id, fecha) WHERE (eliminado_en IS NULL);


--
-- Name: ix_ranchos_pais; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_ranchos_pais ON public.ranchos USING btree (pais_codigo);


--
-- Name: ix_razas_rancho; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_razas_rancho ON public.razas USING btree (rancho_id);


--
-- Name: ix_sesiones_usuario; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_sesiones_usuario ON public.sesiones USING btree (usuario_id) WHERE (revocada_en IS NULL);


--
-- Name: ix_tipos_colaborador_rancho; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_tipos_colaborador_rancho ON public.tipos_colaborador USING btree (rancho_id) WHERE (eliminado_en IS NULL);


--
-- Name: ix_tokens_usuario_tipo; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_tokens_usuario_tipo ON public.tokens USING btree (usuario_id, tipo) WHERE (usado_en IS NULL);


--
-- Name: ix_usuarios_rancho; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_usuarios_rancho ON public.usuarios USING btree (rancho_id) WHERE (eliminado_en IS NULL);


--
-- Name: ix_usuarios_tipo_colaborador; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_usuarios_tipo_colaborador ON public.usuarios USING btree (tipo_colaborador_id);


--
-- Name: ux_animales_rancho_identificador; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX ux_animales_rancho_identificador ON public.animales USING btree (rancho_id, identificador) WHERE (eliminado_en IS NULL);


--
-- Name: ux_corrales_rancho_nombre; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX ux_corrales_rancho_nombre ON public.corrales USING btree (rancho_id, lower((nombre)::text)) WHERE (eliminado_en IS NULL);


--
-- Name: ux_pasos_guia_rancho_paso; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX ux_pasos_guia_rancho_paso ON public.pasos_guia USING btree (rancho_id, paso);


--
-- Name: ux_permisos_tipo; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX ux_permisos_tipo ON public.permisos_tipo USING btree (tipo_colaborador_id, modulo_codigo, COALESCE(rancho_id, '00000000-0000-0000-0000-000000000000'::uuid)) WHERE (eliminado_en IS NULL);


--
-- Name: ux_permisos_usuario; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX ux_permisos_usuario ON public.permisos_usuario USING btree (usuario_id, modulo_codigo) WHERE (eliminado_en IS NULL);


--
-- Name: ux_pesajes_animal_fecha; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX ux_pesajes_animal_fecha ON public.pesajes USING btree (animal_id, fecha) WHERE (eliminado_en IS NULL);


--
-- Name: ux_productos_rancho_clave; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX ux_productos_rancho_clave ON public.productos_sanitarios USING btree (rancho_id, clave) WHERE (eliminado_en IS NULL);


--
-- Name: ux_ranchos_propietario; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX ux_ranchos_propietario ON public.ranchos USING btree (propietario_id) WHERE (eliminado_en IS NULL);


--
-- Name: ux_razas_rancho_clave; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX ux_razas_rancho_clave ON public.razas USING btree (COALESCE(rancho_id, '00000000-0000-0000-0000-000000000000'::uuid), clave) WHERE (eliminado_en IS NULL);


--
-- Name: ux_sesiones_token; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX ux_sesiones_token ON public.sesiones USING btree (token_refresco_hash);


--
-- Name: ux_tipos_colaborador_nombre_global; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX ux_tipos_colaborador_nombre_global ON public.tipos_colaborador USING btree (lower((nombre)::text)) WHERE ((eliminado_en IS NULL) AND (rancho_id IS NULL));


--
-- Name: ux_tipos_colaborador_nombre_rancho; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX ux_tipos_colaborador_nombre_rancho ON public.tipos_colaborador USING btree (rancho_id, lower((nombre)::text)) WHERE ((eliminado_en IS NULL) AND (rancho_id IS NOT NULL));


--
-- Name: ux_tokens_hash; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX ux_tokens_hash ON public.tokens USING btree (token_hash);


--
-- Name: ux_usuarios_correo; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX ux_usuarios_correo ON public.usuarios USING btree (lower((correo)::text)) WHERE (eliminado_en IS NULL);


--
-- Name: accesos_admin tg_accesos_admin_modificado_en; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER tg_accesos_admin_modificado_en BEFORE UPDATE ON public.accesos_admin FOR EACH ROW EXECUTE FUNCTION public.fn_tocar_modificado_en();


--
-- Name: animales tg_animales_modificado_en; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER tg_animales_modificado_en BEFORE UPDATE ON public.animales FOR EACH ROW EXECUTE FUNCTION public.fn_tocar_modificado_en();


--
-- Name: aplicaciones_sanitarias tg_aplicaciones_sanitarias_modificado_en; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER tg_aplicaciones_sanitarias_modificado_en BEFORE UPDATE ON public.aplicaciones_sanitarias FOR EACH ROW EXECUTE FUNCTION public.fn_tocar_modificado_en();


--
-- Name: cambios_estado_animal tg_cambios_estado_animal_modificado_en; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER tg_cambios_estado_animal_modificado_en BEFORE UPDATE ON public.cambios_estado_animal FOR EACH ROW EXECUTE FUNCTION public.fn_tocar_modificado_en();


--
-- Name: configuracion_plataforma tg_configuracion_plataforma_modificado_en; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER tg_configuracion_plataforma_modificado_en BEFORE UPDATE ON public.configuracion_plataforma FOR EACH ROW EXECUTE FUNCTION public.fn_tocar_modificado_en();


--
-- Name: consultas_asistente tg_consultas_asistente_modificado_en; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER tg_consultas_asistente_modificado_en BEFORE UPDATE ON public.consultas_asistente FOR EACH ROW EXECUTE FUNCTION public.fn_tocar_modificado_en();


--
-- Name: corrales tg_corrales_modificado_en; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER tg_corrales_modificado_en BEFORE UPDATE ON public.corrales FOR EACH ROW EXECUTE FUNCTION public.fn_tocar_modificado_en();


--
-- Name: esquemas_vacunacion tg_esquemas_vacunacion_modificado_en; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER tg_esquemas_vacunacion_modificado_en BEFORE UPDATE ON public.esquemas_vacunacion FOR EACH ROW EXECUTE FUNCTION public.fn_tocar_modificado_en();


--
-- Name: franjas_precio tg_franjas_precio_modificado_en; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER tg_franjas_precio_modificado_en BEFORE UPDATE ON public.franjas_precio FOR EACH ROW EXECUTE FUNCTION public.fn_tocar_modificado_en();


--
-- Name: modulos tg_modulos_modificado_en; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER tg_modulos_modificado_en BEFORE UPDATE ON public.modulos FOR EACH ROW EXECUTE FUNCTION public.fn_tocar_modificado_en();


--
-- Name: movimientos_corral tg_movimientos_corral_modificado_en; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER tg_movimientos_corral_modificado_en BEFORE UPDATE ON public.movimientos_corral FOR EACH ROW EXECUTE FUNCTION public.fn_tocar_modificado_en();


--
-- Name: paises tg_paises_modificado_en; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER tg_paises_modificado_en BEFORE UPDATE ON public.paises FOR EACH ROW EXECUTE FUNCTION public.fn_tocar_modificado_en();


--
-- Name: pasos_guia tg_pasos_guia_modificado_en; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER tg_pasos_guia_modificado_en BEFORE UPDATE ON public.pasos_guia FOR EACH ROW EXECUTE FUNCTION public.fn_tocar_modificado_en();


--
-- Name: permisos_tipo tg_permisos_tipo_modificado_en; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER tg_permisos_tipo_modificado_en BEFORE UPDATE ON public.permisos_tipo FOR EACH ROW EXECUTE FUNCTION public.fn_tocar_modificado_en();


--
-- Name: permisos_usuario tg_permisos_usuario_modificado_en; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER tg_permisos_usuario_modificado_en BEFORE UPDATE ON public.permisos_usuario FOR EACH ROW EXECUTE FUNCTION public.fn_tocar_modificado_en();


--
-- Name: pesajes tg_pesajes_modificado_en; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER tg_pesajes_modificado_en BEFORE UPDATE ON public.pesajes FOR EACH ROW EXECUTE FUNCTION public.fn_tocar_modificado_en();


--
-- Name: productos_sanitarios tg_productos_sanitarios_modificado_en; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER tg_productos_sanitarios_modificado_en BEFORE UPDATE ON public.productos_sanitarios FOR EACH ROW EXECUTE FUNCTION public.fn_tocar_modificado_en();


--
-- Name: ranchos tg_ranchos_modificado_en; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER tg_ranchos_modificado_en BEFORE UPDATE ON public.ranchos FOR EACH ROW EXECUTE FUNCTION public.fn_tocar_modificado_en();


--
-- Name: razas tg_razas_modificado_en; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER tg_razas_modificado_en BEFORE UPDATE ON public.razas FOR EACH ROW EXECUTE FUNCTION public.fn_tocar_modificado_en();


--
-- Name: registro_auditoria tg_registro_auditoria_modificado_en; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER tg_registro_auditoria_modificado_en BEFORE UPDATE ON public.registro_auditoria FOR EACH ROW EXECUTE FUNCTION public.fn_tocar_modificado_en();


--
-- Name: sesiones tg_sesiones_modificado_en; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER tg_sesiones_modificado_en BEFORE UPDATE ON public.sesiones FOR EACH ROW EXECUTE FUNCTION public.fn_tocar_modificado_en();


--
-- Name: tipos_colaborador tg_tipos_colaborador_modificado_en; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER tg_tipos_colaborador_modificado_en BEFORE UPDATE ON public.tipos_colaborador FOR EACH ROW EXECUTE FUNCTION public.fn_tocar_modificado_en();


--
-- Name: tokens tg_tokens_modificado_en; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER tg_tokens_modificado_en BEFORE UPDATE ON public.tokens FOR EACH ROW EXECUTE FUNCTION public.fn_tocar_modificado_en();


--
-- Name: usuarios tg_usuarios_modificado_en; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER tg_usuarios_modificado_en BEFORE UPDATE ON public.usuarios FOR EACH ROW EXECUTE FUNCTION public.fn_tocar_modificado_en();


--
-- Name: accesos_admin fk_accesos_admin_admin; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.accesos_admin
    ADD CONSTRAINT fk_accesos_admin_admin FOREIGN KEY (admin_id) REFERENCES public.usuarios(id);


--
-- Name: accesos_admin fk_accesos_admin_rancho; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.accesos_admin
    ADD CONSTRAINT fk_accesos_admin_rancho FOREIGN KEY (rancho_id) REFERENCES public.ranchos(id) ON DELETE CASCADE;


--
-- Name: animales fk_animales_categoria; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.animales
    ADD CONSTRAINT fk_animales_categoria FOREIGN KEY (categoria_codigo) REFERENCES public.categorias_animal(codigo);


--
-- Name: animales fk_animales_corral; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.animales
    ADD CONSTRAINT fk_animales_corral FOREIGN KEY (corral_id) REFERENCES public.corrales(id);


--
-- Name: animales fk_animales_rancho; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.animales
    ADD CONSTRAINT fk_animales_rancho FOREIGN KEY (rancho_id) REFERENCES public.ranchos(id) ON DELETE CASCADE;


--
-- Name: aplicaciones_sanitarias fk_aplicaciones_animal; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.aplicaciones_sanitarias
    ADD CONSTRAINT fk_aplicaciones_animal FOREIGN KEY (animal_id, rancho_id) REFERENCES public.animales(id, rancho_id) ON DELETE CASCADE;


--
-- Name: aplicaciones_sanitarias fk_aplicaciones_esquema; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.aplicaciones_sanitarias
    ADD CONSTRAINT fk_aplicaciones_esquema FOREIGN KEY (esquema_id, rancho_id) REFERENCES public.esquemas_vacunacion(id, rancho_id) ON DELETE CASCADE;


--
-- Name: aplicaciones_sanitarias fk_aplicaciones_producto; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.aplicaciones_sanitarias
    ADD CONSTRAINT fk_aplicaciones_producto FOREIGN KEY (producto_id, rancho_id) REFERENCES public.productos_sanitarios(id, rancho_id) ON DELETE CASCADE;


--
-- Name: aplicaciones_sanitarias fk_aplicaciones_rancho; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.aplicaciones_sanitarias
    ADD CONSTRAINT fk_aplicaciones_rancho FOREIGN KEY (rancho_id) REFERENCES public.ranchos(id) ON DELETE CASCADE;


--
-- Name: registro_auditoria fk_auditoria_admin; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.registro_auditoria
    ADD CONSTRAINT fk_auditoria_admin FOREIGN KEY (admin_id) REFERENCES public.usuarios(id) ON DELETE CASCADE;


--
-- Name: registro_auditoria fk_auditoria_rancho; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.registro_auditoria
    ADD CONSTRAINT fk_auditoria_rancho FOREIGN KEY (rancho_id) REFERENCES public.ranchos(id) ON DELETE SET NULL;


--
-- Name: registro_auditoria fk_auditoria_usuario; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.registro_auditoria
    ADD CONSTRAINT fk_auditoria_usuario FOREIGN KEY (usuario_id) REFERENCES public.usuarios(id) ON DELETE SET NULL;


--
-- Name: cambios_estado_animal fk_cambios_estado_animal; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cambios_estado_animal
    ADD CONSTRAINT fk_cambios_estado_animal FOREIGN KEY (animal_id) REFERENCES public.animales(id) ON DELETE CASCADE;


--
-- Name: cambios_estado_animal fk_cambios_estado_rancho; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cambios_estado_animal
    ADD CONSTRAINT fk_cambios_estado_rancho FOREIGN KEY (rancho_id) REFERENCES public.ranchos(id) ON DELETE CASCADE;


--
-- Name: consultas_asistente fk_consultas_asistente_rancho; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.consultas_asistente
    ADD CONSTRAINT fk_consultas_asistente_rancho FOREIGN KEY (rancho_id) REFERENCES public.ranchos(id) ON DELETE CASCADE;


--
-- Name: consultas_asistente fk_consultas_asistente_usuario; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.consultas_asistente
    ADD CONSTRAINT fk_consultas_asistente_usuario FOREIGN KEY (usuario_id) REFERENCES public.usuarios(id) ON DELETE CASCADE;


--
-- Name: corrales fk_corrales_rancho; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.corrales
    ADD CONSTRAINT fk_corrales_rancho FOREIGN KEY (rancho_id) REFERENCES public.ranchos(id) ON DELETE CASCADE;


--
-- Name: esquemas_vacunacion fk_esquemas_producto; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.esquemas_vacunacion
    ADD CONSTRAINT fk_esquemas_producto FOREIGN KEY (producto_id, rancho_id) REFERENCES public.productos_sanitarios(id, rancho_id) ON DELETE CASCADE;


--
-- Name: esquemas_vacunacion fk_esquemas_rancho; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.esquemas_vacunacion
    ADD CONSTRAINT fk_esquemas_rancho FOREIGN KEY (rancho_id) REFERENCES public.ranchos(id) ON DELETE CASCADE;


--
-- Name: movimientos_corral fk_movimientos_animal; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.movimientos_corral
    ADD CONSTRAINT fk_movimientos_animal FOREIGN KEY (animal_id) REFERENCES public.animales(id) ON DELETE CASCADE;


--
-- Name: movimientos_corral fk_movimientos_destino; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.movimientos_corral
    ADD CONSTRAINT fk_movimientos_destino FOREIGN KEY (corral_destino_id) REFERENCES public.corrales(id);


--
-- Name: movimientos_corral fk_movimientos_origen; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.movimientos_corral
    ADD CONSTRAINT fk_movimientos_origen FOREIGN KEY (corral_origen_id) REFERENCES public.corrales(id);


--
-- Name: movimientos_corral fk_movimientos_rancho; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.movimientos_corral
    ADD CONSTRAINT fk_movimientos_rancho FOREIGN KEY (rancho_id) REFERENCES public.ranchos(id) ON DELETE CASCADE;


--
-- Name: paises fk_paises_franja_precio; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.paises
    ADD CONSTRAINT fk_paises_franja_precio FOREIGN KEY (franja_precio_codigo) REFERENCES public.franjas_precio(codigo);


--
-- Name: pasos_guia fk_pasos_guia_rancho; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pasos_guia
    ADD CONSTRAINT fk_pasos_guia_rancho FOREIGN KEY (rancho_id) REFERENCES public.ranchos(id) ON DELETE CASCADE;


--
-- Name: permisos_tipo fk_permisos_tipo_modulo; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.permisos_tipo
    ADD CONSTRAINT fk_permisos_tipo_modulo FOREIGN KEY (modulo_codigo) REFERENCES public.modulos(codigo);


--
-- Name: permisos_tipo fk_permisos_tipo_rancho; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.permisos_tipo
    ADD CONSTRAINT fk_permisos_tipo_rancho FOREIGN KEY (rancho_id) REFERENCES public.ranchos(id) ON DELETE CASCADE;


--
-- Name: permisos_tipo fk_permisos_tipo_tipo_colaborador; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.permisos_tipo
    ADD CONSTRAINT fk_permisos_tipo_tipo_colaborador FOREIGN KEY (tipo_colaborador_id) REFERENCES public.tipos_colaborador(id);


--
-- Name: permisos_usuario fk_permisos_usuario_modulo; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.permisos_usuario
    ADD CONSTRAINT fk_permisos_usuario_modulo FOREIGN KEY (modulo_codigo) REFERENCES public.modulos(codigo);


--
-- Name: permisos_usuario fk_permisos_usuario_usuario; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.permisos_usuario
    ADD CONSTRAINT fk_permisos_usuario_usuario FOREIGN KEY (usuario_id) REFERENCES public.usuarios(id);


--
-- Name: pesajes fk_pesajes_animal; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pesajes
    ADD CONSTRAINT fk_pesajes_animal FOREIGN KEY (animal_id, rancho_id) REFERENCES public.animales(id, rancho_id) ON DELETE CASCADE;


--
-- Name: pesajes fk_pesajes_rancho; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pesajes
    ADD CONSTRAINT fk_pesajes_rancho FOREIGN KEY (rancho_id) REFERENCES public.ranchos(id) ON DELETE CASCADE;


--
-- Name: productos_sanitarios fk_productos_rancho; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.productos_sanitarios
    ADD CONSTRAINT fk_productos_rancho FOREIGN KEY (rancho_id) REFERENCES public.ranchos(id) ON DELETE CASCADE;


--
-- Name: ranchos fk_ranchos_pais; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ranchos
    ADD CONSTRAINT fk_ranchos_pais FOREIGN KEY (pais_codigo) REFERENCES public.paises(codigo);


--
-- Name: ranchos fk_ranchos_propietario; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ranchos
    ADD CONSTRAINT fk_ranchos_propietario FOREIGN KEY (propietario_id) REFERENCES public.usuarios(id);


--
-- Name: razas fk_razas_rancho; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.razas
    ADD CONSTRAINT fk_razas_rancho FOREIGN KEY (rancho_id) REFERENCES public.ranchos(id) ON DELETE CASCADE;


--
-- Name: sesiones fk_sesiones_usuario; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sesiones
    ADD CONSTRAINT fk_sesiones_usuario FOREIGN KEY (usuario_id) REFERENCES public.usuarios(id);


--
-- Name: tipos_colaborador fk_tipos_colaborador_rancho; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tipos_colaborador
    ADD CONSTRAINT fk_tipos_colaborador_rancho FOREIGN KEY (rancho_id) REFERENCES public.ranchos(id);


--
-- Name: tokens fk_tokens_usuario; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tokens
    ADD CONSTRAINT fk_tokens_usuario FOREIGN KEY (usuario_id) REFERENCES public.usuarios(id);


--
-- Name: usuarios fk_usuarios_pais; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.usuarios
    ADD CONSTRAINT fk_usuarios_pais FOREIGN KEY (pais_codigo) REFERENCES public.paises(codigo);


--
-- Name: usuarios fk_usuarios_rancho; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.usuarios
    ADD CONSTRAINT fk_usuarios_rancho FOREIGN KEY (rancho_id) REFERENCES public.ranchos(id);


--
-- Name: usuarios fk_usuarios_tipo_colaborador; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.usuarios
    ADD CONSTRAINT fk_usuarios_tipo_colaborador FOREIGN KEY (tipo_colaborador_id) REFERENCES public.tipos_colaborador(id);


--
-- PostgreSQL database dump complete
--


