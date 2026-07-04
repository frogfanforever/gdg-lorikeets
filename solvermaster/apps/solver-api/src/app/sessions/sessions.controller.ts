import { Body, Controller, Get, HttpCode, Param, Post, Put } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { SessionsService } from './sessions.service';
import { CreateSessionDto, RecommendationDto, SetParametersDto } from './dto';

@ApiTags('sessions')
@Controller('sessions')
export class SessionsController {
  constructor(private readonly sessions: SessionsService) {}

  @Post()
  @HttpCode(201)
  @ApiOperation({ summary: 'Step 1 — start a solving session from a problem' })
  create(@Body() body: CreateSessionDto) {
    return this.sessions.create(body);
  }

  @Post(':id/analyze')
  @HttpCode(200)
  @ApiOperation({ summary: 'Step 2 — agent suggests improving/preserving parameters (confidence + alternatives)' })
  analyze(@Param('id') id: string) {
    return this.sessions.analyze(id);
  }

  @Put(':id/parameters')
  @ApiOperation({ summary: 'Step 2 — set/override the improving & preserving parameters (invalidates downstream)' })
  setParameters(@Param('id') id: string, @Body() body: SetParametersDto) {
    return this.sessions.setParameters(id, body);
  }

  @Post(':id/matrix')
  @HttpCode(200)
  @ApiOperation({ summary: 'Step 3 — look up the contradiction-matrix cell → principles found' })
  matrix(@Param('id') id: string) {
    return this.sessions.matrix(id);
  }

  @Post(':id/recommendation')
  @HttpCode(200)
  @ApiOperation({ summary: 'Step 5 — synthesize a recommendation from the selected principles (new version)' })
  recommendation(@Param('id') id: string, @Body() body: RecommendationDto) {
    return this.sessions.recommendation(id, body);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Full session state: parameters, matrix, recommendation, decision trace, metadata' })
  get(@Param('id') id: string) {
    return this.sessions.get(id);
  }

  @Get(':id/versions')
  @ApiOperation({ summary: 'Iteration history (Version A, B, …)' })
  versions(@Param('id') id: string) {
    return this.sessions.versions(id);
  }
}
