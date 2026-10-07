import { useEffect, useState } from 'react';
import {
  Alerta,
  Boton,
  CampoTexto,
  Cargando,
  DisenoApp,
  Icono,
  Insignia,
  Tarjeta,
} from '../../componentes';
import { api, type PerfilUsuario } from '../../servicios/api';
import { IDIOMAS, cambiarIdioma, existe, localeActual, t } from '../../servicios/idioma';
import { enumerar, faltasDeContrasena, inicial } from '../../servicios/texto';

/**
 * Mi perfil. Se llega tocando el usuario al pie del menú lateral o desde el
 * menú de la cuenta, arriba a la derecha.
 *
 * QUÉ SE PUEDE CAMBIAR
 *   el nombre       acá mismo.
 *   el idioma       el de su país o uno elegido (HU-25).
 *   la contraseña   con la actual y la nueva (el mismo servicio de HU-10).
 * QUÉ NO, Y POR QUÉ
 *   el correo       cambiarlo exige confirmar el nuevo (HU-07); se ve, pero
 *                   no se edita todavía.
 *   el país         es el criterio 2 de HU-14 (Brian): se cambia desde los
 *                   ajustes del país cuando esa parte exista.
 *   rol y rancho    los decide el propietario, no uno mismo.
 */

/** El nombre del rol en el idioma actual; si no lo conocemos, el código tal cual. */
function nombreRol(rol: string): string {
  return existe(`perfil.roles.${rol}`) ? t(`perfil.roles.${rol}`) : rol;
}

function fecha(valor: string): string {
  return new Date(valor).toLocaleDateString(localeActual(), {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

export function PaginaPerfil() {
  const [perfil, setPerfil] = useState<PerfilUsuario | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let vigente = true;
    api
      .perfil()
      .then((datos) => vigente && setPerfil(datos))
      .catch((err) => vigente && setError((err as Error).message));
    return () => {
      vigente = false;
    };
  }, []);

  const usuario = perfil
    ? { nombre: perfil.nombre, rol: perfil.rol, correo: perfil.correo }
    : { nombre: '…', rol: '—' };

  return (
    <DisenoApp
      activo="perfil"
      ruta={[t('perfil.titulo')]}
      usuario={usuario}
      rancho={perfil?.rancho ?? null}
      rotulo={t('perfil.rotulo')}
      titulo={t('perfil.titulo')}
    >
      <div className="col g24">
        {error && <Alerta variante="error">{error}</Alerta>}
        {!perfil && !error && <Cargando lineas={4} />}

        {perfil && (
          <>
            <section className="perfil__cabecera">
              <span className="perfil__avatar">{inicial(perfil.nombre)}</span>
              <div className="perfil__quien">
                <h2 className="h2">{perfil.nombre}</h2>
                <span className="cuerpo c-500">{perfil.correo}</span>
                <div className="fila g8">
                  <Insignia variante="exito">{nombreRol(perfil.rol)}</Insignia>
                  {perfil.tipo_colaborador && (
                    <Insignia variante="neutro">{perfil.tipo_colaborador}</Insignia>
                  )}
                  {perfil.rancho && (
                    <Insignia variante="info">
                      <Icono nombre="casa" tamano={14} />
                      &nbsp;{perfil.rancho}
                    </Insignia>
                  )}
                </div>
              </div>
            </section>

            <div className="par perfil__par">
              <DatosPersonales perfil={perfil} alGuardar={setPerfil} />
              <CambioDeContrasena />
            </div>

            <PreferenciaIdioma perfil={perfil} />
          </>
        )}
      </div>
    </DisenoApp>
  );
}

function DatosPersonales({
  perfil,
  alGuardar,
}: {
  perfil: PerfilUsuario;
  alGuardar: (perfil: PerfilUsuario) => void;
}) {
  const [nombre, setNombre] = useState(perfil.nombre);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');
  const [aviso, setAviso] = useState('');

  const cambio = nombre.trim() !== perfil.nombre;

  async function guardar(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setAviso('');
    setGuardando(true);
    try {
      const respuesta = await api.actualizarPerfil({ nombre: nombre.trim() });
      alGuardar(respuesta.perfil);
      setNombre(respuesta.perfil.nombre);
      setAviso(respuesta.mensaje);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setGuardando(false);
    }
  }

  return (
    <Tarjeta titulo={t('perfil.datos.titulo')}>
      <form className="col g16" onSubmit={guardar}>
        {error && <Alerta variante="error">{error}</Alerta>}
        {aviso && <Alerta variante="exito">{aviso}</Alerta>}

        <CampoTexto
          etiqueta={t('perfil.datos.nombre')}
          obligatorio
          maxLength={150}
          autoComplete="name"
          value={nombre}
          onChange={(e) => {
            setNombre(e.target.value);
            setAviso('');
          }}
        />
        <CampoTexto
          etiqueta={t('perfil.datos.correo')}
          value={perfil.correo}
          disabled
          ayuda={t('perfil.datos.correoAyuda')}
        />
        <CampoTexto
          etiqueta={t('perfil.datos.pais')}
          value={perfil.pais ?? t('perfil.datos.sinPais')}
          disabled
          ayuda={t('perfil.datos.paisAyuda')}
        />

        <dl className="datos perfil__datos">
          <dt>{t('perfil.datos.rol')}</dt>
          <dd>{nombreRol(perfil.rol)}</dd>
          <dt>{t('perfil.datos.rancho')}</dt>
          <dd>{perfil.rancho ?? t('perfil.datos.sinRancho')}</dd>
          <dt>{t('perfil.datos.desde')}</dt>
          <dd>{fecha(perfil.creado_en)}</dd>
        </dl>

        <div className="fila g8 perfil__botones">
          {cambio && (
            <Boton type="button" variante="secundario" onClick={() => setNombre(perfil.nombre)} disabled={guardando}>
              {t('perfil.datos.deshacer')}
            </Boton>
          )}
          <Boton type="submit" variante="primario" disabled={!cambio || guardando}>
            {guardando ? t('comun.guardando') : t('perfil.datos.guardarCambios')}
          </Boton>
        </div>
      </form>
    </Tarjeta>
  );
}

function CambioDeContrasena() {
  const [actual, setActual] = useState('');
  const [nueva, setNueva] = useState('');
  const [repetir, setRepetir] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState('');
  const [aviso, setAviso] = useState('');

  const faltas = faltasDeContrasena(nueva);
  const noCoinciden = repetir.length > 0 && repetir !== nueva;
  const listo = actual && nueva && repetir && faltas.length === 0 && !noCoinciden;

  async function cambiar(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setAviso('');
    setEnviando(true);
    try {
      const respuesta = await api.cambiarMiContrasena(actual, nueva);
      setAviso(respuesta.mensaje);
      setActual('');
      setNueva('');
      setRepetir('');
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setEnviando(false);
    }
  }

  return (
    <Tarjeta titulo={t('perfil.contrasena.titulo')}>
      <form className="col g16" onSubmit={cambiar}>
        {error && <Alerta variante="error">{error}</Alerta>}
        {aviso && <Alerta variante="exito">{aviso}</Alerta>}

        <CampoTexto
          etiqueta={t('perfil.contrasena.actual')}
          type="password"
          autoComplete="current-password"
          value={actual}
          onChange={(e) => setActual(e.target.value)}
        />
        <CampoTexto
          etiqueta={t('perfil.contrasena.nueva')}
          type="password"
          autoComplete="new-password"
          ayuda={t('comun.contrasena.reglas')}
          error={nueva && faltas.length > 0 ? t('comun.contrasena.falta', { faltas: enumerar(faltas) }) : undefined}
          value={nueva}
          onChange={(e) => setNueva(e.target.value)}
        />
        <CampoTexto
          etiqueta={t('perfil.contrasena.repetir')}
          type="password"
          autoComplete="new-password"
          error={noCoinciden ? t('perfil.contrasena.noCoincide') : undefined}
          value={repetir}
          onChange={(e) => setRepetir(e.target.value)}
        />

        <div className="fila g8 perfil__botones">
          <Boton type="submit" variante="primario" disabled={!listo || enviando}>
            <Icono nombre="llave" tamano={18} />
            {enviando ? t('perfil.contrasena.cambiando') : t('perfil.contrasena.cambiar')}
          </Boton>
        </div>
      </form>
    </Tarjeta>
  );
}

/**
 * HU-25 · Criterio 2: "El idioma se toma del país elegido y se puede cambiar."
 *
 * La primera opción es seguir al país: si la persona nunca eligió, es la que
 * está marcada. Elegir un idioma lo guarda en la cuenta, así vale en
 * cualquier computadora donde entre. Al guardar, toda la pantalla se vuelve a
 * dibujar en el idioma nuevo: ese es el aviso de que se guardó.
 */
function PreferenciaIdioma({ perfil }: { perfil: PerfilUsuario }) {
  const [elegido, setElegido] = useState(perfil.idioma_elegido ?? '');
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');

  const nombreDe = (codigo: string) =>
    IDIOMAS.find((idioma) => idioma.codigo === codigo)?.nombre ?? codigo;

  async function elegir(valor: string) {
    setElegido(valor);
    setError('');
    setGuardando(true);
    try {
      const respuesta = await api.actualizarPerfil({ idioma: valor || null });
      cambiarIdioma(respuesta.perfil.idioma, { recordar: true });
    } catch (err) {
      setError((err as Error).message);
      setElegido(perfil.idioma_elegido ?? '');
    } finally {
      setGuardando(false);
    }
  }

  const opciones = [
    {
      valor: '',
      nombre: t('perfil.idioma.segunPais'),
      detalle: t('perfil.idioma.segunPaisDetalle', {
        idioma: nombreDe(perfil.idioma_del_pais),
        pais: perfil.pais ?? t('perfil.idioma.tuRancho'),
      }),
    },
    ...IDIOMAS.map((idioma) => ({ valor: idioma.codigo, nombre: idioma.nombre, detalle: '' })),
  ];

  return (
    <Tarjeta titulo={t('perfil.idioma.titulo')}>
      <fieldset className="perfil__idiomas" disabled={guardando}>
        <legend className="cuerpo c-600">{t('perfil.idioma.explicacion')}</legend>
        {error && <Alerta variante="error">{error}</Alerta>}
        {opciones.map((opcion) => (
          <label
            key={opcion.valor || 'pais'}
            className={elegido === opcion.valor ? 'perfil__idioma elegido' : 'perfil__idioma'}
          >
            <input
              type="radio"
              name="idioma"
              value={opcion.valor}
              checked={elegido === opcion.valor}
              onChange={() => void elegir(opcion.valor)}
            />
            <span className="col">
              <strong>{opcion.nombre}</strong>
              {opcion.detalle && <span className="pie c-500">{opcion.detalle}</span>}
            </span>
          </label>
        ))}
      </fieldset>
    </Tarjeta>
  );
}
