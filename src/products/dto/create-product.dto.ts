import {
    IsArray,
    IsIn,
    IsNumber,
    IsOptional,
    IsPositive,
    IsString,
    MinLength
} from "class-validator";

export class CreateProductDto {

    @IsString()
    @MinLength(1)
    title: string;

    @IsNumber()
    @IsPositive()
    @IsOptional()
    price?: number;

    @IsString()
    @IsOptional()
    description?: string;

    @IsString()
    @IsOptional()
    slug?: string;

    @IsNumber()
    @IsPositive()
    @IsOptional()
    stock?: number;

    @IsArray()
    @IsString({ each: true })
    sizes: string[];

    @IsIn(['men', 'woman', 'kid', 'unisex'])
    gender: string;
}
