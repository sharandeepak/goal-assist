import { DataTypes, Model, type Optional } from "sequelize";
import { getSequelize } from "../config";

interface StandupLogAttributes {
  id: string;
  user_id: string;
  log_date: string;
  completed_items: string[];
  blockers: string[];
  planned_items: string[];
  notes: string | null;
  created_at: Date;
}

type StandupLogCreationAttributes = Optional<
  StandupLogAttributes,
  "id" | "completed_items" | "blockers" | "planned_items" | "notes" | "created_at"
>;

export class StandupLog
  extends Model<StandupLogAttributes, StandupLogCreationAttributes>
  implements StandupLogAttributes
{
  declare id: string;
  declare user_id: string;
  declare log_date: string;
  declare completed_items: string[];
  declare blockers: string[];
  declare planned_items: string[];
  declare notes: string | null;
  declare created_at: Date;
}

export function initStandupLogModel(): typeof StandupLog {
  StandupLog.init(
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
      log_date: {
        type: DataTypes.DATEONLY,
        allowNull: false,
      },
      completed_items: {
        type: DataTypes.ARRAY(DataTypes.TEXT),
        defaultValue: [],
      },
      blockers: {
        type: DataTypes.ARRAY(DataTypes.TEXT),
        defaultValue: [],
      },
      planned_items: {
        type: DataTypes.ARRAY(DataTypes.TEXT),
        defaultValue: [],
      },
      notes: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      created_at: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
      },
    },
    {
      sequelize: getSequelize(),
      tableName: "standup_logs",
      schema: "public",
      timestamps: false,
      indexes: [
        {
          unique: true,
          fields: ["user_id", "log_date"],
        },
      ],
    }
  );

  return StandupLog;
}
