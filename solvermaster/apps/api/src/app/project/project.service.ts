import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { Op } from 'sequelize';
import { Project } from './project.model';
import { CreateProjectDto, UpdateProjectDto } from './project.dto';

@Injectable()
export class ProjectService {
  constructor(@InjectModel(Project) private readonly model: typeof Project) {}

  getAll() {
    return this.model.findAll({ order: [['id', 'ASC']] });
  }

  getById(id: number) {
    return this.model.findByPk(id);
  }

  search(name: string) {
    return this.model.findAll({
      where: { name: { [Op.iLike]: `%${name}%` } },
      order: [['id', 'ASC']],
    });
  }

  create(dto: CreateProjectDto) {
    return this.model.create({ ...dto });
  }

  async update(id: number, dto: UpdateProjectDto) {
    await this.model.update({ ...dto }, { where: { id } });
    return this.getById(id);
  }

  delete(id: number) {
    return this.model.destroy({ where: { id } });
  }
}
