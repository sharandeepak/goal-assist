import { DataTypes, Model, type Optional } from "sequelize";
import { getSequelize } from "../config";

interface MilestoneAttributes {
  id: string;
  user_id: string;
  company_id: string;
  employee_id: string;
  title: string;
  description: string | null;
  progress: number;
  urgency: "low" | "medium" | "high";
  status: "planned" | "active" | "completed" | "on_hold";
  start_date: Date | null;
  end_date: Date | null;
  created_at: Date;
  updated_at: Date;
}

type MilestoneCreationAttributes = Optional<
  MilestoneAttributes,
  "id" | "description" | "progress" | "start_date" | "end_date" | "created_at" | "updated_at"
>;

export class Milestone extends Model<MilestoneAttributes, MilestoneCreationAttributes> implements MilestoneAttributes {
  declare id: string;
  declare user_id: string;
  declare company_id: string;
  declare employee_id: string;
  declare title: string;
  declare description: string | null;
  declare progress: number;
  declare urgency: "low" | "medium" | "high";
  declare status: "planned" | "active" | "completed" | "on_hold";
  declare start_date: Date | null;
  declare end_date: Date | null;
  declare created_at: Date;
  declare updated_at: Date;
}

export function initMilestoneModel(): typeof Milestone {
  Milestone.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      user_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: { model: "users", key: "id" },
      },
      company_id: {
        type: DataTypes.UUID,
        allowNull: true,
        references: { model: "companies", key: "id" },
      },
      employee_id: {
        type: DataTypes.UUID,
        allowNull: true,
        references: { model: "employees", key: "id" },
      },
      title: {
        type: DataTypes.TEXT,
        allowNull: false,
      },
      description: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      progress: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
        validate: { min: 0, max: 100 },
      },
      urgency: {
        type: DataTypes.ENUM("low", "medium", "high"),
        allowNull: false,
      },
      status: {
        type: DataTypes.ENUM("planned", "active", "completed", "on_hold"),
        allowNull: false,
      },
      start_date: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      end_date: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      created_at: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
      },
      updated_at: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
      },
    },
    {
      sequelize: getSequelize(),
      tableName: "milestones",
      schema: "public",
      timestamps: false,
    }
  );

  return Milestone;
}
