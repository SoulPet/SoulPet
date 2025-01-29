'use client';

import { Notification, NotificationPriority, NotificationType } from './types';

export interface ExportConfig {
  format: 'json' | 'csv' | 'xml';
  compression?: boolean;
  encryption?: {
    enabled: boolean;
    password?: string;
  };
  dateRange?: {
    start: Date;
    end: Date;
  };
  includeMetadata?: boolean;
  excludeFields?: string[];
}

export interface ImportConfig {
  format: 'json' | 'csv' | 'xml';
  compression?: boolean;
  encryption?: {
    enabled: boolean;
    password?: string;
  };
  conflictResolution: 'skip' | 'overwrite' | 'duplicate';
  validateData?: boolean;
  batchSize?: number;
}

export interface ExportResult {
  data: string | Blob;
  format: string;
  timestamp: Date;
  metadata: {
    totalCount: number;
    fileSize: number;
    compressed: boolean;
    encrypted: boolean;
    dateRange?: {
      start: Date;
      end: Date;
    };
  };
}

export interface ImportResult {
  success: boolean;
  totalProcessed: number;
  imported: number;
  skipped: number;
  errors: Array<{
    index: number;
    error: string;
    data?: unknown;
  }>;
  metadata?: {
    format: string;
    timestamp: Date;
    originalCount: number;
  };
}

interface ExportTemplate {
  id: string;
  name: string;
  description?: string;
  config: {
    format: 'json' | 'csv' | 'xml';
    compression?: boolean;
    encryption?: {
      enabled: boolean;
      algorithm?: string;
      key?: string;
    };
    includeMetadata?: boolean;
    dateFormat?: string;
    fields?: string[];
  };
}

interface ExportProgress {
  total: number;
  current: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  startTime: Date;
  endTime?: Date;
  error?: string;
}

interface ExportHistory {
  id: string;
  timestamp: Date;
  config: ExportConfig;
  result: ExportResult;
  duration: number;
}

interface BackupConfig {
  enabled: boolean;
  interval: number; // milliseconds
  maxBackups: number;
  path: string;
  format: 'json' | 'csv' | 'xml';
  compression: boolean;
  encryption?: {
    enabled: boolean;
    password: string;
  };
}

interface NotificationAction {
  id: string;
  label: string;
  handler?: () => void;
}

interface NotificationValidation {
  id?: string;
  type?: NotificationType;
  priority?: NotificationPriority;
  title?: string;
  message?: string;
  timestamp?: Date;
  read?: boolean;
  group?: string;
  expiresAt?: Date;
  data?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  actions?: NotificationAction[];
}

export class NotificationExport {
  private static instance: NotificationExport;
  private templates: Map<string, ExportTemplate> = new Map();
  private currentProgress: ExportProgress | null = null;
  private exportHistory: ExportHistory[] = [];
  private maxHistorySize: number = 100;
  private backupConfig: BackupConfig = {
    enabled: false,
    interval: 24 * 60 * 60 * 1000, // 24 hours
    maxBackups: 7,
    path: '/backups',
    format: 'json',
    compression: true,
  };
  private backupInterval: NodeJS.Timeout | null = null;
  private lastExportTimestamp: Date | null = null;

  private constructor() {
    this.initializeDefaultTemplates();
    this.setupAutoBackup();
  }

  private initializeDefaultTemplates(): void {
    this.templates.set('default', {
      id: 'default',
      name: 'Default Export',
      description: 'Full notification export with all fields',
      config: {
        format: 'json',
        compression: true,
        encryption: {
          enabled: false,
        },
        includeMetadata: true,
        dateFormat: 'ISO',
      },
    });

    this.templates.set('minimal', {
      id: 'minimal',
      name: 'Minimal Export',
      description: 'Basic notification data without metadata',
      config: {
        format: 'json',
        compression: false,
        encryption: {
          enabled: false,
        },
        includeMetadata: false,
        fields: [
          'id',
          'type',
          'priority',
          'title',
          'message',
          'timestamp',
          'read',
        ],
      },
    });
  }

  static getInstance(): NotificationExport {
    if (!NotificationExport.instance) {
      NotificationExport.instance = new NotificationExport();
    }
    return NotificationExport.instance;
  }

  /**
   * Configure auto backup
   */
  configureBackup(config: Partial<BackupConfig>): void {
    this.backupConfig = { ...this.backupConfig, ...config };
    this.setupAutoBackup();
  }

  private setupAutoBackup(): void {
    if (this.backupInterval) {
      clearInterval(this.backupInterval);
    }

    if (this.backupConfig.enabled) {
      this.backupInterval = setInterval(
        () => this.performAutoBackup(),
        this.backupConfig.interval
      );
    }
  }

  private async performAutoBackup(): Promise<void> {
    try {
      // Get notifications since last backup
      const notifications = await this.getNotificationsSinceLastBackup();
      if (notifications.length === 0) return;

      const result = await this.exportNotifications(notifications, {
        format: this.backupConfig.format,
        compression: this.backupConfig.compression,
        encryption: this.backupConfig.encryption,
        includeMetadata: true,
      });

      await this.saveBackup(result);
      await this.cleanupOldBackups();
      this.lastExportTimestamp = new Date();
    } catch (error) {
      console.error('Auto backup failed:', error);
    }
  }

  private async getNotificationsSinceLastBackup(): Promise<Notification[]> {
    // Implementation depends on how notifications are stored
    return [];
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  private async saveBackup(_result: ExportResult): Promise<void> {
    // Save backup file (implementation depends on environment)
  }

  private async cleanupOldBackups(): Promise<void> {
    // Implementation depends on environment
  }

  /**
   * Add export template
   */
  addTemplate(template: ExportTemplate): void {
    this.templates.set(template.id, template);
  }

  /**
   * Remove export template
   */
  removeTemplate(templateId: string): boolean {
    return this.templates.delete(templateId);
  }

  /**
   * Get export template
   */
  getTemplate(templateId: string): ExportTemplate | undefined {
    return this.templates.get(templateId);
  }

  /**
   * Get all export templates
   */
  getAllTemplates(): ExportTemplate[] {
    return Array.from(this.templates.values());
  }

  /**
   * Get export progress
   */
  getProgress(): ExportProgress | null {
    return this.currentProgress;
  }

  /**
   * Get export history
   */
  getExportHistory(): ExportHistory[] {
    return [...this.exportHistory];
  }

  /**
   * Clear export history
   */
  clearExportHistory(): void {
    this.exportHistory = [];
  }

  /**
   * Perform incremental export
   */
  async incrementalExport(
    notifications: Notification[],
    config: ExportConfig & { lastExportTime?: Date }
  ): Promise<ExportResult> {
    try {
      // Filter notifications based on last export time
      let filteredNotifications = notifications;
      if (config.lastExportTime) {
        filteredNotifications = notifications.filter(
          (n) => n.timestamp > config.lastExportTime!
        );
      }

      // Start progress tracking
      this.currentProgress = {
        total: filteredNotifications.length,
        current: 0,
        status: 'processing',
        startTime: new Date(),
      };

      const result = await this.exportNotifications(
        filteredNotifications,
        config
      );

      // Update progress
      this.currentProgress.status = 'completed';
      this.currentProgress.endTime = new Date();

      // Add to history
      this.addToHistory({
        id: crypto.randomUUID(),
        timestamp: new Date(),
        config,
        result,
        duration:
          this.currentProgress.endTime.getTime() -
          this.currentProgress.startTime.getTime(),
      });

      return result;
    } catch (error) {
      if (this.currentProgress) {
        this.currentProgress.status = 'failed';
        this.currentProgress.error = (error as Error).message;
      }
      throw error;
    }
  }

  private addToHistory(entry: ExportHistory): void {
    this.exportHistory.unshift(entry);
    if (this.exportHistory.length > this.maxHistorySize) {
      this.exportHistory = this.exportHistory.slice(0, this.maxHistorySize);
    }
  }

  /**
   * Export notifications to file
   */
  async exportNotifications(
    notifications: Notification[],
    config: ExportConfig
  ): Promise<ExportResult> {
    try {
      // Update progress
      this.currentProgress = {
        total: notifications.length,
        current: 0,
        status: 'processing',
        startTime: new Date(),
      };

      // Filter notifications by date range if specified
      let filteredNotifications = notifications;
      if (config.dateRange) {
        filteredNotifications = notifications.filter(
          (n) =>
            n.timestamp >= config.dateRange!.start &&
            n.timestamp <= config.dateRange!.end
        );
      }

      // Remove excluded fields if specified
      if (config.excludeFields?.length) {
        filteredNotifications = this.removeExcludedFields(
          filteredNotifications,
          config.excludeFields
        );
      }

      // Convert to specified format
      let data = await this.convertToFormat(
        filteredNotifications,
        config.format,
        (progress) => {
          if (this.currentProgress) {
            this.currentProgress.current = Math.floor(
              progress * filteredNotifications.length
            );
          }
        }
      );

      // Add metadata if requested
      if (config.includeMetadata) {
        data = this.addMetadata(data, config);
      }

      // Compress if requested
      if (config.compression) {
        data = await this.compressData(data);
      }

      // Encrypt if requested
      if (config.encryption?.enabled) {
        data = await this.encryptData(data, config.encryption.password);
      }

      // Update progress
      if (this.currentProgress) {
        this.currentProgress.status = 'completed';
        this.currentProgress.endTime = new Date();
      }

      const result = {
        data: new Blob([data], { type: this.getContentType(config.format) }),
        format: config.format,
        timestamp: new Date(),
        metadata: {
          totalCount: filteredNotifications.length,
          fileSize: new Blob([data]).size,
          compressed: !!config.compression,
          encrypted: !!config.encryption?.enabled,
          dateRange: config.dateRange,
        },
      };

      // Add to history
      this.addToHistory({
        id: crypto.randomUUID(),
        timestamp: new Date(),
        config,
        result,
        duration: this.currentProgress
          ? this.currentProgress.endTime!.getTime() -
            this.currentProgress.startTime.getTime()
          : 0,
      });

      return result;
    } catch (error: unknown) {
      if (this.currentProgress) {
        this.currentProgress.status = 'failed';
        this.currentProgress.error =
          error instanceof Error ? error.message : 'Unknown error';
      }
      throw new Error(
        `Export failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Import notifications from file
   */
  async importNotifications(
    data: string | Blob,
    config: ImportConfig
  ): Promise<ImportResult> {
    try {
      let content = typeof data === 'string' ? data : await data.text();

      // Decrypt if encrypted
      if (config.encryption?.enabled) {
        content = await this.decryptData(content, config.encryption.password);
      }

      // Decompress if compressed
      if (config.compression) {
        content = await this.decompressData(content);
      }

      // Parse data based on format
      const notifications = await this.parseFormat(content, config.format);

      // Validate data if requested
      if (config.validateData) {
        this.validateNotifications(notifications);
      }

      // Process notifications in batches
      const result = await this.processImport(notifications, config);

      return result;
    } catch (error: unknown) {
      throw new Error(
        `Import failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Validate import file
   */
  async validateImportFile(
    data: string | Blob,
    format: 'json' | 'csv' | 'xml'
  ): Promise<{
    valid: boolean;
    errors: string[];
    metadata?: unknown;
  }> {
    try {
      const content = typeof data === 'string' ? data : await data.text();
      const errors: string[] = [];

      // Check format validity
      if (!this.isValidFormat(content, format)) {
        errors.push(`Invalid ${format.toUpperCase()} format`);
      }

      // Parse and validate structure
      const parsed = await this.parseFormat(content, format);
      if (!Array.isArray(parsed)) {
        errors.push('Data must be an array of notifications');
      }

      // Validate individual notifications
      parsed.forEach((notification, index) => {
        const validationErrors = this.validateNotification(notification);
        if (validationErrors.length > 0) {
          errors.push(
            `Notification at index ${index} has errors: ${validationErrors.join(
              ', '
            )}`
          );
        }
      });

      return {
        valid: errors.length === 0,
        errors,
        metadata: this.extractMetadata(content),
      };
    } catch (error) {
      return {
        valid: false,
        errors: [
          `Validation failed: ${(error as Error).message || 'Unknown error'}`,
        ],
      };
    }
  }

  private async convertToFormat(
    notifications: Notification[],
    format: 'json' | 'csv' | 'xml',
    onProgress?: (progress: number) => void
  ): Promise<string> {
    const total = notifications.length;
    let processed = 0;

    const reportProgress = () => {
      processed++;
      if (onProgress) {
        onProgress(processed / total);
      }
    };

    switch (format) {
      case 'json':
        const json = JSON.stringify(notifications, null, 2);
        reportProgress();
        return json;

      case 'csv':
        const csv = this.convertToCSV(notifications, reportProgress);
        return csv;

      case 'xml':
        const xml = this.convertToXML(notifications, reportProgress);
        return xml;

      default:
        throw new Error(`Unsupported format: ${format}`);
    }
  }

  private async parseFormat(
    content: string,
    format: 'json' | 'csv' | 'xml'
  ): Promise<unknown[]> {
    switch (format) {
      case 'json':
        return JSON.parse(content);
      case 'csv':
        return this.parseCSV(content);
      case 'xml':
        return this.parseXML(content);
      default:
        throw new Error(`Unsupported format: ${format}`);
    }
  }

  private getContentType(format: string): string {
    switch (format) {
      case 'json':
        return 'application/json';
      case 'csv':
        return 'text/csv';
      case 'xml':
        return 'application/xml';
      default:
        return 'application/octet-stream';
    }
  }

  private async compressData(data: string): Promise<string> {
    try {
      // Convert string to Uint8Array
      const textEncoder = new TextEncoder();
      const uint8Array = textEncoder.encode(data);

      // Compress using CompressionStream
      const cs = new CompressionStream('gzip');
      const writer = cs.writable.getWriter();
      await writer.write(uint8Array);
      await writer.close();

      // Read compressed data
      const reader = cs.readable.getReader();
      const chunks = [];
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        chunks.push(value);
      }

      // Combine chunks and convert to base64
      const compressedArray = new Uint8Array(
        chunks.reduce((acc, chunk) => acc + chunk.length, 0)
      );
      let offset = 0;
      for (const chunk of chunks) {
        compressedArray.set(chunk, offset);
        offset += chunk.length;
      }

      return btoa(
        Array.from(compressedArray)
          .map((byte) => String.fromCharCode(byte))
          .join('')
      );
    } catch (error: unknown) {
      console.error('Compression failed:', error);
      return data;
    }
  }

  private async decompressData(data: string): Promise<string> {
    try {
      // Convert base64 to Uint8Array
      const compressedArray = new Uint8Array(
        atob(data)
          .split('')
          .map((char) => char.charCodeAt(0))
      );

      // Decompress using DecompressionStream
      const ds = new DecompressionStream('gzip');
      const writer = ds.writable.getWriter();
      await writer.write(compressedArray);
      await writer.close();

      // Read decompressed data
      const reader = ds.readable.getReader();
      const chunks = [];
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        chunks.push(value);
      }

      // Combine chunks and convert to string
      const decompressedArray = new Uint8Array(
        chunks.reduce((acc, chunk) => acc + chunk.length, 0)
      );
      let offset = 0;
      for (const chunk of chunks) {
        decompressedArray.set(chunk, offset);
        offset += chunk.length;
      }

      const textDecoder = new TextDecoder();
      return textDecoder.decode(decompressedArray);
    } catch (error) {
      console.error('Decompression failed:', error);
      return data;
    }
  }

  private async encryptData(data: string, password?: string): Promise<string> {
    if (!password) return data;

    try {
      // Generate key from password
      const encoder = new TextEncoder();
      const keyMaterial = await crypto.subtle.importKey(
        'raw',
        encoder.encode(password),
        'PBKDF2',
        false,
        ['deriveBits', 'deriveKey']
      );

      // Generate salt
      const salt = crypto.getRandomValues(new Uint8Array(16));

      // Derive key
      const key = await crypto.subtle.deriveKey(
        {
          name: 'PBKDF2',
          salt,
          iterations: 100000,
          hash: 'SHA-256',
        },
        keyMaterial,
        { name: 'AES-GCM', length: 256 },
        false,
        ['encrypt']
      );

      // Generate IV
      const iv = crypto.getRandomValues(new Uint8Array(12));

      // Encrypt data
      const encryptedContent = await crypto.subtle.encrypt(
        {
          name: 'AES-GCM',
          iv,
        },
        key,
        encoder.encode(data)
      );

      // Combine salt, IV, and encrypted data
      const encryptedArray = new Uint8Array(
        salt.length + iv.length + encryptedContent.byteLength
      );
      encryptedArray.set(salt, 0);
      encryptedArray.set(iv, salt.length);
      encryptedArray.set(
        new Uint8Array(encryptedContent),
        salt.length + iv.length
      );

      return btoa(
        Array.from(encryptedArray)
          .map((byte) => String.fromCharCode(byte))
          .join('')
      );
    } catch (error: unknown) {
      console.error('Encryption failed:', error);
      return data;
    }
  }

  private async decryptData(data: string, password?: string): Promise<string> {
    if (!password) return data;

    try {
      // Convert base64 to Uint8Array
      const encryptedArray = new Uint8Array(
        atob(data)
          .split('')
          .map((char) => char.charCodeAt(0))
      );

      // Extract salt, IV, and encrypted data
      const salt = encryptedArray.slice(0, 16);
      const iv = encryptedArray.slice(16, 28);
      const encryptedContent = encryptedArray.slice(28);

      // Generate key from password
      const encoder = new TextEncoder();
      const keyMaterial = await crypto.subtle.importKey(
        'raw',
        encoder.encode(password),
        'PBKDF2',
        false,
        ['deriveBits', 'deriveKey']
      );

      // Derive key
      const key = await crypto.subtle.deriveKey(
        {
          name: 'PBKDF2',
          salt,
          iterations: 100000,
          hash: 'SHA-256',
        },
        keyMaterial,
        { name: 'AES-GCM', length: 256 },
        false,
        ['decrypt']
      );

      // Decrypt data
      const decryptedContent = await crypto.subtle.decrypt(
        {
          name: 'AES-GCM',
          iv,
        },
        key,
        encryptedContent
      );

      const decoder = new TextDecoder();
      return decoder.decode(decryptedContent);
    } catch (error) {
      console.error('Decryption failed:', error);
      return data;
    }
  }

  private convertToCSV(
    notifications: Notification[],
    onProgress?: () => void
  ): string {
    // Define CSV headers
    const headers = [
      'id',
      'type',
      'priority',
      'title',
      'message',
      'timestamp',
      'read',
      'group',
      'data',
    ];

    // Convert notifications to CSV rows
    const rows = notifications.map((notification) => {
      return [
        notification.id,
        notification.type,
        notification.priority,
        this.escapeCSV(notification.title),
        this.escapeCSV(notification.message),
        notification.timestamp.toISOString(),
        notification.read ? 'true' : 'false',
        notification.group || '',
        JSON.stringify(notification.data || {}),
      ];
    });

    // Combine headers and rows
    const csv = [headers.join(','), ...rows.map((row) => row.join(','))].join(
      '\n'
    );

    if (onProgress) {
      notifications.forEach(() => onProgress());
    }
    return csv;
  }

  private convertToXML(
    notifications: Notification[],
    onProgress?: () => void
  ): string {
    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n<notifications>\n';

    notifications.forEach((notification) => {
      xml += '  <notification>\n';
      xml += `    <id>${this.escapeXML(notification.id)}</id>\n`;
      xml += `    <type>${this.escapeXML(notification.type)}</type>\n`;
      xml += `    <priority>${this.escapeXML(
        notification.priority
      )}</priority>\n`;
      xml += `    <title>${this.escapeXML(notification.title)}</title>\n`;
      xml += `    <message>${this.escapeXML(notification.message)}</message>\n`;
      xml += `    <timestamp>${notification.timestamp.toISOString()}</timestamp>\n`;
      xml += `    <read>${notification.read}</read>\n`;
      if (notification.group) {
        xml += `    <group>${this.escapeXML(notification.group)}</group>\n`;
      }
      if (notification.data) {
        xml += `    <data>${this.escapeXML(
          JSON.stringify(notification.data)
        )}</data>\n`;
      }
      xml += '  </notification>\n';
    });

    xml += '</notifications>';
    if (onProgress) {
      notifications.forEach(() => onProgress());
    }
    return xml;
  }

  private parseCSV(content: string): Record<string, unknown>[] {
    const lines = content.split('\n');
    const headers = lines[0].split(',');
    const notifications: Record<string, never>[] = [];

    for (let i = 1; i < lines.length; i++) {
      if (!lines[i].trim()) continue;

      const values = this.parseCSVLine(lines[i]);
      const notification: Record<string, unknown> = {};

      headers.forEach((header, index) => {
        const value = values[index];
        switch (header) {
          case 'timestamp':
            notification[header] = new Date(value);
            break;
          case 'read':
            notification[header] = value.toLowerCase() === 'true';
            break;
          case 'data':
            try {
              notification[header] = JSON.parse(value);
            } catch {
              notification[header] = {};
            }
            break;
          default:
            notification[header] = value;
        }
      });

      notifications.push(notification as Record<string, never>);
    }

    return notifications;
  }

  private parseXML(content: string): never[] {
    const parser = new DOMParser();
    const doc = parser.parseFromString(content, 'application/xml');
    const notifications: unknown[] = [];

    const notificationElements = doc.getElementsByTagName('notification');
    for (let i = 0; i < notificationElements.length; i++) {
      const elem = notificationElements[i];
      const notification: unknown = {};

      // Parse basic fields
      ['id', 'type', 'priority', 'title', 'message', 'group'].forEach(
        (field) => {
          const fieldElem = elem.getElementsByTagName(field)[0];
          if (fieldElem) {
            (notification as Record<string, unknown>)[field] =
              fieldElem.textContent || '';
          }
        }
      );

      // Parse timestamp
      const timestampElem = elem.getElementsByTagName('timestamp')[0];
      if (timestampElem) {
        (notification as Record<string, unknown>).timestamp = new Date(
          timestampElem.textContent || ''
        );
      }

      // Parse read status
      const readElem = elem.getElementsByTagName('read')[0];
      if (readElem) {
        (notification as Record<string, unknown>).read =
          readElem.textContent?.toLowerCase() === 'true';
      }

      // Parse data
      const dataElem = elem.getElementsByTagName('data')[0];
      if (dataElem) {
        try {
          (notification as Record<string, unknown>).data = JSON.parse(
            dataElem.textContent || '{}'
          );
        } catch {
          (notification as Record<string, unknown>).data = {};
        }
      }

      notifications.push(notification);
    }

    return notifications as never[];
  }

  private escapeCSV(str: string): string {
    if (!str) return '';
    str = str.replace(/"/g, '""');
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      str = `"${str}"`;
    }
    return str;
  }

  private escapeXML(str: string): string {
    if (!str) return '';
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }

  private parseCSVLine(line: string): string[] {
    const values: string[] = [];
    let currentValue = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          currentValue += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        values.push(currentValue);
        currentValue = '';
      } else {
        currentValue += char;
      }
    }
    values.push(currentValue);
    return values;
  }

  private validateNotification(notification: unknown): string[] {
    const errors: string[] = [];
    const validatedNotification = notification as NotificationValidation;

    // Check required fields
    if (!validatedNotification.id) {
      errors.push('Missing required field: id');
    }
    if (!validatedNotification.type) {
      errors.push('Missing required field: type');
    }
    if (!validatedNotification.priority) {
      errors.push('Missing required field: priority');
    }
    if (!validatedNotification.title) {
      errors.push('Missing required field: title');
    }
    if (!validatedNotification.message) {
      errors.push('Missing required field: message');
    }
    if (!validatedNotification.timestamp) {
      errors.push('Missing required field: timestamp');
    }

    // Validate field types
    if (
      validatedNotification.id &&
      typeof validatedNotification.id !== 'string'
    ) {
      errors.push('Invalid type for field: id (should be string)');
    }
    if (
      validatedNotification.type &&
      !Object.values(NotificationType).includes(validatedNotification.type)
    ) {
      errors.push('Invalid value for field: type');
    }
    if (
      validatedNotification.priority &&
      !Object.values(NotificationPriority).includes(
        validatedNotification.priority
      )
    ) {
      errors.push('Invalid value for field: priority');
    }
    if (
      validatedNotification.title &&
      typeof validatedNotification.title !== 'string'
    ) {
      errors.push('Invalid type for field: title (should be string)');
    }
    if (
      validatedNotification.message &&
      typeof validatedNotification.message !== 'string'
    ) {
      errors.push('Invalid type for field: message (should be string)');
    }
    if (
      validatedNotification.timestamp &&
      !(validatedNotification.timestamp instanceof Date) &&
      isNaN(new Date(validatedNotification.timestamp).getTime())
    ) {
      errors.push(
        'Invalid type for field: timestamp (should be Date or valid date string)'
      );
    }
    if (
      validatedNotification.read !== undefined &&
      typeof validatedNotification.read !== 'boolean'
    ) {
      errors.push('Invalid type for field: read (should be boolean)');
    }
    if (
      validatedNotification.group !== undefined &&
      typeof validatedNotification.group !== 'string'
    ) {
      errors.push('Invalid type for field: group (should be string)');
    }
    if (
      validatedNotification.expiresAt !== undefined &&
      !(validatedNotification.expiresAt instanceof Date) &&
      isNaN(new Date(validatedNotification.expiresAt).getTime())
    ) {
      errors.push(
        'Invalid type for field: expiresAt (should be Date or valid date string)'
      );
    }

    // Validate data and metadata
    if (
      validatedNotification.data !== undefined &&
      (typeof validatedNotification.data !== 'object' ||
        validatedNotification.data === null)
    ) {
      errors.push('Invalid type for field: data (should be object)');
    }
    if (
      validatedNotification.metadata !== undefined &&
      typeof validatedNotification.metadata !== 'object'
    ) {
      errors.push('Invalid type for field: metadata (should be object)');
    }

    // Validate actions
    if (validatedNotification.actions) {
      if (!Array.isArray(validatedNotification.actions)) {
        errors.push('Invalid type for field: actions (should be array)');
      } else {
        validatedNotification.actions.forEach((action, index) => {
          if (!action.id) {
            errors.push(`Missing required field: actions[${index}].id`);
          }
          if (!action.label) {
            errors.push(`Missing required field: actions[${index}].label`);
          }
          if (action.handler && typeof action.handler !== 'function') {
            errors.push(
              `Invalid type for field: actions[${index}].handler (should be function)`
            );
          }
        });
      }
    }

    return errors;
  }

  private validateNotifications(notifications: unknown[]): void {
    if (!Array.isArray(notifications)) {
      throw new Error('Input must be an array of notifications');
    }

    const errors: Array<{ index: number; errors: string[] }> = [];

    notifications.forEach((notification, index) => {
      const validationErrors = this.validateNotification(notification);
      if (validationErrors.length > 0) {
        errors.push({ index, errors: validationErrors });
      }
    });

    if (errors.length > 0) {
      throw new Error(
        'Validation failed:\n' +
          errors
            .map(
              ({ index, errors: validationErrors }) =>
                `Notification at index ${index}:\n${validationErrors.map((e) => `  - ${e}`).join('\n')}`
            )
            .join('\n')
      );
    }
  }

  private isValidFormat(content: string, format: string): boolean {
    try {
      switch (format) {
        case 'json':
          JSON.parse(content);
          return true;

        case 'csv':
          // Check if content has valid CSV structure
          const lines = content.trim().split('\n');
          if (lines.length < 2) return false; // Need at least header and one data row

          const headerCount = lines[0].split(',').length;
          return lines.every((line) => {
            const fields = this.parseCSVLine(line);
            return fields.length === headerCount;
          });

        case 'xml':
          // Check if content is valid XML
          const parser = new DOMParser();
          const doc = parser.parseFromString(content, 'application/xml');
          return !doc.querySelector('parsererror');

        default:
          return false;
      }
    } catch (error) {
      return false;
    }
  }

  private handleError(error: unknown): Error {
    if (error instanceof Error) {
      return new Error(`Operation failed: ${error.message}`);
    }
    return new Error('Operation failed: Unknown error');
  }

  private async processImport(
    notifications: unknown[],
    config: ImportConfig
  ): Promise<ImportResult> {
    const result: ImportResult = {
      success: true,
      totalProcessed: notifications.length,
      imported: 0,
      skipped: 0,
      errors: [],
      metadata: {
        format: config.format,
        timestamp: new Date(),
        originalCount: notifications.length,
      },
    };

    try {
      for (let i = 0; i < notifications.length; i++) {
        try {
          const notification = notifications[i];
          const validationErrors = this.validateNotification(notification);

          if (validationErrors.length > 0) {
            result.errors.push({
              index: i,
              error: validationErrors.join(', '),
              data: notification,
            });
            result.skipped++;
            continue;
          }

          if (
            config.conflictResolution === 'skip' &&
            (await this.notificationExists((notification as { id: string }).id))
          ) {
            result.skipped++;
            continue;
          }

          await this.importNotification(
            notification as NotificationValidation,
            config
          );
          result.imported++;
        } catch (error) {
          result.errors.push({
            index: i,
            error: error instanceof Error ? error.message : 'Unknown error',
            data: notifications[i],
          });
          result.skipped++;
        }
      }
    } catch (error) {
      result.success = false;
      throw this.handleError(error);
    }

    return result;
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  private async notificationExists(_id: string): Promise<boolean> {
    // Implementation would depend on how notifications are stored
    return false;
  }

  private async importNotification(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _notification: NotificationValidation,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _config: ImportConfig
  ): Promise<void> {
    // Implementation would depend on how notifications are stored
    // This is a placeholder
  }

  private removeExcludedFields(
    notifications: Notification[],
    excludeFields: string[]
  ): Notification[] {
    return notifications.map((notification) => {
      const filtered = { ...notification };
      excludeFields.forEach((field) => {
        delete filtered[field as keyof Notification];
      });
      return filtered;
    });
  }

  private addMetadata(data: string, config: ExportConfig): string {
    try {
      let content: Record<string, unknown>;

      switch (config.format) {
        case 'json':
          content = JSON.parse(data);
          content = {
            metadata: {
              version: '1.0',
              timestamp: new Date().toISOString(),
              format: config.format,
              compression: !!config.compression,
              encryption: !!config.encryption?.enabled,
              dateRange: config.dateRange,
              totalCount: Array.isArray(content) ? content.length : 0,
            },
            data: content,
          };
          return JSON.stringify(content, null, 2);

        case 'xml':
          const metadataXml = `  <metadata>
    <version>1.0</version>
    <timestamp>${new Date().toISOString()}</timestamp>
    <format>${config.format}</format>
    <compression>${!!config.compression}</compression>
    <encryption>${!!config.encryption?.enabled}</encryption>
    ${
      config.dateRange
        ? `
    <dateRange>
      <start>${config.dateRange.start.toISOString()}</start>
      <end>${config.dateRange.end.toISOString()}</end>
    </dateRange>`
        : ''
    }
  </metadata>\n`;

          return data.replace(
            '<notifications>',
            '<notifications>\n' + metadataXml
          );

        case 'csv':
          const metadataComment = `# Export Metadata:
# Version: 1.0
# Timestamp: ${new Date().toISOString()}
# Format: ${config.format}
# Compression: ${!!config.compression}
# Encryption: ${!!config.encryption?.enabled}
${config.dateRange ? `# Date Range: ${config.dateRange.start.toISOString()} - ${config.dateRange.end.toISOString()}` : ''}
#\n`;

          return metadataComment + data;

        default:
          return data;
      }
    } catch (error) {
      console.error('Failed to add metadata:', error);
      return data;
    }
  }

  private extractMetadata(content: string): {
    version?: string;
    timestamp?: Date;
    format?: string;
    compression?: boolean;
    encryption?: boolean;
    dateRange?: { start: Date; end: Date };
    totalCount?: number;
  } {
    try {
      // Try JSON format first
      try {
        const json = JSON.parse(content);
        if (json.metadata) {
          return {
            ...json.metadata,
            timestamp: json.metadata.timestamp
              ? new Date(json.metadata.timestamp)
              : undefined,
            dateRange: json.metadata.dateRange
              ? {
                  start: new Date(json.metadata.dateRange.start),
                  end: new Date(json.metadata.dateRange.end),
                }
              : undefined,
          };
        }
      } catch {}

      // Try XML format
      if (content.includes('<metadata>')) {
        const parser = new DOMParser();
        const doc = parser.parseFromString(content, 'application/xml');
        const metadata = doc.querySelector('metadata');
        if (metadata) {
          const extract = (tag: string): string | undefined => {
            const element = metadata.querySelector(tag);
            return element?.textContent || undefined;
          };

          const dateRange = metadata.querySelector('dateRange');

          return {
            version: extract('version'),
            timestamp: extract('timestamp')
              ? new Date(extract('timestamp') as string)
              : undefined,
            format: extract('format'),
            compression: extract('compression') === 'true',
            encryption: extract('encryption') === 'true',
            dateRange: dateRange
              ? {
                  start: new Date(
                    dateRange.querySelector('start')?.textContent || ''
                  ),
                  end: new Date(
                    dateRange.querySelector('end')?.textContent || ''
                  ),
                }
              : undefined,
          };
        }
      }

      // Try CSV format (metadata in comments)
      if (content.startsWith('#')) {
        const lines = content.split('\n');
        const metadata: Record<string, unknown> = {};

        for (const line of lines) {
          if (!line.startsWith('#')) break;

          const match = line.match(/^# ([^:]+): (.+)$/);
          if (match) {
            const [, key, value] = match;
            switch (key.toLowerCase()) {
              case 'version':
                metadata.version = value.trim();
                break;
              case 'timestamp':
                metadata.timestamp = new Date(value.trim());
                break;
              case 'format':
                metadata.format = value.trim();
                break;
              case 'compression':
                metadata.compression = value.trim() === 'true';
                break;
              case 'encryption':
                metadata.encryption = value.trim() === 'true';
                break;
              case 'date range':
                const [start, end] = value.trim().split(' - ');
                metadata.dateRange = {
                  start: new Date(start),
                  end: new Date(end),
                };
                break;
            }
          }
        }

        return metadata;
      }

      return {};
    } catch (error) {
      console.error('Failed to extract metadata:', error);
      return {};
    }
  }
}
