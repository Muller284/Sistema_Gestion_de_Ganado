import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Icono, IconoMarca, SelectorIdioma, type NombreIcono } from '../../componentes';
import { hayAlguienDentro } from '../../servicios/api';
import { t, tJsx } from '../../servicios/idioma';
import {
  FRANJAS,
  PLANES,
  franjaDelNavegador,
  loQueIncluye,
  nombreDeFranja,
  nombreDelPlan,
  paraQuienEs,
  precioDelPlan,
  type ClaveFranja,
  type Periodo,
} from './planes';

/**
 * La landing: lo primero que ve quien llega sin cuenta.
 *
 * DE DÓNDE SALE
 * Del marco "Web / Landing / Página completa / Con datos" de Figma, que es de
 * Aaron según el inventario de pantallas. Se tomó de ahí la estructura y el
 * sistema de diseño, y se le sumaron cosas que en un dibujo no se pueden
 * mostrar: los precios cambian según la región, el asistente responde las
 * preguntas de ejemplo y todo lo que se puede tocar lleva a una pantalla que
 * ya existe (registro e ingreso).
 *
 * TODO EL CONTENIDO VIENE DE LA PROPUESTA
 * Los tres diferenciales, los planes con sus límites, los precios, las
 * franjas regionales y las preguntas del asistente son los de la Propuesta
 * v4. Si allá cambia un número, se cambia en planes.ts y en ningún otro lado.
 *
 * LOS TEXTOS ESTÁN EN EL ARCHIVO DE IDIOMA (HU-25)
 * Todo lo que se lee está bajo landing.* en idiomas/<idioma>.json. Las listas
 * de esta página guardan solo claves y se traducen al dibujar, nunca al cargar
 * el módulo.
 *
 * LAS ANCLAS NO SON ENLACES CON #
 * El enrutador usa la almohadilla (#/registro). Un enlace a "#planes" lo
 * leería como una ruta y mandaría al principio. Por eso el menú de la página
 * son botones que desplazan hasta la sección.
 */

export function PaginaLanding() {
  const raiz = useAparecerAlDesplazar();

  return (
    <div className="landing" ref={raiz}>
      <Cabecera />
      <main>
        <Portada />
        <Diferenciales />
        <Funciones />
        <Asistente />
        <ComoEmpieza />
        <Planes />
        <Preguntas />
        <Cierre />
      </main>
      <Pie />
    </div>
  );
}

/* ==========================================================================
 * Ayudas
 * ======================================================================== */

/** Si la persona pidió que las cosas no se muevan. Sin matchMedia (pruebas), no. */
function prefiereQuieto(): boolean {
  return (
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
}

function irA(id: string) {
  const destino = document.getElementById(id);
  if (!destino) return;
  destino.scrollIntoView({ behavior: prefiereQuieto() ? 'auto' : 'smooth', block: 'start' });
}

/**
 * Lo marcado con data-aparece entra al llegar a la pantalla, una sola vez.
 *
 * Se activa solo si el navegador lo permite y la persona no pidió quietud. Si
 * no, la clase landing--animada nunca se pone y todo se ve desde el principio:
 * nada queda escondido por un navegador viejo.
 */
function useAparecerAlDesplazar() {
  const raiz = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const nodo = raiz.current;
    if (!nodo) return;
    if (prefiereQuieto() || !('IntersectionObserver' in window)) return;

    nodo.classList.add('landing--animada');
    const observador = new IntersectionObserver(
      (entradas) => {
        for (const entrada of entradas) {
          if (entrada.isIntersecting) {
            entrada.target.classList.add('visible');
            observador.unobserve(entrada.target);
          }
        }
      },
      { rootMargin: '0px 0px -10% 0px', threshold: 0.1 },
    );
    nodo.querySelectorAll('[data-aparece]').forEach((el) => observador.observe(el));
    return () => observador.disconnect();
  }, []);

  return raiz;
}

function Encabezado({
  rotulo,
  titulo,
  bajada,
  claro = false,
}: {
  rotulo: string;
  titulo: ReactNode;
  bajada?: ReactNode;
  claro?: boolean;
}) {
  return (
    <div className={claro ? 'lp-encabezado lp-encabezado--claro' : 'lp-encabezado'} data-aparece>
      <p className="lp-rotulo">{rotulo}</p>
      <h2 className="lp-titulo">{titulo}</h2>
      {bajada && <p className="lp-bajada">{bajada}</p>}
    </div>
  );
}

/* ==========================================================================
 * Cabecera
 * ======================================================================== */

/** id de la sección en la página → clave de su nombre en landing.menu. */
const SECCIONES = [
  { id: 'funciones', clave: 'funciones' },
  { id: 'asistente', clave: 'asistente' },
  { id: 'como-empieza', clave: 'comoEmpieza' },
  { id: 'planes', clave: 'planes' },
  { id: 'preguntas', clave: 'preguntas' },
];

function Cabecera() {
  const [abierto, setAbierto] = useState(false);
  const [conSombra, setConSombra] = useState(false);
  const adentro = hayAlguienDentro();

  // La barra gana sombra en cuanto la página deja de estar arriba del todo:
  // es lo que la separa del contenido que pasa por debajo.
  useEffect(() => {
    const alDesplazar = () => setConSombra(window.scrollY > 8);
    alDesplazar();
    window.addEventListener('scroll', alDesplazar, { passive: true });
    return () => window.removeEventListener('scroll', alDesplazar);
  }, []);

  function elegir(id: string) {
    setAbierto(false);
    irA(id);
  }

  return (
    <header className={conSombra ? 'lp-cabecera con-sombra' : 'lp-cabecera'}>
      <div className="lp-ancho lp-cabecera__fila">
        <button type="button" className="lp-marca" onClick={() => window.scrollTo({ top: 0 })}>
          <span className="lp-marca__icono">
            <IconoMarca tamano={18} />
          </span>
          {t('landing.marca')}
        </button>

        <nav className={abierto ? 'lp-menu abierto' : 'lp-menu'} aria-label={t('landing.menu.secciones')}>
          {SECCIONES.map((s) => (
            <button key={s.id} type="button" onClick={() => elegir(s.id)}>
              {t(`landing.menu.${s.clave}`)}
            </button>
          ))}
          <div className="lp-menu__acciones">
            <SelectorIdioma />
            {adentro ? (
              <Link className="btn btn-primario" to="/rancho">
                <Icono nombre="casa" tamano={18} />
                {t('landing.menu.irAMiRancho')}
              </Link>
            ) : (
              <>
                <Link className="btn btn-fantasma" to="/ingreso">
                  {t('landing.menu.ingresar')}
                </Link>
                <Link className="btn btn-primario" to="/registro">
                  {t('landing.menu.probarGratis')}
                </Link>
              </>
            )}
          </div>
        </nav>

        <button
          type="button"
          className="lp-hamburguesa"
          aria-label={abierto ? t('landing.menu.cerrar') : t('landing.menu.abrir')}
          aria-expanded={abierto}
          onClick={() => setAbierto((previo) => !previo)}
        >
          <Icono nombre={abierto ? 'cerrar' : 'menu'} />
        </button>
      </div>
    </header>
  );
}

/* ==========================================================================
 * Portada
 * ======================================================================== */

function Portada() {
  return (
    <section className="lp-portada">
      <div className="lp-ancho lp-portada__rejilla">
        <div className="lp-portada__texto">
          <p className="lp-pastilla">
            <Icono nombre="ubicacion" tamano={16} />
            {t('landing.portada.pastilla')}
          </p>
          <h1 className="lp-portada__titulo">
            {tJsx('landing.portada.titulo', { resaltado: (s) => <span>{s}</span> })}
          </h1>
          <p className="lp-portada__bajada">
            {t('landing.portada.bajada')}
          </p>
          <div className="lp-portada__acciones">
            <Link className="btn btn-primario lp-btn-grande" to="/registro">
              {t('landing.portada.probar')}
              <Icono nombre="flecha" tamano={18} />
            </Link>
            <Link className="btn btn-secundario lp-btn-grande" to="/ingreso">
              {t('landing.portada.yaTengoCuenta')}
            </Link>
          </div>
          <ul className="lp-garantias">
            <li>
              <Icono nombre="exito" tamano={16} />
              {t('landing.portada.sinTarjeta')}
            </li>
            <li>
              <Icono nombre="exito" tamano={16} />
              {t('landing.portada.sigueGratis')}
            </li>
            <li>
              <Icono nombre="exito" tamano={16} />
              {t('landing.portada.exportas')}
            </li>
          </ul>
        </div>

        <Vitrina />
      </div>
    </section>
  );
}

/**
 * Un anticipo del sistema armado con el mismo sistema de diseño, no una
 * imagen: así nunca queda desactualizado respecto de las pantallas reales y
 * se ve nítido en cualquier pantalla. Es decorativo; los lectores de
 * pantalla lo saltan.
 */
function Vitrina() {
  // Alturas en porcentaje: la ganancia del lote subiendo mes a mes.
  const pesos = [46, 58, 52, 70, 81, 96];
  return (
    <div className="lp-vitrina" aria-hidden="true">
      <div className="lp-ventana">
        <div className="lp-ventana__barra">
          <span />
          <span />
          <span />
          <p>{t('landing.vitrina.barra')}</p>
        </div>

        <div className="lp-ventana__cuerpo">
          <div className="lp-ventana__cifras">
            <div className="lp-mini-cifra">
              <p>{t('landing.vitrina.animales')}</p>
              <strong>248</strong>
              <span className="insignia ins-exito">{t('landing.vitrina.animalesNota')}</span>
            </div>
            <div className="lp-mini-cifra">
              <p>{t('landing.vitrina.corrales')}</p>
              <strong>6</strong>
              <span className="insignia ins-neutro">{t('landing.vitrina.corralesNota')}</span>
            </div>
            <div className="lp-mini-cifra">
              <p>{t('landing.vitrina.vacunas')}</p>
              <strong>12</strong>
              <span className="insignia ins-adv">{t('landing.vitrina.vacunasNota')}</span>
            </div>
          </div>

          <div className="lp-grafico">
            <p>{t('landing.vitrina.grafico')}</p>
            <div className="lp-grafico__barras">
              {pesos.map((alto, i) => (
                <span key={i} style={{ height: `${alto}%` }} />
              ))}
            </div>
          </div>

          <ul className="lp-filas">
            {[
              ['0447', 'novillo', 'activo'],
              ['0512', 'vaquilla', 'activo'],
              ['0398', 'toro', 'vendido'],
            ].map(([caravana, detalle, estado]) => (
              <li key={caravana}>
                <span className="dato">{caravana}</span>
                <span className="flex1">{t(`landing.vitrina.filas.${detalle}`)}</span>
                <span className={`insignia ins-${estado}`}>
                  {estado === 'activo' ? t('landing.vitrina.activo') : t('landing.vitrina.vendido')}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="lp-flotante lp-flotante--senal">
        <span className="lp-flotante__icono">
          <Icono nombre="sin-senal" tamano={18} />
        </span>
        <div>
          <strong>{t('landing.vitrina.sinSenal')}</strong>
          <p>{t('landing.vitrina.sinSenalNota')}</p>
        </div>
      </div>

      <div className="lp-flotante lp-flotante--asistente">
        <span className="lp-flotante__icono">
          <Icono nombre="asistente" tamano={18} />
        </span>
        <div>
          <strong>{t('landing.vitrina.pregunta')}</strong>
          <p>{t('landing.vitrina.respuesta')}</p>
        </div>
      </div>
    </div>
  );
}

/* ==========================================================================
 * Los tres diferenciales
 * ======================================================================== */

/** Textos en landing.diferenciales.<clave>.{titulo,texto}. */
const DIFERENCIALES: { icono: NombreIcono; clave: string }[] = [
  { icono: 'equipo', clave: 'equipo' },
  { icono: 'sin-senal', clave: 'sinInternet' },
  { icono: 'asistente', clave: 'asistente' },
];

function Diferenciales() {
  return (
    <section className="lp-seccion lp-seccion--blanca">
      <div className="lp-ancho">
        <Encabezado
          rotulo={t('landing.diferenciales.rotulo')}
          titulo={t('landing.diferenciales.titulo')}
        />
        <div className="lp-tres">
          {DIFERENCIALES.map((d) => (
            <article
              key={d.clave}
              className="lp-diferencial"
              data-aparece
            >
              <span className="lp-emblema">
                <Icono nombre={d.icono} tamano={24} />
              </span>
              <h3>{t(`landing.diferenciales.${d.clave}.titulo`)}</h3>
              <p>{t(`landing.diferenciales.${d.clave}.texto`)}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ==========================================================================
 * Funciones
 * ======================================================================== */

/** Textos en landing.funciones.lista.<clave>.{titulo,texto}. */
const FUNCIONES: { icono: NombreIcono; clave: string }[] = [
  { icono: 'animal', clave: 'animales' },
  { icono: 'corral', clave: 'corrales' },
  { icono: 'sanidad', clave: 'sanidad' },
  { icono: 'balanza', clave: 'pesajes' },
  { icono: 'planilla', clave: 'importa' },
  { icono: 'descargar', clave: 'tusDatos' },
];

function Funciones() {
  return (
    <section className="lp-seccion" id="funciones">
      <div className="lp-ancho">
        <Encabezado
          rotulo={t('landing.funciones.rotulo')}
          titulo={t('landing.funciones.titulo')}
          bajada={t('landing.funciones.bajada')}
        />
        <div className="lp-rejilla-funciones">
          {FUNCIONES.map((f) => (
            <article
              key={f.clave}
              className="lp-funcion"
              data-aparece
            >
              <span className="lp-funcion__icono">
                <Icono nombre={f.icono} tamano={22} />
              </span>
              <div>
                <h3>{t(`landing.funciones.lista.${f.clave}.titulo`)}</h3>
                <p>{t(`landing.funciones.lista.${f.clave}.texto`)}</p>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ==========================================================================
 * Asistente
 * ======================================================================== */

/**
 * Las preguntas son las de la propuesta. Las respuestas son de ejemplo.
 * Textos en landing.asistente.ejemplos.<clave>.{pregunta,respuesta}.
 */
const PREGUNTAS_ASISTENTE = ['terneros', 'vacunaVencida', 'ganancia', 'veterinario', 'peorCorral'];

function Asistente() {
  const [elegida, setElegida] = useState(0);
  const actual = PREGUNTAS_ASISTENTE[elegida];
  const pregunta = (clave: string) => t(`landing.asistente.ejemplos.${clave}.pregunta`);

  return (
    <section className="lp-seccion lp-seccion--oscura" id="asistente">
      <div className="lp-ancho lp-asistente">
        <div className="lp-asistente__texto">
          <Encabezado
            claro
            rotulo={t('landing.asistente.rotulo')}
            titulo={t('landing.asistente.titulo')}
            bajada={t('landing.asistente.bajada')}
          />
          <ul className="lp-asistente__reglas" data-aparece>
            <li>
              <Icono nombre="escudo" tamano={18} />
              {t('landing.asistente.reglas.soloLee')}
            </li>
            <li>
              <Icono nombre="escudo" tamano={18} />
              {t('landing.asistente.reglas.noModifica')}
            </li>
            <li>
              <Icono nombre="escudo" tamano={18} />
              {t('landing.asistente.reglas.colaboradores')}
            </li>
          </ul>
        </div>

        <div className="lp-chat" data-aparece>
          <div className="lp-chat__sugerencias" role="group" aria-label={t('landing.asistente.ejemplosEtiqueta')}>
            {PREGUNTAS_ASISTENTE.map((clave, i) => (
              <button
                key={clave}
                type="button"
                className={i === elegida ? 'activa' : undefined}
                aria-pressed={i === elegida}
                onClick={() => setElegida(i)}
              >
                {pregunta(clave)}
              </button>
            ))}
          </div>

          {/* La clave obliga a React a rehacer las burbujas y así vuelven a
              entrar con su animación al cambiar de pregunta. */}
          <div className="lp-chat__conversacion" key={elegida} aria-live="polite">
            <p className="lp-burbuja lp-burbuja--pregunta">{pregunta(actual)}</p>
            <div className="lp-burbuja lp-burbuja--respuesta">
              <span className="lp-burbuja__autor">
                <Icono nombre="asistente" tamano={14} />
                {t('landing.asistente.autor')}
              </span>
              <p>{t(`landing.asistente.ejemplos.${actual}.respuesta`)}</p>
            </div>
          </div>
          <p className="lp-chat__nota">{t('landing.asistente.nota')}</p>
        </div>
      </div>
    </section>
  );
}

/* ==========================================================================
 * Cómo empieza
 * ======================================================================== */

/** Textos en landing.comoEmpieza.pasos.<clave>.{titulo,texto}. */
const PASOS: { icono: NombreIcono; clave: string }[] = [
  { icono: 'persona-mas', clave: 'cuenta' },
  { icono: 'correo', clave: 'correo' },
  { icono: 'ubicacion', clave: 'rancho' },
  { icono: 'regla', clave: 'guia' },
];

function ComoEmpieza() {
  return (
    <section className="lp-seccion lp-seccion--blanca" id="como-empieza">
      <div className="lp-ancho">
        <Encabezado
          rotulo={t('landing.comoEmpieza.rotulo')}
          titulo={t('landing.comoEmpieza.titulo')}
          bajada={t('landing.comoEmpieza.bajada')}
        />
        <ol className="lp-pasos">
          {PASOS.map((p, i) => (
            <li key={p.clave} data-aparece>
              <span className="lp-pasos__numero">{i + 1}</span>
              <span className="lp-pasos__icono">
                <Icono nombre={p.icono} tamano={20} />
              </span>
              <h3>{t(`landing.comoEmpieza.pasos.${p.clave}.titulo`)}</h3>
              <p>{t(`landing.comoEmpieza.pasos.${p.clave}.texto`)}</p>
            </li>
          ))}
        </ol>
        <div className="lp-centro" data-aparece>
          <Link className="btn btn-primario lp-btn-grande" to="/registro">
            {t('landing.comoEmpieza.crearCuenta')}
            <Icono nombre="flecha" tamano={18} />
          </Link>
        </div>
      </div>
    </section>
  );
}

/* ==========================================================================
 * Planes
 * ======================================================================== */

function Planes() {
  const [periodo, setPeriodo] = useState<Periodo>('mes');
  const [franja, setFranja] = useState<ClaveFranja>(franjaDelNavegador);

  return (
    <section className="lp-seccion" id="planes">
      <div className="lp-ancho">
        <Encabezado
          rotulo={t('landing.planes.rotulo')}
          titulo={t('landing.planes.titulo')}
          bajada={t('landing.planes.bajada')}
        />

        <div className="lp-planes__controles" data-aparece>
          <div className="lp-segmentos" role="group" aria-label={t('landing.planes.formaDePago')}>
            <button
              type="button"
              aria-pressed={periodo === 'mes'}
              className={periodo === 'mes' ? 'activo' : undefined}
              onClick={() => setPeriodo('mes')}
            >
              {t('landing.planes.mensual')}
            </button>
            <button
              type="button"
              aria-pressed={periodo === 'anio'}
              className={periodo === 'anio' ? 'activo' : undefined}
              onClick={() => setPeriodo('anio')}
            >
              {tJsx('landing.planes.anual', {
                ahorro: (s) => <span className="lp-ahorro">{s}</span>,
              })}
            </button>
          </div>

          <label className="lp-region">
            <span>{t('landing.planes.preciosPara')}</span>
            <select value={franja} onChange={(e) => setFranja(e.target.value as ClaveFranja)}>
              {FRANJAS.map((f) => (
                <option key={f.clave} value={f.clave}>
                  {nombreDeFranja(f)}
                </option>
              ))}
            </select>
            <Icono nombre="desplegar" tamano={16} />
          </label>
        </div>

        <div className="lp-planes">
          {PLANES.map((plan) => {
            const precio = precioDelPlan(plan, periodo, franja);
            return (
              <article
                key={plan.clave}
                className={plan.destacado ? 'lp-plan lp-plan--destacado' : 'lp-plan'}
                data-aparece
              >
                {plan.destacado && (
                  <span className="insignia ins-plan lp-plan__cinta">
                    {t('landing.planes.cinta')}
                  </span>
                )}
                <h3>{nombreDelPlan(plan)}</h3>
                <p className="lp-plan__para">{paraQuienEs(plan)}</p>
                <p className="lp-plan__precio">
                  <span className="lp-plan__moneda">USD</span>
                  <strong>{precio.monto}</strong>
                  <span className="lp-plan__periodo">
                    {precio.gratis
                      ? t('landing.planes.paraSiempre')
                      : periodo === 'mes'
                        ? t('landing.planes.porMes')
                        : t('landing.planes.porAnio')}
                  </span>
                </p>
                <p className="lp-plan__detalle">{precio.detalle}</p>

                <ul>
                  {loQueIncluye(plan).map((linea) => (
                    <li key={linea.clave}>
                      <Icono nombre="exito" tamano={16} />
                      {linea.texto}
                    </li>
                  ))}
                </ul>

                <Link
                  className={
                    plan.destacado ? 'btn btn-plan btn-bloque' : 'btn btn-secundario btn-bloque'
                  }
                  to="/registro"
                >
                  {plan.destacado ? t('landing.planes.probar') : t('landing.planes.empezar')}
                </Link>
              </article>
            );
          })}
        </div>

        <p className="lp-planes__nota" data-aparece>
          {t('landing.planes.nota')}
        </p>
      </div>
    </section>
  );
}

/* ==========================================================================
 * Preguntas frecuentes
 * ======================================================================== */

/** Textos en landing.preguntas.lista.<clave>.{p,r}. */
const PREGUNTAS = ['finPrueba', 'internet', 'excel', 'privacidad', 'irme'];

function Preguntas() {
  return (
    <section className="lp-seccion lp-seccion--blanca" id="preguntas">
      <div className="lp-ancho lp-angosto">
        <Encabezado rotulo={t('landing.preguntas.rotulo')} titulo={t('landing.preguntas.titulo')} />
        <div className="lp-preguntas" data-aparece>
          {PREGUNTAS.map((clave) => (
            <details key={clave}>
              <summary>
                {t(`landing.preguntas.lista.${clave}.p`)}
                <Icono nombre="desplegar" tamano={20} />
              </summary>
              <p>{t(`landing.preguntas.lista.${clave}.r`)}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ==========================================================================
 * Cierre y pie
 * ======================================================================== */

function Cierre() {
  return (
    <section className="lp-cierre">
      <div className="lp-ancho lp-cierre__caja" data-aparece>
        <div>
          <h2>{t('landing.cierre.titulo')}</h2>
          <p>{t('landing.cierre.bajada')}</p>
        </div>
        <div className="lp-cierre__acciones">
          <Link className="btn lp-btn-grande lp-btn-claro" to="/registro">
            {t('landing.cierre.crearCuenta')}
            <Icono nombre="flecha" tamano={18} />
          </Link>
          <Link className="btn lp-btn-grande lp-btn-contorno" to="/ingreso">
            {t('landing.cierre.ingresar')}
          </Link>
        </div>
      </div>
    </section>
  );
}

function Pie() {
  return (
    <footer className="lp-pie">
      <div className="lp-ancho lp-pie__fila">
        <span className="lp-pie__marca">
          <IconoMarca tamano={16} />
          {t('landing.marca')}
        </span>
        <nav aria-label={t('landing.pie.enlaces')}>
          <Link to="/registro">{t('landing.pie.crearCuenta')}</Link>
          <Link to="/ingreso">{t('landing.pie.ingresar')}</Link>
          <Link to="/solicitar-recuperacion">{t('landing.pie.recuperar')}</Link>
          <Link to="/sistema-diseno">{t('landing.pie.sistemaDiseno')}</Link>
        </nav>
        <span className="lp-pie__derechos">{t('landing.pie.derechos', { marca: t('landing.marca') })}</span>
      </div>
    </footer>
  );
}
