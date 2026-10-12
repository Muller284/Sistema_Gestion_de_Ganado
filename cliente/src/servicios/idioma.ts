import { Fragment, createElement, useEffect, useState, type ReactNode } from 'react';

/**
 * HU-25 · Interfaz en español e inglés.
 *
 * Criterios de aceptación:
 *   1. Todos los textos de la interfaz están fuera del código, en archivos de
 *      traducción.
 *   2. El idioma se toma del país elegido y se puede cambiar.
 *   3. Agregar un idioma nuevo consiste en sumar un archivo, sin tocar el
 *      sistema.
 *
 * DÓNDE ESTÁN LOS TEXTOS
 * En la carpeta idiomas/ de la raíz del repositorio: un archivo por idioma
 * (es.json, en.json). El mismo archivo lo leen el cliente (la interfaz) y el
 * servidor (sus mensajes y los correos). Para sumar un idioma se copia es.json
 * con otro nombre, se traduce y listo: este archivo los descubre solo con
 * import.meta.glob, y aparece en el selector de idioma.
 *
 * CÓMO SE USA
 *   t('equipo.titulo')                         texto simple
 *   t('equipo.bienvenida', { nombre })         con datos: "Hola, {nombre}"
 *   tn('equipo.colaboradores', 3)              con cantidad: elige .uno u .otros
 *                                              (y .cero si existe); {n} es la cantidad
 *   tJsx('perfil.aviso', { b: (s) => <strong>{s}</strong> })
 *                                              con partes marcadas: "Hola <b>Ana</b>"
 *   localeActual()                             para fechas y números: 'es' | 'en'
 *
 * QUÉ IDIOMA SE USA
 *   con sesión     el que eligió la persona en Mi perfil; si no eligió, el de su
 *                  país (o el del país del rancho, si no tiene uno propio). Lo
 *                  decide el servidor y llega en /usuarios/yo.
 *   sin sesión     el que se eligió en el selector (se recuerda en el navegador);
 *                  si no, el del navegador si lo tenemos; si no, español.
 *
 * Cambiar el idioma vuelve a montar la aplicación con los textos nuevos (el
 * ProveedorIdioma, en componentes/, cambia de key). Es lo más simple y no deja textos viejos
 * colgados; cambiar de idioma es algo que se hace pocas veces.
 */

type Arbol = { [clave: string]: string | Arbol };

interface ArchivoIdioma extends Arbol {
  _idioma: { codigo: string; nombre: string } & Arbol;
}

export interface IdiomaDisponible {
  codigo: string;
  nombre: string;
}

const ARCHIVOS = import.meta.glob<ArchivoIdioma>('../../../idiomas/*.json', {
  eager: true,
  import: 'default',
});

const DICCIONARIOS: Record<string, ArchivoIdioma> = {};
for (const archivo of Object.values(ARCHIVOS)) {
  const codigo = String(archivo._idioma?.codigo ?? '');
  if (codigo) DICCIONARIOS[codigo] = archivo;
}

export const IDIOMA_POR_DEFECTO = 'es';

/** Los idiomas que hay, en el orden en que se muestran en el selector. */
export const IDIOMAS: IdiomaDisponible[] = Object.keys(DICCIONARIOS)
  .sort((a, b) => (a === IDIOMA_POR_DEFECTO ? -1 : b === IDIOMA_POR_DEFECTO ? 1 : a.localeCompare(b)))
  .map((codigo) => ({ codigo, nombre: String(DICCIONARIOS[codigo]._idioma.nombre) }));

const CLAVE_GUARDADA = 'idioma';
const EVENTO = 'idioma-cambiado';

/** 'en-US' → 'en'. Si no lo tenemos, null. */
export function normalizarIdioma(valor: string | null | undefined): string | null {
  if (!valor) return null;
  const corto = valor.toLowerCase().split(/[-_]/)[0];
  return DICCIONARIOS[corto] ? corto : null;
}

function leerGuardado(): string | null {
  try {
    return normalizarIdioma(localStorage.getItem(CLAVE_GUARDADA));
  } catch {
    return null;
  }
}

function idiomaInicial(): string {
  return (
    leerGuardado() ??
    (typeof navigator !== 'undefined' ? normalizarIdioma(navigator.language) : null) ??
    IDIOMA_POR_DEFECTO
  );
}

let actual = idiomaInicial();

export function idiomaActual(): string {
  return actual;
}

/** Para Intl y toLocaleDateString. */
export function localeActual(): string {
  return actual;
}

/**
 * Cambia el idioma de toda la interfaz.
 * recordar: guardarlo en el navegador (lo que se elige sin sesión).
 */
export function cambiarIdioma(codigo: string, { recordar = false } = {}): void {
  const elegido = normalizarIdioma(codigo);
  if (!elegido) return;
  if (recordar) {
    try {
      localStorage.setItem(CLAVE_GUARDADA, elegido);
    } catch {
      // Sin almacenamiento (modo privado): se usa igual, solo no se recuerda.
    }
  }
  if (elegido === actual) return;
  actual = elegido;
  window.dispatchEvent(new CustomEvent(EVENTO, { detail: elegido }));
}

function buscar(diccionario: Arbol | undefined, clave: string): string | null {
  let nodo: string | Arbol | undefined = diccionario;
  for (const parte of clave.split('.')) {
    if (!nodo || typeof nodo === 'string') return null;
    nodo = nodo[parte];
  }
  return typeof nodo === 'string' ? nodo : null;
}

function rellenar(texto: string, datos?: Record<string, string | number>): string {
  if (!datos) return texto;
  return texto.replace(/\{(\w+)\}/g, (entero, nombre: string) =>
    nombre in datos ? String(datos[nombre]) : entero,
  );
}

/**
 * El texto de una clave en el idioma actual. Si falta en ese idioma se usa el
 * español; si falta también ahí, se muestra la clave (y en desarrollo se avisa
 * en la consola), para que se note y no quede un hueco en blanco.
 */
export function t(clave: string, datos?: Record<string, string | number>): string {
  const texto =
    buscar(DICCIONARIOS[actual], clave) ?? buscar(DICCIONARIOS[IDIOMA_POR_DEFECTO], clave);
  if (texto === null) {
    if (import.meta.env.DEV) console.warn(`[idioma] falta la clave «${clave}»`);
    return clave;
  }
  return rellenar(texto, datos);
}

/** Si existe la clave en el idioma actual o en el de por defecto. */
export function existe(clave: string): boolean {
  return (
    buscar(DICCIONARIOS[actual], clave) !== null ||
    buscar(DICCIONARIOS[IDIOMA_POR_DEFECTO], clave) !== null
  );
}

/** Con cantidad: clave.cero (si existe), clave.uno o clave.otros. {n} es la cantidad. */
export function tn(clave: string, n: number, datos?: Record<string, string | number>): string {
  const forma = n === 0 && existe(`${clave}.cero`) ? 'cero' : n === 1 ? 'uno' : 'otros';
  return t(`${clave}.${forma}`, { n, ...datos });
}

/**
 * Para textos con partes destacadas o enlaces adentro de la oración:
 *   "Si cambias un tipo, <b>cambia para todos</b>."
 *   tJsx('tipos.intro', { b: (s) => <strong>{s}</strong> })
 * Las marcas no se anidan. Así la oración entera queda en el archivo de
 * traducción y cada idioma pone la parte destacada donde le corresponde.
 */
export function tJsx(
  clave: string,
  partes: Record<string, (contenido: string) => ReactNode>,
  datos?: Record<string, string | number>,
): ReactNode {
  const texto = t(clave, datos);
  const resultado: ReactNode[] = [];
  const marca = /<(\w+)>(.*?)<\/\1>/g;
  let desde = 0;
  let encontrado: RegExpExecArray | null;
  while ((encontrado = marca.exec(texto)) !== null) {
    if (encontrado.index > desde) resultado.push(texto.slice(desde, encontrado.index));
    const armar = partes[encontrado[1]];
    resultado.push(
      createElement(Fragment, { key: encontrado.index }, armar ? armar(encontrado[2]) : encontrado[2]),
    );
    desde = encontrado.index + encontrado[0].length;
  }
  if (desde < texto.length) resultado.push(texto.slice(desde));
  return createElement(Fragment, null, ...resultado);
}

/** Lo que necesitan los selectores de idioma. */
export function useIdioma() {
  const [idioma, setIdioma] = useState(actual);
  useEffect(() => {
    const alCambiar = () => setIdioma(actual);
    window.addEventListener(EVENTO, alCambiar);
    return () => window.removeEventListener(EVENTO, alCambiar);
  }, []);
  return { idioma, idiomas: IDIOMAS, cambiar: cambiarIdioma };
}
