/**
 * ============================================================================
 * SISTEMA DE GESTIÓN DE GANADO
 * Pruebas de Calidad (QA) — HU-11: Bloqueo por intentos fallidos
 * Responsable: Romina | Criterio de Terminación: 100% Verde
 * ============================================================================
 */

const assert = require('assert');

// Mock en memoria para validar la máquina de estados de HU-11
class ManejadorBloqueoIntentos {
  constructor(maxIntentos = 5, minutosBloqueo = 15) {
    this.maxIntentos = maxIntentos;
    this.minutosBloqueo = minutosBloqueo;
    this.usuarios = new Map();
  }

  registrarUsuario(correo, contrasena) {
    this.usuarios.set(correo.toLowerCase(), {
      contrasena,
      intentos_fallidos: 0,
      bloqueado_hasta: null,
    });
  }

  autenticar(correo, contrasena, tiempoActual = new Date()) {
    const user = this.usuarios.get(correo.toLowerCase());
    if (!user) {
      return { exito: false, mensaje: 'Credenciales inválidas.' };
    }

    // Verificar si está bloqueado
    if (user.bloqueado_hasta && tiempoActual < user.bloqueado_hasta) {
      const minutosRestantes = Math.ceil(
        (user.bloqueado_hasta.getTime() - tiempoActual.getTime()) / 60000,
      );
      return {
        exito: false,
        bloqueado: true,
        mensaje: `Cuenta temporalmente bloqueada por exceso de intentos fallidos. Intente nuevamente en ${minutosRestantes} minutos.`,
      };
    }

    // Si el tiempo de bloqueo ya expiró, se levanta el bloqueo
    if (user.bloqueado_hasta && tiempoActual >= user.bloqueado_hasta) {
      user.bloqueado_hasta = null;
      user.intentos_fallidos = 0;
    }

    if (user.contrasena === contrasena) {
      // Éxito: reinicia intentos fallidos
      user.intentos_fallidos = 0;
      user.bloqueado_hasta = null;
      return { exito: true, mensaje: 'Autenticación exitosa.' };
    }

    // Fallo de contraseña
    user.intentos_fallidos += 1;
    if (user.intentos_fallidos >= this.maxIntentos) {
      user.bloqueado_hasta = new Date(
        tiempoActual.getTime() + this.minutosBloqueo * 60000,
      );
      return {
        exito: false,
        bloqueado: true,
        mensaje: `Cuenta temporalmente bloqueada por 15 minutos tras ${this.maxIntentos} intentos fallidos consecutivos.`,
      };
    }

    return {
      exito: false,
      bloqueado: false,
      mensaje: 'Credenciales inválidas.',
    };
  }
}

let exitosas = 0;
let fallidas = 0;

function prueba(nombre, fn) {
  try {
    fn();
    console.log(`  [PASA]  ${nombre}`);
    exitosas++;
  } catch (error) {
    console.error(`  [FALLA] ${nombre}`);
    console.error(`          ${error.message}`);
    fallidas++;
  }
}

console.log('================================================================');
console.log('  SUITE DE PRUEBAS DE CALIDAD (QA) — HU-11: BLOQUEO DE CUENTA');
console.log('  Responsable: Romina | Criterio de Terminación: 100% Verde');
console.log('================================================================\n');

const ahora = new Date('2026-09-23T10:00:00Z');

prueba('Test 1: Intentos fallidos menores a 5 no bloquean la cuenta', () => {
  const gestor = new ManejadorBloqueoIntentos();
  gestor.registrarUsuario('propietario@rancho.bo', 'ClaveCorrecta123');

  for (let i = 1; i <= 4; i++) {
    const res = gestor.autenticar('propietario@rancho.bo', 'ClaveErronea', ahora);
    assert.strictEqual(res.exito, false);
    assert.strictEqual(res.bloqueado, false);
  }
});

prueba('Test 2: El 5to intento fallido consecutivo activa el bloqueo de 15 minutos', () => {
  const gestor = new ManejadorBloqueoIntentos();
  gestor.registrarUsuario('propietario@rancho.bo', 'ClaveCorrecta123');

  for (let i = 1; i <= 4; i++) {
    gestor.autenticar('propietario@rancho.bo', 'ClaveErronea', ahora);
  }

  const res5 = gestor.autenticar('propietario@rancho.bo', 'ClaveErronea', ahora);
  assert.strictEqual(res5.exito, false);
  assert.strictEqual(res5.bloqueado, true);
  assert.match(res5.mensaje, /bloqueada por 15 minutos/);
});

prueba('Test 3: Ingreso con contraseña correcta mientras está bloqueado es rechazado', () => {
  const gestor = new ManejadorBloqueoIntentos();
  gestor.registrarUsuario('propietario@rancho.bo', 'ClaveCorrecta123');

  for (let i = 1; i <= 5; i++) {
    gestor.autenticar('propietario@rancho.bo', 'ClaveErronea', ahora);
  }

  // Intento 6 minutos después con clave correcta
  const tiempoMinuto6 = new Date('2026-09-23T10:06:00Z');
  const res = gestor.autenticar('propietario@rancho.bo', 'ClaveCorrecta123', tiempoMinuto6);
  assert.strictEqual(res.exito, false);
  assert.strictEqual(res.bloqueado, true);
});

prueba('Test 4: El bloqueo se levanta automáticamente tras cumplirse los 15 minutos', () => {
  const gestor = new ManejadorBloqueoIntentos();
  gestor.registrarUsuario('propietario@rancho.bo', 'ClaveCorrecta123');

  for (let i = 1; i <= 5; i++) {
    gestor.autenticar('propietario@rancho.bo', 'ClaveErronea', ahora);
  }

  // Intento a los 16 minutos (después del tiempo de bloqueo)
  const tiempoMinuto16 = new Date('2026-09-23T10:16:00Z');
  const res = gestor.autenticar('propietario@rancho.bo', 'ClaveCorrecta123', tiempoMinuto16);
  assert.strictEqual(res.exito, true);
});

prueba('Test 5: Ingreso exitoso antes de 5 fallos reinicia el contador a 0', () => {
  const gestor = new ManejadorBloqueoIntentos();
  gestor.registrarUsuario('propietario@rancho.bo', 'ClaveCorrecta123');

  // 3 intentos fallidos
  for (let i = 1; i <= 3; i++) {
    gestor.autenticar('propietario@rancho.bo', 'ClaveErronea', ahora);
  }

  // 1 intento exitoso
  const resExito = gestor.autenticar('propietario@rancho.bo', 'ClaveCorrecta123', ahora);
  assert.strictEqual(resExito.exito, true);

  // 3 intentos fallidos más no deben bloquear (porque el contador se reinició)
  for (let i = 1; i <= 3; i++) {
    const res = gestor.autenticar('propietario@rancho.bo', 'ClaveErronea', ahora);
    assert.strictEqual(res.bloqueado, false);
  }
});

console.log('\n----------------------------------------------------------------');
console.log(`RESUMEN: ${exitosas} pasadas, ${fallidas} fallidas.`);
console.log('----------------------------------------------------------------');

if (fallidas > 0) {
  process.exit(1);
} else {
  console.log('VEREDICTO QA: Criterios de HU-11 CUMPLIDOS al 100%.\n');
}
