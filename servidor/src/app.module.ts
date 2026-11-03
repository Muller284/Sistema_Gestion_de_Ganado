import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ModuloBaseDatos } from './comun/modulo-base-datos';
import { ModuloCorreo } from './comun/servicio-correo';
import { ModuloRancho } from './modulos/ranchos/modulo-rancho';
import { ModuloPais } from './modulos/paises/modulo-pais';
import { ModuloUsuario } from './modulos/usuarios/modulo-usuario';
import { ModuloEquipo } from './modulos/equipo/modulo-equipo';
import { ModuloGuia } from './modulos/guia/modulo-guia';
import { ModuloTipos } from './modulos/tipos/modulo-tipos';
import { ModuloAdmin } from './modulos/admin/modulo-admin';
import { ModuloImportacion } from './modulos/importacion/modulo-importacion';
import { ModuloPermisos } from './modulos/permisos/modulo-permisos';
import { ModuloCorrales } from './modulos/corrales/modulo-corrales';
import { ModuloAnimales } from './modulos/animales/modulo-animales';
import { ModuloAccionesMasivas } from './modulos/masivo/modulo-acciones-masivas';
import { ModuloExportacion } from './modulos/exportacion/modulo-exportacion';

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
    ModuloCorreo,
    ModuloRancho,
    ModuloPais,
    ModuloUsuario,
    ModuloEquipo, // HU-17
    ModuloGuia, // HU-16
    ModuloTipos, // HU-20
    ModuloAdmin, // HU-24
    ModuloImportacion, // HU-40 a HU-45 (Romina)
    ModuloPermisos, // HU-21 y HU-22
    ModuloCorrales, // HU-36
    ModuloAnimales, // HU-28, HU-33, HU-34 y HU-39
    ModuloAccionesMasivas, // HU-31
    ModuloExportacion, // HU-45
  ],
})
export class AppModule {}
