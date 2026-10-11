import { Global, Module } from '@nestjs/common';
import { Pool } from 'pg';

/**
 * Conexion unica a PostgreSQL, compartida por toda la aplicacion.
 *
 * Usa DATABASE_URL, la misma variable que ya usan migrar.js y sembrar.js,
 * para que no haya dos formas distintas de conectarse a la misma base.
 */
export const POOL_BD = 'POOL_BD';

@Global()
@Module({
  providers: [
    {
      provide: POOL_BD,
      useFactory: () => {
        const cadena = process.env.DATABASE_URL;
        if (!cadena) {
          throw new Error(
            'Falta la variable DATABASE_URL. Copia .env.ejemplo como .env y completala.',
          );
        }
        return new Pool({ connectionString: cadena });
      },
    },
  ],
  exports: [POOL_BD],
})
export class ModuloBaseDatos {}
