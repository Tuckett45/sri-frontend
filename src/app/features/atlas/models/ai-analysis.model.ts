/**
 * AI Analysis models for ATLAS deployment analysis
 * These models support AI-powered deployment readiness assessment, risk analysis,
 * and recommendation generation
 * 
 * Requirements: 1.5
 */

/**
 * Deployment readiness status
 * Indicates the overall readiness level for deployment
 */
export enum ReadinessStatus {
  /** Deployment is not ready to proceed */
  NotReady = 'NotReady',
  
  /** Deployment is partially ready with some concerns */
  PartiallyReady = 'PartiallyReady',
  
  /** Deployment is ready to proceed */
  Ready = 'Ready',
  
  /** Deployment is ready but has minor concerns */
  ReadyWithConcerns = 'ReadyWithConcerns',
  
  /** Readiness status cannot be determined */
  Unknown = 'Unknown'
}

/**
 * Finding category classification
 * Categorizes analysis findings by domain
 */
export enum FindingCategory {
  /** Evidence-related findings */
  Evidence = 'Evidence',
  
  /** Compliance-related findings */
  Compliance = 'Compliance',
  
  /** Risk-related findings */
  Risk = 'Risk',
  
  /** Quality-related findings */
  Quality = 'Quality',
  
  /** Process-related findings */
  Process = 'Process',
  
  /** Technical findings */
  Technical = 'Technical',
  
  /** Documentation findings */
  Documentation = 'Documentation',
  
  /** Approval-related findings */
  Approval = 'Approval',
  
  /** Other uncategorized findings */
  Other = 'Other'
}

/**
 * Finding severity level
 * Indicates the importance and urgency of a finding
 */
export enum FindingSeverity {
  /** Informational finding */
  Info = 'Info',
  
  /** Low severity finding */
  Low = 'Low',
  
  /** Medium severity finding */
  Medium = 'Medium',
  
  /** High severity finding */
  High = 'High',
  
  /** Critical severity finding requiring immediate attention */
  Critical = 'Critical'
}

/**
 * Readiness assessment result
 * Provides overall deployment readiness evaluation
 */
export interface ReadinessAssessment {
  /** Overall readiness status */
  status: ReadinessStatus;
  
  /** Numeric readiness score (0-100) */
  score: number;
  
  /** Summary of readiness assessment */
  summary?: string;
  
  /** Key factors contributing to readiness */
  keyFactors?: string[];
  
  /** Critical issues blocking deployment */
  criticalBlockers?: string[];
  
  /** Areas requiring improvement */
  improvementAreas?: string[];
}

/**
 * Analysis finding
 * Represents a specific issue or observation identified during analysis
 */
export interface AnalysisFinding {
  /** Unique finding identifier */
  id?: string;
  
  /** Finding title */
  title?: string;
  
  /** Detailed description of the finding */
  description?: string;
  
  /** Finding category */
  category: FindingCategory;
  
  /** Finding severity level */
  severity: FindingSeverity;
  
  /** AI confidence in this finding (0-1) */
  confidence: number;
  
  /** Evidence supporting this finding */
  supportingEvidence?: string[];
  
  /** Potential impact if not addressed */
  potentialImpact?: string;
}

/**
 * Recommendation
 * Actionable suggestion for improving deployment
 */
export interface Recommendation {
  /** Unique recommendation identifier */
  id?: string;
  
  /** Recommendation title */
  title?: string;
  
  /** Detailed description */
  description?: string;
  
  /** Recommendation category */
  category: string;
  
  /** Priority level */
  priority: string;
  
  /** Recommendation type */
  type: string;
  
  /** Rationale for this recommendation */
  rationale?: string;
  
  /** Expected benefits of implementing */
  expectedBenefits?: string[];
  
  /** Risks if recommendation is ignored */
  risksIfIgnored?: string[];
  
  /** Steps to implement this recommendation */
  implementationSteps?: string[];
  
  /** Estimated effort to implement */
  estimatedEffort?: string;
  
  /** Criteria for measuring success */
  successCriteria?: string[];
  
  /** AI confidence in this recommendation (0-1) */
  confidence: number;
  
  /** Related recommendation IDs */
  relatedRecommendations?: string[];
  
  /** Dependencies that must be addressed first */
  dependencies?: string[];
}

/**
 * Complete analysis result
 * Comprehensive AI analysis output for a deployment
 */
export interface AnalysisResult {
  /** Unique analysis identifier */
  analysisId?: string;
  
  /** Deployment being analyzed */
  deploymentId: string;
  
  /** Agent that performed the analysis */
  agentId?: string;
  
  /** Readiness assessment */
  readinessAssessment: ReadinessAssessment;
  
  /** List of findings identified */
  findings?: AnalysisFinding[];
  
  /** List of recommendations */
  recommendations?: Recommendation[];
  
  /** Overall confidence in analysis (0-1) */
  confidenceLevel: number;
  
  /** Explanation of analysis reasoning */
  explanatoryReasoning?: string;
  
  /** When analysis was completed */
  completedAt: Date;
  
  /** Duration of analysis execution */
  analysisDuration: string;
  
  /** Correlation ID for tracing */
  correlationId?: string;
  
  /** Additional metadata */
  metadata?: Record<string, any>;
}

/**
 * Risk level classification
 * Indicates the overall risk level
 */
export enum RiskLevel {
  /** Very low risk */
  VeryLow = 'VeryLow',
  
  /** Low risk */
  Low = 'Low',
  
  /** Medium risk */
  Medium = 'Medium',
  
  /** High risk */
  High = 'High',
  
  /** Very high risk */
  VeryHigh = 'VeryHigh',
  
  /** Critical risk requiring immediate attention */
  Critical = 'Critical'
}

/**
 * Risk category classification
 * Categorizes risks by domain
 */
export enum RiskCategory {
  /** Technical risks */
  Technical = 'Technical',
  
  /** Operational risks */
  Operational = 'Operational',
  
  /** Security risks */
  Security = 'Security',
  
  /** Compliance risks */
  Compliance = 'Compliance',
  
  /** Performance risks */
  Performance = 'Performance',
  
  /** Integration risks */
  Integration = 'Integration',
  
  /** Resource-related risks */
  Resource = 'Resource',
  
  /** Timeline risks */
  Timeline = 'Timeline',
  
  /** Quality risks */
  Quality = 'Quality',
  
  /** Business risks */
  Business = 'Business',
  
  /** Other uncategorized risks */
  Other = 'Other'
}

/**
 * Risk severity level
 * Indicates the potential impact of a risk
 */
export enum RiskSeverity {
  /** Negligible impact */
  Negligible = 'Negligible',
  
  /** Minor impact */
  Minor = 'Minor',
  
  /** Moderate impact */
  Moderate = 'Moderate',
  
  /** Major impact */
  Major = 'Major',
  
  /** Severe impact */
  Severe = 'Severe',
  
  /** Critical impact */
  Critical = 'Critical'
}

/**
 * Identified risk
 * Represents a specific risk identified during assessment
 */
export interface IdentifiedRisk {
  /** Unique risk identifier */
  id?: string;
  
  /** Risk title */
  title?: string;
  
  /** Detailed risk description */
  description?: string;
  
  /** Risk category */
  category: RiskCategory;
  
  /** Risk severity level */
  severity: RiskSeverity;
  
  /** Probability of occurrence (0-1) */
  probability: number;
  
  /** Potential impact if risk materializes */
  potentialImpact?: string;
  
  /** Indicators suggesting this risk */
  riskIndicators?: string[];
  
  /** Historical occurrences of similar risks */
  historicalOccurrences?: string[];
  
  /** AI confidence in this risk assessment (0-1) */
  confidence: number;
}

/**
 * Risk mitigation strategy
 * Actionable steps to reduce or eliminate a risk
 */
export interface RiskMitigation {
  /** Unique mitigation identifier */
  id?: string;
  
  /** Associated risk identifier */
  riskId?: string;
  
  /** Mitigation title */
  title?: string;
  
  /** Detailed description */
  description?: string;
  
  /** Mitigation type */
  type: string;
  
  /** Priority level */
  priority: string;
  
  /** Estimated effort to implement */
  estimatedEffort?: string;
  
  /** Expected effectiveness (0-1) */
  expectedEffectiveness: number;
  
  /** Steps to implement mitigation */
  implementationSteps?: string[];
}

/**
 * Complete risk assessment result
 * Comprehensive risk analysis output for a deployment
 */
export interface RiskAssessment {
  /** Unique assessment identifier */
  assessmentId?: string;
  
  /** Deployment being assessed */
  deploymentId: string;
  
  /** Agent that performed the assessment */
  agentId?: string;
  
  /** Overall risk level */
  overallRiskLevel: RiskLevel;
  
  /** Overall risk score (0-100) */
  overallRiskScore: number;
  
  /** List of identified risks */
  identifiedRisks?: IdentifiedRisk[];
  
  /** Recommended mitigation strategies */
  mitigationRecommendations?: RiskMitigation[];
  
  /** Risk factors considered */
  riskFactors?: any[];
  
  /** Overall confidence in assessment (0-1) */
  confidenceLevel: number;
  
  /** Explanation of assessment reasoning */
  explanatoryReasoning?: string;
  
  /** When assessment was completed */
  completedAt: Date;
  
  /** Duration of assessment execution */
  assessmentDuration: string;
  
  /** Correlation ID for tracing */
  correlationId?: string;
  
  /** Additional metadata */
  metadata?: Record<string, any>;
}

/**
 * Recommendation set
 * Collection of recommendations for a deployment
 */
export interface RecommendationSet {
  /** Unique recommendation set identifier */
  recommendationSetId?: string;
  
  /** Deployment these recommendations are for */
  deploymentId: string;
  
  /** Agent that generated recommendations */
  agentId?: string;
  
  /** List of recommendations */
  recommendations?: Recommendation[];
  
  /** Summary of recommendations */
  summary?: string;
  
  /** Priority recommendation IDs */
  priorityRecommendations?: string[];
  
  /** Expected overall impact */
  expectedImpact?: string;
  
  /** Overall confidence in recommendations (0-1) */
  confidenceLevel: number;
  
  /** Explanation of recommendation reasoning */
  explanatoryReasoning?: string;
  
  /** When recommendations were generated */
  generatedAt: Date;
  
  /** Duration of generation process */
  generationDuration: string;
  
  /** Correlation ID for tracing */
  correlationId?: string;
  
  /** Additional metadata */
  metadata?: Record<string, any>;
}
