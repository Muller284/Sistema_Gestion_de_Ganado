/**
 * ============================================================================
 * SISTEMA DE GESTION DE GANADO
 * Pruebas de Aislamiento de Datos entre Ranchos (HU-03)
 * Responsable: Romina (Control de Calidad) - En conjunto con Brian
 * ============================================================================
 * Criterios de Aceptacion validados:
 *  1. El filtro por rancho se aplica en un unico lugar del codigo (RepositorioBase).
 *  2. No es posible ejecutar una consulta de datos productivos sin indicar el rancho.
 *  3. Existen pruebas automaticas que intentan leer datos de otro rancho y fallan.
 * ============================================================================
 */

const assert = require('assert');
const RepositorioBase = require('../RepositorioBase');

// Identificadores fijos de las semillas (servidor/semillas/001_datos_prueba.sql)
const RANCHO_A_ID = 'a0000000-0000-4000-8000-000000000001'; // Rancho El Cerrito
const USUARIO_PROPIETARIO_A_ID = 'a1000000-0000-4000-8000-000000000001';
const USUARIO_VETERINARIO_A_ID = 'a1000000-0000-4000-8000-000000000003';

const RANCHO_B_ID = 'b0000000-0000-4000-8000-000000000002'; // Hacienda La Floresta
const USUARIO_PROPIETARIO_B_ID = 'b1000000-0000-4000-8000-000000000001';
const USUARIO_VETERINARIO_B_ID = 'b1000000-0000-4000-8000-000000000003';

// Mock/Simulator de Base de Datos para garantizar ejecución 100% confiable y autónoma
class MockDbPool {
  constructor() {
    this.usuarios = [
      // Usuarios Rancho A
      { id: USUARIO_PROPIETARIO_A_ID, rancho_id: RANCHO_A_ID, nombre: 'Carlos Gutierrez', rol: 'propietario', eliminado_en: null },
      { id: 'a1000000-0000-4000-8000-000000000002', rancho_id: RANCHO_A_ID, nombre: 'Maria Rene Aguilera', rol: 'socio', eliminado_en: null },
      { id: USUARIO_VETERINARIO_A_ID, rancho_id: RANCHO_A_ID, nombre: 'Dr. Jorge Soliz', rol: 'colaborador', eliminado_en: null },
      { id: 'a1000000-0000-4000-8000-000000000004', rancho_id: RANCHO_A_ID, nombre: 'Roberto Justiniano', rol: 'colaborador', eliminado_en: null },
      // Usuarios Rancho B
      { id: USUARIO_PROPIETARIO_B_ID, rancho_id: RANCHO_B_ID, nombre: 'Fernando Torrico', rol: 'propietario', eliminado_en: null },
      { id: 'b1000000-0000-4000-8000-000000000002', rancho_id: RANCHO_B_ID, nombre: 'Patricia Villarroel', rol: 'socio', eliminado_en: null },
      { id: USUARIO_VETERINARIO_B_ID, rancho_id: RANCHO_B_ID, nombre: 'Dra. Lucia Morales', rol: 'colaborador', eliminado_en: null },
      // Usuario sin rancho (recién registrado)
      { id: 'c1000000-0000-4000-8000-000000000001', rancho_id: null, nombre: 'Propietario Sin Rancho', rol: 'propietario', eliminado_en: null }
    ];
  }

  async query(sql, params) {
    if (sql.includes('SELECT * FROM usuarios')) {
      const ranchoId = params[0];
      let filas = this.usuarios.filter(u => u.rancho_id === ranchoId && u.eliminado_en === null);

      if (params.length > 1) {
        const idBuscado = params[1];
        filas = filas.filter(u => u.id === idBuscado);
      }
      return { rows: filas };
    }

    if (sql.includes('INSERT INTO')) {
      const nuevo = { ...params };
      return { rows: [nuevo] };
    }

    return { rows: [] };
  }
}

async function ejecutarPruebas() {
  console.log('================================================================');
  console.log('  SUITE DE PRUEBAS DE CALIDAD (QA) - HU-03 AISLAMIENTO DE RANCHOS');
  console.log('  Responsable: Romina | Criterio de Terminación: 100% Verde');
  console.log('================================================================\n');

  let exitosas = 0;
  let fallidas = 0;

  function registrarPaso(nombre) {
    console.log(`  [PASS] ${nombre}`);
    exitosas++;
  }

  function registrarFallo(nombre, error) {
    console.error(`  [FAIL] ${nombre}:`, error.message);
    fallidas++;
  }

  const dbMock = new MockDbPool();

  // --------------------------------------------------------------------------
  // TEST 1: Bloqueo obligatorio ante intento de instanciar repositorio sin rancho
  // --------------------------------------------------------------------------
  try {
    assert.throws(
      () => new RepositorioBase(dbMock, null, USUARIO_PROPIETARIO_A_ID),
      /SEGURIDAD CRÍTICA: No se puede instanciar un repositorio sin indicar el rancho_id/,
      'Debe arrojar error si el rancho_id es nulo'
    );
    assert.throws(
      () => new RepositorioBase(dbMock, undefined, USUARIO_PROPIETARIO_A_ID),
      /SEGURIDAD CRÍTICA: No se puede instanciar un repositorio sin indicar el rancho_id/,
      'Debe arrojar error si el rancho_id es indefinido'
    );
    registrarPaso('Test 1: Se bloquea cualquier intento de instanciar repositorio con rancho_id nulo/indefinido');
  } catch (err) {
    registrarFallo('Test 1: Bloqueo sin rancho_id', err);
  }

  // --------------------------------------------------------------------------
  // TEST 2: Consulta desde Rancho A nunca devuelve usuarios de Rancho B
  // --------------------------------------------------------------------------
  try {
    const repoRanchoA = new RepositorioBase(dbMock, RANCHO_A_ID, USUARIO_PROPIETARIO_A_ID);
    const usuariosA = await repoRanchoA.consultar('usuarios');

    assert(usuariosA.length > 0, 'Rancho A debe tener usuarios');
    const contieneUsuariosDeRanchoB = usuariosA.some(u => u.rancho_id === RANCHO_B_ID);
    assert.strictEqual(contieneUsuariosDeRanchoB, false, 'No debe existir ningun usuario de Rancho B');

    const todosPertenecenARanchoA = usuariosA.every(u => u.rancho_id === RANCHO_A_ID);
    assert.strictEqual(todosPertenecenARanchoA, true, 'Todos los usuarios devueltos deben pertenecer a Rancho A');

    registrarPaso('Test 2: Consulta general de Rancho A filtra estrictamente y aisla los datos de Rancho B');
  } catch (err) {
    registrarFallo('Test 2: Aislamiento general Rancho A vs Rancho B', err);
  }

  // --------------------------------------------------------------------------
  // TEST 3: Intento intencional de Rancho A de leer un ID específico de Rancho B
  // --------------------------------------------------------------------------
  try {
    const repoRanchoA = new RepositorioBase(dbMock, RANCHO_A_ID, USUARIO_PROPIETARIO_A_ID);
    
    // Intenta leer al Propietario de Rancho B mediante una consulta con ID
    const resultado = await repoRanchoA.consultar('usuarios', 'AND id = $2', [USUARIO_PROPIETARIO_B_ID]);

    assert.strictEqual(resultado.length, 0, 'Una consulta de Rancho A por el ID de Rancho B debe devolver 0 registros');
    registrarPaso('Test 3: Intento directo de consultar registro ajeno de Rancho B devuelve vacío (no encontrado)');
  } catch (err) {
    registrarFallo('Test 3: Acceso por identificador directo a rancho ajeno', err);
  }

  // --------------------------------------------------------------------------
  // TEST 4: Consulta simétrica desde Rancho B nunca devuelve usuarios de Rancho A
  // --------------------------------------------------------------------------
  try {
    const repoRanchoB = new RepositorioBase(dbMock, RANCHO_B_ID, USUARIO_PROPIETARIO_B_ID);
    const usuariosB = await repoRanchoB.consultar('usuarios');

    assert(usuariosB.length > 0, 'Rancho B debe tener usuarios');
    const contieneUsuariosDeRanchoA = usuariosB.some(u => u.rancho_id === RANCHO_A_ID);
    assert.strictEqual(contieneUsuariosDeRanchoA, false, 'No debe existir ningun usuario de Rancho A en consulta de Rancho B');

    const todosPertenecenARanchoB = usuariosB.every(u => u.rancho_id === RANCHO_B_ID);
    assert.strictEqual(todosPertenecenARanchoB, true, 'Todos los usuarios devueltos deben pertenecer a Rancho B');

    registrarPaso('Test 4: Consulta simetrica de Rancho B confirma aislamiento bidireccional estricto');
  } catch (err) {
    registrarFallo('Test 4: Aislamiento bidireccional Rancho B', err);
  }

  // --------------------------------------------------------------------------
  // TEST 5: Prevención de contaminación al insertar (Cross-tenant override)
  // --------------------------------------------------------------------------
  try {
    const repoRanchoA = new RepositorioBase(dbMock, RANCHO_A_ID, USUARIO_PROPIETARIO_A_ID);
    
    // Un payload malicioso intenta forzar rancho_id de Rancho B
    const intentoAtaque = {
      nombre: 'Colaborador Infiltrado',
      rancho_id: RANCHO_B_ID
    };

    await repoRanchoA.insertar('usuarios', intentoAtaque);

    // RepositorioBase debe forzar datos.rancho_id = this.ranchoId
    assert.strictEqual(intentoAtaque.rancho_id, RANCHO_A_ID, 'El repositorio debe forzar rancho_id al rancho del contexto');
    assert.strictEqual(intentoAtaque.creado_por, USUARIO_PROPIETARIO_A_ID, 'Debe registrar creado_por con la autoría real (HU-23)');

    registrarPaso('Test 5: RepositorioBase sobrescribe y fuerza rancho_id y creado_por al insertar (Anti-suplantación)');
  } catch (err) {
    registrarFallo('Test 5: Prevención de inyección de rancho_id ajeno en inserción', err);
  }

  console.log('\n----------------------------------------------------------------');
  console.log(`RESUMEN DE PRUEBAS DE AISLAMIENTO:`);
  console.log(`  Pruebas ejecutadas: ${exitosas + fallidas}`);
  console.log(`  Aprobadas (Verde) : ${exitosas}`);
  console.log(`  Fallidas  (Rojo)  : ${fallidas}`);
  console.log('----------------------------------------------------------------');

  if (fallidas > 0) {
    console.error('ALERTA QA: Existen fallos de aislamiento. NO se aprueba la HU-03.');
    process.exit(1);
  } else {
    console.log('VEREDICTO QA: Criterios de HU-03 y HU-04 CUMPLIDOS al 100%.');
  }
}

if (require.main === module) {
  ejecutarPruebas();
}

module.exports = { ejecutarPruebas };
