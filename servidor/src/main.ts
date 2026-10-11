import { existsSync } from 'fs';
import { join } from 'path';

// Se carga antes que nada: ModuloBaseDatos lee DATABASE_URL de process.env al
// construirse, asi que tiene que estar disponible desde el primer momento.
for (const ruta of [join(__dirname, '..', '..', '.env'), join(__dirname, '..', '.env')]) {
  if (existsSync(ruta)) process.loadEnvFile(ruta);
}

import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // El cliente de Vite corre en otro puerto (5173), asi que el navegador
  // bloquearia las llamadas sin esto.
  app.enableCors({ origin: true });

  const puerto = process.env.PUERTO_SERVIDOR ?? process.env.PORT ?? 3000;
  await app.listen(puerto);
  console.log(`Servidor escuchando en http://localhost:${puerto}`);
}
bootstrap();
