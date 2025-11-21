export interface DailyReport {
  id?: number;
  userId: string;
  userName?: string;
  userEmail?: string;
  segmentId: string;
  currentLocation: string;
  descriptionOfWork: string;
  forwardProductionCompleted: string;
  safetyConcerns: string;
  incidentDelayConcerns: string;
  additionalComments?: string;
  cmPunchListLink?: string;
  nextStepsAndFollowUp: string;
  market?: string;
  submittedDate?: Date;
  isValidated?: boolean;
  validatedBy?: string;
  validatedDate?: Date;
}

export interface DailyReportSubmissionStatus {
  hasSubmittedToday: boolean;
  lastSubmissionDate?: Date;
}

export interface UserSubmissionStatus {
  userId: string;
  userName: string;
  userEmail: string;
  hasSubmittedToday: boolean;
  lastSubmissionDate?: Date;
  market?: string;
}
