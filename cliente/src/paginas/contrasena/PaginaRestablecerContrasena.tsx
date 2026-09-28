import { useState } from 'react';
import { Alerta, Boton, CampoTexto, DisenoAcceso,  } from '../../componentes';
import { api } from '../../servicios/api';

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

export function PaginaRestablecerContrasena() {
  const [nueva, setNueva] = useState('');
  const [repetir, setRepetir] = useState('');
  const [error, setError] = useState('');
  const [exito, setExito] = useState(false);
  const [enviando, setEnviando] = useState(false);

  // Extraer el token de la URL (ej. http://localhost:5173/recuperar-contrasena?token=12345)
  const parametros = new URLSearchParams(window.location.search);
  const token = parametros.get('token');

  const faltas = faltasDeContrasena(nueva);
  const tocada = nueva.length > 0;
  const noCoinciden = repetir.length > 0 && repetir !== nueva;

  async function guardar(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    if (!token) {
      setError('El enlace de recuperación no es válido o está incompleto.');
      return;
    }
    if (faltas.length > 0) {
      setError(`La contraseña necesita al menos ${enumerar(faltas)}.`);
      return;
    }
    if (nueva !== repetir) {
      setError('Las dos contraseñas no coinciden.');
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
        titulo="¡Contraseña recuperada!"
        nota="Tu contraseña se ha actualizado correctamente."
      >
        <div className="col g16">
          <Alerta variante="exito">
            Ya puedes usar tu nueva contraseña para ingresar al sistema.
          </Alerta>
          <Boton variante="primario" bloque onClick={() => window.location.href = '/'}>
            Ir al inicio
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
        titulo="Enlace inválido"
        nota="No podemos recuperar tu contraseña."
      >
        <div className="col g16">
          <Alerta variante="error">
            Falta el código de seguridad. Asegúrate de hacer clic en el enlace completo que llegó a tu correo.
          </Alerta>
          <Boton variante="secundario" bloque onClick={() => window.location.href = '/'}>
            Volver al inicio
          </Boton>
        </div>
      </DisenoAcceso>
    );
  }

  // Pantalla normal del formulario
  return (
    <DisenoAcceso
      icono="llave"
      titulo="Crea tu nueva contraseña"
      nota="Ingresa una contraseña segura que puedas recordar."
    >
      <div className="col g16">
        {error && <Alerta variante="error">{error}</Alerta>}

        <form onSubmit={guardar} className="col g16">
          <CampoTexto
            etiqueta="Contraseña nueva"
            obligatorio
            type="password"
            autoComplete="new-password"
            placeholder="Al menos 8 caracteres"
            ayuda="Usa al menos 8 caracteres, con una mayúscula y un número."
            error={tocada && faltas.length > 0 ? `Falta al menos ${enumerar(faltas)}.` : undefined}
            value={nueva}
            onChange={(e) => setNueva(e.target.value)}
          />
          <CampoTexto
            etiqueta="Repetir la contraseña nueva"
            obligatorio
            type="password"
            autoComplete="new-password"
            error={noCoinciden ? 'Las dos contraseñas no coinciden.' : undefined}
            value={repetir}
            onChange={(e) => setRepetir(e.target.value)}
          />
          <Boton type="submit" variante="primario" bloque disabled={enviando}>
            {enviando ? 'Guardando...' : 'Guardar contraseña'}
          </Boton>
        </form>
      </div>
    </DisenoAcceso>
  );
}