import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Alerta, Boton, CampoTexto, DisenoAcceso,  } from '../../componentes';
import { api } from '../../servicios/api';
import { t } from '../../servicios/idioma';
import { enumerar, faltasDeContrasena } from '../../servicios/texto';

export function PaginaRestablecerContrasena() {
  const [nueva, setNueva] = useState('');
  const [repetir, setRepetir] = useState('');
  const [error, setError] = useState('');
  const [exito, setExito] = useState(false);
  const [enviando, setEnviando] = useState(false);

  // El token viene en la direccion: /#/recuperar-contrasena?token=...
  // Con HashRouter la consulta vive DENTRO de la almohadilla, asi que
  // window.location.search llega vacio. Se lee con el enrutador.
  const [parametros] = useSearchParams();
  const token = parametros.get('token');
  const navegar = useNavigate();

  const faltas = faltasDeContrasena(nueva);
  const tocada = nueva.length > 0;
  const noCoinciden = repetir.length > 0 && repetir !== nueva;

  async function guardar(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    if (!token) {
      setError(t('acceso.contrasena.restablecer.enlaceInvalido'));
      return;
    }
    if (faltas.length > 0) {
      setError(t('comun.contrasena.necesita', { faltas: enumerar(faltas) }));
      return;
    }
    if (nueva !== repetir) {
      setError(t('acceso.comun.noCoinciden'));
      return;
    }

    setEnviando(true);
    try {
      await api.ejecutarRecuperacion(token, nueva);
      setExito(true);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setEnviando(false);
    }
  }

  // Pantalla de éxito tras cambiar la contraseña
  if (exito) {
    return (
      <DisenoAcceso
        icono="llave"
        titulo={t('acceso.contrasena.restablecer.exito.titulo')}
        nota={t('acceso.contrasena.restablecer.exito.nota')}
      >
        <div className="col g16">
          <Alerta variante="exito">{t('acceso.contrasena.restablecer.exito.texto')}</Alerta>
          <Boton variante="primario" bloque onClick={() => navegar('/ingreso')}>
            {t('acceso.contrasena.restablecer.exito.ingresar')}
          </Boton>
        </div>
      </DisenoAcceso>
    );
  }

  // Protección: Si alguien entra a la página sin un token en la URL
  if (!token) {
    return (
      <DisenoAcceso
        icono="llave"
        titulo={t('acceso.contrasena.restablecer.invalido.titulo')}
        nota={t('acceso.contrasena.restablecer.invalido.nota')}
      >
        <div className="col g16">
          <Alerta variante="error">{t('acceso.contrasena.restablecer.invalido.texto')}</Alerta>
          <Boton variante="secundario" bloque onClick={() => navegar('/')}>
            {t('acceso.contrasena.restablecer.invalido.volverInicio')}
          </Boton>
        </div>
      </DisenoAcceso>
    );
  }

  // Pantalla normal del formulario
  return (
    <DisenoAcceso
      icono="llave"
      titulo={t('acceso.contrasena.restablecer.titulo')}
      nota={t('acceso.contrasena.restablecer.nota')}
    >
      <div className="col g16">
        {error && <Alerta variante="error">{error}</Alerta>}

        <form onSubmit={guardar} className="col g16">
          <CampoTexto
            etiqueta={t('acceso.comun.contrasenaNueva')}
            obligatorio
            type="password"
            autoComplete="new-password"
            placeholder={t('acceso.comun.alMenos8')}
            ayuda={t('acceso.comun.ayudaContrasena')}
            error={
              tocada && faltas.length > 0
                ? t('comun.contrasena.falta', { faltas: enumerar(faltas) })
                : undefined
            }
            value={nueva}
            onChange={(e) => setNueva(e.target.value)}
          />
          <CampoTexto
            etiqueta={t('acceso.comun.repetirNueva')}
            obligatorio
            type="password"
            autoComplete="new-password"
            error={noCoinciden ? t('acceso.comun.noCoinciden') : undefined}
            value={repetir}
            onChange={(e) => setRepetir(e.target.value)}
          />
          <Boton type="submit" variante="primario" bloque disabled={enviando}>
            {enviando
              ? t('acceso.contrasena.restablecer.guardando')
              : t('acceso.contrasena.restablecer.guardar')}
          </Boton>
        </form>
      </div>
    </DisenoAcceso>
  );
}