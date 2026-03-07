import { getSequelize, testConnection } from "./config";
import { initUserModel, User } from "./models/User";
import { initCompanyModel, Company } from "./models/Company";
import { initEmployeeModel, Employee } from "./models/Employee";
import { initTaskModel, Task } from "./models/Task";
import { initMilestoneModel, Milestone } from "./models/Milestone";
import { initSatisfactionLogModel, SatisfactionLog } from "./models/SatisfactionLog";
import { initStandupLogModel, StandupLog } from "./models/StandupLog";
import { initTimeEntryModel, TimeEntry } from "./models/TimeEntry";

let initialized = false;

export function initModels(): void {
  if (initialized) return;

  initUserModel();
  initCompanyModel();
  initEmployeeModel();
  initMilestoneModel();
  initTaskModel();
  initSatisfactionLogModel();
  initStandupLogModel();
  initTimeEntryModel();

  User.hasMany(Company, { foreignKey: "creator_id" });
  Company.belongsTo(User, { foreignKey: "creator_id" });

  Company.hasMany(Employee, { foreignKey: "company_id" });
  Employee.belongsTo(Company, { foreignKey: "company_id" });

  User.hasMany(Employee, { foreignKey: "user_id" });
  Employee.belongsTo(User, { foreignKey: "user_id" });

  User.hasMany(Task, { foreignKey: "user_id" });
  Task.belongsTo(User, { foreignKey: "user_id" });

  Company.hasMany(Task, { foreignKey: "company_id" });
  Task.belongsTo(Company, { foreignKey: "company_id" });

  Employee.hasMany(Task, { foreignKey: "employee_id" });
  Task.belongsTo(Employee, { foreignKey: "employee_id" });

  User.hasMany(Milestone, { foreignKey: "user_id" });
  Milestone.belongsTo(User, { foreignKey: "user_id" });

  Company.hasMany(Milestone, { foreignKey: "company_id" });
  Milestone.belongsTo(Company, { foreignKey: "company_id" });

  Employee.hasMany(Milestone, { foreignKey: "employee_id" });
  Milestone.belongsTo(Employee, { foreignKey: "employee_id" });

  Milestone.hasMany(Task, { foreignKey: "milestone_id" });
  Task.belongsTo(Milestone, { foreignKey: "milestone_id" });

  User.hasMany(SatisfactionLog, { foreignKey: "user_id" });
  SatisfactionLog.belongsTo(User, { foreignKey: "user_id" });

  User.hasMany(StandupLog, { foreignKey: "user_id" });
  StandupLog.belongsTo(User, { foreignKey: "user_id" });

  User.hasMany(TimeEntry, { foreignKey: "user_id" });
  TimeEntry.belongsTo(User, { foreignKey: "user_id" });

  Task.hasMany(TimeEntry, { foreignKey: "task_id" });
  TimeEntry.belongsTo(Task, { foreignKey: "task_id" });

  initialized = true;
}

export {
  getSequelize,
  testConnection,
  User,
  Company,
  Employee,
  Task,
  Milestone,
  SatisfactionLog,
  StandupLog,
  TimeEntry,
};
