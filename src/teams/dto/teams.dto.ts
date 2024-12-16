/* eslint-disable prettier/prettier */


import { Types } from 'mongoose';
import { IsNotEmpty, IsString, IsArray, IsOptional, IsMongoId } from 'class-validator';

export class CreateTeamDto {
    @IsNotEmpty()
    @IsString()
    readonly name: string;

    @IsOptional()
    @IsString()
    readonly description?: string;

    @IsArray()
    @IsMongoId({ each: true })
    readonly members: Types.ObjectId[];

    @IsOptional()
    @IsArray()
    @IsMongoId({ each: true })
    readonly leader?: Types.ObjectId[];

    @IsOptional()
    @IsString()
    readonly privacy?: string; // Could be 'public', 'private', etc.
}