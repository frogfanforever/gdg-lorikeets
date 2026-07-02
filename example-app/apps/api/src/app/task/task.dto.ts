import { ApiProperty, PartialType } from '@nestjs/swagger';
import { IsBoolean, IsInt, IsOptional, IsString, Max, Min, MinLength } from 'class-validator';

export class CreateTaskDto {
  @ApiProperty({ example: 1 })
  @IsInt()
  projectId!: number;

  @ApiProperty({ example: 'Design homepage' })
  @IsString()
  @MinLength(1)
  title!: string;

  @ApiProperty({ required: false, example: false })
  @IsOptional()
  @IsBoolean()
  done?: boolean;

  @ApiProperty({ example: 3, minimum: 1, maximum: 5 })
  @IsInt()
  @Min(1)
  @Max(5)
  priority!: number;
}

export class UpdateTaskDto extends PartialType(CreateTaskDto) {}
