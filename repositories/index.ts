import { FirebaseTaskRepository } from "./firebase/FirebaseTaskRepository";
import { FirebaseMilestoneRepository } from "./firebase/FirebaseMilestoneRepository";
import { FirebaseSatisfactionRepository } from "./firebase/FirebaseSatisfactionRepository";
import { FirebaseStandupRepository } from "./firebase/FirebaseStandupRepository";
import { FirebaseTimeEntryRepository } from "./firebase/FirebaseTimeEntryRepository";

// Initialize repositories (Dependency Injection Root)
export const taskRepository = new FirebaseTaskRepository();
export const milestoneRepository = new FirebaseMilestoneRepository();
export const satisfactionRepository = new FirebaseSatisfactionRepository();
export const standupRepository = new FirebaseStandupRepository();
export const timeEntryRepository = new FirebaseTimeEntryRepository();
