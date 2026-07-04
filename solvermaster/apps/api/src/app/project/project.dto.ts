import { ApiProperty, PartialType } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString, MinLength } from 'class-validator';

export class CreateProjectDto {
  @ApiProperty({ example: 'Website Redesign' })
  @IsString()
  @MinLength(1)
  name!: string;

  @ApiProperty({ required: false, example: 'Marketing site refresh' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ enum: ['active', 'archived'], example: 'active' })
  @IsIn(['active', 'archived'])
  status!: string;
}

export class UpdateProjectDto extends PartialType(CreateProjectDto) {}
