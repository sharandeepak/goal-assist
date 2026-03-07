import { DataTypes, Model, type Optional } from "sequelize";
import { getSequelize } from "../config";

interface CompanyAttributes {
  id: string;
  name: string;
  creator_id: string;
  created_at: Date;
  updated_at: Date;
}

type CompanyCreationAttributes = Optional<CompanyAttributes, "id" | "created_at" | "updated_at">;

export class Company extends Model<CompanyAttributes, CompanyCreationAttributes> implements CompanyAttributes {
  declare id: string;
  declare name: string;
  declare creator_id: string;
  declare created_at: Date;
  declare updated_at: Date;
}

export function initCompanyModel(): typeof Company {
  Company.init(
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
        references: { model: "users", key: "id" },
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
      tableName: "companies",
      schema: "public",
      timestamps: false,
    }
  );

  return Company;
}
