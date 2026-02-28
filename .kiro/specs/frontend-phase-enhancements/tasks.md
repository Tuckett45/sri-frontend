# Implementation Plan: Frontend Phase Enhancements

## Overview

This implementation plan covers a comprehensive 6-phase frontend enhancement strategy for the SRI Frontend Angular application. The plan progressively builds capabilities from admin viewers and state visualization through AI-powered advisory panels, workflow template switching, and predictive dashboards. Each phase introduces new components, services, state management, and testing while maintaining backward compatibility.

The implementation follows a phased approach with clear dependencies, enabling incremental delivery and validation at each milestone. All tasks reference specific requirements for traceability and include property-based tests for the 30 correctness properties defined in the design.

## Phase Dependencies

- Phase 0 (Foundation) → Phase 1 (Enforcement) → Phase 2 (Workflow)
- Phase 2 → Phase 3 (AI Advisory) and Phase 4 (Templates)
- Phase 3 + Phase 4 → Phase 5 (Predictive)

## Tasks

### Phase 0: Admin Viewers and State Visualization

- [x] 1. Set up Phase 0 foundation and shared infrastructure
  - Create directory structure for Phase 0 components and services
  - Set up NgRx state slices for admin viewer and state history
  - Configure routing for admin dashboard
  - _Requirements: 1.1, 2.1_

- [x] 2. Implement Admin Viewer component and state management
  - [x] 2.1 Create AdminViewerComponent with template and styles
    - Implement component class with observables for metrics, users, and health
    - Create template with metrics display, audit log table, and filters
    - Add auto-refresh functionality with configurable interval
    - _Requirements: 1.1, 1.6_

  - [x] 2.2 Implement admin viewer NgRx actions, reducers, and effects
    - Define actions for loading metrics, filtering audit log, exporting data
    - Create reducer for admin viewer state management
    - Implement effects for API calls with caching logic
    - _Requirements: 1.2, 16.1_

  - [x] 2.3 Create admin metrics service with caching
    - Implement loadAdminMetrics with 30-second cache TTL
    - Add filterAuditLog function with AND logic for filters
    - Implement export functionality for CSV and PDF formats
    - _Requirements: 1.2, 1.3, 1.4, 1.5, 16.1_

  - [ ]* 2.4 Write property test for admin metrics caching (Property 1)
    - **Property 1: Admin Metrics Caching**
    - **Validates: Requirements 16.1**

  - [ ]* 2.5 Write unit tests for AdminViewerComponent
    - Test metrics loading on init
    - Test filter application
    - Test auto-refresh behavior
    - Test export functionality
    - _Requirements: 1.1-1.7_


- [x] 3. Implement State Visualization components
  - [x] 3.1 Create StateVisualizationComponent with D3.js integration
    - Implement component with state machine diagram rendering
    - Add interactive state selection and transition highlighting
    - Support multiple layout modes (horizontal, vertical, radial)
    - _Requirements: 2.1, 2.2, 2.3, 2.4_

  - [x] 3.2 Create StateTimelineComponent for transition history
    - Implement chronological timeline display
    - Add filtering by date range and user
    - Support grouping by date and metadata display
    - _Requirements: 2.6, 2.7_

  - [x] 3.3 Implement state history NgRx state management
    - Define actions for loading state history and transitions
    - Create reducer for state history management
    - Implement effects for fetching state data
    - _Requirements: 2.1, 2.6_

  - [ ]* 3.4 Write property test for state history ordering (Property 18)
    - **Property 18: State History Chronological Order**
    - **Validates: Requirements 2.6, 17.4**

  - [ ]* 3.5 Write unit tests for state visualization components
    - Test state machine rendering
    - Test current state highlighting
    - Test transition display
    - Test timeline filtering
    - _Requirements: 2.1-2.7_

- [x] 4. Checkpoint - Phase 0 complete
  - Ensure all tests pass, ask the user if questions arise.

### Phase 1: Role Enforcement and Lifecycle UI

- [x] 5. Implement role-based access control infrastructure
  - [x] 5.1 Create RoleEnforcementDirective
    - Implement directive with hide/disable enforcement modes
    - Support single and multiple role requirements (AND/OR logic)
    - Add reactive permission re-evaluation on role changes
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

  - [x] 5.2 Implement checkPermission function with condition evaluation
    - Create permission checking logic with role and resource matching
    - Add condition evaluation for permission conditions
    - Ensure deterministic results for same inputs
    - _Requirements: 3.6, 3.7, 20.1_

  - [x] 5.3 Create role permissions NgRx state management
    - Define actions for loading and updating permissions
    - Create reducer for role permissions state
    - Implement effects for permission API calls
    - _Requirements: 3.1, 3.6_

  - [ ]* 5.4 Write property test for permission consistency (Property 2)
    - **Property 2: Role Permission Consistency**
    - **Validates: Requirements 20.1**

  - [ ]* 5.5 Write property test for permission condition evaluation (Property 17)
    - **Property 17: Permission Condition Evaluation**
    - **Validates: Requirements 3.7**

  - [ ]* 5.6 Write unit tests for role enforcement
    - Test directive hide/disable modes
    - Test single and multiple role requirements
    - Test reactive permission updates
    - Test checkPermission function
    - _Requirements: 3.1-3.7_

- [x] 6. Implement lifecycle management UI
  - [x] 6.1 Create LifecycleManagementComponent
    - Implement component with current state display
    - Add available transitions display
    - Create transition history view
    - Add approval workflow UI
    - _Requirements: 4.1, 4.2, 4.4, 4.5_

  - [x] 6.2 Create StateTransitionControlsComponent
    - Implement reusable transition control panel
    - Add transition reason input when required
    - Display approval warnings for restricted transitions
    - _Requirements: 4.2, 4.3_

  - [x] 6.3 Implement lifecycle state management and validation
    - Create validateTransition function with prerequisite checks
    - Implement executeTransition with audit logging
    - Add approval request creation and handling
    - _Requirements: 4.2, 4.3, 4.4, 4.5, 4.6, 4.7_

  - [x] 6.4 Create lifecycle transitions NgRx state management
    - Define actions for transitions and approvals
    - Create reducer for lifecycle state
    - Implement effects for transition execution
    - _Requirements: 4.1, 4.7_

  - [ ]* 6.5 Write property test for state transition validity (Property 3)
    - **Property 3: State Transition Validity**
    - **Validates: Requirements 4.2, 20.2**

  - [ ]* 6.6 Write property test for audit log completeness (Property 19)
    - **Property 19: Audit Log Completeness**
    - **Validates: Requirements 4.6, 17.1**

  - [ ]* 6.7 Write unit tests for lifecycle management
    - Test transition validation
    - Test approval workflows
    - Test audit log creation
    - Test state history updates
    - _Requirements: 4.1-4.7_

- [~] 7. Checkpoint - Phase 1 complete
  - Ensure all tests pass, ask the user if questions arise.

### Phase 2: Full Vertical Slice Workflow UI

- [x] 8. Implement workflow wizard infrastructure
  - [x] 8.1 Create WorkflowWizardComponent with multi-step navigation
    - Implement wizard component with step management
    - Add step navigation (next, previous, go to step)
    - Create progress indicator
    - Add draft save/load functionality
    - _Requirements: 5.1, 5.4, 5.5, 5.6, 5.8_

  - [x] 8.2 Implement step validation and progression logic
    - Create validateCurrentStep function
    - Implement canProceedToNextStep with validation checks
    - Add step completion tracking
    - _Requirements: 5.2, 5.3_

  - [x] 8.3 Create workflow wizard NgRx state management
    - Define actions for wizard initialization, navigation, and submission
    - Create reducer for wizard state
    - Implement effects for draft persistence and workflow submission
    - _Requirements: 5.1, 5.5, 5.6, 5.7_

  - [ ]* 8.4 Write property test for workflow step dependency enforcement (Property 4)
    - **Property 4: Workflow Step Dependency Enforcement**
    - **Validates: Requirements 6.2, 20.3**

  - [ ]* 8.5 Write property test for workflow wizard step progression (Property 14)
    - **Property 14: Workflow Wizard Step Progression**
    - **Validates: Requirements 5.2, 5.3**

  - [ ]* 8.6 Write property test for workflow draft persistence (Property 25)
    - **Property 25: Workflow Draft Persistence**
    - **Validates: Requirements 5.5, 5.6**

  - [ ]* 8.7 Write unit tests for workflow wizard
    - Test step initialization
    - Test navigation logic
    - Test validation integration
    - Test draft save/load
    - _Requirements: 5.1-5.8_

- [x] 9. Implement job processing pipeline
  - [x] 9.1 Create JobProcessingPipelineComponent
    - Implement pipeline visualization with stages
    - Add stage execution controls
    - Display stage results and errors
    - Support retry and skip functionality
    - _Requirements: 6.1, 6.3, 6.4, 6.5, 6.6_

  - [x] 9.2 Implement pipeline execution logic
    - Create executeStage function with dependency checking
    - Add retry logic for failed stages
    - Implement stage skipping with reason capture
    - Aggregate results from all stages
    - _Requirements: 6.1, 6.2, 6.3, 6.5, 6.7_

  - [ ]* 9.3 Write property test for pipeline stage execution order (Property 15)
    - **Property 15: Pipeline Stage Execution Order**
    - **Validates: Requirements 6.1, 6.2**

  - [ ]* 9.4 Write unit tests for job processing pipeline
    - Test stage execution order
    - Test dependency enforcement
    - Test retry logic
    - Test error handling
    - _Requirements: 6.1-6.7_

- [x] 10. Implement validation engine
  - [x] 10.1 Create ValidationEngineService
    - Implement validateWorkflowData with schema validation
    - Add validateStep for individual step validation
    - Create evaluateRule for business rule evaluation
    - Support custom validator registration
    - _Requirements: 7.1, 7.2, 7.5, 7.6_

  - [x] 10.2 Implement validation result aggregation
    - Ensure all validation errors are captured
    - Add validation warnings support
    - Create detailed error messages with field names and codes
    - _Requirements: 7.3, 7.4_

  - [ ]* 10.3 Write property test for validation result completeness (Property 5)
    - **Property 5: Validation Result Completeness**
    - **Validates: Requirements 7.3, 20.4**

  - [ ]* 10.4 Write unit tests for validation engine
    - Test required field validation
    - Test business rule evaluation
    - Test custom validators
    - Test batch validation
    - _Requirements: 7.1-7.6_

- [~] 11. Checkpoint - Phase 2 complete
  - Ensure all tests pass, ask the user if questions arise.

### Phase 3: AI Advisory Panels

- [x] 12. Implement AI recommendation infrastructure
  - [x] 12.1 Create RecommendationEngineService
    - Implement getRecommendations with context-based fetching
    - Add recommendation sorting by priority and confidence
    - Implement 5-minute caching for recommendations
    - Add acceptRecommendation and rejectRecommendation functions
    - _Requirements: 8.1, 8.3, 8.4, 8.5, 8.6, 16.2_

  - [x] 12.2 Implement recommendation feedback and analytics
    - Create provideFeedback function
    - Add getRecommendationMetrics for analytics
    - Implement explainRecommendation for AI explanations
    - _Requirements: 8.5, 8.6, 9.6_

  - [x] 12.3 Create AI recommendations NgRx state management
    - Define actions for fetching, accepting, and rejecting recommendations
    - Create reducer for recommendations state
    - Implement effects for API calls with caching
    - _Requirements: 8.1, 8.5, 8.6_

  - [ ]* 12.4 Write property test for recommendation confidence bounds (Property 6)
    - **Property 6: Recommendation Confidence Bounds**
    - **Validates: Requirements 20.5**

  - [ ]* 12.5 Write property test for recommendation priority ordering (Property 7)
    - **Property 7: Recommendation Priority Ordering**
    - **Validates: Requirements 8.3, 8.4**

  - [ ]* 12.6 Write property test for recommendation expiration (Property 20)
    - **Property 20: Recommendation Expiration**
    - **Validates: Requirements 8.7**

  - [ ]* 12.7 Write property test for AI recommendation feedback recording (Property 27)
    - **Property 27: AI Recommendation Feedback Recording**
    - **Validates: Requirements 8.5, 8.6**

  - [ ]* 12.8 Write unit tests for recommendation engine
    - Test recommendation fetching
    - Test sorting logic
    - Test caching behavior
    - Test acceptance/rejection
    - _Requirements: 8.1-8.7_

- [x] 13. Implement AI advisory UI components
  - [x] 13.1 Create AIAdvisoryPanelComponent
    - Implement component with recommendations display
    - Add confidence score and priority visualization
    - Create accept/reject controls
    - Add auto-refresh functionality
    - _Requirements: 8.1, 8.2, 8.5, 8.6_

  - [x] 13.2 Create InsightsDisplayComponent
    - Implement insights visualization with multiple display modes
    - Add chart rendering for insight metrics
    - Create filtering and sorting controls
    - _Requirements: 9.1, 9.2, 9.7_

  - [x] 13.3 Implement insight metric trend calculation
    - Create logic for trend determination (up/down/stable)
    - Calculate change percentages
    - Ensure trend consistency with change values
    - _Requirements: 9.3, 9.4, 9.5_

  - [ ]* 13.4 Write property test for insight metric trend consistency (Property 24)
    - **Property 24: Insight Metric Trend Consistency**
    - **Validates: Requirements 9.3, 9.4**

  - [ ]* 13.5 Write unit tests for AI advisory components
    - Test recommendation display
    - Test accept/reject actions
    - Test insights visualization
    - Test trend calculations
    - _Requirements: 8.1-8.7, 9.1-9.7_

- [~] 14. Checkpoint - Phase 3 complete
  - Ensure all tests pass, ask the user if questions arise.

### Phase 4: Workflow Template Switching

- [ ] 15. Implement template management infrastructure
  - [~] 15.1 Create TemplateEngineService
    - Implement getTemplates and getTemplateById functions
    - Add applyTemplate with customization support
    - Create validateTemplate function
    - Implement template usage tracking
    - _Requirements: 10.1, 11.1, 11.6_

  - [~] 15.2 Implement template customization logic
    - Create validateTemplateCustomization function
    - Add logic for applying step modifications
    - Implement step addition and removal
    - Ensure template immutability during application
    - _Requirements: 11.2, 11.3, 11.4, 11.5_

  - [~] 15.3 Create workflow templates NgRx state management
    - Define actions for template loading, selection, and application
    - Create reducer for templates state
    - Implement effects for template API calls
    - _Requirements: 10.1, 10.6, 11.1_

  - [ ]* 15.4 Write property test for template immutability (Property 8)
    - **Property 8: Template Immutability**
    - **Validates: Requirements 11.5, 20.6**

  - [ ]* 15.5 Write property test for template customization validation (Property 9)
    - **Property 9: Template Customization Validation**
    - **Validates: Requirements 11.2, 11.3, 11.4**

  - [ ]* 15.6 Write property test for template version consistency (Property 21)
    - **Property 21: Template Version Consistency**
    - **Validates: Requirements 11.7**

  - [ ]* 15.7 Write unit tests for template engine
    - Test template loading
    - Test template application
    - Test customization validation
    - Test usage tracking
    - _Requirements: 10.1-10.6, 11.1-11.7_

- [ ] 16. Implement template UI components
  - [~] 16.1 Create TemplateSelectorComponent
    - Implement template browsing with grid/list views
    - Add search and category filtering
    - Create template preview functionality
    - Add template comparison feature
    - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5_

  - [~] 16.2 Implement template metadata display
    - Show template name, description, author, version
    - Display usage count and ratings
    - Add template category organization
    - _Requirements: 10.2_

  - [ ]* 16.3 Write unit tests for template selector
    - Test template display
    - Test search and filtering
    - Test template selection
    - Test preview functionality
    - _Requirements: 10.1-10.6_

- [ ] 17. Implement configuration management
  - [~] 17.1 Create ConfigurationManagerService
    - Implement getConfiguration and updateConfiguration functions
    - Add configuration validation with schema checking
    - Implement configuration caching
    - Support batch configuration operations
    - _Requirements: 12.1, 12.2, 12.3, 12.5_

  - [~] 17.2 Implement template-specific configuration
    - Add getTemplateConfiguration function
    - Create updateTemplateConfiguration with validation
    - _Requirements: 12.5_

  - [ ]* 17.3 Write property test for configuration schema validation (Property 28)
    - **Property 28: Configuration Schema Validation**
    - **Validates: Requirements 12.2, 12.3**

  - [ ]* 17.4 Write unit tests for configuration manager
    - Test configuration retrieval
    - Test configuration updates
    - Test validation logic
    - Test caching behavior
    - _Requirements: 12.1-12.6_

- [~] 18. Checkpoint - Phase 4 complete
  - Ensure all tests pass, ask the user if questions arise.

### Phase 5: Predictive Dashboards

- [ ] 19. Implement forecasting infrastructure
  - [~] 19.1 Create ForecastService
    - Implement getForecasts with parameter validation
    - Add forecast caching with expiration
    - Create getPredictions for anomaly and capacity predictions
    - Implement getTrends for historical trend analysis
    - _Requirements: 13.1, 13.2, 13.6, 14.1_

  - [~] 19.2 Implement forecast data validation
    - Validate sufficient historical data (minimum 30 points)
    - Ensure confidence interval bounds (lowerBound ≤ value ≤ upperBound)
    - Validate chronological ordering of data points
    - _Requirements: 13.2, 13.4, 13.5_

  - [~] 19.3 Create forecasts NgRx state management
    - Define actions for loading forecasts, predictions, and trends
    - Create reducer for forecasts state
    - Implement effects for forecast API calls with caching
    - _Requirements: 13.1, 13.6, 13.7_

  - [ ]* 19.4 Write property test for forecast data point ordering (Property 10)
    - **Property 10: Forecast Data Point Ordering**
    - **Validates: Requirements 13.5, 20.7**

  - [ ]* 19.5 Write property test for forecast confidence intervals (Property 11)
    - **Property 11: Forecast Confidence Intervals**
    - **Validates: Requirements 13.4**

  - [ ]* 19.6 Write property test for forecast model metadata (Property 23)
    - **Property 23: Forecast Model Metadata**
    - **Validates: Requirements 13.3**

  - [ ]* 19.7 Write unit tests for forecast service
    - Test forecast generation
    - Test data validation
    - Test caching behavior
    - Test error handling for insufficient data
    - _Requirements: 13.1-13.7_

- [ ] 20. Implement trend analysis and anomaly detection
  - [~] 20.1 Implement detectAnomalies function
    - Create anomaly detection with threshold-based flagging
    - Calculate statistical measures (mean, standard deviation)
    - Classify anomaly severity based on deviation magnitude
    - Determine anomaly types (spike, drop, shift)
    - _Requirements: 14.4, 14.5, 14.6_

  - [~] 20.2 Implement calculateTrendStatistics function
    - Calculate mean, median, standard deviation, variance
    - Ensure statistical accuracy (mean = sum / count)
    - Compute linear regression slope and R-squared
    - _Requirements: 14.2, 14.3_

  - [~] 20.3 Create TrendAnalysisComponent
    - Implement trend visualization with multiple chart types
    - Add anomaly highlighting
    - Display trend statistics
    - Support smoothing algorithms (moving average, exponential)
    - _Requirements: 14.1, 14.2, 14.6, 14.7_

  - [ ]* 20.4 Write property test for anomaly detection threshold (Property 12)
    - **Property 12: Anomaly Detection Threshold**
    - **Validates: Requirements 14.4**

  - [ ]* 20.5 Write property test for trend statistics accuracy (Property 13)
    - **Property 13: Trend Statistics Accuracy**
    - **Validates: Requirements 14.3**

  - [ ]* 20.6 Write property test for anomaly severity classification (Property 30)
    - **Property 30: Anomaly Severity Classification**
    - **Validates: Requirements 14.5**

  - [ ]* 20.7 Write unit tests for trend analysis
    - Test anomaly detection
    - Test statistics calculation
    - Test trend visualization
    - Test smoothing algorithms
    - _Requirements: 14.1-14.7_

- [ ] 21. Implement predictive dashboard UI
  - [~] 21.1 Create PredictiveDashboardComponent
    - Implement dashboard with multiple visualization types
    - Add time horizon selection controls
    - Create metric selection interface
    - Display confidence intervals toggle
    - _Requirements: 13.1, 13.7_

  - [~] 21.2 Implement chart data preparation
    - Transform forecast data for chart libraries
    - Prepare comparison data (forecast vs actual)
    - Create multi-metric visualizations
    - _Requirements: 13.3_

  - [~] 21.3 Ensure time horizon consistency across dashboard
    - Synchronize all forecasts, predictions, and trends with selected time horizon
    - Update all visualizations when time horizon changes
    - _Requirements: 13.7_

  - [ ]* 21.4 Write property test for predictive dashboard time horizon consistency (Property 29)
    - **Property 29: Predictive Dashboard Time Horizon Consistency**
    - **Validates: Requirements 13.7**

  - [ ]* 21.5 Write unit tests for predictive dashboard
    - Test dashboard initialization
    - Test time horizon changes
    - Test metric selection
    - Test chart rendering
    - _Requirements: 13.1-13.7_

- [ ] 22. Implement scenario analysis
  - [~] 22.1 Create scenario analysis functionality
    - Implement runScenarioAnalysis function
    - Validate scenario parameters (adjustedValue ≠ baseValue)
    - Calculate scenario outcomes with impact classification
    - Support scenario comparison
    - _Requirements: 15.1, 15.2, 15.3, 15.4, 15.5_

  - [ ]* 22.2 Write property test for scenario parameter validation (Property 22)
    - **Property 22: Scenario Parameter Validation**
    - **Validates: Requirements 15.1, 15.2**

  - [ ]* 22.3 Write unit tests for scenario analysis
    - Test parameter validation
    - Test outcome calculation
    - Test scenario comparison
    - Test impact classification
    - _Requirements: 15.1-15.5_

- [~] 23. Checkpoint - Phase 5 complete
  - Ensure all tests pass, ask the user if questions arise.

### Cross-Phase Integration and Testing

- [ ] 24. Implement error handling and recovery
  - [~] 24.1 Add network error handling with retry logic
    - Implement exponential backoff for GET requests (up to 3 retries)
    - Add manual retry options for persistent failures
    - Display user-friendly error messages
    - _Requirements: 18.1, 18.2_

  - [~] 24.2 Implement validation error handling
    - Display inline validation messages for field errors
    - Show validation summaries for form-level errors
    - _Requirements: 18.3_

  - [~] 24.3 Add permission error handling
    - Display access denied messages for permission failures
    - Hide/disable UI elements proactively based on permissions
    - _Requirements: 18.4_

  - [~] 24.4 Implement AI service error handling with fallback
    - Return cached recommendations when AI service unavailable
    - Display appropriate messages for service unavailability
    - _Requirements: 18.5, 18.6_

  - [~] 24.5 Add forecast error handling
    - Handle insufficient data errors with descriptive messages
    - Display minimum data requirements to users
    - _Requirements: 18.7_

  - [ ]* 24.6 Write unit tests for error handling
    - Test retry logic
    - Test error message display
    - Test fallback behavior
    - Test cache usage on errors
    - _Requirements: 18.1-18.7_

- [ ] 25. Implement caching and performance optimizations
  - [~] 25.1 Add cache expiration enforcement
    - Implement cache TTL checking for all cached data
    - Fetch fresh data when cache expired
    - Clear cache entries on updates
    - _Requirements: 16.1, 16.3, 16.4, 16.5, 16.6_

  - [ ]* 25.2 Write property test for cache expiration enforcement (Property 16)
    - **Property 16: Cache Expiration Enforcement**
    - **Validates: Requirements 16.3**

  - [ ]* 25.3 Write unit tests for caching behavior
    - Test cache hit/miss scenarios
    - Test TTL expiration
    - Test cache invalidation
    - _Requirements: 16.1-16.6_

- [ ] 26. Implement UI responsiveness features
  - [~] 26.1 Add reactive permission updates
    - Implement role change detection
    - Update UI immediately on permission changes
    - Re-evaluate all role enforcement directives
    - _Requirements: 19.1_

  - [~] 26.2 Add loading indicators for async operations
    - Display spinners for API calls
    - Show progress bars for long operations
    - Implement skeleton screens for initial loads
    - _Requirements: 19.5_

  - [ ]* 26.3 Write property test for role enforcement directive reactivity (Property 26)
    - **Property 26: Role Enforcement Directive Reactivity**
    - **Validates: Requirements 3.5, 19.1**

  - [ ]* 26.4 Write unit tests for UI responsiveness
    - Test immediate UI updates
    - Test loading indicators
    - Test reactive permission changes
    - _Requirements: 19.1-19.5_

- [ ] 27. Integration testing across phases
  - [ ]* 27.1 Write integration tests for Phase 0-1 interaction
    - Test admin viewer with role enforcement
    - Test state visualization with permissions
    - Verify audit logging for admin actions

  - [ ]* 27.2 Write integration tests for Phase 1-2 interaction
    - Test workflow wizard with role enforcement
    - Test lifecycle management with validation
    - Verify permission checks during workflow execution

  - [ ]* 27.3 Write integration tests for Phase 2-3 interaction
    - Test workflow wizard with AI recommendations
    - Test validation engine with AI insights
    - Verify recommendation acceptance in workflows

  - [ ]* 27.4 Write integration tests for Phase 2-4 interaction
    - Test workflow wizard with template selection
    - Test template application with validation
    - Verify customized templates in workflows

  - [ ]* 27.5 Write integration tests for Phase 3-5 interaction
    - Test AI recommendations with predictive forecasts
    - Test insights display with trend analysis
    - Verify forecast-based recommendations

  - [ ]* 27.6 Write integration tests for Phase 4-5 interaction
    - Test template selection with predictive analytics
    - Test configuration management with forecasts
    - Verify template recommendations based on predictions

- [ ] 28. End-to-end testing
  - [ ]* 28.1 Write E2E test for complete workflow creation
    - Test full workflow from wizard through execution
    - Verify all phases work together
    - Test with role enforcement and validation

  - [ ]* 28.2 Write E2E test for AI-assisted workflow
    - Test workflow with AI recommendations
    - Verify recommendation acceptance and application
    - Test with template selection

  - [ ]* 28.3 Write E2E test for predictive planning workflow
    - Test workflow creation with forecast data
    - Verify scenario analysis integration
    - Test with template customization

- [~] 29. Final checkpoint - All phases complete
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Property tests validate universal correctness properties from the design
- Unit tests validate specific examples and edge cases
- Integration tests verify cross-phase interactions
- E2E tests validate complete user workflows
- Checkpoints ensure incremental validation at phase boundaries
- All 30 correctness properties are covered by property-based tests
- Implementation uses TypeScript with Angular and NgRx
