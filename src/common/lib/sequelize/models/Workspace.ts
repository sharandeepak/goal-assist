import { DataTypes, Model, type Optional } from "sequelize";
import { getSequelize } from "../config";

interface WorkspaceAttributes {
  id: string;
  name: string;
  creator_id: string;
  created_at: Date;
  updated_at: Date;
}

type WorkspaceCreationAttributes = Optional<WorkspaceAttributes, "id" | "created_at" | "updated_at">;

export class Workspace extends Model<WorkspaceAttributes, WorkspaceCreationAttributes> implements WorkspaceAttributes {
  declare id: string;
  declare name: string;
  declare creator_id: string;
  declare created_at: Date;
  declare updated_at: Date;
}

export function initWorkspaceModel(): typeof Workspace {
  Workspace.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      name: {
        type: DataTypes.TEXT,
        allowNull: false,
      },
      creator_id: {
        type: DataTypes.UUID,
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
      tableName: "workspaces",
      schema: "public",
      timestamps: false,
    }
  );

  return Workspace;
}
