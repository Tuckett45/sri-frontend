/**
 * Agent models for ATLAS AI agent execution and management
 * These models support AI agent execution, configuration, telemetry,
 * and performance monitoring
 * 
 * Requirements: 1.5
 */

/**
 * Agent domain classification
 * Categorizes agents by their primary functional domain
 */
export enum AgentDomain {
  /** Deployment-related agents */
  Deployment = 'Deployment',
  
  /** Dispatch-related agents */
  Dispatch = 'Dispatch',
  
  /** CRM-related agents */
  CRM = 'CRM',
  
  /** Cross-cutting concern agents */
  CrossCutting = 'CrossCutting'
}

/**
 * Agent type classification
 * Defines the underlying implementation approach
 */
export enum AgentType {
  /** Rule-based agent using predefined logic */
  RuleBased = 'RuleBased',
  
  /** Machine learning-based agent */
  MLBased = 'MLBased',
  
  /** Hybrid agent combining rules and ML */
  Hybrid = 'Hybrid'
}

/**
 * Agent execution status
 * Indicates the outcome of an agent execution
 */
export enum AgentExecutionStatus {
  /** Execution completed successfully */
  Success = 'Success',
  
  /** Execution completed with partial success */
  PartialSuccess = 'PartialSuccess',
  
  /** Execution failed */
  Failed = 'Failed',
  
  /** Execution timed out */
  Timeout = 'Timeout'
}

/**
 * Agent metadata
 * Describes an agent's identity, capabilities, and registration information
 */
export interface AgentMetadata {
  /** Unique agent identifier */
  agentId?: string;
  
  /** Human-readable agent name */
  agentName?: string;
  
  /** Agent version */
  version?: string;
  
  /** Functional domain of the agent */
  domain: AgentDomain;
  
  /** Agent implementation type */
  type: AgentType;
  
  /** Description of agent's purpose and functionality */
  description?: string;
  
  /** List of agent capabilities */
  capabilities?: string[];
  
  /** When the agent was registered */
  registeredAt: Date;
  
  /** User who registered the agent */
  registeredBy?: string;
  
  /** Whether the agent is currently active */
  isActive: boolean;
}

/**
 * Agent configuration
 * Contains runtime configuration parameters for an agent
 */
export interface AgentConfiguration {
  /** Agent identifier this configuration applies to */
  agentId?: string;
  
  /** Configuration version */
  version?: string;
  
  /** Configuration parameters as key-value pairs */
  parameters?: Record<string, any>;
  
  /** Threshold values for agent decision-making */
  thresholds?: any;
  
  /** Feature flags controlling agent behavior */
  featureFlags?: any;
  
  /** When configuration was last updated */
  lastUpdated: Date;
  
  /** User who last updated the configuration */
  updatedBy?: string;
}

/**
 * Execute agent request
 * Request payload for executing a single agent
 */
export interface ExecuteAgentRequest {
  /** Agent identifier to execute */
  agentId?: string;
  
  /** Input data for the agent */
  input: any;
  
  /** Optional specific version to execute */
  version?: string;
}

/**
 * Agent recommendation result
 * Output from an agent execution containing recommendations and metadata
 */
export interface AgentRecommendation {
  /** Unique recommendation identifier */
  recommendationId?: string;
  
  /** Agent that generated this recommendation */
  agentId?: string;
  
  /** Version of the agent that executed */
  agentVersion?: string;
  
  /** The actual recommendation data */
  recommendation: any;
  
  /** Confidence score for this recommendation (0-1) */
  confidenceScore: number;
  
  /** Explanation of the reasoning behind the recommendation */
  reasoning?: string;
  
  /** Factors that influenced the decision */
  decisionFactors?: any[];
  
  /** Data sources used in the analysis */
  dataSources?: any[];
  
  /** Feature importance scores for ML-based agents */
  featureImportance?: Record<string, number>;
  
  /** When the recommendation was generated */
  timestamp: Date;
  
  /** Duration of the execution */
  executionDuration: string;
  
  /** Execution status */
  status: AgentExecutionStatus;
}

/**
 * Agent performance report
 * Statistical summary of agent performance over a time period
 */
export interface AgentPerformanceReport {
  /** Agent identifier */
  agentId?: string;
  
  /** Report start date */
  startDate: Date;
  
  /** Report end date */
  endDate: Date;
  
  /** Total number of executions */
  totalExecutions: number;
  
  /** Number of successful executions */
  successfulExecutions: number;
  
  /** Number of failed executions */
  failedExecutions: number;
  
  /** Success rate as percentage (0-100) */
  successRate: number;
  
  /** Average confidence score across all executions */
  averageConfidenceScore: number;
  
  /** Average execution duration */
  averageDuration: string;
  
  /** 95th percentile execution duration */
  p95Duration: string;
  
  /** 99th percentile execution duration */
  p99Duration: string;
}

/**
 * Agent health status
 * Current operational health of an agent
 */
export interface AgentHealthStatus {
  /** Agent identifier */
  agentId?: string;
  
  /** Current health state (e.g., 'Healthy', 'Degraded', 'Unhealthy') */
  state: string;
  
  /** Recent success rate */
  successRate: number;
  
  /** Average response time */
  averageResponseTime: string;
  
  /** Timestamp of last execution */
  lastExecutionTime: Date;
  
  /** List of current issues or warnings */
  issues?: string[];
}
