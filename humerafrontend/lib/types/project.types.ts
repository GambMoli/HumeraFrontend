export interface Project {
  id: string;
  name: string;
  user_id: string;
  created_at: string;
  updated_at: string;
}

export interface CreateProjectDto {
  name: string;
}

export interface ProjectsResponse {
  projects: Project[];
}