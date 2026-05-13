import { Skill } from './technician.model';

export interface JobTemplate {
  id: string;
  name: string;
  jobType: string;
  requiredSkills: Skill[];
  estimatedHours: number;
  crewSize: number;
  scopeDescription?: string;
  priority?: string;
  createdBy: string;
  createdAt: Date;
  updatedAt?: Date;
}

export interface CreateJobTemplateDto {
  name: string;
  jobType: string;
  requiredSkills: string[];
  estimatedHours: number;
  crewSize: number;
  scopeDescription?: string;
  priority?: string;
}

export interface UpdateJobTemplateDto {
  name?: string;
  jobType?: string;
  requiredSkills?: string[];
  estimatedHours?: number;
  crewSize?: number;
  scopeDescription?: string;
  priority?: string;
}
