import {
  BelongsTo,
  Column,
  DataType,
  ForeignKey,
  Model,
  Table,
} from 'sequelize-typescript';
import { Project } from '../project/project.model';

@Table({ tableName: 'tasks', timestamps: false })
export class Task extends Model {
  @ForeignKey(() => Project)
  @Column({ type: DataType.INTEGER, allowNull: false, field: 'project_id' })
  declare projectId: number;

  @Column({ type: DataType.STRING, allowNull: false })
  declare title: string;

  @Column({ type: DataType.BOOLEAN, allowNull: false, defaultValue: false })
  declare done: boolean;

  @Column({ type: DataType.INTEGER, allowNull: false, defaultValue: 3 })
  declare priority: number;

  @BelongsTo(() => Project)
  declare project?: Project;
}
