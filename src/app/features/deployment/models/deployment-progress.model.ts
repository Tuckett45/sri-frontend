export interface SiteSurveyProgressEntry {
  id: string;
  title: string;
  status: 'yes' | 'no' | null;
  notes: string | null;
}

export interface SiteSurveyProgress {
  responses: SiteSurveyProgressEntry[];
}

export interface SiteSurveySubmission extends SiteSurveyProgress {
  phase: 'SiteSurvey';
  submittedAt: string;
}

export interface StartDeploymentProgressPayload {
  projectId: string | null;
  activePhaseIndex: number;
  activeTaskTabIndex: number;
  siteSurvey: SiteSurveyProgress;
  phaseTasks: Record<string, Record<string, boolean>>;
  submittedSiteSurvey?: SiteSurveySubmission;
}
