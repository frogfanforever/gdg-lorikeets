import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { Task } from './task.model';
import { CreateTaskDto, UpdateTaskDto } from './task.dto';

@Injectable()
export class TaskService {
  constructor(@InjectModel(Task) private readonly model: typeof Task) {}

  getAll() {
    return this.model.findAll({ order: [['id', 'ASC']] });
  }

  getById(id: number) {
    return this.model.findByPk(id);
  }

  create(dto: CreateTaskDto) {
    return this.model.create({ ...dto });
  }

  async update(id: number, dto: UpdateTaskDto) {
    await this.model.update({ ...dto }, { where: { id } });
    return this.getById(id);
  }

  delete(id: number) {
    return this.model.destroy({ where: { id } });
  }
}
