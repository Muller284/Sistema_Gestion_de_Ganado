import {
  Alerta,
  Boton,
  CampoLista,
  CampoTexto,
  Cargando,
  Dato,
  Datos,
  EstadoVacio,
  Icono,
  Insignia,
  type NombreIcono,
  Tarjeta,
} from '../../componentes';
import { t, tJsx } from '../../servicios/idioma';

/**
 * HU-05 · Catalogo del sistema de diseño.
 *
 * Es la pagina 00 de Figma, pero dentro del proyecto y funcionando. Sirve para
 * tres cosas:
 *   1. Que el equipo vea que componente existe antes de inventar uno.
 *   2. Revisar de un vistazo que un cambio en los tokens no rompio nada.
 *   3. Mostrarla en la demostracion, que es la forma de demostrar HU-05.
 *
 * Se abre en la direccion #/sistema-diseno.
 */

/** nombre es la clave del texto en el archivo de idioma; se traduce al dibujar. */
const COLORES: { nombre: string; variable: string }[] = [
  { nombre: 'sistemaDiseno.colores.nombres.corral800', variable: '--corral-800' },
  { nombre: 'sistemaDiseno.colores.nombres.corral600', variable: '--corral-600' },
  { nombre: 'sistemaDiseno.colores.nombres.corral400', variable: '--corral-400' },
  { nombre: 'sistemaDiseno.colores.nombres.corral100', variable: '--corral-100' },
  { nombre: 'sistemaDiseno.colores.nombres.caravana500', variable: '--caravana-500' },
  { nombre: 'sistemaDiseno.colores.nombres.caravana100', variable: '--caravana-100' },
  { nombre: 'sistemaDiseno.colores.nombres.arena900', variable: '--arena-900' },
  { nombre: 'sistemaDiseno.colores.nombres.arena600', variable: '--arena-600' },
  { nombre: 'sistemaDiseno.colores.nombres.arena300', variable: '--arena-300' },
  { nombre: 'sistemaDiseno.colores.nombres.arena100', variable: '--arena-100' },
  { nombre: 'sistemaDiseno.colores.nombres.exito', variable: '--exito-base' },
  { nombre: 'sistemaDiseno.colores.nombres.advertencia', variable: '--adv-base' },
  { nombre: 'sistemaDiseno.colores.nombres.error', variable: '--error-base' },
  { nombre: 'sistemaDiseno.colores.nombres.informacion', variable: '--info-base' },
];

/** Todos los iconos del sistema, en el orden en que aparecen en Iconos.tsx. */
const ICONOS: NombreIcono[] = [
  'caravana',
  'casa',
  'animal',
  'corral',
  'sanidad',
  'balanza',
  'equipo',
  'plan',
  'info',
  'exito',
  'advertencia',
  'error',
  'pendiente',
  'lapiz',
  'archivar',
  'mas',
  'correo',
  'llave',
  'regla',
  'ubicacion',
  'produccion',
  'entrar',
  'enviar',
  'persona-mas',
];

function Muestra({ nombre, variable }: { nombre: string; variable: string }) {
  return (
    <div className="col g4">
      <div className="muestra" style={{ backgroundColor: `var(${variable})` }} />
      <span className="pie c-500">{t(nombre)}</span>
      <span className="dato">{variable}</span>
    </div>
  );
}

export function PaginaSistemaDiseno() {
  return (
    <main className="pagina">
      <header className="encabezado-pagina">
        <h1>{t('sistemaDiseno.titulo')}</h1>
        <p className="cuerpo c-600">{t('sistemaDiseno.intro')}</p>
      </header>

      <div className="col g24">
        <Tarjeta titulo={t('sistemaDiseno.colores.titulo')}>
          <p className="cuerpo c-600 separado">{t('sistemaDiseno.colores.nota')}</p>
          <div className="rejilla-auto">
            {COLORES.map((color) => (
              <Muestra key={color.variable} {...color} />
            ))}
          </div>
        </Tarjeta>

        <Tarjeta titulo={t('sistemaDiseno.tipografia.titulo')}>
          <div className="col g16">
            <div>
              <span className="pie c-600 rotulo-token">{t('sistemaDiseno.tipografia.titulos')}</span>
              <h2>Hacienda La Floresta</h2>
            </div>
            <div>
              <span className="pie c-600 rotulo-token">{t('sistemaDiseno.tipografia.texto')}</span>
              <p>{t('sistemaDiseno.tipografia.ejemplo')}</p>
            </div>
            <div>
              <span className="pie c-600 rotulo-token">
                {t('sistemaDiseno.tipografia.identificadores')}
              </span>
              <p className="dato">BO-4471-A · a0000000-0000-4000-8000-000000000001</p>
            </div>
          </div>
        </Tarjeta>

        <Tarjeta titulo={t('sistemaDiseno.botones.titulo')}>
          <div className="fila centro g8">
            <Boton variante="primario">{t('sistemaDiseno.botones.crearRancho')}</Boton>
            <Boton variante="secundario">{t('sistemaDiseno.botones.editar')}</Boton>
            <Boton variante="fantasma">{t('comun.cancelar')}</Boton>
            <Boton variante="destructivo">{t('sistemaDiseno.botones.darDeBaja')}</Boton>
            <Boton variante="secundario" disabled>
              {t('sistemaDiseno.botones.deshabilitado')}
            </Boton>
            <Boton variante="plan">{t('sistemaDiseno.botones.mejorarPlan')}</Boton>
          </div>
        </Tarjeta>

        <Tarjeta titulo={t('sistemaDiseno.campos.titulo')}>
          <div className="col g16">
            <CampoTexto
              etiqueta={t('sistemaDiseno.campos.nombreRancho')}
              obligatorio
              defaultValue="Rancho El Cerrito"
            />
            <CampoTexto
              etiqueta={t('sistemaDiseno.campos.superficie')}
              ayuda={t('sistemaDiseno.campos.superficieAyuda')}
              type="number"
              defaultValue="240"
            />
            <CampoTexto
              etiqueta={t('sistemaDiseno.campos.correo')}
              error={t('sistemaDiseno.campos.correoError')}
              defaultValue={t('sistemaDiseno.campos.correoEjemplo')}
            />
            <CampoTexto etiqueta={t('sistemaDiseno.campos.caravana')} mono defaultValue="BO-4471-A" />
            <CampoLista etiqueta={t('sistemaDiseno.campos.tipoProduccion')} defaultValue="mixto">
              <option value="carne">{t('sistemaDiseno.campos.carne')}</option>
              <option value="leche">{t('sistemaDiseno.campos.leche')}</option>
              <option value="mixto">{t('sistemaDiseno.campos.mixto')}</option>
            </CampoLista>
            <CampoTexto etiqueta={t('sistemaDiseno.campos.pais')} disabled defaultValue="Bolivia" />
          </div>
        </Tarjeta>

        <Tarjeta
          titulo={t('sistemaDiseno.tarjeta.titulo')}
          accion={<Insignia variante="exito">{t('sistemaDiseno.insignias.activo')}</Insignia>}
          pie={
            <>
              <Boton variante="secundario">{t('sistemaDiseno.botones.editar')}</Boton>
              <Boton variante="destructivo">{t('sistemaDiseno.botones.darDeBaja')}</Boton>
            </>
          }
        >
          <Datos>
            <Dato nombre={t('sistemaDiseno.tarjeta.ubicacion')}>Sacaba, Cochabamba (BO)</Dato>
            <Dato nombre={t('sistemaDiseno.campos.superficie')}>240 ha</Dato>
            <Dato nombre={t('sistemaDiseno.tarjeta.caravanas')}>
              <span className="dato">4471 · 4472 · 4473</span>
            </Dato>
          </Datos>
        </Tarjeta>

        <Tarjeta titulo={t('sistemaDiseno.insignias.titulo')}>
          <div className="fila centro g8">
            <Insignia>{t('sistemaDiseno.insignias.neutra')}</Insignia>
            <Insignia variante="exito">{t('sistemaDiseno.insignias.activo')}</Insignia>
            <Insignia variante="adv">{t('sistemaDiseno.insignias.sinVerificar')}</Insignia>
            <Insignia variante="error">{t('sistemaDiseno.insignias.suspendido')}</Insignia>
            <Insignia variante="info">{t('sistemaDiseno.insignias.soloLectura')}</Insignia>
            <Insignia variante="plan">{t('sistemaDiseno.insignias.planProfesional')}</Insignia>
          </div>
        </Tarjeta>

        <Tarjeta titulo={t('sistemaDiseno.iconos.titulo')}>
          <div className="col g16">
            <p className="cuerpo c-600">
              {tJsx(
                'sistemaDiseno.iconos.texto',
                {
                  enlace: (s) => <a href="https://lucide.dev">{s}</a>,
                  dato: (s) => <span className="dato">{s}</span>,
                },
                { archivo: 'componentes/Iconos.tsx', ejemplo: '<Icono nombre="corral" />' },
              )}
            </p>
            <div className="rejilla-iconos">
              {ICONOS.map((nombre) => (
                <div key={nombre} className="muestra-icono">
                  <Icono nombre={nombre} tamano={24} />
                  <span className="dato">{nombre}</span>
                </div>
              ))}
            </div>
          </div>
        </Tarjeta>

        <Tarjeta titulo={t('sistemaDiseno.alertas.titulo')}>
          <div className="col g16">
            <Alerta variante="exito">{t('sistemaDiseno.alertas.ranchoCreado')}</Alerta>
            <Alerta variante="error">{t('sistemaDiseno.alertas.unSoloRancho')}</Alerta>
            <Alerta variante="adv">{t('sistemaDiseno.alertas.confirmaCorreo')}</Alerta>
            <Alerta variante="info">{t('sistemaDiseno.alertas.soloPropietario')}</Alerta>
          </div>
        </Tarjeta>

        <Tarjeta titulo={t('sistemaDiseno.vacio.titulo')}>
          <EstadoVacio
            icono="animal"
            titulo={t('sistemaDiseno.vacio.sinAnimales')}
            texto={t('sistemaDiseno.vacio.texto')}
            accion={<Boton variante="primario">{t('sistemaDiseno.vacio.registrar')}</Boton>}
          />
        </Tarjeta>

        <Tarjeta titulo={t('sistemaDiseno.carga.titulo')}>
          <Cargando />
        </Tarjeta>
      </div>
    </main>
  );
}
