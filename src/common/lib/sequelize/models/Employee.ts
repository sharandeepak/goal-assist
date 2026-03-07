import { DataTypes, Model, type Optional } from "sequelize";
import { getSequelize } from "../config";

interface EmployeeAttributes {
  id: string;
  company_id: string;
  user_id: string | null;
  first_name: string;
  last_name: string | null;
  email: string;
  role: "admin" | "member" | "manager";
  status: "invited" | "active";
  created_at: Date;
  updated_at: Date;
}

type EmployeeCreationAttributes = Optional<
  EmployeeAttributes,
  "id" | "user_id" | "last_name" | "role" | "status" | "created_at" | "updated_at"
>;

export class Employee extends Model<EmployeeAttributes, EmployeeCreationAttributes> implements EmployeeAttributes {
  declare id: string;
  declare company_id: string;
  declare user_id: string | null;
  declare first_name: string;
  declare last_name: string | null;
  declare email: string;
  declare role: "admin" | "member" | "manager";
  declare status: "invited" | "active";
  declare created_at: Date;
  declare updated_at: Date;
}

export function initEmployeeModel(): typeof Employee {
  Employee.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      company_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: { model: "companies", key: "id" },
      },
      user_id: {
        type: DataTypes.UUID,
        allowNull: true,
        references: { model: "users", key: "id" },
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
      tableName: "employees",
      schema: "public",
      timestamps: false,
    }
  );

  return Employee;
}
