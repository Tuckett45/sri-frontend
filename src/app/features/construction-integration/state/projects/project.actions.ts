import { createAction, props } from '@ngrx/store';
import { Project } from '../../models/construction.models';

// Load Projects
export const loadProjects = createAction('[Construction/Projects] Load Projects');
export const loadProjectsSuccess = createAction(
  '[Construction/Projects] Load Projects Success',
  props<{ projects: Project[] }>()
);
export const loadProjectsFailure = createAction(
  '[Construction/Projects] Load Projects Failure',
  props<{ error: string }>()
);

// Load Single Project
export const loadProject = createAction(
  '[Construction/Projects] Load Project',
  props<{ id: string }>()
);
export const loadProjectSuccess = createAction(
  '[Construction/Projects] Load Project Success',
  props<{ project: Project }>()
);
export const loadProjectFailure = createAction(
  '[Construction/Projects] Load Project Failure',
  props<{ error: string }>()
);

// Create Project
export const createProject = createAction(
  '[Construction/Projects] Create Project',
  props<{ project: Partial<Project> }>()
);
export const createProjectSuccess = createAction(
  '[Construction/Projects] Create Project Success',
  props<{ project: Project }>()
);
export const createProjectFailure = createAction(
  '[Construction/Projects] Create Project Failure',
  props<{ error: string }>()
);

// Update Project
export const updateProject = createAction(
  '[Construction/Projects] Update Project',
  props<{ id: string; project: Partial<Project> }>()
);
export const updateProjectSuccess = createAction(
  '[Construction/Projects] Update Project Success',
  props<{ project: Project }>()
);
export const updateProjectFailure = createAction(
  '[Construction/Projects] Update Project Failure',
  props<{ error: string }>()
);

// Selection
export const selectProject = createAction(
  '[Construction/Projects] Select Project',
  props<{ id: string }>()
);
export const clearProjectSelection = createAction(
  '[Construction/Projects] Clear Selection'
);
