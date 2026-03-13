import { DataTypes, Model, type Optional } from "sequelize";
import { getSequelize } from "../config";

interface UserAttributes {
  id: string;
  workspace_id: string;
  auth_id: string | null;
  first_name: string;
  last_name: string | null;
  email: string;
  role: "admin" | "member" | "manager";
  status: "invited" | "active";
  created_at: Date;
  updated_at: Date;
}

type UserCreationAttributes = Optional<
  UserAttributes,
  "id" | "auth_id" | "last_name" | "role" | "status" | "created_at" | "updated_at"
>;

export class User extends Model<UserAttributes, UserCreationAttributes> implements UserAttributes {
  declare id: string;
  declare workspace_id: string;
  declare auth_id: string | null;
  declare first_name: string;
  declare last_name: string | null;
  declare email: string;
  declare role: "admin" | "member" | "manager";
  declare status: "invited" | "active";
  declare created_at: Date;
  declare updated_at: Date;
}

export function initUserModel(): typeof User {
  User.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      workspace_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: { model: "workspaces", key: "id" },
      },
      auth_id: {
        type: DataTypes.UUID,
        allowNull: true,
      },
      first_name: {
        type: DataTypes.TEXT,
        allowNull: false,
      },
      last_name: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      email: {
        type: DataTypes.TEXT,
        allowNull: false,
      },
      role: {
        type: DataTypes.ENUM("admin", "member", "manager"),
        allowNull: false,
        defaultValue: "member",
      },
      status: {
        type: DataTypes.ENUM("invited", "active"),
        allowNull: false,
        defaultValue: "invited",
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
      tableName: "users",
      schema: "public",
      timestamps: false,
    }
  );

  return User;
}
