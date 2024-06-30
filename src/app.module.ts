import { Module } from '@nestjs/common';
import { ProductsModule } from './products/products.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [
    ConfigModule.forRoot(),
    ProductsModule,
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.DB_HOST,
      port: +process.env.DB_PORT,
      database: process.env.DB_NAME,
      username: process.env.DB_USERNAME,
      password:  process.env.DB_PASSWORD,     
      //entities: [],
      autoLoadEntities: true,
      synchronize: JSON.parse(process.env.BD_SYNCHRONIZE),
    }),
  ],
})
export class AppModule { }
