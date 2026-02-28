import { getSequelize, testConnection } from "./config";
import { initUserModel, User } from "./models/User";
import { initTaskModel, Task } from "./models/Task";
import { initMilestoneModel, Milestone } from "./models/Milestone";
import { initSatisfactionLogModel, SatisfactionLog } from "./models/SatisfactionLog";
import { initStandupLogModel, StandupLog } from "./models/StandupLog";
import { initTimeEntryModel, TimeEntry } from "./models/TimeEntry";

let initialized = false;

export function initModels(): void {
  if (initialized) return;

  initUserModel();
  initMilestoneModel();
  initTaskModel();
  initSatisfactionLogModel();
  initStandupLogModel();
  initTimeEntryModel();

  User.hasMany(Task, { foreignKey: "user_id" });
  Task.belongsTo(User, { foreignKey: "user_id" });

  User.hasMany(Milestone, { foreignKey: "user_id" });
  Milestone.belongsTo(User, { foreignKey: "user_id" });

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
  Task,
  Milestone,
  SatisfactionLog,
  StandupLog,
  TimeEntry,
};
