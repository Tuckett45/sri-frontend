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

export interface PhaseFollowUpProgressEntry {
  id: string;
  prompt: string;
  response: string | null;
}

export interface PhaseQuestionProgressEntry {
  id: string;
  title: string;
  controlType: 'radio' | 'checkbox' | 'text';
  status?: 'yes' | 'no' | null;
  checked?: boolean;
  notes?: string | null;
  textResponse?: string | null;
  followUps: PhaseFollowUpProgressEntry[];
}

export interface PhaseQuestionProgress {
  responses: PhaseQuestionProgressEntry[];
}

export interface StartDeploymentProgressPayload {
  projectId: string | null;                                 
  activePhaseIndex: number;
  activeTaskTabIndex: number;
  siteSurvey: SiteSurveyProgress;                         
  phaseTasks: Record<string, Record<string, boolean>>;     
  receiving: PhaseQuestionProgress | null;                 
  submittedSiteSurvey: SiteSurveySubmission | null;   
}

