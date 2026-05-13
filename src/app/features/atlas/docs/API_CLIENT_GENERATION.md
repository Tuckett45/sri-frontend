# API Client Generation Guide

## Overview

This guide explains how to generate TypeScript API clients for new ATLAS microservices using the OpenAPI specification. The ATLAS integration uses a code-first approach where TypeScript models and services are generated from OpenAPI/Swagger specifications.

## Prerequisites

- Node.js 18+ installed
- Access to ATLAS OpenAPI specification files
- Understanding of OpenAPI 3.0 specification format

## Tools

### OpenAPI Generator

We use `@openapitools/openapi-generator-cli` for generating TypeScript clients.

```bash
# Install globally
npm install -g @openapitools/openapi-generator-cli

# Or use npx (recommended)
npx @openapitools/openapi-generator-cli version
```

### Alternative: NSwag

For .NET-based ATLAS services, NSwag can also be used:

```bash
# Install NSwag CLI
dotnet tool install -g NSwag.ConsoleCore
```

## Generation Process

### Step 1: Obtain OpenAPI Specification

Get the OpenAPI spec from the ATLAS service:

```bash
# Download from running service
curl https://atlas-api.example.com/swagger/v1/swagger.json -o atlas-api.json

# Or from source repository
cp /path/to/atlas-service/swagger.json .kiro/specs/atlas-api.json
```

### Step 2: Configure Generator

Create a configuration file for the generator:

```yaml
# openapi-config.yaml
generatorName: typescript-angular
inputSpec: .kiro/specs/atlas-api.json
outputDir: src/app/features/atlas/generated
additionalProperties:
  ngVersion: "18.2.6"
  npmName: "@atlas/api-client"
  npmVersion: "1.0.0"
  snapshot: false
  providedInRoot: true
  withInterfaces: true
  useSingleRequestParameter: false
```

### Step 3: Generate Client Code

```bash
# Using config file
npx @openapitools/openapi-generator-cli generate -c openapi-config.yaml

# Or with inline parameters
npx @openapitools/openapi-generator-cli generate \
  -i .kiro/specs/atlas-api.json \
  -g typescript-angular \
  -o src/app/features/atlas/generated \
  --additional-properties=ngVersion=18.2.6,providedInRoot=true
```

### Step 4: Review Generated Code

The generator creates:

```
src/app/features/atlas/generated/
├── model/              # TypeScript interfaces
│   ├── deployment-dto.ts
│   ├── lifecycle-state.ts
│   └── ...
├── api/                # Service classes
│   ├── deployments.service.ts
│   ├── ai-analysis.service.ts
│   └── ...
├── variables.ts        # Configuration
├── configuration.ts    # API configuration
├── encoder.ts          # Parameter encoding
└── index.ts            # Public API exports
```


## Customizing Generated Code

### Step 5: Integrate with Existing Services

Don't use generated services directly. Instead, wrap them in custom services:

```typescript
// services/deployment.service.ts
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { DeploymentsService as GeneratedDeploymentsService } from '../generated/api/deployments.service';
import { DeploymentDto, CreateDeploymentRequest } from '../generated/model/models';
import { AtlasErrorHandlerService } from './atlas-error-handler.service';

/**
 * Custom wrapper around generated deployment service.
 * Adds error handling, caching, and business logic.
 */
@Injectable({ providedIn: 'root' })
export class DeploymentService {
  constructor(
    private generatedService: GeneratedDeploymentsService,
    private errorHandler: AtlasErrorHandlerService
  ) {}

  getDeployments(params?: any): Observable<PagedResult<DeploymentDto>> {
    return this.generatedService.getDeployments(
      params?.state,
      params?.type,
      params?.page,
      params?.pageSize
    ).pipe(
      catchError(this.errorHandler.handleError)
    );
  }

  createDeployment(request: CreateDeploymentRequest): Observable<DeploymentDto> {
    return this.generatedService.createDeployment(request).pipe(
      catchError(this.errorHandler.handleError)
    );
  }
}
```

### Step 6: Map Generated Models to Domain Models

Create domain-specific models that extend or transform generated models:

```typescript
// models/deployment.model.ts
import { DeploymentDto as GeneratedDeploymentDto } from '../generated/model/deployment-dto';

/**
 * Extended deployment model with computed properties and methods.
 */
export interface DeploymentDto extends GeneratedDeploymentDto {
  // Add computed properties
  displayName?: string;
  isEditable?: boolean;
}

/**
 * Transform generated DTO to domain model.
 */
export function toDeploymentModel(dto: GeneratedDeploymentDto): DeploymentDto {
  return {
    ...dto,
    displayName: `${dto.type} - ${dto.title}`,
    isEditable: dto.currentState === 'DRAFT'
  };
}
```

## Handling API Changes

### Versioning Strategy

When the ATLAS API changes:

1. **Minor changes** (new optional fields): Regenerate and test
2. **Major changes** (breaking changes): Create new version

```bash
# Generate to versioned directory
npx @openapitools/openapi-generator-cli generate \
  -i .kiro/specs/atlas-api-v2.json \
  -g typescript-angular \
  -o src/app/features/atlas/generated/v2
```

### Migration Script

Create a script to automate regeneration:

```bash
#!/bin/bash
# scripts/generate-atlas-client.sh

echo "Generating ATLAS API client..."

# Backup existing generated code
if [ -d "src/app/features/atlas/generated" ]; then
  mv src/app/features/atlas/generated src/app/features/atlas/generated.backup
fi

# Generate new client
npx @openapitools/openapi-generator-cli generate \
  -i .kiro/specs/atlas-api.json \
  -g typescript-angular \
  -o src/app/features/atlas/generated \
  --additional-properties=ngVersion=18.2.6,providedInRoot=true

# Run linter
npm run lint -- --fix src/app/features/atlas/generated

# Run tests
npm test -- --include='**/generated/**/*.spec.ts'

echo "Client generation complete!"
```

Make it executable:

```bash
chmod +x scripts/generate-atlas-client.sh
```

## Custom Templates

### Creating Custom Templates

Override default templates for more control:

```bash
# Get default templates
npx @openapitools/openapi-generator-cli author template \
  -g typescript-angular \
  -o templates/typescript-angular

# Modify templates in templates/typescript-angular/

# Generate with custom templates
npx @openapitools/openapi-generator-cli generate \
  -i .kiro/specs/atlas-api.json \
  -g typescript-angular \
  -o src/app/features/atlas/generated \
  -t templates/typescript-angular
```

### Example: Custom Service Template

```mustache
// templates/typescript-angular/api.service.mustache
import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { AtlasErrorHandlerService } from '../services/atlas-error-handler.service';

/**
 * {{description}}
 * @generated
 */
@Injectable({ providedIn: 'root' })
export class {{classname}} {
  private basePath = '{{basePath}}';

  constructor(
    private http: HttpClient,
    private errorHandler: AtlasErrorHandlerService
  ) {}

  {{#operations}}
  {{#operation}}
  /**
   * {{summary}}
   * {{notes}}
   {{#allParams}}
   * @param {{paramName}} {{description}}
   {{/allParams}}
   * @returns {{returnType}}
   */
  {{nickname}}({{#allParams}}{{paramName}}{{^required}}?{{/required}}: {{dataType}}{{^-last}}, {{/-last}}{{/allParams}}): Observable<{{returnType}}> {
    return this.http.{{httpMethod}}{{^isBodyParam}}<{{returnType}}>{{/isBodyParam}}(
      `${this.basePath}{{path}}`,
      {{#isBodyParam}}{{paramName}},{{/isBodyParam}}
      { /* options */ }
    ).pipe(
      catchError(this.errorHandler.handleError)
    );
  }
  {{/operation}}
  {{/operations}}
}
```

## Best Practices

### DO

✅ **Version control the OpenAPI spec** - Keep specs in `.kiro/specs/`
✅ **Wrap generated services** - Add error handling and business logic
✅ **Use custom models** - Extend generated models with domain logic
✅ **Automate generation** - Create scripts for regeneration
✅ **Test after regeneration** - Run full test suite
✅ **Review generated code** - Check for breaking changes

### DON'T

❌ **Modify generated code directly** - Changes will be lost on regeneration
❌ **Commit generated code** - Add to `.gitignore` and generate on build
❌ **Use generated services directly** - Always wrap in custom services
❌ **Skip testing** - Always test after regeneration
❌ **Ignore breaking changes** - Review API changes carefully

## Troubleshooting

### Issue: Generation fails with validation errors

**Solution**: Validate OpenAPI spec first

```bash
npx @openapitools/openapi-generator-cli validate -i .kiro/specs/atlas-api.json
```

### Issue: Generated code has TypeScript errors

**Solution**: Update generator version or fix spec

```bash
# Update generator
npm install -g @openapitools/openapi-generator-cli@latest

# Check for spec issues
npx swagger-cli validate .kiro/specs/atlas-api.json
```

### Issue: Generated services don't match API behavior

**Solution**: Verify spec matches actual API

```bash
# Test API endpoint
curl -X GET https://atlas-api.example.com/v1/deployments

# Compare with spec
```

### Issue: Circular dependencies in generated code

**Solution**: Use `--skip-validate-spec` or fix spec

```bash
npx @openapitools/openapi-generator-cli generate \
  -i .kiro/specs/atlas-api.json \
  -g typescript-angular \
  -o src/app/features/atlas/generated \
  --skip-validate-spec
```

## Alternative: Manual Client Creation

For simple APIs or when generation isn't suitable:

```typescript
// services/simple-api.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class SimpleApiService {
  private baseUrl = '/v1/simple';

  constructor(private http: HttpClient) {}

  getItems(): Observable<Item[]> {
    return this.http.get<Item[]>(`${this.baseUrl}/items`);
  }

  getItem(id: string): Observable<Item> {
    return this.http.get<Item>(`${this.baseUrl}/items/${id}`);
  }

  createItem(item: CreateItemRequest): Observable<Item> {
    return this.http.post<Item>(`${this.baseUrl}/items`, item);
  }
}
```

## NPM Scripts

Add these scripts to `package.json`:

```json
{
  "scripts": {
    "generate:atlas-client": "bash scripts/generate-atlas-client.sh",
    "validate:openapi": "npx @openapitools/openapi-generator-cli validate -i .kiro/specs/atlas-api.json",
    "update:openapi": "curl https://atlas-api.example.com/swagger/v1/swagger.json -o .kiro/specs/atlas-api.json && npm run generate:atlas-client"
  }
}
```

## Resources

- [OpenAPI Generator Documentation](https://openapi-generator.tech/docs/generators/typescript-angular)
- [OpenAPI Specification](https://swagger.io/specification/)
- [NSwag Documentation](https://github.com/RicoSuter/NSwag)
- [Swagger Editor](https://editor.swagger.io/) - For editing OpenAPI specs
- [Swagger Validator](https://validator.swagger.io/) - For validating specs
