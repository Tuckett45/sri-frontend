# ATLAS Services

This directory contains service classes that provide business logic and API communication for the ATLAS feature module.

## AtlasConfigService

The `AtlasConfigService` provides centralized configuration management for ATLAS integration.

### Features

- **Environment-based Configuration**: Automatically loads configuration based on the current environment (production, staging, development)
- **Multiple Environments**: Supports different configurations for production, staging, and development
- **Runtime Updates**: Allows configuration updates at runtime with validation
- **Observable Configuration**: Provides configuration as an observable for reactive updates
- **Endpoint Management**: Provides methods to retrieve ATLAS base URL and service-specific endpoints
- **Feature Flags**: Supports feature flags for enabling/disabling ATLAS features
- **Validation**: Validates configuration before applying updates

### Usage

#### Basic Usage

```typescript
import { AtlasConfigService } from './services';

constructor(private atlasConfig: AtlasConfigService) {}

// Get base URL
const baseUrl = this.atlasConfig.getBaseUrl();

// Get specific endpoint
const deploymentsEndpoint = this.atlasConfig.getEndpoint('deployments');

// Check if ATLAS is enabled
if (this.atlasConfig.isEnabled()) {
  // Use ATLAS services
}

// Check if a specific feature is enabled
if (this.atlasConfig.isFeatureEnabled('deployments')) {
  // Use deployments feature
}
```

#### Subscribing to Configuration Changes

```typescript
this.atlasConfig.config$.subscribe(config => {
  console.log('Configuration updated:', config);
});
```

#### Updating Configuration at Runtime

```typescript
this.atlasConfig.updateConfiguration({
  timeout: 45000,
  features: {
    enabled: true,
    hybridMode: true,
    enabledFeatures: ['deployments', 'aiAnalysis']
  }
});
```

### Configuration Structure

```typescript
interface AtlasConfiguration {
  baseUrl: string;
  apiVersion: string;
  endpoints: {
    deployments: string;
    aiAnalysis: string;
    approvals: string;
    exceptions: string;
    agents: string;
    queryBuilder: string;
    signalR: string;
  };
  features: {
    enabled: boolean;
    hybridMode: boolean;
    enabledFeatures: string[];
  };
  timeout: number;
  retryAttempts: number;
}
```

### Environment-Specific Configuration

#### Production
- Base URL: `https://sri-api.azurewebsites.net/api/atlas`
- All features enabled
- Timeout: 30 seconds
- Retry attempts: 3

#### Staging
- Base URL: `https://sri-api-staging-b0amh5fpbjbtchf5.centralus-01.azurewebsites.net/atlas`
- Hybrid mode enabled
- Selected features enabled (deployments, aiAnalysis, approvals)
- Timeout: 30 seconds
- Retry attempts: 3

#### Development
- Base URL: `https://localhost:44376/api/atlas`
- Hybrid mode enabled
- Limited features enabled (deployments, aiAnalysis)
- Timeout: 60 seconds (longer for debugging)
- Retry attempts: 2

### Validation

The service validates configuration updates to ensure:
- Base URL is a valid URL (HTTP/HTTPS or relative path)
- API version is not empty
- Timeout is between 0 and 300,000ms (5 minutes)
- Retry attempts are between 0 and 10
- Endpoints configuration is a valid object

Invalid configuration updates are rejected and logged to the console.

### Requirements Mapping

- **Requirement 4.1**: Load ATLAS endpoint configurations at application startup
- **Requirement 4.2**: Support multiple environment configurations (development, staging, production)
- **Requirement 4.4**: Provide methods to retrieve ATLAS base URL and service-specific endpoints
- **Requirement 4.5**: Support runtime configuration updates
- **Requirement 4.6**: Validate ATLAS endpoint URLs before using them
- **Requirement 4.7**: Notify dependent services when configuration changes

### Testing

The service includes comprehensive unit tests covering:
- Configuration loading
- Environment detection
- Base URL and endpoint retrieval
- Feature flag checking
- Runtime configuration updates
- Configuration validation
- Observable notifications

Run tests with:
```bash
npm test -- --include='**/atlas-config.service.spec.ts'
```

All 33 tests pass successfully.
