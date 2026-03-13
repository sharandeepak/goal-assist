import { getSequelize, testConnection } from "./config";
import { initUserModel, User } from "./models/User";
import { initWorkspaceModel, Workspace } from "./models/Workspace";
import { initTaskModel, Task } from "./models/Task";
import { initMilestoneModel, Milestone } from "./models/Milestone";
import { initSatisfactionLogModel, SatisfactionLog } from "./models/SatisfactionLog";
import { initStandupLogModel, StandupLog } from "./models/StandupLog";
import { initTimeEntryModel, TimeEntry } from "./models/TimeEntry";

let initialized = false;

export function initModels(): void {
  if (initialized) return;

  initWorkspaceModel();
  initUserModel();
  initMilestoneModel();
  initTaskModel();
  initSatisfactionLogModel();
  initStandupLogModel();
  initTimeEntryModel();

  Workspace.hasMany(User, { foreignKey: "workspace_id" });
  User.belongsTo(Workspace, { foreignKey: "workspace_id" });

  Workspace.hasMany(Task, { foreignKey: "workspace_id" });
  Task.belongsTo(Workspace, { foreignKey: "workspace_id" });

  User.hasMany(Task, { foreignKey: "user_id" });
  Task.belongsTo(User, { foreignKey: "user_id" });

  Workspace.hasMany(Milestone, { foreignKey: "workspace_id" });
  Milestone.belongsTo(Workspace, { foreignKey: "workspace_id" });

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
  Workspace,
  User,
  Task,
  Milestone,
  SatisfactionLog,
  StandupLog,
  TimeEntry,
};
