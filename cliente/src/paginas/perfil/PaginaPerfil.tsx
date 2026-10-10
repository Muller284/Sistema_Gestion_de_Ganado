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
import { inicial } from '../../servicios/texto';

/**
 * Mi perfil. Se llega tocando el usuario al pie del menú lateral o desde el
 * menú de la cuenta, arriba a la derecha.
 *
 * QUÉ SE PUEDE CAMBIAR
 *   el nombre       acá mismo.
 *   la contraseña   con la actual y la nueva (el mismo servicio de HU-10).
 * QUÉ NO, Y POR QUÉ
 *   el correo       cambiarlo exige confirmar el nuevo (HU-07); se ve, pero
 *                   no se edita todavía.
 *   el país         es el criterio 2 de HU-14 (Brian): se cambia desde los
 *                   ajustes del país cuando esa parte exista.
 *   rol y rancho    los decide el propietario, no uno mismo.
 */

const ROLES: Record<string, string> = {
  propietario: 'Propietario',
  socio: 'Socio',
  colaborador: 'Colaborador',
  admin_plataforma: 'Admin de plataforma',
};

function faltasDeContrasena(contrasena: string): string[] {
  const faltas: string[] = [];
  if (contrasena.length < 8) faltas.push('ocho caracteres');
  if (!/[A-ZÁÉÍÓÚÑ]/.test(contrasena)) faltas.push('una mayúscula');
  if (!/[0-9]/.test(contrasena)) faltas.push('un número');
  return faltas;
}

function enumerar(partes: string[]): string {
  if (partes.length <= 1) return partes.join('');
  return `${partes.slice(0, -1).join(', ')} y ${partes[partes.length - 1]}`;
}

function fecha(valor: string): string {
  return new Date(valor).toLocaleDateString('es', {
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
      ruta={['Mi perfil']}
      usuario={usuario}
      rancho={perfil?.rancho ?? null}
      rotulo="Tu cuenta"
      titulo="Mi perfil"
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
                  <Insignia variante="exito">{ROLES[perfil.rol] ?? perfil.rol}</Insignia>
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
    <Tarjeta titulo="Tus datos">
      <form className="col g16" onSubmit={guardar}>
        {error && <Alerta variante="error">{error}</Alerta>}
        {aviso && <Alerta variante="exito">{aviso}</Alerta>}

        <CampoTexto
          etiqueta="Nombre y apellido"
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
          etiqueta="Correo"
          value={perfil.correo}
          disabled
          ayuda="Es con el que entras. Cambiarlo exige confirmar el nuevo, y eso llega más adelante."
        />
        <CampoTexto
          etiqueta="País"
          value={perfil.pais ?? 'Sin país registrado'}
          disabled
          ayuda="Define idioma, moneda y unidades. Se cambia desde los ajustes del país."
        />

        <dl className="datos perfil__datos">
          <dt>Rol</dt>
          <dd>{ROLES[perfil.rol] ?? perfil.rol}</dd>
          <dt>Rancho</dt>
          <dd>{perfil.rancho ?? 'Todavía sin rancho'}</dd>
          <dt>En el sistema desde</dt>
          <dd>{fecha(perfil.creado_en)}</dd>
        </dl>

        <div className="fila g8 perfil__botones">
          {cambio && (
            <Boton type="button" variante="secundario" onClick={() => setNombre(perfil.nombre)} disabled={guardando}>
              Deshacer
            </Boton>
          )}
          <Boton type="submit" variante="primario" disabled={!cambio || guardando}>
            {guardando ? 'Guardando…' : 'Guardar cambios'}
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
    <Tarjeta titulo="Contraseña">
      <form className="col g16" onSubmit={cambiar}>
        {error && <Alerta variante="error">{error}</Alerta>}
        {aviso && <Alerta variante="exito">{aviso}</Alerta>}

        <CampoTexto
          etiqueta="Contraseña actual"
          type="password"
          autoComplete="current-password"
          value={actual}
          onChange={(e) => setActual(e.target.value)}
        />
        <CampoTexto
          etiqueta="Contraseña nueva"
          type="password"
          autoComplete="new-password"
          ayuda="Al menos 8 caracteres, con una mayúscula y un número."
          error={nueva && faltas.length > 0 ? `Falta al menos ${enumerar(faltas)}.` : undefined}
          value={nueva}
          onChange={(e) => setNueva(e.target.value)}
        />
        <CampoTexto
          etiqueta="Repite la nueva"
          type="password"
          autoComplete="new-password"
          error={noCoinciden ? 'No coincide con la nueva.' : undefined}
          value={repetir}
          onChange={(e) => setRepetir(e.target.value)}
        />

        <div className="fila g8 perfil__botones">
          <Boton type="submit" variante="primario" disabled={!listo || enviando}>
            <Icono nombre="llave" tamano={18} />
            {enviando ? 'Cambiando…' : 'Cambiar contraseña'}
          </Boton>
        </div>
      </form>
    </Tarjeta>
  );
}
