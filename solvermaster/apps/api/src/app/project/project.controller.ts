import {
  Body,
  Controller,
  Delete,
  Get,
  NotFoundException,
  Param,
  Patch,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { ProjectService } from './project.service';
import { CreateProjectDto, UpdateProjectDto } from './project.dto';

@ApiTags('projects')
@Controller('project')
export class ProjectController {
  constructor(private readonly service: ProjectService) {}

  @Get()
  @ApiOperation({ summary: 'List all projects' })
  getAll() {
    return this.service.getAll();
  }

  @Get('search')
  @ApiOperation({ summary: 'Search projects by name' })
  async search(@Query('name') name: string) {
    const rows = await this.service.search(name ?? '');
    if (rows.length === 0) {
      throw new NotFoundException(`No projects match "${name}"`);
    }
    return rows;
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a project by id' })
  async byId(@Param('id') id: string) {
    const project = await this.service.getById(Number(id));
    if (!project) throw new NotFoundException(`Project ${id} not found`);
    return project;
  }

  @Post()
  @ApiOperation({ summary: 'Create a project' })
  create(@Body() dto: CreateProjectDto) {
    return this.service.create(dto);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Replace a project' })
  async update(@Param('id') id: string, @Body() dto: UpdateProjectDto) {
    const project = await this.service.getById(Number(id));
    if (!project) throw new NotFoundException(`Project ${id} not found`);
    return this.service.update(Number(id), dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Partially update a project' })
  async patch(@Param('id') id: string, @Body() dto: UpdateProjectDto) {
    const project = await this.service.getById(Number(id));
    if (!project) throw new NotFoundException(`Project ${id} not found`);
    return this.service.update(Number(id), dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a project' })
  async remove(@Param('id') id: string) {
    const project = await this.service.getById(Number(id));
    if (!project) throw new NotFoundException(`Project ${id} not found`);
    return this.service.delete(Number(id));
  }
}
