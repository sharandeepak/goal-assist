import { DataTypes, Model, type Optional } from "sequelize";
import { getSequelize } from "../config";

interface TimeEntryAttributes {
  id: string;
  workspace_id: string;
  user_id: string;
  task_id: string | null;
  task_title_snapshot: string;
  emoji: string | null;
  milestone_id_snapshot: string | null;
  tags_snapshot: string[];
  note: string | null;
  source: "manual" | "timer";
  started_at: Date | null;
  ended_at: Date | null;
  duration_sec: number;
  day: string;
  created_at: Date;
  updated_at: Date;
}

type TimeEntryCreationAttributes = Optional<
  TimeEntryAttributes,
  | "id"
  | "task_id"
  | "emoji"
  | "milestone_id_snapshot"
  | "tags_snapshot"
  | "note"
  | "started_at"
  | "ended_at"
  | "duration_sec"
  | "created_at"
  | "updated_at"
>;

export class TimeEntry
  extends Model<TimeEntryAttributes, TimeEntryCreationAttributes>
  implements TimeEntryAttributes
{
  declare id: string;
  declare workspace_id: string;
  declare user_id: string;
  declare task_id: string | null;
  declare task_title_snapshot: string;
  declare emoji: string | null;
  declare milestone_id_snapshot: string | null;
  declare tags_snapshot: string[];
  declare note: string | null;
  declare source: "manual" | "timer";
  declare started_at: Date | null;
  declare ended_at: Date | null;
  declare duration_sec: number;
  declare day: string;
  declare created_at: Date;
  declare updated_at: Date;
}

export function initTimeEntryModel(): typeof TimeEntry {
  TimeEntry.init(
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
      task_id: {
        type: DataTypes.UUID,
        allowNull: true,
        references: { model: "tasks", key: "id" },
      },
      task_title_snapshot: {
        type: DataTypes.TEXT,
        allowNull: false,
      },
      emoji: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      milestone_id_snapshot: {
        type: DataTypes.UUID,
        allowNull: true,
      },
      tags_snapshot: {
        type: DataTypes.ARRAY(DataTypes.TEXT),
        defaultValue: [],
      },
      note: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      source: {
        type: DataTypes.ENUM("manual", "timer"),
        allowNull: false,
      },
      started_at: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      ended_at: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      duration_sec: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
      },
      day: {
        type: DataTypes.DATEONLY,
        allowNull: false,
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
      tableName: "time_entries",
      schema: "public",
      timestamps: false,
    }
  );

  return TimeEntry;
}
