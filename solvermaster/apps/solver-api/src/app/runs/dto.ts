import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ProblemDto {
  @ApiProperty({ example: 'Reducing e-waste' })
  title!: string;

  @ApiProperty({
    example:
      'Increase safe material recovery from discarded electronics while keeping devices compact and cheap to produce.',
  })
  statement!: string;

  @ApiPropertyOptional({ example: 'SDG 12' })
  sdg?: string;
}

export class CreateRunDto {
  @ApiProperty({ type: ProblemDto })
  problem!: ProblemDto;

  @ApiPropertyOptional({
    type: [String],
    example: ['triz', 'scamper'],
    description: "Defaults to all available methods. 'triz' is mandatory.",
  })
  methods?: string[];
}
