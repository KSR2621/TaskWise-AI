export type Priority = "Low" | "Medium" | "High";
export type TaskCategory = "Today" | "This Week" | "Long Term";

export interface Subtask {
  id: string;
  title: string;
  completed: boolean;
}

export interface Task {
  id:string;
  title: string;
  completed: boolean;
  priority: Priority;
  category: TaskCategory;
  deadline?: string;
  subtasks: Subtask[];
  userCriteria?: string;
  suggestedSchedule?: string;
  reminderInterval?: string;
  priorityScore?: number;
  reasoning?: string;
}
