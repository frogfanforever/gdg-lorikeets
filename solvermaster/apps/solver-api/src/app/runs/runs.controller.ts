import { Body, Controller, Get, HttpCode, Param, Post } from '@nestjs/common';
import { RunsService } from './runs.service';

@Controller('runs')
export class RunsController {
  constructor(private readonly runs: RunsService) {}

  /** Define a problem → a contradiction per available method. */
  @Post()
  @HttpCode(201)
  create(@Body() body: any) {
    return this.runs.create(body);
  }

  @Get(':id')
  get(@Param('id') id: string) {
    return this.runs.get(id);
  }
}
