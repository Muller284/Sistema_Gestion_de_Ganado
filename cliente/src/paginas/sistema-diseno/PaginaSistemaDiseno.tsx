import {
  Alerta,
  Boton,
  CampoLista,
  CampoTexto,
  Cargando,
  Dato,
  Datos,
  EstadoVacio,
  Insignia,
  Tarjeta,
} from '../../componentes';

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

const COLORES: { nombre: string; variable: string }[] = [
  { nombre: 'Corral 800', variable: '--corral-800' },
  { nombre: 'Corral 600', variable: '--corral-600' },
  { nombre: 'Corral 400', variable: '--corral-400' },
  { nombre: 'Corral 100', variable: '--corral-100' },
  { nombre: 'Caravana 500', variable: '--caravana-500' },
  { nombre: 'Caravana 100', variable: '--caravana-100' },
  { nombre: 'Arena 900', variable: '--arena-900' },
  { nombre: 'Arena 600', variable: '--arena-600' },
  { nombre: 'Arena 300', variable: '--arena-300' },
  { nombre: 'Arena 100', variable: '--arena-100' },
  { nombre: 'Éxito', variable: '--exito-base' },
  { nombre: 'Advertencia', variable: '--adv-base' },
  { nombre: 'Error', variable: '--error-base' },
  { nombre: 'Información', variable: '--info-base' },
];

function Muestra({ nombre, variable }: { nombre: string; variable: string }) {
  return (
    <div className="col g4">
      <div className="muestra" style={{ backgroundColor: `var(${variable})` }} />
      <span className="pie c-500">{nombre}</span>
      <span className="dato">{variable}</span>
    </div>
  );
}

export function PaginaSistemaDiseno() {
  return (
    <main className="pagina">
      <header className="encabezado-pagina">
        <h1>Sistema de diseño</h1>
        <p className="cuerpo c-600">
          HU-05 · Todo lo que se puede usar en una pantalla. Si algo no está
          acá, no se escribe a mano: se agrega acá primero.
        </p>
      </header>

      <div className="col g24">
        <Tarjeta titulo="Colores">
          <p className="cuerpo c-600 separado">
            El dorado caravana se usa únicamente en planes, suscripción y
            límites de plan. Nunca en una acción común.
          </p>
          <div className="rejilla-auto">
            {COLORES.map((color) => (
              <Muestra key={color.variable} {...color} />
            ))}
          </div>
        </Tarjeta>

        <Tarjeta titulo="Tipografía">
          <div className="col g16">
            <div>
              <span className="pie c-600 rotulo-token">Outfit · títulos</span>
              <h2>Hacienda La Floresta</h2>
            </div>
            <div>
              <span className="pie c-600 rotulo-token">Inter · texto</span>
              <p>
                El rancho es la raíz del aislamiento: ninguna consulta puede
                devolver información de un rancho ajeno.
              </p>
            </div>
            <div>
              <span className="pie c-600 rotulo-token">
                IBM Plex Mono · identificadores
              </span>
              <p className="dato">BO-4471-A · a0000000-0000-4000-8000-000000000001</p>
            </div>
          </div>
        </Tarjeta>

        <Tarjeta titulo="Botones">
          <div className="fila centro g8">
            <Boton variante="primario">Crear rancho</Boton>
            <Boton variante="secundario">Editar</Boton>
            <Boton variante="fantasma">Cancelar</Boton>
            <Boton variante="destructivo">Dar de baja</Boton>
            <Boton variante="secundario" disabled>
              Deshabilitado
            </Boton>
            <Boton variante="plan">Mejorar plan</Boton>
          </div>
        </Tarjeta>

        <Tarjeta titulo="Campos">
          <div className="col g16">
            <CampoTexto
              etiqueta="Nombre del rancho"
              obligatorio
              defaultValue="Rancho El Cerrito"
            />
            <CampoTexto
              etiqueta="Superficie"
              ayuda="En hectáreas."
              type="number"
              defaultValue="240"
            />
            <CampoTexto
              etiqueta="Correo"
              error="Ya existe una cuenta con ese correo."
              defaultValue="ariel@ejemplo.com"
            />
            <CampoTexto etiqueta="Caravana" mono defaultValue="BO-4471-A" />
            <CampoLista etiqueta="Tipo de producción" defaultValue="mixto">
              <option value="carne">Carne</option>
              <option value="leche">Leche</option>
              <option value="mixto">Mixto</option>
            </CampoLista>
            <CampoTexto etiqueta="País" disabled defaultValue="Bolivia" />
          </div>
        </Tarjeta>

        <Tarjeta
          titulo="Tarjeta con encabezado, cuerpo y pie"
          accion={<Insignia variante="exito">Activo</Insignia>}
          pie={
            <>
              <Boton variante="secundario">Editar</Boton>
              <Boton variante="destructivo">Dar de baja</Boton>
            </>
          }
        >
          <Datos>
            <Dato nombre="Ubicación">Sacaba, Cochabamba (BO)</Dato>
            <Dato nombre="Superficie">240 ha</Dato>
            <Dato nombre="Caravanas">
              <span className="dato">4471 · 4472 · 4473</span>
            </Dato>
          </Datos>
        </Tarjeta>

        <Tarjeta titulo="Insignias">
          <div className="fila centro g8">
            <Insignia>Neutra</Insignia>
            <Insignia variante="exito">Activo</Insignia>
            <Insignia variante="adv">Sin verificar</Insignia>
            <Insignia variante="error">Suspendido</Insignia>
            <Insignia variante="info">Solo lectura</Insignia>
            <Insignia variante="plan">Plan Profesional</Insignia>
          </div>
        </Tarjeta>

        <Tarjeta titulo="Alertas">
          <div className="col g16">
            <Alerta variante="exito">Rancho creado.</Alerta>
            <Alerta variante="error">
              Una cuenta maneja un solo rancho.
            </Alerta>
            <Alerta variante="adv">
              Confirma tu correo para poder usar el sistema.
            </Alerta>
            <Alerta variante="info">
              Solo el propietario puede crear o editar el rancho.
            </Alerta>
          </div>
        </Tarjeta>

        <Tarjeta titulo="Estado vacío">
          <EstadoVacio
            titulo="Todavía no tienes animales"
            texto="Registra el primero o impórtalos desde un archivo de Excel."
            accion={<Boton variante="primario">Registrar animal</Boton>}
          />
        </Tarjeta>

        <Tarjeta titulo="Estado de carga">
          <Cargando />
        </Tarjeta>
      </div>
    </main>
  );
}
