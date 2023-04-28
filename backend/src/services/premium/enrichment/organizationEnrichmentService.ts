import PDLJS, { CompanyResponse } from 'peopledatalabs'
import { LoggingBase } from "../../loggingBase"
import { 
  EnrichmentParams, 
  IEnrichmentResponse, 
  IOrganization 
} from "./types/organizationEnrichmentTypes"
import { IServiceOptions } from "../../IServiceOptions"

export default class OrganizationEnrichmentService extends LoggingBase {
  private organizationInstances: IOrganization[]
  
  private readonly apiKey: string

  options: IServiceOptions

  constructor({
    options, 
    apiKey
  }: {
    options: OrganizationEnrichmentService['options'], 
    apiKey: string
  }
    ) {
    super(options)
    this.apiKey = apiKey
    this.queryEnrichableOrganizations()
      .then(organizations => {
        this.organizationInstances = organizations
      })
  }
  
  /**
   * Fetch enrichment data from PDL Company API
   * @param enrichmentInput - The object that contains organization enrichment attributes
   * @returns the PDL company response
   */
  async getEnrichment(
    enrichmentInput: EnrichmentParams
    ): Promise<IEnrichmentResponse> {
      const results: IEnrichmentResponse = []
      const PDLClient = new PDLJS({apiKey: this.apiKey})
      
      for( const input of enrichmentInput) {
        const data = await PDLClient.company.enrichment(input)
        if (data.status !== 200) {
          // TODO: Handle failed operation
        }
        data.name = input.name
        results.push(data)
      }

      return results
  }

  /*
  Update all enrichable organizations with enriched data
  */
  public async enrichOrganizationsAndSignalDone(): Promise<void> {
      const payload = await this.getEnrichment(this.enrichableAttrs)
      const enrichedOrganizations = OrganizationEnrichmentService.transformEnrichedData(payload)
      this.updateOrganizationInstances(enrichedOrganizations)
      OrganizationEnrichmentService.saveOrganizationInstances()
      OrganizationEnrichmentService.sendDoneSignal()
  }

  private updateOrganizationInstances(enrichedOrganizations: IOrganization[]) {
    this.organizationInstances.forEach(org => {
      Object.assign(org, enrichedOrganizations[org.name])
    })
  }

  private static saveOrganizationInstances() {}

  private static transformEnrichedData(organizations: Awaited<IEnrichmentResponse>): IOrganization[] {
    const remapFields = <T extends ObjectConstructor>(orgs: CompanyResponse, fieldMap: { [key: string]: string}) => (
      Object.keys(orgs).reduce(
        (acc, key) => ({
          ...acc,
          ...{ [fieldMap[key] || key]: orgs[key] },
        }),
        {} as T
      )
    )
    
    return organizations.map(org => <IOrganization><unknown>remapFields(org, {}))
  }

  private async queryEnrichableOrganizations(): Promise<IOrganization[]> {
    const _ = this.options.database
    return null
  }

  private get enrichableAttrs(): EnrichmentParams {
    return this.organizationInstances.map(
      ({name, location, website}) => ({name, location, website})
    )
  }

  private static sendDoneSignal(){}
}