import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ModuloBaseDatos } from './comun/modulo-base-datos';
import { ModuloRancho } from './modulos/ranchos/modulo-rancho';
import { ModuloPais } from './modulos/paises/modulo-pais';

@Module({
  imports: [
    // El .env vive en la raiz del proyecto, no en servidor/. Sin envFilePath
    // el servidor no encontraba DATABASE_URL al arrancar fuera de Docker.
    ConfigModule.forRoot({ isGlobal: true, envFilePath: ['../.env', '.env'] }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres' as const,
        // Antes leia DB_HOST, DB_PORT, DB_USERNAME, DB_PASSWORD y DB_DATABASE,
        // que no existen en .env.ejemplo: el servidor nunca lograba conectarse.
        // Ahora usa DATABASE_URL, la misma variable que migrar.js y sembrar.js.
        url: configService.get<string>('DATABASE_URL'),
        autoLoadEntities: true,
        synchronize: false, // <-- SIEMPRE EN FALSE (evita sobrescribir la migración)
      }),
    }),
    ModuloBaseDatos,
    ModuloRancho,
    ModuloPais,
  ],
})
export class AppModule {}
