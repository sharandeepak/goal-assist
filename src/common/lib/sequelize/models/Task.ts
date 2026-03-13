import { DataTypes, Model, type Optional } from "sequelize";
import { getSequelize } from "../config";

interface TaskAttributes {
  id: string;
  workspace_id: string;
  user_id: string;
  title: string;
  completed: boolean;
  date: Date | null;
  completed_date: Date | null;
  priority: "low" | "medium" | "high" | null;
  urgency: "low" | "medium" | "high" | null;
  tags: string[];
  milestone_id: string | null;
  created_at: Date;
  updated_at: Date;
}

type TaskCreationAttributes = Optional<
  TaskAttributes,
  "id" | "completed" | "date" | "completed_date" | "priority" | "urgency" | "tags" | "milestone_id" | "created_at" | "updated_at"
>;

export class Task extends Model<TaskAttributes, TaskCreationAttributes> implements TaskAttributes {
  declare id: string;
  declare workspace_id: string;
  declare user_id: string;
  declare title: string;
  declare completed: boolean;
  declare date: Date | null;
  declare completed_date: Date | null;
  declare priority: "low" | "medium" | "high" | null;
  declare urgency: "low" | "medium" | "high" | null;
  declare tags: string[];
  declare milestone_id: string | null;
  declare created_at: Date;
  declare updated_at: Date;
}

export function initTaskModel(): typeof Task {
  Task.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      workspace_id: {
        type: DataTypes.UUID,
        allowNull: true,
        references: { model: "workspaces", key: "id" },
      },
      user_id: {
        type: DataTypes.UUID,
        allowNull: true,
        references: { model: "users", key: "id" },
      },
      title: {
        type: DataTypes.TEXT,
        allowNull: false,
      },
      completed: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
      },
      date: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      completed_date: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      priority: {
        type: DataTypes.ENUM("low", "medium", "high"),
        allowNull: true,
      },
      urgency: {
        type: DataTypes.ENUM("low", "medium", "high"),
        allowNull: true,
      },
      tags: {
        type: DataTypes.ARRAY(DataTypes.TEXT),
        defaultValue: [],
      },
      milestone_id: {
        type: DataTypes.UUID,
        allowNull: true,
        references: { model: "milestones", key: "id" },
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
      tableName: "tasks",
      schema: "public",
      timestamps: false,
    }
  );

  return Task;
}
