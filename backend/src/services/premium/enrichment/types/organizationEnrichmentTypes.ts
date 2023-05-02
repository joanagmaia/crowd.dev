import { CompanyEnrichmentParams, CompanyResponse } from "peopledatalabs"

export type IEnrichmentResponse = CompanyResponse

export type EnrichmentParams = CompanyEnrichmentParams
export type IOrganizations = IOrganization[]

export interface IOrganization {
  id: string
  name: string
  website?: string
  location?: string
  description?: IEnrichmentResponse['summary']
  employeeCountByCountry?: IEnrichmentResponse['employee_count_by_country']
  type?: IEnrichmentResponse['type']
  ticker?: IEnrichmentResponse['ticker']
  headline?: IEnrichmentResponse['headline']
  profiles?: IEnrichmentResponse['profiles']
  naics?: IEnrichmentResponse['naics']
  industry?: IEnrichmentResponse['industry']
  founded?: IEnrichmentResponse['founded']
  employees?: IEnrichmentResponse['size']
  twitter?: IEnrichmentResponse['twitter_url']
  lastEnrichedAt?: Date
}

export interface IEnrichableOrganization extends IOrganization{
  cachId: string
  tenantId:string
}
