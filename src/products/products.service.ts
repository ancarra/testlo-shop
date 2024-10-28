import { BadRequestException, ConsoleLogger, Injectable, InternalServerErrorException, Logger, NotFoundException } from '@nestjs/common';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { privateDecrypt } from 'crypto';
import { DataSource, Repository } from 'typeorm';
import { Product, ProductImage } from './entities';
import { PaginationDto } from '../common/pagination.dto';
import { isUUID } from 'class-validator';
import { transcode } from 'buffer';
import { query } from 'express';

@Injectable()
export class ProductsService {

  private readonly logger = new Logger('ProductsService');
  constructor(
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
    @InjectRepository(ProductImage)
    private readonly productImagesRepository: Repository<ProductImage>,
    private readonly dataSource: DataSource,
  ) { }

  async create(createProductDto: CreateProductDto) {

    try {
      const { images = [], ...productDetails } = createProductDto;
      const product = this.productRepository.create(
        {
          ...productDetails,
          images: images.map(image => this.productImagesRepository.create({ url: image }))
        }
      );
      await this.productRepository.save(product);

      return { ...product, images };

    } catch (error) {
      this.handlerDBExeptions(error);

    }
  }

  async findAll(paginationDto: PaginationDto) {
    const { limit = 10, offset = 0 } = paginationDto;
    console.log(paginationDto);
    const products = await this.productRepository.find({
      take: limit,
      skip: offset,
      relations: {
        images: true,
      }
    })

    return products.map(product => ({
      ...product,
      images: product.images.map(img => img.url)
    }))

    // return products.map(({images, ...rest}) => ({
    //   ...rest,
    //   images: images.map(img => img.url)
    // }))
  };

  async findOne(term: string) {
    let product: Product;

    if (isUUID(term)) {
      product = await this.productRepository.findOneBy({ id: term });
    } else {
      const queryBuilder = this.productRepository.createQueryBuilder('prod');
      product = await queryBuilder
        .where('UPPER(title) =:title or slug =:slug',
          {
            title: term.toLocaleUpperCase(),
            slug: term.toLocaleLowerCase(),
          })
        .leftJoinAndSelect('prod.images', 'prodImages')
        .getOne();
    }
    if (!product)
      throw new NotFoundException(`Product with ${term} not found`);
    return product;
  }

  async findOnePlain(term: string) {
    const { images = [], ...restOfProduct } = await this.findOne(term);
    return {
      ...restOfProduct,
      images: images.map(img => img.url)
    }
  }

  async update(id: string, updateProductDto: UpdateProductDto) {

    const { images, ...toUpdate } = updateProductDto;

    const product = await this.productRepository.preload({ id, ...toUpdate });
    if (!product) throw new NotFoundException(`Product with id: ${id} not found`);

    //Create query runner
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      if (images) {
        await queryRunner.manager.delete(ProductImage, { product: { id } })
        product.images = images.map(
          image => this.productImagesRepository.create({ url: image })
        )
      } else {

        product.images = await this.productImagesRepository.findBy({ product: { id } });
      }
      await queryRunner.manager.save(product);
      //await this.productRepository.save(product);

      await queryRunner.commitTransaction();
      await queryRunner.release();

      return product;//this.findOnePlain(id);

    } catch (error) {

      await queryRunner.rollbackTransaction();
      await queryRunner.release();

      this.handlerDBExeptions(error);
    }
  }

  async remove(id: string) {
    const product = await this.findOne(id);
    await this.productRepository.remove(product);
    return `This action removes a #${id} product`;
  }

  async deleteAllProducts() {
    const query = this.productRepository.createQueryBuilder('product');

    try {
      return await query
        .delete()
        .where({})
        .execute()

    } catch (error) {
      this.handlerDBExeptions(error);
    }
  }

  private handlerDBExeptions(error: any) {
    if (error.code == '23505') {
      throw new BadRequestException(error.detail);
    }
    this.logger.error(error);
    throw new InternalServerErrorException('Unexpected error !');
  }
  
}
