import { Column, DataType, HasMany, Model, Table } from 'sequelize-typescript';
import { Task } from '../task/task.model';

@Table({ tableName: 'projects', timestamps: false })
export class Project extends Model {
  @Column({ type: DataType.STRING, allowNull: false })
  declare name: string;

  @Column({ type: DataType.STRING, allowNull: true })
  declare description: string | null;

  @Column({ type: DataType.STRING, allowNull: false, defaultValue: 'active' })
  declare status: string;

  @HasMany(() => Task)
  declare tasks?: Task[];
}
