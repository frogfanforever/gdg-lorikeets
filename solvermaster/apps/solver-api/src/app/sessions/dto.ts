import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

class ProblemDto {
  @ApiPropertyOptional({ example: 'Bicycle frame' }) title?: string;
  @ApiProperty({ example: 'Frame must be lighter but thinner walls lose strength under load.' })
  statement!: string;
  @ApiPropertyOptional({ example: 'SDG 12' }) sdg?: string;
}

export class CreateSessionDto {
  @ApiProperty({ type: ProblemDto }) problem!: ProblemDto;
}

export class SetParametersDto {
  @ApiProperty({ example: 14, description: 'Altshuller parameter id to improve' }) improving!: number;
  @ApiProperty({ example: 1, description: 'Altshuller parameter id to preserve' }) preserving!: number;
}

export class RecommendationDto {
  @ApiProperty({ type: [Number], example: [1, 40], description: 'Inventive Principle ids to apply' })
  selected_principle_ids!: number[];
}
