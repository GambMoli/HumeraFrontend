export type TaskStatus = 'todo' | 'in_progress' | 'done';

export interface Task {
  id: string;
  title: string;
  description?: string;
  status: TaskStatus;
  project_id: string;
  assignee: string;
  created_at: string;
  updated_at: string;
}

export interface CreateTaskDto {
  project_id: string;
  title: string;
  description?: string;
  assignee: string;
}

export interface UpdateTaskDto {
  status: TaskStatus;
}

export interface TasksResponse {
  tasks: Task[];
}