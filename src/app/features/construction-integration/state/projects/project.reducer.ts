import { createReducer, on } from '@ngrx/store';
import { ProjectState, projectAdapter, initialProjectState } from './project.state';
import * as ProjectActions from './project.actions';

export const projectReducer = createReducer(
  initialProjectState,

  // Load Projects
  on(ProjectActions.loadProjects, (state): ProjectState => ({
    ...state,
    loading: true,
    error: null
  })),
  on(ProjectActions.loadProjectsSuccess, (state, { projects }): ProjectState =>
    projectAdapter.setAll(projects, { ...state, loading: false, error: null })
  ),
  on(ProjectActions.loadProjectsFailure, (state, { error }): ProjectState => ({
    ...state,
    loading: false,
    error
  })),

  // Load Single Project
  on(ProjectActions.loadProject, (state, { id }): ProjectState => ({
    ...state,
    selectedId: id,
    loading: true,
    error: null
  })),
  on(ProjectActions.loadProjectSuccess, (state, { project }): ProjectState =>
    projectAdapter.upsertOne(project, { ...state, loading: false, error: null })
  ),
  on(ProjectActions.loadProjectFailure, (state, { error }): ProjectState => ({
    ...state,
    loading: false,
    error
  })),

  // Create Project
  on(ProjectActions.createProject, (state): ProjectState => ({
    ...state,
    loading: true,
    error: null
  })),
  on(ProjectActions.createProjectSuccess, (state, { project }): ProjectState =>
    projectAdapter.addOne(project, { ...state, loading: false, error: null })
  ),
  on(ProjectActions.createProjectFailure, (state, { error }): ProjectState => ({
    ...state,
    loading: false,
    error
  })),

  // Update Project
  on(ProjectActions.updateProject, (state): ProjectState => ({
    ...state,
    loading: true,
    error: null
  })),
  on(ProjectActions.updateProjectSuccess, (state, { project }): ProjectState =>
    projectAdapter.upsertOne(project, { ...state, loading: false, error: null })
  ),
  on(ProjectActions.updateProjectFailure, (state, { error }): ProjectState => ({
    ...state,
    loading: false,
    error
  })),

  // Selection
  on(ProjectActions.selectProject, (state, { id }): ProjectState => ({
    ...state,
    selectedId: id
  })),
  on(ProjectActions.clearProjectSelection, (state): ProjectState => ({
    ...state,
    selectedId: null
  }))
);
