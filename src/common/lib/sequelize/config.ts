import { Sequelize } from "sequelize";

let sequelizeInstance: Sequelize | null = null;

export function getSequelize(): Sequelize {
  if (!sequelizeInstance) {
    const connectionString = process.env.SUPABASE_DB_URL;

    if (!connectionString) {
      throw new Error(
        "SUPABASE_DB_URL environment variable is required for Sequelize connection."
      );
    }

    sequelizeInstance = new Sequelize(connectionString, {
      dialect: "postgres",
      logging: process.env.NODE_ENV === "development" ? console.log : false,
      pool: {
        max: 5,
        min: 0,
        acquire: 30000,
        idle: 10000,
      },
      dialectOptions: {
        ssl: {
          require: true,
          rejectUnauthorized: false,
        },
      },
    });
  }

  return sequelizeInstance;
}

export async function testConnection(): Promise<void> {
  const sequelize = getSequelize();
  await sequelize.authenticate();
}
