import { Controller, Get, Param, ParseIntPipe, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { EngineClient } from './domain/engine.client';

/** TRIZ reference data (39 parameters, 40 principles, matrix cells) proxied from the
 *  pytriz engine so the frontend has a single origin. Powers pickers + detail panels. */
@ApiTags('triz-reference')
@Controller()
export class ReferenceController {
  constructor(private readonly engine: EngineClient) {}

  @Get('parameters')
  @ApiOperation({ summary: 'List the 39 parameters, or search with ?q=' })
  parameters(@Query('q') q?: string, @Query('limit') limit?: string) {
    return q ? this.engine.searchParameters(q, Number(limit) || 5) : this.engine.listParameters();
  }

  @Get('parameters/:id')
  parameter(@Param('id', ParseIntPipe) id: number) {
    return this.engine.getParameter(id);
  }

  @Get('principles')
  @ApiOperation({ summary: 'List the 40 Inventive Principles' })
  principles() {
    return this.engine.listPrinciples();
  }

  @Get('principles/:id')
  @ApiOperation({ summary: 'Full principle text: description, rules, hints, examples' })
  principle(@Param('id', ParseIntPipe) id: number) {
    return this.engine.getPrinciple(id);
  }

  @Get('matrix/cell')
  @ApiOperation({ summary: 'Principles at a contradiction-matrix cell' })
  matrixCell(@Query('improving', ParseIntPipe) improving: number, @Query('preserving', ParseIntPipe) preserving: number) {
    return this.engine.matrixCell(improving, preserving);
  }
}
