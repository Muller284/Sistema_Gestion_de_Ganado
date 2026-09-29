import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Icono, IconoMarca, type NombreIcono } from '../../componentes';
import { hayAlguienDentro } from '../../servicios/api';
import {
  FRANJAS,
  PLANES,
  franjaDelNavegador,
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

const SECCIONES = [
  { id: 'funciones', nombre: 'Funciones' },
  { id: 'asistente', nombre: 'Asistente' },
  { id: 'como-empieza', nombre: 'Cómo empieza' },
  { id: 'planes', nombre: 'Planes' },
  { id: 'preguntas', nombre: 'Preguntas' },
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
          Gestión de Ganado
        </button>

        <nav className={abierto ? 'lp-menu abierto' : 'lp-menu'} aria-label="Secciones">
          {SECCIONES.map((s) => (
            <button key={s.id} type="button" onClick={() => elegir(s.id)}>
              {s.nombre}
            </button>
          ))}
          <div className="lp-menu__acciones">
            {adentro ? (
              <Link className="btn btn-primario" to="/">
                <Icono nombre="casa" tamano={18} />
                Ir a mi rancho
              </Link>
            ) : (
              <>
                <Link className="btn btn-fantasma" to="/ingreso">
                  Ingresar
                </Link>
                <Link className="btn btn-primario" to="/registro">
                  Probar gratis
                </Link>
              </>
            )}
          </div>
        </nav>

        <button
          type="button"
          className="lp-hamburguesa"
          aria-label={abierto ? 'Cerrar el menú' : 'Abrir el menú'}
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
            Para productores de cualquier país
          </p>
          <h1 className="lp-portada__titulo">
            Tu rancho entero, <span>en el bolsillo</span>
          </h1>
          <p className="lp-portada__bajada">
            Animales, corrales, vacunas y pesajes en un solo lugar. Trabaja con
            tu equipo, registra desde el corral aunque no haya señal y pregunta
            lo que necesites saber con tus propias palabras.
          </p>
          <div className="lp-portada__acciones">
            <Link className="btn btn-primario lp-btn-grande" to="/registro">
              Probar 10 días gratis
              <Icono nombre="flecha" tamano={18} />
            </Link>
            <Link className="btn btn-secundario lp-btn-grande" to="/ingreso">
              Ya tengo cuenta
            </Link>
          </div>
          <ul className="lp-garantias">
            <li>
              <Icono nombre="exito" tamano={16} />
              Sin tarjeta
            </li>
            <li>
              <Icono nombre="exito" tamano={16} />
              Después sigues gratis
            </li>
            <li>
              <Icono nombre="exito" tamano={16} />
              Tus datos se exportan cuando quieras
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
          <p>Estancia La Esperanza · Panel</p>
        </div>

        <div className="lp-ventana__cuerpo">
          <div className="lp-ventana__cifras">
            <div className="lp-mini-cifra">
              <p>Animales activos</p>
              <strong>248</strong>
              <span className="insignia ins-exito">+12 este mes</span>
            </div>
            <div className="lp-mini-cifra">
              <p>Corrales</p>
              <strong>6</strong>
              <span className="insignia ins-neutro">1 excedido</span>
            </div>
            <div className="lp-mini-cifra">
              <p>Vacunas por vencer</p>
              <strong>12</strong>
              <span className="insignia ins-adv">esta semana</span>
            </div>
          </div>

          <div className="lp-grafico">
            <p>Ganancia diaria · lote de engorde</p>
            <div className="lp-grafico__barras">
              {pesos.map((alto, i) => (
                <span key={i} style={{ height: `${alto}%` }} />
              ))}
            </div>
          </div>

          <ul className="lp-filas">
            {[
              ['0447', 'Brangus · Novillo', 'activo'],
              ['0512', 'Nelore · Vaquilla', 'activo'],
              ['0398', 'Criollo · Toro', 'vendido'],
            ].map(([caravana, detalle, estado]) => (
              <li key={caravana}>
                <span className="dato">{caravana}</span>
                <span className="flex1">{detalle}</span>
                <span className={`insignia ins-${estado}`}>
                  {estado === 'activo' ? 'Activo' : 'Vendido'}
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
          <strong>Sin señal en el corral</strong>
          <p>3 pesajes guardados, se suben solos</p>
        </div>
      </div>

      <div className="lp-flotante lp-flotante--asistente">
        <span className="lp-flotante__icono">
          <Icono nombre="asistente" tamano={18} />
        </span>
        <div>
          <strong>¿Qué corral engorda peor?</strong>
          <p>El Bajo: 410 g/día, 22 % menos que el resto.</p>
        </div>
      </div>
    </div>
  );
}

/* ==========================================================================
 * Los tres diferenciales
 * ======================================================================== */

const DIFERENCIALES: { icono: NombreIcono; titulo: string; texto: string }[] = [
  {
    icono: 'equipo',
    titulo: 'Se trabaja en equipo',
    texto:
      'Delegas la carga en tus colaboradores y compartes la información con tus socios, sin perder el control. Cada dato guarda quién lo registró y cuándo.',
  },
  {
    icono: 'sin-senal',
    titulo: 'Funciona sin internet',
    texto:
      'Desde el celular registras animales, vacunas, pesajes y movimientos en la manga, sin señal. Los datos suben solos cuando vuelve la conexión.',
  },
  {
    icono: 'asistente',
    titulo: 'Un asistente que conoce tu rancho',
    texto:
      'Pregunta con palabras normales, sin filtros ni reportes. Solo lee los datos de tu rancho: no consulta internet y no modifica nada.',
  },
];

function Diferenciales() {
  return (
    <section className="lp-seccion lp-seccion--blanca">
      <div className="lp-ancho">
        <Encabezado
          rotulo="Por qué no una planilla"
          titulo="Tres cosas que un cuaderno no puede hacer"
        />
        <div className="lp-tres">
          {DIFERENCIALES.map((d) => (
            <article
              key={d.titulo}
              className="lp-diferencial"
              data-aparece
            >
              <span className="lp-emblema">
                <Icono nombre={d.icono} tamano={24} />
              </span>
              <h3>{d.titulo}</h3>
              <p>{d.texto}</p>
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

const FUNCIONES: { icono: NombreIcono; titulo: string; texto: string }[] = [
  {
    icono: 'animal',
    titulo: 'Animales',
    texto: 'La ficha y el historial completo de cada animal, con su caravana única dentro del rancho.',
  },
  {
    icono: 'corral',
    titulo: 'Corrales',
    texto: 'Capacidad, ocupación y un aviso cuando un corral se pasa de su límite.',
  },
  {
    icono: 'sanidad',
    titulo: 'Sanidad',
    texto: 'Tus propios esquemas de vacunación, un calendario y avisos antes de cada vencimiento.',
  },
  {
    icono: 'balanza',
    titulo: 'Pesajes',
    texto: 'La ganancia diaria se calcula sola. Compara lotes y detecta a tiempo el que no engorda.',
  },
  {
    icono: 'planilla',
    titulo: 'Importa tu planilla',
    texto: 'Sube tu Excel como está: el sistema reconoce las columnas y te muestra los errores antes de cargar.',
  },
  {
    icono: 'descargar',
    titulo: 'Tus datos son tuyos',
    texto: 'Bájalos a Excel cuando quieras. Nada se borra de verdad: lo dado de baja se puede consultar.',
  },
];

function Funciones() {
  return (
    <section className="lp-seccion" id="funciones">
      <div className="lp-ancho">
        <Encabezado
          rotulo="Funciones"
          titulo="Todo el trabajo del campo, ordenado"
          bajada="Lo que hoy está repartido entre cuadernos, planillas y la memoria de cada uno, en un solo lugar y con el historial completo."
        />
        <div className="lp-rejilla-funciones">
          {FUNCIONES.map((f) => (
            <article
              key={f.titulo}
              className="lp-funcion"
              data-aparece
            >
              <span className="lp-funcion__icono">
                <Icono nombre={f.icono} tamano={22} />
              </span>
              <div>
                <h3>{f.titulo}</h3>
                <p>{f.texto}</p>
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

/** Las preguntas son las de la propuesta. Las respuestas son de ejemplo. */
const PREGUNTAS_ASISTENTE = [
  {
    pregunta: '¿Cuántos terneros machos nacidos este año tengo en el corral norte?',
    respuesta: 'Tienes 14 terneros machos nacidos en 2026 en el corral Norte. El más reciente es la caravana 0561, nacido el 3 de septiembre.',
  },
  {
    pregunta: '¿Qué animales tienen la vacuna vencida hace más de un mes?',
    respuesta: 'Son 4 animales, todos de aftosa: 0447, 0512, 0520 y 0533. Están en el corral El Bajo.',
  },
  {
    pregunta: '¿Cuál fue la ganancia diaria del lote de engorde en los últimos 90 días?',
    respuesta: 'El lote de engorde ganó en promedio 780 g por día. Es un 9 % más que en los 90 días anteriores.',
  },
  {
    pregunta: '¿Qué le aplicó el veterinario a la caravana 447 en el último año?',
    respuesta: 'Tres aplicaciones: aftosa en marzo, carbunclo en abril y un antiparasitario en agosto. Las registró el Dr. Rojas.',
  },
  {
    pregunta: '¿Qué corral viene engordando peor que el resto?',
    respuesta: 'El Bajo: 410 g por día, un 22 % por debajo del promedio de los otros corrales.',
  },
];

function Asistente() {
  const [elegida, setElegida] = useState(0);
  const actual = PREGUNTAS_ASISTENTE[elegida];

  return (
    <section className="lp-seccion lp-seccion--oscura" id="asistente">
      <div className="lp-ancho lp-asistente">
        <div className="lp-asistente__texto">
          <Encabezado
            claro
            rotulo="Asistente con inteligencia artificial"
            titulo="Pregunta como le preguntarías a tu capataz"
            bajada="No hay una lista cerrada de preguntas ni filtros que aprender. El asistente arma la consulta sobre los datos de tu rancho y te responde en segundos."
          />
          <ul className="lp-asistente__reglas" data-aparece>
            <li>
              <Icono nombre="escudo" tamano={18} />
              Solo lee tu rancho. Nunca ve datos de otras cuentas.
            </li>
            <li>
              <Icono nombre="escudo" tamano={18} />
              No da de alta, no modifica y no borra nada.
            </li>
            <li>
              <Icono nombre="escudo" tamano={18} />
              A cada colaborador le responde solo sobre sus módulos.
            </li>
          </ul>
        </div>

        <div className="lp-chat" data-aparece>
          <div className="lp-chat__sugerencias" role="group" aria-label="Preguntas de ejemplo">
            {PREGUNTAS_ASISTENTE.map((p, i) => (
              <button
                key={p.pregunta}
                type="button"
                className={i === elegida ? 'activa' : undefined}
                aria-pressed={i === elegida}
                onClick={() => setElegida(i)}
              >
                {p.pregunta}
              </button>
            ))}
          </div>

          {/* La clave obliga a React a rehacer las burbujas y así vuelven a
              entrar con su animación al cambiar de pregunta. */}
          <div className="lp-chat__conversacion" key={elegida} aria-live="polite">
            <p className="lp-burbuja lp-burbuja--pregunta">{actual.pregunta}</p>
            <div className="lp-burbuja lp-burbuja--respuesta">
              <span className="lp-burbuja__autor">
                <Icono nombre="asistente" tamano={14} />
                Asistente
              </span>
              <p>{actual.respuesta}</p>
            </div>
          </div>
          <p className="lp-chat__nota">Respuestas de ejemplo con datos ficticios.</p>
        </div>
      </div>
    </section>
  );
}

/* ==========================================================================
 * Cómo empieza
 * ======================================================================== */

const PASOS: { icono: NombreIcono; titulo: string; texto: string }[] = [
  { icono: 'persona-mas', titulo: 'Crea tu cuenta', texto: 'Nombre, correo, contraseña y país. El país define idioma, moneda y unidades.' },
  { icono: 'correo', titulo: 'Confirma tu correo', texto: 'Te llega un enlace. Al abrirlo, la cuenta queda activa.' },
  { icono: 'ubicacion', titulo: 'Crea tu rancho', texto: 'Nombre, superficie, tipo de producción y, si quieres, su lugar en el mapa.' },
  { icono: 'regla', titulo: 'Sigue la guía', texto: 'Animales, corrales, vacunas y equipo, paso a paso y a tu ritmo.' },
];

function ComoEmpieza() {
  return (
    <section className="lp-seccion lp-seccion--blanca" id="como-empieza">
      <div className="lp-ancho">
        <Encabezado
          rotulo="Cómo empieza"
          titulo="De cero a tu rancho andando, sin llamar a nadie"
          bajada="No hay vendedores ni instalaciones. Te registras, confirmas el correo y en unos minutos estás cargando tu rodeo."
        />
        <ol className="lp-pasos">
          {PASOS.map((p, i) => (
            <li key={p.titulo} data-aparece>
              <span className="lp-pasos__numero">{i + 1}</span>
              <span className="lp-pasos__icono">
                <Icono nombre={p.icono} tamano={20} />
              </span>
              <h3>{p.titulo}</h3>
              <p>{p.texto}</p>
            </li>
          ))}
        </ol>
        <div className="lp-centro" data-aparece>
          <Link className="btn btn-primario lp-btn-grande" to="/registro">
            Crear mi cuenta
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
          rotulo="Planes"
          titulo="Pagas por el tamaño de tu equipo, no por anotar"
          bajada="Empiezas con 10 días del plan Profesional, sin tarjeta. Si no eliges nada, pasas al plan Gratis: la cuenta no se bloquea y no pierdes ningún dato."
        />

        <div className="lp-planes__controles" data-aparece>
          <div className="lp-segmentos" role="group" aria-label="Forma de pago">
            <button
              type="button"
              aria-pressed={periodo === 'mes'}
              className={periodo === 'mes' ? 'activo' : undefined}
              onClick={() => setPeriodo('mes')}
            >
              Mensual
            </button>
            <button
              type="button"
              aria-pressed={periodo === 'anio'}
              className={periodo === 'anio' ? 'activo' : undefined}
              onClick={() => setPeriodo('anio')}
            >
              Anual <span className="lp-ahorro">−20 %</span>
            </button>
          </div>

          <label className="lp-region">
            <span>Precios para</span>
            <select value={franja} onChange={(e) => setFranja(e.target.value as ClaveFranja)}>
              {FRANJAS.map((f) => (
                <option key={f.clave} value={f.clave}>
                  {f.nombre}
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
                    Tus primeros 10 días
                  </span>
                )}
                <h3>{plan.nombre}</h3>
                <p className="lp-plan__para">{plan.para}</p>
                <p className="lp-plan__precio">
                  <span className="lp-plan__moneda">USD</span>
                  <strong>{precio.monto}</strong>
                  <span className="lp-plan__periodo">
                    {precio.gratis ? 'para siempre' : periodo === 'mes' ? '/ mes' : '/ año'}
                  </span>
                </p>
                <p className="lp-plan__detalle">{precio.detalle}</p>

                <ul>
                  {plan.incluye.map((linea) => (
                    <li key={linea}>
                      <Icono nombre="exito" tamano={16} />
                      {linea}
                    </li>
                  ))}
                </ul>

                <Link
                  className={
                    plan.destacado ? 'btn btn-plan btn-bloque' : 'btn btn-secundario btn-bloque'
                  }
                  to="/registro"
                >
                  {plan.destacado ? 'Probar 10 días gratis' : 'Empezar'}
                </Link>
              </article>
            );
          })}
        </div>

        <p className="lp-planes__nota" data-aparece>
          Precios en dólares estadounidenses. Cada cuenta maneja un rancho.
          Donde dice «sin límite» se aplica una política de uso razonable.
        </p>
      </div>
    </section>
  );
}

/* ==========================================================================
 * Preguntas frecuentes
 * ======================================================================== */

const PREGUNTAS = [
  {
    p: '¿Qué pasa cuando terminan los 10 días de prueba?',
    r: 'Tu cuenta pasa sola al plan Gratis. No se bloquea, no pierdes ningún dato y puedes mejorar el plan cuando quieras.',
  },
  {
    p: '¿Necesito internet para usarlo?',
    r: 'Para la web, sí. Desde el celular puedes registrar animales, vacunas, pesajes y movimientos de corral sin señal: se guardan en el teléfono y se suben solos cuando vuelve la conexión.',
  },
  {
    p: '¿Puedo traer lo que ya tengo en Excel?',
    r: 'Sí. Subes tu planilla como está y el sistema reconoce las columnas por su nombre. Solo te pregunta por las que no pudo identificar, y antes de cargar te muestra los errores y los repetidos.',
  },
  {
    p: '¿Otro productor puede ver mis animales?',
    r: 'No. Cada rancho está separado desde la base de datos, y hay pruebas automáticas que intentan leer datos de otro rancho y tienen que fallar. El asistente tampoco puede salir de tu rancho.',
  },
  {
    p: '¿Y si quiero irme?',
    r: 'Exporta todo a Excel en cualquier momento. Si cancelas, la cuenta queda en solo lectura al menos 12 meses para que sigas consultando y exportando tu información.',
  },
];

function Preguntas() {
  return (
    <section className="lp-seccion lp-seccion--blanca" id="preguntas">
      <div className="lp-ancho lp-angosto">
        <Encabezado rotulo="Preguntas" titulo="Lo que todos preguntan antes de empezar" />
        <div className="lp-preguntas" data-aparece>
          {PREGUNTAS.map((item) => (
            <details key={item.p}>
              <summary>
                {item.p}
                <Icono nombre="desplegar" tamano={20} />
              </summary>
              <p>{item.r}</p>
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
          <h2>Empieza hoy con tu rodeo</h2>
          <p>10 días con todas las funciones. Sin tarjeta y sin compromiso.</p>
        </div>
        <div className="lp-cierre__acciones">
          <Link className="btn lp-btn-grande lp-btn-claro" to="/registro">
            Crear mi cuenta
            <Icono nombre="flecha" tamano={18} />
          </Link>
          <Link className="btn lp-btn-grande lp-btn-contorno" to="/ingreso">
            Ingresar
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
          Gestión de Ganado
        </span>
        <nav aria-label="Enlaces del pie">
          <Link to="/registro">Crear cuenta</Link>
          <Link to="/ingreso">Ingresar</Link>
          <Link to="/solicitar-recuperacion">Recuperar contraseña</Link>
          <Link to="/sistema-diseno">Sistema de diseño</Link>
        </nav>
        <span className="lp-pie__derechos">© 2026 Gestión de Ganado</span>
      </div>
    </footer>
  );
}
