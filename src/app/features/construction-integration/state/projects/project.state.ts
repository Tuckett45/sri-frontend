import { EntityState, EntityAdapter, createEntityAdapter } from '@ngrx/entity';
import { Project } from '../../models/construction.models';

export interface ProjectState extends EntityState<Project> {
  selectedId: string | null;
  loading: boolean;
  error: string | null;
}

export const projectAdapter: EntityAdapter<Project> = createEntityAdapter<Project>({
  selectId: (project: Project) => project.id,
  sortComparer: (a: Project, b: Project) => a.name.localeCompare(b.name)
});

export const initialProjectState: ProjectState = projectAdapter.getInitialState({
  selectedId: null,
  loading: false,
  error: null
});
