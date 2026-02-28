import { DataTypes, Model, type Optional } from "sequelize";
import { getSequelize } from "../config";

interface UserAttributes {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  created_at: Date;
  updated_at: Date;
}

type UserCreationAttributes = Optional<UserAttributes, "full_name" | "avatar_url" | "created_at" | "updated_at">;

export class User extends Model<UserAttributes, UserCreationAttributes> implements UserAttributes {
  declare id: string;
  declare email: string;
  declare full_name: string | null;
  declare avatar_url: string | null;
  declare created_at: Date;
  declare updated_at: Date;
}

export function initUserModel(): typeof User {
  User.init(
    {
      id: {
        type: DataTypes.UUID,
        primaryKey: true,
      },
      email: {
        type: DataTypes.TEXT,
        allowNull: false,
      },
      full_name: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      avatar_url: {
        type: DataTypes.TEXT,
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
      tableName: "users",
      schema: "public",
      timestamps: false,
    }
  );

  return User;
}
