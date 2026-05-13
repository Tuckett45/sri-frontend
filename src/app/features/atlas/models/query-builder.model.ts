/**
 * Query Builder models for ATLAS dynamic database query building
 * These models support dynamic query construction, execution, result handling,
 * and template management for database queries
 * 
 * Requirements: 1.5
 */

/**
 * Data source information
 * Describes an available data source for querying
 */
export interface DataSourceInfo {
  /** Unique data source identifier */
  id?: string;
  
  /** Human-readable data source name */
  name?: string;
  
  /** Description of the data source */
  description?: string;
  
  /** Number of fields available in this data source */
  fieldCount: number;
  
  /** Maximum number of rows that can be returned */
  maxRowsTotal: number;
}

/**
 * Field configuration
 * Describes a queryable field within a data source
 */
export interface FieldConfig {
  /** Field name (database column name) */
  name?: string;
  
  /** Human-readable display name */
  displayName?: string;
  
  /** Data type of the field (e.g., 'string', 'number', 'date') */
  dataType?: string;
  
  /** List of operators allowed for this field (e.g., 'equals', 'contains', 'greaterThan') */
  allowedOperators?: string[];
  
  /** Roles that are allowed to query this field */
  allowedRoles?: string[];
  
  /** Whether this field can be used in filters */
  isFilterable: boolean;
  
  /** Whether this field can be used for sorting */
  isSortable: boolean;
}

/**
 * Filter selection
 * Represents a single filter condition in a query
 */
export interface FilterSelection {
  /** Field name to filter on */
  field?: string;
  
  /** Comparison operator (e.g., 'equals', 'contains', 'greaterThan') */
  operator?: string;
  
  /** Value to compare against */
  value: any;
  
  /** Data type of the value */
  dataType?: string;
}

/**
 * Filter group
 * Groups multiple filters with a logical operator
 */
export interface FilterGroup {
  /** List of filters in this group */
  filters?: FilterSelection[];
  
  /** Logical operator combining filters ('AND' or 'OR') */
  logicalOperator?: string;
}

/**
 * Sort criteria
 * Defines sorting for query results
 */
export interface SortCriteria {
  /** Field name to sort by */
  field?: string;
  
  /** Sort direction ('ASC' or 'DESC') */
  direction?: string;
}

/**
 * User query
 * Complete query definition constructed by the user
 */
export interface UserQuery {
  /** Data source to query */
  dataSource?: string;
  
  /** List of filter conditions */
  filters?: FilterSelection[];
  
  /** Logical operator for top-level filters ('AND' or 'OR') */
  logicalOperator?: string;
  
  /** Grouped filters for complex queries */
  grouping?: FilterGroup[];
  
  /** Sort criteria for results */
  sortBy?: SortCriteria[];
  
  /** Maximum number of rows to return */
  limit?: number;
}

/**
 * Column metadata
 * Describes a column in query results
 */
export interface ColumnMetadata {
  /** Column name */
  name?: string;
  
  /** Human-readable display name */
  displayName?: string;
  
  /** Data type of the column */
  dataType?: string;
}

/**
 * Query result
 * Contains the results of an executed query
 */
export interface QueryResult {
  /** Column definitions for the result set */
  columns?: ColumnMetadata[];
  
  /** Result rows as 2D array */
  rows?: any[][];
  
  /** Total number of rows returned */
  totalRows: number;
  
  /** Query execution time in milliseconds */
  executionTimeMs: number;
  
  /** Whether results were served from cache */
  fromCache: boolean;
  
  /** Timestamp when query was executed */
  timestamp: Date;
}

/**
 * Export format
 * Supported formats for exporting query results
 */
export enum ExportFormat {
  /** Comma-separated values */
  CSV = 'CSV',
  
  /** JSON format */
  JSON = 'JSON',
  
  /** Microsoft Excel format */
  Excel = 'Excel'
}

/**
 * Export request
 * Request to export query results in a specific format
 */
export interface ExportRequestDto {
  /** Query result to export */
  queryResult: QueryResult;
  
  /** Desired export format */
  format: ExportFormat;
  
  /** Optional data source name for context */
  dataSource?: string;
  
  /** Optional custom file name */
  fileName?: string;
}

/**
 * Query template
 * Saved query template with parameterization support
 */
export interface QueryTemplate {
  /** Unique template identifier */
  id?: string;
  
  /** Template name */
  name?: string;
  
  /** Template description */
  description?: string;
  
  /** Data source this template queries */
  dataSource?: string;
  
  /** Template parameters for dynamic values */
  parameters?: TemplateParameter[];
  
  /** SQL template with parameter placeholders */
  sqlTemplate?: string;
  
  /** Whether this template is publicly accessible */
  isPublic: boolean;
  
  /** User who created the template */
  createdBy?: string;
  
  /** When the template was created */
  createdAt: Date;
  
  /** When the template was last modified */
  modifiedAt?: Date;
}

/**
 * Template parameter
 * Defines a parameter for a query template
 */
export interface TemplateParameter {
  /** Parameter name */
  name?: string;
  
  /** Human-readable display name */
  displayName?: string;
  
  /** Data type of the parameter */
  dataType?: string;
  
  /** Whether this parameter is required */
  isRequired: boolean;
  
  /** Default value for the parameter */
  defaultValue?: any;
}

/**
 * Create template request
 * Request payload for creating a new query template
 */
export interface CreateTemplateRequest {
  /** Template name */
  name?: string;
  
  /** Template description */
  description?: string;
  
  /** Data source this template queries */
  dataSource?: string;
  
  /** Template parameters */
  parameters?: TemplateParameter[];
  
  /** SQL template with parameter placeholders */
  sqlTemplate?: string;
  
  /** Whether this template should be publicly accessible */
  isPublic: boolean;
}

/**
 * Template execution request
 * Request to execute a template with specific parameter values
 */
export interface TemplateExecutionRequest {
  /** Parameter values as key-value pairs */
  parameters?: Record<string, any>;
}
