import { createFeatureSelector, createSelector } from '@ngrx/store';
import { ProjectState, projectAdapter } from './project.state';
import { ProjectCategory } from '../../models/construction.models';

export const selectProjectState = createFeatureSelector<ProjectState>('constructionProjects');

const { selectAll, selectEntities } = projectAdapter.getSelectors(selectProjectState);

export const selectAllProjects = selectAll;
export const selectProjectEntities = selectEntities;

export const selectProjectsByCategory = (category: ProjectCategory) =>
  createSelector(selectAllProjects, projects =>
    projects.filter(p => p.category === category)
  );

export const selectSelectedProjectId = createSelector(
  selectProjectState,
  state => state.selectedId
);

export const selectSelectedProject = createSelector(
  selectProjectEntities,
  selectSelectedProjectId,
  (entities, selectedId) => selectedId ? entities[selectedId] ?? null : null
);

export const selectProjectsLoading = createSelector(
  selectProjectState,
  state => state.loading
);

export const selectProjectsError = createSelector(
  selectProjectState,
  state => state.error
);
