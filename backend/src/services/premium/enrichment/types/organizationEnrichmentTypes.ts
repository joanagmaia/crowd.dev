import { CompanyEnrichmentParams, CompanyResponse } from "peopledatalabs"

export type IEnrichmentResponse = CompanyResponse[]

export type EnrichmentParams = CompanyEnrichmentParams[]

export interface IOrganization {
  name: string
  website: string
  location: string
}
