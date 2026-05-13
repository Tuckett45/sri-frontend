import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { local_environment } from '../../../../environments/environments';
import { ClientConfiguration } from '../models/quote-workflow.model';

/**
 * Service for managing per-client configuration settings for quote presentation.
 *
 * Handles HTTP communication with the backend API for loading, saving,
 * and listing Client_Configuration records. Also provides a synchronous
 * default configuration for clients without a stored record.
 *
 * Requirements: 11.1–11.4
 */
@Injectable({ providedIn: 'root' })
export class ClientConfigurationService {
  private readonly apiUrl = `${local_environment.apiUrl}/client-configurations`;

  constructor(private http: HttpClient) {}

  /**
   * Loads the Client_Configuration for a specific client by name.
   * Used during RFP intake to apply client-specific defaults to the BOM Builder.
   * @param clientName The client name to look up
   * @returns Observable of the ClientConfiguration for the given client
   */
  getClientConfiguration(clientName: string): Observable<ClientConfiguration> {
    const params = new HttpParams().set('clientName', clientName);
    return this.http.get<ClientConfiguration>(this.apiUrl, { params });
  }

  /**
   * Returns the default ClientConfiguration values used when no
   * Client_Configuration record exists for a selected client.
   *
   * Defaults:
   *  - taxFreightVisible: true
   *  - defaultMarkupPercentage: 10
   *
   * This is a synchronous method (not an API call).
   * @returns A ClientConfiguration object with default values
   */
  getDefaultConfiguration(): ClientConfiguration {
    return {
      id: '',
      clientName: '',
      taxFreightVisible: true,
      defaultMarkupPercentage: 10,
      createdAt: '',
      updatedAt: ''
    };
  }

  /**
   * Creates or updates a Client_Configuration record.
   * Uses POST for new records and PUT for existing records (determined by
   * whether the configuration has an existing id).
   * @param config The ClientConfiguration to save
   * @returns Observable of the saved ClientConfiguration
   */
  saveClientConfiguration(config: ClientConfiguration): Observable<ClientConfiguration> {
    if (config.id) {
      return this.http.put<ClientConfiguration>(`${this.apiUrl}/${config.id}`, config);
    }
    return this.http.post<ClientConfiguration>(this.apiUrl, config);
  }

  /**
   * Loads all Client_Configuration records.
   * Used by the administration interface for managing client configurations.
   * @returns Observable of all ClientConfiguration records
   */
  getAllClientConfigurations(): Observable<ClientConfiguration[]> {
    return this.http.get<ClientConfiguration[]>(this.apiUrl);
  }
}
