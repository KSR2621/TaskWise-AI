export type Priority = "Low" | "Medium" | "High";

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
  deadline?: string;
  subtasks: Subtask[];
  userCriteria?: string;
  suggestedSchedule?: string;
  reminderInterval?: string;
  priorityScore?: number;
  reasoning?: string;
}
