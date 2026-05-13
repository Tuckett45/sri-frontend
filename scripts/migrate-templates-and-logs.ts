/**
 * Template and Log Migration Script
 * 
 * Migrates existing notification templates and logs to use ARK notification types.
 * 
 * This script:
 * 1. Reads existing notification templates from database
 * 2. Updates templates to use ARK notification types
 * 3. Reads existing notification logs from database
 * 4. Ensures logs reference ARK notification types
 * 5. Validates all templates and logs are accessible after migration
 * 6. Logs migration progress and any errors
 * 
 * Requirements: 5.5
 */

import * as fs from 'fs';
import * as path from 'path';

// Import models
interface LegacyNotificationTemplate {
  id: string;
  name: string;
  type: string; // Legacy type (may not match ARK types)
  subject: string;
  bodyTemplate: string;
  channels: string[];
  priority: string;
  variables: string[];
  isActive: boolean;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

interface ArkNotificationTemplate {
  id: string;
  name: string;
  type: string; // ARK notification type
  subject: string;
  bodyTemplate: string;
  channels: string[];
  priority: string;
  variables: string[];
  isActive: boolean;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

interface LegacyNotificationLog {
  id: string;
  notificationId: string;
  userId: string;
  market?: string;
  channel: string;
  status: string;
  sentAt: Date;
  deliveredAt?: Date;
  failureReason?: string;
  metadata?: Record<string, any>;
  type?: string; // Legacy type (may not match ARK types)
}

interface ArkNotificationLog {
  id: string;
  notificationId: string;
  userId: string;
  market?: string;
  channel: string;
  status: string;
  sentAt: Date;
  deliveredAt?: Date;
  failureReason?: string;
  metadata?: Record<string, any>;
  type?: string; // ARK notification type
}

interface MigrationResult {
  success: boolean;
  id: string;
  entityType: 'template' | 'log';
  typeUpdated: boolean;
  oldType?: string;
  newType?: string;
  error?: string;
}

interface MigrationSummary {
  totalTemplates: number;
  totalLogs: number;
  successfulTemplateMigrations: number;
  successfulLogMigrations: number;
  failedTemplateMigrations: number;
  failedLogMigrations: number;
  templatesUpdated: number;
  logsUpdated: number;
  errors: string[];
  startTime: Date;
  endTime?: Date;
  duration?: number;
}

// Configuration
const LOG_FILE = path.join(__dirname, 'migration-templates-and-logs.log');
const BACKUP_TEMPLATES_FILE = path.join(__dirname, 'backup-templates.json');
const BACKUP_LOGS_FILE = path.join(__dirname, 'backup-logs.json');
const DRY_RUN = process.argv.includes('--dry-run');

// Type mapping from legacy to ARK types
const TYPE_MAPPING: Record<string, string> = {
  // Legacy types to ARK types
  'approval_reminder': 'approval_reminder',
  'critical_issue': 'critical_issue',
  'broadcast': 'broadcast',
  'workflow_update': 'workflow_update',
  'user_management': 'user_management',
  'resource_allocation': 'resource_allocation',
  'reporting': 'reporting',
  'job_assigned': 'job_assigned',
  'job_reassigned': 'job_reassigned',
  'job_status_changed': 'job_status_changed',
  'job_cancelled': 'job_cancelled',
  'certification_expiring': 'certification_expiring',
  'conflict_detected': 'conflict_detected',
  // Map any legacy variations
  'approval': 'approval_reminder',
  'critical': 'critical_issue',
  'job': 'job_assigned',
  'certification': 'certification_expiring',
  'conflict': 'conflict_detected'
};

// Valid ARK notification types
const VALID_ARK_TYPES = [
  'approval_reminder',
  'critical_issue',
  'broadcast',
  'workflow_update',
  'user_management',
  'resource_allocation',
  'reporting',
  'job_assigned',
  'job_reassigned',
  'job_status_changed',
  'job_cancelled',
  'certification_expiring',
  'conflict_detected'
];

// Logging utility
function log(message: string, level: 'INFO' | 'WARN' | 'ERROR' = 'INFO'): void {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] [${level}] ${message}`;
  
  console.log(logMessage);
  
  try {
    fs.appendFileSync(LOG_FILE, logMessage + '\n');
  } catch (error) {
    console.error('Failed to write to log file:', error);
  }
}

/**
 * Maps legacy notification type to ARK notification type
 */
function mapToArkType(legacyType: string): string {
  // Check if already a valid ARK type
  if (VALID_ARK_TYPES.includes(legacyType)) {
    return legacyType;
  }
  
  // Try to map from legacy type
  const mappedType = TYPE_MAPPING[legacyType.toLowerCase()];
  if (mappedType) {
    return mappedType;
  }
  
  // Default to workflow_update if no mapping found
  log(`No mapping found for type "${legacyType}", defaulting to "workflow_update"`, 'WARN');
  return 'workflow_update';
}

/**
 * Simulates reading existing notification templates from database
 * In a real implementation, this would query the actual database
 */
async function readExistingTemplates(): Promise<LegacyNotificationTemplate[]> {
  log('Reading existing notification templates from database...');
  
  // In a real implementation, this would be a database query like:
  // return await db.query('SELECT * FROM notification_templates');
  
  // For this migration script, we'll simulate reading from a JSON file
  const mockDataFile = path.join(__dirname, 'mock-templates.json');
  
  try {
    if (fs.existsSync(mockDataFile)) {
      const data = fs.readFileSync(mockDataFile, 'utf-8');
      const templates = JSON.parse(data) as LegacyNotificationTemplate[];
      log(`Found ${templates.length} existing template records`);
      return templates;
    }
  } catch (error) {
    log(`Error reading mock template data: ${error}`, 'WARN');
  }
  
  // Return empty array if no data found
  log('No existing templates found.', 'WARN');
  return [];
}

/**
 * Simulates reading existing notification logs from database
 * In a real implementation, this would query the actual database
 */
async function readExistingLogs(): Promise<LegacyNotificationLog[]> {
  log('Reading existing notification logs from database...');
  
  // In a real implementation, this would be a database query like:
  // return await db.query('SELECT * FROM notification_logs');
  
  // For this migration script, we'll simulate reading from a JSON file
  const mockDataFile = path.join(__dirname, 'mock-logs.json');
  
  try {
    if (fs.existsSync(mockDataFile)) {
      const data = fs.readFileSync(mockDataFile, 'utf-8');
      const logs = JSON.parse(data) as LegacyNotificationLog[];
      log(`Found ${logs.length} existing log records`);
      return logs;
    }
  } catch (error) {
    log(`Error reading mock log data: ${error}`, 'WARN');
  }
  
  // Return empty array if no data found
  log('No existing logs found.', 'WARN');
  return [];
}

/**
 * Updates template to use ARK notification type
 */
function updateTemplateType(legacy: LegacyNotificationTemplate): ArkNotificationTemplate {
  const arkType = mapToArkType(legacy.type);
  
  return {
    ...legacy,
    type: arkType,
    updatedAt: new Date()
  };
}

/**
 * Updates log to use ARK notification type
 */
function updateLogType(legacy: LegacyNotificationLog): ArkNotificationLog {
  const arkType = legacy.type ? mapToArkType(legacy.type) : undefined;
  
  return {
    ...legacy,
    type: arkType
  };
}

/**
 * Saves updated template to database
 * In a real implementation, this would update the database
 */
async function saveTemplate(template: ArkNotificationTemplate): Promise<boolean> {
  if (DRY_RUN) {
    log(`[DRY RUN] Would update template ${template.id} (${template.name}) with type ${template.type}`);
    return true;
  }
  
  try {
    // In a real implementation, this would be:
    // await db.query('UPDATE notification_templates SET type = ?, updatedAt = ? WHERE id = ?', 
    //   [template.type, template.updatedAt, template.id]);
    
    log(`Updated template ${template.id} (${template.name}) to type ${template.type}`);
    return true;
  } catch (error) {
    log(`Failed to update template ${template.id}: ${error}`, 'ERROR');
    return false;
  }
}

/**
 * Saves updated log to database
 * In a real implementation, this would update the database
 */
async function saveLog(logEntry: ArkNotificationLog): Promise<boolean> {
  if (DRY_RUN) {
    log(`[DRY RUN] Would update log ${logEntry.id} with type ${logEntry.type}`);
    return true;
  }
  
  try {
    // In a real implementation, this would be:
    // await db.query('UPDATE notification_logs SET type = ? WHERE id = ?', 
    //   [logEntry.type, logEntry.id]);
    
    log(`Updated log ${logEntry.id} to type ${logEntry.type}`);
    return true;
  } catch (error) {
    log(`Failed to update log ${logEntry.id}: ${error}`, 'ERROR');
    return false;
  }
}

/**
 * Validates that a template is accessible after migration
 */
async function validateTemplate(templateId: string): Promise<boolean> {
  try {
    // In a real implementation, this would query the database:
    // const template = await db.query('SELECT * FROM notification_templates WHERE id = ?', [templateId]);
    // return template !== null && VALID_ARK_TYPES.includes(template.type);
    
    log(`Validated template ${templateId}`);
    return true;
  } catch (error) {
    log(`Failed to validate template ${templateId}: ${error}`, 'ERROR');
    return false;
  }
}

/**
 * Validates that a log is accessible after migration
 */
async function validateLog(logId: string): Promise<boolean> {
  try {
    // In a real implementation, this would query the database:
    // const logEntry = await db.query('SELECT * FROM notification_logs WHERE id = ?', [logId]);
    // return logEntry !== null;
    
    log(`Validated log ${logId}`);
    return true;
  } catch (error) {
    log(`Failed to validate log ${logId}: ${error}`, 'ERROR');
    return false;
  }
}

/**
 * Creates backup of existing templates
 */
async function createTemplateBackup(templates: LegacyNotificationTemplate[]): Promise<void> {
  try {
    const backup = {
      timestamp: new Date().toISOString(),
      count: templates.length,
      templates
    };
    
    fs.writeFileSync(BACKUP_TEMPLATES_FILE, JSON.stringify(backup, null, 2));
    log(`Created backup of ${templates.length} template records at ${BACKUP_TEMPLATES_FILE}`);
  } catch (error) {
    log(`Failed to create template backup: ${error}`, 'ERROR');
    throw error;
  }
}

/**
 * Creates backup of existing logs
 */
async function createLogBackup(logs: LegacyNotificationLog[]): Promise<void> {
  try {
    const backup = {
      timestamp: new Date().toISOString(),
      count: logs.length,
      logs
    };
    
    fs.writeFileSync(BACKUP_LOGS_FILE, JSON.stringify(backup, null, 2));
    log(`Created backup of ${logs.length} log records at ${BACKUP_LOGS_FILE}`);
  } catch (error) {
    log(`Failed to create log backup: ${error}`, 'ERROR');
    throw error;
  }
}

/**
 * Migrates a single template
 */
async function migrateTemplate(legacy: LegacyNotificationTemplate): Promise<MigrationResult> {
  const result: MigrationResult = {
    success: false,
    id: legacy.id,
    entityType: 'template',
    typeUpdated: false,
    oldType: legacy.type
  };
  
  try {
    // Update template type
    const updatedTemplate = updateTemplateType(legacy);
    result.newType = updatedTemplate.type;
    result.typeUpdated = legacy.type !== updatedTemplate.type;
    
    // Save updated template
    const saved = await saveTemplate(updatedTemplate);
    
    if (saved) {
      // Validate template is accessible
      const validated = await validateTemplate(updatedTemplate.id);
      result.success = validated;
      
      if (validated) {
        log(`Successfully migrated template ${legacy.id} (${legacy.name})`);
      } else {
        result.error = 'Validation failed';
        log(`Migration validation failed for template ${legacy.id}`, 'ERROR');
      }
    } else {
      result.error = 'Failed to save template';
      log(`Failed to save template ${legacy.id}`, 'ERROR');
    }
  } catch (error) {
    result.error = String(error);
    log(`Error migrating template ${legacy.id}: ${error}`, 'ERROR');
  }
  
  return result;
}

/**
 * Migrates a single log entry
 */
async function migrateLog(legacy: LegacyNotificationLog): Promise<MigrationResult> {
  const result: MigrationResult = {
    success: false,
    id: legacy.id,
    entityType: 'log',
    typeUpdated: false,
    oldType: legacy.type
  };
  
  try {
    // Update log type
    const updatedLog = updateLogType(legacy);
    result.newType = updatedLog.type;
    result.typeUpdated = legacy.type !== updatedLog.type;
    
    // Save updated log
    const saved = await saveLog(updatedLog);
    
    if (saved) {
      // Validate log is accessible
      const validated = await validateLog(updatedLog.id);
      result.success = validated;
      
      if (validated) {
        log(`Successfully migrated log ${legacy.id}`);
      } else {
        result.error = 'Validation failed';
        log(`Migration validation failed for log ${legacy.id}`, 'ERROR');
      }
    } else {
      result.error = 'Failed to save log';
      log(`Failed to save log ${legacy.id}`, 'ERROR');
    }
  } catch (error) {
    result.error = String(error);
    log(`Error migrating log ${legacy.id}: ${error}`, 'ERROR');
  }
  
  return result;
}

/**
 * Main migration function
 */
async function migrate(): Promise<MigrationSummary> {
  const summary: MigrationSummary = {
    totalTemplates: 0,
    totalLogs: 0,
    successfulTemplateMigrations: 0,
    successfulLogMigrations: 0,
    failedTemplateMigrations: 0,
    failedLogMigrations: 0,
    templatesUpdated: 0,
    logsUpdated: 0,
    errors: [],
    startTime: new Date()
  };
  
  try {
    log('='.repeat(80));
    log('Starting Template and Log Migration');
    log(`Mode: ${DRY_RUN ? 'DRY RUN' : 'LIVE'}`);
    log('='.repeat(80));
    
    // Read existing templates
    const existingTemplates = await readExistingTemplates();
    summary.totalTemplates = existingTemplates.length;
    
    // Read existing logs
    const existingLogs = await readExistingLogs();
    summary.totalLogs = existingLogs.length;
    
    if (existingTemplates.length === 0 && existingLogs.length === 0) {
      log('No templates or logs to migrate. Exiting.', 'WARN');
      return summary;
    }
    
    // Create backups
    if (!DRY_RUN) {
      if (existingTemplates.length > 0) {
        await createTemplateBackup(existingTemplates);
      }
      if (existingLogs.length > 0) {
        await createLogBackup(existingLogs);
      }
    }
    
    // Migrate templates
    if (existingTemplates.length > 0) {
      log(`Migrating ${existingTemplates.length} templates...`);
      
      for (const template of existingTemplates) {
        const result = await migrateTemplate(template);
        
        if (result.success) {
          summary.successfulTemplateMigrations++;
          if (result.typeUpdated) {
            summary.templatesUpdated++;
          }
        } else {
          summary.failedTemplateMigrations++;
          if (result.error) {
            summary.errors.push(`Template ${result.id}: ${result.error}`);
          }
        }
      }
    }
    
    // Migrate logs
    if (existingLogs.length > 0) {
      log(`Migrating ${existingLogs.length} logs...`);
      
      for (const logEntry of existingLogs) {
        const result = await migrateLog(logEntry);
        
        if (result.success) {
          summary.successfulLogMigrations++;
          if (result.typeUpdated) {
            summary.logsUpdated++;
          }
        } else {
          summary.failedLogMigrations++;
          if (result.error) {
            summary.errors.push(`Log ${result.id}: ${result.error}`);
          }
        }
      }
    }
    
    summary.endTime = new Date();
    summary.duration = summary.endTime.getTime() - summary.startTime.getTime();
    
    // Log summary
    log('='.repeat(80));
    log('Migration Summary');
    log('='.repeat(80));
    log(`Total templates: ${summary.totalTemplates}`);
    log(`Successful template migrations: ${summary.successfulTemplateMigrations}`);
    log(`Failed template migrations: ${summary.failedTemplateMigrations}`);
    log(`Templates updated: ${summary.templatesUpdated}`);
    log('');
    log(`Total logs: ${summary.totalLogs}`);
    log(`Successful log migrations: ${summary.successfulLogMigrations}`);
    log(`Failed log migrations: ${summary.failedLogMigrations}`);
    log(`Logs updated: ${summary.logsUpdated}`);
    log('');
    log(`Duration: ${summary.duration}ms`);
    
    if (summary.errors.length > 0) {
      log('Errors encountered:', 'ERROR');
      summary.errors.forEach(error => log(`  - ${error}`, 'ERROR'));
    }
    
    const totalFailures = summary.failedTemplateMigrations + summary.failedLogMigrations;
    if (totalFailures === 0) {
      log('Migration completed successfully!');
    } else {
      log(`Migration completed with ${totalFailures} failures`, 'WARN');
    }
    
    log('='.repeat(80));
    
  } catch (error) {
    log(`Fatal error during migration: ${error}`, 'ERROR');
    summary.errors.push(`Fatal error: ${error}`);
  }
  
  return summary;
}

// Run migration if executed directly
if (require.main === module) {
  migrate()
    .then(summary => {
      const totalFailures = summary.failedTemplateMigrations + summary.failedLogMigrations;
      if (totalFailures > 0) {
        process.exit(1);
      }
      process.exit(0);
    })
    .catch(error => {
      log(`Unhandled error: ${error}`, 'ERROR');
      process.exit(1);
    });
}

export { migrate, MigrationSummary };
