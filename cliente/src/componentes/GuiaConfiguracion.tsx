import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, type EstadoGuia, type PasoGuia } from '../servicios/api';
import { Icono, type NombreIcono } from './Iconos';
import { Insignia } from './Insignia';

/**
 * HU-16 · Guía de configuración inicial.
 *
 * Criterios de aceptación:
 *   1. Muestra cuatro pasos: animales, corrales, vacunas y equipo.
 *   2. Cada paso indica si está pendiente, en curso o completo.
 *   3. Puedo abandonarla y retomarla más adelante desde donde quedé.
 *   4. Los pasos de fases posteriores quedan visibles pero marcados como no
 *      disponibles todavía.
 *
 * TODO LO DECIDE EL SERVIDOR
 * Qué paso está en qué estado, cuál sigue y si la guía está en pausa lo
 * calcula GET /guia. Esta pieza solo lo muestra y avisa lo que se tocó: así
 * la guía dice lo mismo en cualquier navegador.
 *
 * "SEGUIR DESPUÉS" NO BORRA NADA
 * Pausar la achica a una franja con el progreso y el botón para retomarla.
 * Al retomarla, el paso marcado como siguiente es el que quedó en curso.
 *
 * La ve solo el propietario: la guía es suya (HU-16 dice "Como propietario").
 */

const ICONOS: Record<PasoGuia['clave'], NombreIcono> = {
  animales: 'animal',
  corrales: 'corral',
  vacunas: 'sanidad',
  equipo: 'equipo',
};

const ESTADOS: Record<PasoGuia['estado'], { texto: string; variante: 'neutro' | 'info' | 'exito' }> = {
  pendiente: { texto: 'Pendiente', variante: 'neutro' },
  en_curso: { texto: 'En curso', variante: 'info' },
  completo: { texto: 'Completo', variante: 'exito' },
};

export function GuiaConfiguracion() {
  const [guia, setGuia] = useState<EstadoGuia | null>(null);
  const [error, setError] = useState('');
  const [ocupado, setOcupado] = useState<string | null>(null);

  useEffect(() => {
    let vigente = true;
    api
      .guia()
      .then((datos) => vigente && setGuia(datos))
      .catch((err) => vigente && setError((err as Error).message));
    return () => {
      vigente = false;
    };
  }, []);

  /** Toda escritura devuelve la guía entera ya actualizada. */
  async function hacer(clave: string, accion: () => Promise<EstadoGuia>) {
    setOcupado(clave);
    setError('');
    try {
      setGuia(await accion());
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setOcupado(null);
    }
  }

  if (error && !guia) {
    return (
      <section className="guia">
        <p className="pie c-500">No se pudo cargar la guía: {error}</p>
      </section>
    );
  }

  if (!guia) {
    return (
      <section className="guia" aria-busy="true">
        <div className="esqueleto esqueleto-titulo" />
        <div className="esqueleto esqueleto-linea" />
        <div className="esqueleto esqueleto-linea" />
      </section>
    );
  }

  const porcentaje = Math.round((guia.completos / guia.total) * 100);

  const barra = (
    <div
      className="guia__barra"
      role="progressbar"
      aria-valuenow={guia.completos}
      aria-valuemin={0}
      aria-valuemax={guia.total}
      aria-label="Pasos de la guía completos"
    >
      <span style={{ width: `${porcentaje}%` }} />
    </div>
  );

  // Criterio 3: en pausa queda una franja con el progreso y el botón para volver.
  if (guia.pausada) {
    return (
      <section className="guia guia--pausada">
        <span className="guia__emblema">
          <Icono nombre="regla" tamano={20} />
        </span>
        <div className="guia__resumen">
          <strong>Dejaste la guía para después</strong>
          <span className="pie c-500">
            {guia.completos} de {guia.total} pasos completos. Sigue desde donde quedaste.
          </span>
          {barra}
        </div>
        <button
          type="button"
          className="btn btn-secundario"
          disabled={ocupado === 'pausa'}
          onClick={() => hacer('pausa', () => api.pausarGuia(false))}
        >
          Retomar la guía
        </button>
      </section>
    );
  }

  return (
    <section className="guia" aria-labelledby="guia-titulo">
      <header className="guia__cabecera">
        <div>
          <h2 id="guia-titulo" className="h3">
            {guia.terminada ? 'Tu rancho quedó configurado' : 'Deja tu rancho andando'}
          </h2>
          <p className="pie c-500">
            {guia.completos} de {guia.total} pasos completos
          </p>
        </div>
        {!guia.terminada && (
          <button
            type="button"
            className="btn btn-fantasma"
            disabled={ocupado === 'pausa'}
            onClick={() => hacer('pausa', () => api.pausarGuia(true))}
          >
            Seguir después
          </button>
        )}
      </header>

      {barra}

      {error && <p className="pie guia__error">{error}</p>}

      {/* Criterios 1 y 2: los cuatro pasos, cada uno con su estado. */}
      <ol className="guia__pasos">
        {guia.pasos.map((paso, indice) => (
          <Paso
            key={paso.clave}
            paso={paso}
            numero={indice + 1}
            siguiente={guia.siguiente === paso.clave}
            ocupado={ocupado === paso.clave}
            alAbrir={() => void api.visitarPaso(paso.clave).then(setGuia).catch(() => undefined)}
            alCompletar={() => hacer(paso.clave, () => api.completarPaso(paso.clave))}
            alReabrir={() => hacer(paso.clave, () => api.reabrirPaso(paso.clave))}
          />
        ))}
      </ol>
    </section>
  );
}

function Paso({
  paso,
  numero,
  siguiente,
  ocupado,
  alAbrir,
  alCompletar,
  alReabrir,
}: {
  paso: PasoGuia;
  numero: number;
  siguiente: boolean;
  ocupado: boolean;
  alAbrir: () => void;
  alCompletar: () => void;
  alReabrir: () => void;
}) {
  const clases = [
    'guia__paso',
    `guia__paso--${paso.estado}`,
    paso.disponible ? '' : 'no-disponible',
    siguiente ? 'siguiente' : '',
  ]
    .filter(Boolean)
    .join(' ');

  const estado = ESTADOS[paso.estado];

  return (
    <li className={clases} aria-current={siguiente ? 'step' : undefined}>
      <span className="guia__marca" aria-hidden="true">
        {paso.estado === 'completo' ? <Icono nombre="exito" tamano={18} /> : numero}
      </span>

      <span className="guia__icono" aria-hidden="true">
        <Icono nombre={ICONOS[paso.clave]} tamano={20} />
      </span>

      <div className="guia__texto">
        <strong>{paso.nombre}</strong>
        <span className="pie c-500">{paso.descripcion}</span>
        {paso.disponible && paso.datos > 0 && paso.estado !== 'completo' && (
          <span className="pie c-corral">
            {paso.clave === 'equipo'
              ? `${paso.datos} ${paso.datos === 1 ? 'integrante' : 'integrantes'} ya en el equipo`
              : `${paso.datos} cargados`}
          </span>
        )}
      </div>

      <div className="guia__lado">
        {/* Criterio 4: visible, pero marcado como no disponible todavía. */}
        {!paso.disponible ? (
          <Insignia variante="neutro">Llega en la fase {paso.fase}</Insignia>
        ) : (
          <>
            <Insignia variante={estado.variante}>{estado.texto}</Insignia>
            <div className="guia__acciones">
              {paso.estado !== 'completo' && paso.ruta && (
                <Link
                  className={siguiente ? 'btn btn-primario' : 'btn btn-secundario'}
                  to={paso.ruta}
                  onClick={alAbrir}
                >
                  {paso.estado === 'pendiente' ? 'Empezar' : 'Continuar'}
                  <Icono nombre="flecha" tamano={16} />
                </Link>
              )}
              {paso.estado === 'completo' ? (
                <button type="button" className="btn btn-fantasma" onClick={alReabrir} disabled={ocupado}>
                  Reabrir
                </button>
              ) : (
                paso.estado === 'en_curso' && (
                  <button type="button" className="btn btn-fantasma" onClick={alCompletar} disabled={ocupado}>
                    <Icono nombre="exito" tamano={16} />
                    Listo
                  </button>
                )
              )}
            </div>
          </>
        )}
      </div>
    </li>
  );
}
