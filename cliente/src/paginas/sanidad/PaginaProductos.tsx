import { useEffect, useState, type FormEvent } from 'react';
import {
  Alerta,
  Boton,
  Cargando,
  CampoLista,
  CampoTexto,
  DisenoApp,
  EstadoVacio,
  Icono,
  Tarjeta,
} from '../../componentes';
import { api, type ProductoSanitario } from '../../servicios/api';
import { t, tn } from '../../servicios/idioma';
import {
  TIPOS_PRODUCTO,
  UNIDADES_DOSIS,
  aDatosProducto,
  formularioProducto,
  problemaProducto,
  textoDosis,
  type FormularioProducto,
} from '../../servicios/productos';
import { conTransicion } from '../../servicios/transicion';
import { nivel, useContextoGanado, usuarioDe } from '../ganado/contexto';
import { PestanasSanidad } from './PestanasSanidad';

/**
 * HU-46 · Catálogo de productos sanitarios.
 *
 *   1. Cada producto tiene nombre, tipo, laboratorio opcional y dosis por
 *      animal con su unidad.
 *   2. El catálogo es del rancho: el servidor solo manda los propios.
 *   3. No se repite el nombre sin importar mayúsculas ni acentos: lo controla
 *      el servidor y su mensaje aparece en el formulario.
 *   4. Se da de baja sin borrarse. Mientras un esquema lo use, el botón no
 *      aparece y se dice por qué.
 *   5. Edita quien tiene «editar» en sanidad; el socio ve el catálogo sin
 *      botones.
 */

const NUEVO = 'nuevo';

export function PaginaProductos() {
  const contexto = useContextoGanado();
  const [productos, setProductos] = useState<ProductoSanitario[] | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [aviso, setAviso] = useState('');
  const [editando, setEditando] = useState<string | null>(null);
  const [confirmando, setConfirmando] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState<string | null>(null);
  const [version, setVersion] = useState(0);

  const puedeEditar = nivel(contexto, 'sanidad') === 'editar';

  useEffect(() => {
    let vigente = true;
    api
      .productosSanitarios()
      .then((respuesta) => vigente && setProductos(respuesta.productos))
      .catch((err: Error) => vigente && setError(err.message))
      .finally(() => vigente && setCargando(false));
    return () => {
      vigente = false;
    };
  }, [version]);

  function abrir(id: string | null) {
    conTransicion(() => {
      setEditando(id);
      setConfirmando(null);
      setError('');
    });
  }

  function alGuardar(mensaje: string) {
    setAviso(mensaje);
    abrir(null);
    setVersion((previa) => previa + 1);
  }

  async function darDeBaja(producto: ProductoSanitario) {
    setOcupado(producto.id);
    setError('');
    setAviso('');
    try {
      const respuesta = await api.bajaProducto(producto.id);
      setAviso(respuesta.mensaje);
      setConfirmando(null);
      setVersion((previa) => previa + 1);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setOcupado(null);
    }
  }

  const lista = productos ?? [];

  return (
    <DisenoApp
      activo="sanidad"
      ruta={[t('app.modulos.inicio'), t('sanidad.titulo')]}
      usuario={usuarioDe(contexto)}
      rancho={contexto.rancho?.rancho?.nombre ?? null}
      rotulo={t('sanidad.rotulo')}
      titulo={t('sanidad.pestanas.productos')}
      acciones={
        puedeEditar &&
        editando === null && (
          <Boton variante="primario" onClick={() => abrir(NUEVO)}>
            <Icono nombre="mas" tamano={18} />
            {t('sanidad.productos.nuevo')}
          </Boton>
        )
      }
    >
      <div className="col g24">
        <PestanasSanidad />
        {(cargando || contexto.cargando) && <Cargando lineas={4} />}
        {error && <Alerta variante="error">{error}</Alerta>}
        {contexto.error && <Alerta variante="error">{contexto.error}</Alerta>}
        {aviso && <Alerta variante="exito">{aviso}</Alerta>}
        {!contexto.cargando && !puedeEditar && !error && (
          <Alerta variante="info">{t('sanidad.soloConsulta')}</Alerta>
        )}

        {editando === NUEVO && (
          <FormularioProductoSanitario alGuardar={alGuardar} alCancelar={() => abrir(null)} />
        )}

        {productos && lista.length === 0 && editando !== NUEVO && (
          <EstadoVacio
            icono="sanidad"
            titulo={t('sanidad.productos.vacio.titulo')}
            texto={puedeEditar ? t('sanidad.productos.vacio.texto') : t('sanidad.productos.vacio.textoConsulta')}
          />
        )}

        {lista.length > 0 && (
          <Tarjeta>
            <ul className="ganado__lista">
              {lista.map((producto) =>
                editando === producto.id ? (
                  <li key={producto.id} className="ganado__fila">
                    <FormularioProductoSanitario
                      producto={producto}
                      alGuardar={alGuardar}
                      alCancelar={() => abrir(null)}
                    />
                  </li>
                ) : (
                  <li key={producto.id} className="ganado__fila">
                    <div className="ganado__principal">
                      <span className="cuerpo-m">{producto.nombre}</span>
                      <span className="pie c-500">
                        {[t(`sanidad.productos.tipos.${producto.tipo}`), producto.laboratorio]
                          .filter(Boolean)
                          .join(' · ')}
                      </span>
                    </div>
                    <span className="ganado__dato">
                      {textoDosis(producto.dosis, producto.unidad) ?? t('sanidad.productos.sinDosis')}
                    </span>
                    <span className="ganado__dato">{tn('sanidad.productos.esquemas', producto.esquemas)}</span>
                    {puedeEditar && editando === null && (
                      <div className="ganado__acciones">
                        {confirmando === producto.id ? (
                          <>
                            <span className="pie c-600">
                              {t('sanidad.productos.confirmarBaja', { nombre: producto.nombre })}
                            </span>
                            <Boton
                              variante="secundario"
                              onClick={() => setConfirmando(null)}
                              disabled={ocupado === producto.id}
                            >
                              {t('comun.cancelar')}
                            </Boton>
                            <Boton
                              variante="destructivo"
                              onClick={() => darDeBaja(producto)}
                              disabled={ocupado === producto.id}
                            >
                              {t('sanidad.productos.darDeBaja')}
                            </Boton>
                          </>
                        ) : (
                          <>
                            <Boton variante="fantasma" onClick={() => abrir(producto.id)}>
                              <Icono nombre="lapiz" tamano={16} />
                              {t('sanidad.productos.editar')}
                            </Boton>
                            {producto.esquemas > 0 ? (
                              <span className="pie c-500">{t('sanidad.productos.enUso')}</span>
                            ) : (
                              <Boton variante="fantasma" onClick={() => setConfirmando(producto.id)}>
                                <Icono nombre="archivar" tamano={16} />
                                {t('sanidad.productos.darDeBaja')}
                              </Boton>
                            )}
                          </>
                        )}
                      </div>
                    )}
                  </li>
                ),
              )}
            </ul>
          </Tarjeta>
        )}
      </div>
    </DisenoApp>
  );
}

interface PropiedadesFormulario {
  producto?: ProductoSanitario;
  alGuardar: (mensaje: string) => void;
  alCancelar: () => void;
}

export function FormularioProductoSanitario({ producto, alGuardar, alCancelar }: PropiedadesFormulario) {
  const [formulario, setFormulario] = useState<FormularioProducto>(() => formularioProducto(producto));
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState('');

  const problema = problemaProducto(formulario);
  const completo = formulario.nombre.trim() !== '' && formulario.tipo !== '';

  function cambiar<K extends keyof FormularioProducto>(clave: K, valor: FormularioProducto[K]) {
    setFormulario((previo) => ({ ...previo, [clave]: valor }));
  }

  async function enviar(evento: FormEvent) {
    evento.preventDefault();
    if (problema || !completo) return;
    setEnviando(true);
    setError('');
    try {
      const datos = aDatosProducto(formulario);
      const respuesta = producto ? await api.actualizarProducto(producto.id, datos) : await api.crearProducto(datos);
      alGuardar(respuesta.mensaje);
    } catch (err) {
      setError((err as Error).message);
      setEnviando(false);
    }
  }

  return (
    <form className="col g16 flex1" onSubmit={enviar} noValidate>
      <Tarjeta
        titulo={
          producto
            ? t('sanidad.productos.formulario.editar', { nombre: producto.nombre })
            : t('sanidad.productos.formulario.nuevo')
        }
        pie={
          <div className="fila g8">
            <Boton variante="secundario" onClick={alCancelar} disabled={enviando}>
              {t('comun.cancelar')}
            </Boton>
            <Boton variante="primario" type="submit" disabled={enviando || !completo || problema !== null}>
              {enviando ? t('comun.guardando') : t('comun.guardar')}
            </Boton>
          </div>
        }
      >
        <div className="col g16">
          {error && <Alerta variante="error">{error}</Alerta>}
          <div className="par">
            <CampoTexto
              etiqueta={t('sanidad.productos.formulario.nombre')}
              obligatorio
              maxLength={120}
              placeholder={t('sanidad.productos.formulario.nombreEjemplo')}
              value={formulario.nombre}
              onChange={(e) => cambiar('nombre', e.target.value)}
            />
            <CampoLista
              etiqueta={t('sanidad.productos.formulario.tipo')}
              obligatorio
              value={formulario.tipo}
              onChange={(e) => cambiar('tipo', e.target.value as FormularioProducto['tipo'])}
            >
              <option value="">{t('sanidad.productos.formulario.elegirTipo')}</option>
              {TIPOS_PRODUCTO.map((tipo) => (
                <option key={tipo} value={tipo}>
                  {t(`sanidad.productos.tipos.${tipo}`)}
                </option>
              ))}
            </CampoLista>
          </div>

          <CampoTexto
            etiqueta={t('sanidad.productos.formulario.laboratorio')}
            maxLength={120}
            value={formulario.laboratorio}
            onChange={(e) => cambiar('laboratorio', e.target.value)}
          />

          <div className="par">
            <CampoTexto
              etiqueta={t('sanidad.productos.formulario.dosis')}
              ayuda={t('sanidad.productos.formulario.dosisAyuda')}
              error={problema === 'dosisInvalida' ? t('sanidad.productos.formulario.dosisInvalida') : undefined}
              inputMode="decimal"
              value={formulario.dosis}
              onChange={(e) => cambiar('dosis', e.target.value)}
            />
            <CampoLista
              etiqueta={t('sanidad.productos.formulario.unidad')}
              error={problema === 'dosisSinUnidad' ? t('sanidad.productos.formulario.dosisSinUnidad') : undefined}
              value={formulario.unidad}
              onChange={(e) => cambiar('unidad', e.target.value as FormularioProducto['unidad'])}
            >
              <option value="">{t('sanidad.productos.formulario.sinUnidad')}</option>
              {UNIDADES_DOSIS.map((unidad) => (
                <option key={unidad} value={unidad}>
                  {t(`sanidad.productos.unidadesNombre.${unidad}`)}
                </option>
              ))}
            </CampoLista>
          </div>
        </div>
      </Tarjeta>
    </form>
  );
}
