import {
  CreationOptional,
  DataTypes,
  InferAttributes,
  InferCreationAttributes,
  Model,
} from 'sequelize';
import { sequelize } from '../config/database';

export type RecurringFrequency = 'weekly' | 'monthly';

export class RecurringSchedule extends Model<
  InferAttributes<RecurringSchedule>,
  InferCreationAttributes<RecurringSchedule>
> {
  declare id: CreationOptional<string>;
  declare donorId: string;
  declare productId: string;
  declare amountGbp: string;
  declare frequency: RecurringFrequency;
  /** 0–6 (Sunday–Saturday), required when frequency is weekly */
  declare dayOfWeek: number | null;
  /** 1–28, required when frequency is monthly */
  declare dayOfMonth: number | null;
  declare isActive: CreationOptional<boolean>;
  declare nextScheduledAt: Date;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
}

RecurringSchedule.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    donorId: { type: DataTypes.UUID, allowNull: false },
    productId: { type: DataTypes.UUID, allowNull: false },
    amountGbp: { type: DataTypes.DECIMAL(12, 2), allowNull: false },
    frequency: {
      type: DataTypes.ENUM('weekly', 'monthly'),
      allowNull: false,
    },
    dayOfWeek: { type: DataTypes.SMALLINT, allowNull: true },
    dayOfMonth: { type: DataTypes.SMALLINT, allowNull: true },
    isActive: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    nextScheduledAt: { type: DataTypes.DATE, allowNull: false },
    createdAt: DataTypes.DATE,
    updatedAt: DataTypes.DATE,
  },
  { sequelize, modelName: 'RecurringSchedule', tableName: 'recurring_schedules', timestamps: true },
);
