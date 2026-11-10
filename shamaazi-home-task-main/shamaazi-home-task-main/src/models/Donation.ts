import {
  CreationOptional,
  DataTypes,
  InferAttributes,
  InferCreationAttributes,
  Model,
} from 'sequelize';
import { sequelize } from '../config/database';
import type { Product } from './Product';

export type DonationType = 'one_off' | 'recurring';
export type DonationStatus = 'scheduled' | 'processing' | 'succeeded' | 'failed';

export class Donation extends Model<InferAttributes<Donation>, InferCreationAttributes<Donation>> {
  declare id: CreationOptional<string>;
  declare donorId: string;
  declare productId: string;
  declare recurringScheduleId: string | null;
  declare donationType: DonationType;
  declare amountGbp: string;
  declare status: DonationStatus;
  declare scheduledAt: Date;
  declare processedAt: Date | null;
  declare attemptCount: CreationOptional<number>;
  declare lastError: string | null;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
  declare product?: Product;
}

Donation.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    donorId: { type: DataTypes.UUID, allowNull: false },
    productId: { type: DataTypes.UUID, allowNull: false },
    recurringScheduleId: { type: DataTypes.UUID, allowNull: true },
    donationType: {
      type: DataTypes.ENUM('one_off', 'recurring'),
      allowNull: false,
    },
    amountGbp: { type: DataTypes.DECIMAL(12, 2), allowNull: false },
    status: {
      type: DataTypes.ENUM('scheduled', 'processing', 'succeeded', 'failed'),
      allowNull: false,
    },
    scheduledAt: { type: DataTypes.DATE, allowNull: false },
    processedAt: { type: DataTypes.DATE, allowNull: true },
    attemptCount: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    lastError: { type: DataTypes.TEXT, allowNull: true },
    createdAt: DataTypes.DATE,
    updatedAt: DataTypes.DATE,
  },
  { sequelize, modelName: 'Donation', tableName: 'donations', timestamps: true },
);
