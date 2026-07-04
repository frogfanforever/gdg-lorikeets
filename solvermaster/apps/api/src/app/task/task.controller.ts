import {
  Body,
  Controller,
  Delete,
  Get,
  NotFoundException,
  Param,
  Post,
  Put,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { TaskService } from './task.service';
import { CreateTaskDto, UpdateTaskDto } from './task.dto';

@ApiTags('tasks')
@Controller('task')
export class TaskController {
  constructor(private readonly service: TaskService) {}

  @Get()
  @ApiOperation({ summary: 'List all tasks' })
  getAll() {
    return this.service.getAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a task by id' })
  async byId(@Param('id') id: string) {
    const task = await this.service.getById(Number(id));
    if (!task) throw new NotFoundException(`Task ${id} not found`);
    return task;
  }

  @Post()
  @ApiOperation({ summary: 'Create a task' })
  create(@Body() dto: CreateTaskDto) {
    return this.service.create(dto);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Replace a task' })
  async update(@Param('id') id: string, @Body() dto: UpdateTaskDto) {
    const task = await this.service.getById(Number(id));
    if (!task) throw new NotFoundException(`Task ${id} not found`);
    return this.service.update(Number(id), dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a task' })
  async remove(@Param('id') id: string) {
    const task = await this.service.getById(Number(id));
    if (!task) throw new NotFoundException(`Task ${id} not found`);
    return this.service.delete(Number(id));
  }
}
