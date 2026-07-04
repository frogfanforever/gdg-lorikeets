import { Body, Controller, Get, HttpCode, Param, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { RunsService } from './runs.service';
import { CreateRunDto } from './dto';

@ApiTags('runs')
@Controller('runs')
export class RunsController {
  constructor(private readonly runs: RunsService) {}

  @Post()
  @HttpCode(201)
  @ApiOperation({ summary: 'Define a problem → a contradiction per available method (TRIZ via pytriz)' })
  create(@Body() body: CreateRunDto) {
    return this.runs.create(body);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Fetch a run: problem, contradictions, and recorded step metadata' })
  get(@Param('id') id: string) {
    return this.runs.get(id);
  }
}
