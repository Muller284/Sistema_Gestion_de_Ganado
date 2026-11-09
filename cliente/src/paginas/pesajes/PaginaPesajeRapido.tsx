import { useRef, useState, type FormEvent, type KeyboardEvent } from 'react';
import { Link } from 'react-router-dom';
import { Alerta, Boton, Cargando, CampoTexto, DisenoApp, EstadoVacio, Icono, Tarjeta } from '../../componentes';
import { api } from '../../servicios/api';
import { t, tn } from '../../servicios/idioma';
import { gananciaDiaria, textoGanancia } from '../../servicios/pesos';
import { formatoPeso, pesoAGuardar } from '../../servicios/unidades';
import { nivel, useContextoGanado, usuarioDe } from '../ganado/contexto';

/**
 * HU-55 · Registro rápido de pesaje desde el celular, en la balanza.
 *
 *   1. Se escribe la caravana y el peso, y se guarda con un solo toque: no
 *      hay que buscar el animal antes. Enter en la caravana pasa al peso, y
 *      Enter en el peso guarda.
 *   2. Todo lo tocable mide al menos 48 px: campos y botones usan el alto
 *      móvil del sistema de diseño (52 px) y las acciones van en la barra
 *      pegada al borde inferior (HU-35, animal.css). Después de guardar, la
 *      caravana y el peso se vacían y el cursor vuelve a la caravana.
 *   3. Muestra la ganancia diaria del animal recién pesado, contra su pesaje
 *      anterior (HU-54, servicios/pesos.ts). Si es el primero, lo dice.
 *
 * El peso se escribe en la unidad del país y se manda en kilos (HU-26). La
 * fecha es la de hoy en el país del rancho. Las reglas son las de HU-53 y las
 * controla el servidor (POST /pesajes/rapido).
 */

interface Pesado {
  clave: string;
  identificador: string;
  nombre: string | null;
  peso_kg: number;
  /** Kilos por día contra el pesaje anterior; nulo si es el primero o del mismo día. */
  ganancia: number | null;
}

export function PaginaPesajeRapido() {
  const contexto = useContextoGanado();
  const formulario = useRef<HTMLFormElement>(null);
  const [caravana, setCaravana] = useState('');
  const [peso, setPeso] = useState('');
  const [ocupado, setOcupado] = useState(false);
  const [error, setError] = useState('');
  const [pesados, setPesados] = useState<Pesado[]>([]);

  const puedeEditar = nivel(contexto, 'pesajes') === 'editar';
  const unidad = contexto.regional.peso;
  const valor = Number(peso.replace(',', '.'));
  const pesoValido = peso.trim() !== '' && Number.isFinite(valor) && valor > 0;
  const listo = caravana.trim() !== '' && pesoValido;
  const ultimo = pesados[0] ?? null;

  function enfocar(nombre: 'caravana' | 'peso') {
    formulario.current?.querySelector<HTMLInputElement>(`input[name="${nombre}"]`)?.focus();
  }

  /** Enter en la caravana pasa al peso; recién Enter en el peso guarda. */
  function alTeclearCaravana(evento: KeyboardEvent<HTMLInputElement>) {
    if (evento.key === 'Enter' && caravana.trim() && !pesoValido) {
      evento.preventDefault();
      enfocar('peso');
    }
  }

  async function guardar(evento: FormEvent) {
    evento.preventDefault();
    if (ocupado || !listo) return;
    setOcupado(true);
    setError('');
    try {
      const respuesta = await api.registrarPesajeRapido({
        identificador: caravana.trim(),
        peso_kg: pesoAGuardar(valor, unidad),
      });
      const actual = respuesta.pesaje;
      setPesados((previos) => [
        {
          clave: actual.id,
          identificador: respuesta.animal.identificador,
          nombre: respuesta.animal.nombre,
          peso_kg: actual.peso_kg,
          ganancia: respuesta.anterior ? gananciaDiaria(respuesta.anterior, actual) : null,
        },
        ...previos,
      ]);
      setCaravana('');
      setPeso('');
      enfocar('caravana');
    } catch (err) {
      setError((err as Error).message);
      // Lo más común es una caravana mal escrita: el cursor vuelve ahí.
      enfocar('caravana');
    } finally {
      setOcupado(false);
    }
  }

  return (
    <DisenoApp
      activo="pesajes"
      ruta={[t('app.modulos.pesajes'), t('pesajes.rapido.miga')]}
      usuario={usuarioDe(contexto)}
      rancho={contexto.rancho?.rancho?.nombre ?? null}
      rotulo={t('pesajes.rapido.rotulo')}
      titulo={t('pesajes.rapido.titulo')}
    >
      {contexto.cargando && <Cargando lineas={4} />}

      {!contexto.cargando && !puedeEditar && (
        <EstadoVacio
          icono="balanza"
          titulo={t('pesajes.rapido.sinPermiso.titulo')}
          texto={t('pesajes.rapido.sinPermiso.texto')}
        />
      )}

      {!contexto.cargando && puedeEditar && (
        <form ref={formulario} className="alta-rapida" onSubmit={guardar} noValidate>
          <p className="cuerpo c-600">{t('pesajes.rapido.intro')}</p>

          {error && <Alerta variante="error">{error}</Alerta>}

          {/* El último pesado tiene siempre su lugar: así los campos no se
              mueven bajo el dedo al guardar. */}
          <div className="alta-rapida__encontrado pesaje-rapido__ultimo" role="status" aria-live="polite">
            {ultimo ? (
              <>
                <Icono nombre="exito" tamano={20} />
                <span className="dato">{ultimo.identificador}</span>
                <span className="cuerpo-m">{formatoPeso(ultimo.peso_kg, contexto.regional)}</span>
                <span className="cuerpo c-600">
                  {ultimo.ganancia === null
                    ? t('pesajes.rapido.primerPesaje')
                    : t('pesajes.rapido.ganancia', { ganancia: textoGanancia(ultimo.ganancia, contexto.regional) })}
                </span>
              </>
            ) : (
              <span className="pie c-500">{t('pesajes.rapido.sinPesados')}</span>
            )}
          </div>

          <CampoTexto
            etiqueta={t('pesajes.rapido.caravana')}
            placeholder={t('animales.altaRapida.identificadorEjemplo')}
            name="caravana"
            obligatorio
            movil
            mono
            autoFocus
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
            enterKeyHint="next"
            maxLength={50}
            value={caravana}
            onKeyDown={alTeclearCaravana}
            onChange={(e) => setCaravana(e.target.value)}
          />

          <CampoTexto
            etiqueta={t('pesajes.rapido.peso', { unidad })}
            name="peso"
            obligatorio
            movil
            type="number"
            inputMode="decimal"
            min="0"
            step="0.1"
            enterKeyHint="done"
            value={peso}
            error={peso.trim() !== '' && !pesoValido ? t('animales.ficha.pesajes.pesoInvalido') : undefined}
            onChange={(e) => setPeso(e.target.value)}
          />

          {/* La pista de qué falta ocupa siempre su lugar, como en HU-52. */}
          <p className="pie c-500 alta-rapida__pista" aria-live="polite">
            {!caravana.trim() ? t('pesajes.rapido.faltaCaravana') : !pesoValido ? t('pesajes.rapido.faltaPeso') : t('pesajes.rapido.hoy')}
          </p>

          {pesados.length > 0 && (
            <Tarjeta
              titulo={t('pesajes.rapido.sesion.titulo')}
              accion={<span className="pie c-600">{tn('pesajes.rapido.sesion.cuantos', pesados.length)}</span>}
            >
              <ul className="alta-rapida__sesion">
                {pesados.map((pesado) => (
                  <li key={pesado.clave} className="pesaje-rapido__fila">
                    <span className="dato">{pesado.identificador}</span>
                    <span className="cuerpo-m">{formatoPeso(pesado.peso_kg, contexto.regional)}</span>
                    <span className="pie c-600">
                      {pesado.ganancia === null ? '—' : textoGanancia(pesado.ganancia, contexto.regional)}
                    </span>
                  </li>
                ))}
              </ul>
            </Tarjeta>
          )}

          <div className="alta-rapida__acciones">
            <Link className="btn btn-secundario btn-movil" to="/pesajes">
              {t('pesajes.rapido.terminar')}
            </Link>
            <Boton variante="primario" movil type="submit" disabled={!listo || ocupado}>
              <Icono nombre="balanza" tamano={18} />
              {ocupado ? t('comun.guardando') : t('pesajes.rapido.guardar')}
            </Boton>
          </div>
        </form>
      )}
    </DisenoApp>
  );
}
