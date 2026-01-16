import { apiClient } from './client';
import { Task, CreateTaskDto, UpdateTaskDto, TasksResponse } from '../types/task.types';

export const tasksApi = {
  getByProject: async (projectId: string, status?: string): Promise<Task[]> => {
    const params = status ? { status } : {};
    const { data } = await apiClient.get<TasksResponse>(`/tasks/${projectId}`, { params });
    return data.tasks;
  },

  create: async (task: CreateTaskDto): Promise<Task> => {
    const { data } = await apiClient.post('/tasks', task);
    return data.task;
  },

  update: async (taskId: string, updates: UpdateTaskDto): Promise<Task> => {
    const { data } = await apiClient.patch(`/tasks/${taskId}`, updates);
    return data.task;
  },

  delete: async (taskId: string): Promise<void> => {
    await apiClient.delete(`/tasks/${taskId}`);
  },
};