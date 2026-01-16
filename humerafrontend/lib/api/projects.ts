import { apiClient } from './client';
import { Project, CreateProjectDto, ProjectsResponse } from '../types/project.types';

export const projectsApi = {
  getAll: async (): Promise<Project[]> => {
    const { data } = await apiClient.get<ProjectsResponse>('/projects');
    return data.projects;
  },

  getById: async (id: string): Promise<Project> => {
    const { data } = await apiClient.get(`/projects/${id}`);
    return data;
  },

  create: async (project: CreateProjectDto): Promise<Project> => {
    const { data } = await apiClient.post('/projects/create', project);
    return data.project;
  },
};