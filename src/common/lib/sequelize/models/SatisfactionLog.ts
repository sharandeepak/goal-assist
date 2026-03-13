import { DataTypes, Model, type Optional } from "sequelize";
import { getSequelize } from "../config";

interface SatisfactionLogAttributes {
  id: string;
  workspace_id: string;
  user_id: string;
  log_date: string;
  score: number;
  notes: string | null;
  created_at: Date;
}

type SatisfactionLogCreationAttributes = Optional<
  SatisfactionLogAttributes,
  "id" | "notes" | "created_at"
>;

export class SatisfactionLog
  extends Model<SatisfactionLogAttributes, SatisfactionLogCreationAttributes>
  implements SatisfactionLogAttributes
{
  declare id: string;
  declare workspace_id: string;
  declare user_id: string;
  declare log_date: string;
  declare score: number;
  declare notes: string | null;
  declare created_at: Date;
}

export function initSatisfactionLogModel(): typeof SatisfactionLog {
  SatisfactionLog.init(
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
      log_date: {
        type: DataTypes.DATEONLY,
        allowNull: false,
      },
      score: {
        type: DataTypes.INTEGER,
        allowNull: false,
        validate: { min: 1, max: 10 },
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
      tableName: "satisfaction_logs",
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

  return SatisfactionLog;
}
