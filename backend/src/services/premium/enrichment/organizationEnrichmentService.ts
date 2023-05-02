import PDLJS from 'peopledatalabs'
import lodash from 'lodash'
import { QueryTypes } from 'sequelize'
import { LoggingBase } from "../../loggingBase"
import { 
  EnrichmentParams, 
  IEnrichableOrganization, 
  IEnrichmentResponse, 
  IOrganization, 
  IOrganizations
} from "./types/organizationEnrichmentTypes"
import { IServiceOptions } from "../../IServiceOptions"
import { renameKeys } from '../../../utils/renameKeys'
import OrganizationRepository from '../../../database/repositories/organizationRepository'
import OrganizationCacheRepository from '../../../database/repositories/organizationCacheRepository'
import { ApiWebsocketMessage } from '../../../types/mq/apiWebsocketMessage'
import { createRedisClient } from '../../../utils/redis'
import RedisPubSubEmitter from '../../../utils/redis/pubSubEmitter'

export default class OrganizationEnrichmentService extends LoggingBase {
  tenantId: string
  
  private readonly apiKey: string

  private readonly maxOrganizationsLimit: number

  private readonly fields = [
    "name",
    "location",
    "website",
    "description",
    "employeeCountByCountry",
    "type",
    "ticker",
    "headline",
    "profiles",
    "naics",
    "industry",
    "founded",
    "employees",
    "twitter",
    "lastEnrichedAt",
  ]

  options: IServiceOptions

  constructor({
    options, 
    apiKey,
    limit,
    tenantId,
    
  }: {
    options: OrganizationEnrichmentService['options'], 
    apiKey: string,
    tenantId: string,
    limit: number
  }
    ) {
    super(options)
    this.apiKey = apiKey
    this.maxOrganizationsLimit = limit
    this.tenantId = tenantId
  }
  
  /**
   * Fetch enrichment data from PDL Company API
   * @param enrichmentInput - The object that contains organization enrichment attributes
   * @returns the PDL company response
   */
  async getEnrichment(
    {name, website, locality,  }: EnrichmentParams
    ): Promise<IEnrichmentResponse> {
      const PDLClient = new PDLJS({apiKey: this.apiKey})
      
      const data = await PDLClient.company.enrichment({name, website, locality})
      if (data.status !== 200) {
        // TODO: Handle failed operation
        return null
      }
      data.name = name
      return data
  }

  /*
  Update all enrichable organizations with enriched data
  */
  public async enrichOrganizationsAndSignalDone(): Promise<IOrganizations> {
    const organizations: IOrganizations = []
    const cachedOrganizations: IOrganizations = []
    for (const instance of await this.querytenancyOrganizations()) {
      const data = await this.getEnrichment(instance)
      const orgs = OrganizationEnrichmentService.convertEnrichedDataToOrg(data)
      organizations.push({...orgs, id:instance.id})
      cachedOrganizations.push({...orgs, id:instance.cachId})
    }
    const enrichedOrganizations = await this.saveOrganizationInstances({
      org: organizations,
      cachedOrg: cachedOrganizations
    })
    await this.sendDoneSignal(enrichedOrganizations)
    return enrichedOrganizations
  }

  private async saveOrganizationInstances({
    org,
    cachedOrg
  }: {
    org: IOrganizations,
    cachedOrg: IOrganizations
  }): Promise<IOrganizations> {
    const orgs = await OrganizationRepository.bulkUpdate(org, this.fields, this.options)
    await OrganizationCacheRepository.bulkUpdate(cachedOrg, this.fields, this.options)
    return orgs
      
  }

  private static convertEnrichedDataToOrg(data: Awaited<IEnrichmentResponse>): IOrganization {
    const org = <IOrganization>renameKeys(
      data, {
        summary: 'description',
        employeeCountByCountry: 'employee_count_by_country',
        size: 'employees',
        twitter_url: 'twitter'
      })
    org.lastEnrichedAt = new Date()

    return lodash.pick(
      org, 
    )
  }

  private async sendDoneSignal(organizations: IOrganizations){
    const redis = await createRedisClient(true)

    const apiPubSubEmitter = new RedisPubSubEmitter('api-pubsub', redis, (err) => {
      this.log.error({ err }, 'Error in api-ws emitter!')
    })
    if (!organizations.length) {
      apiPubSubEmitter.emit(
        'user',
        new ApiWebsocketMessage(
          'bulk-enrichment',
          JSON.stringify({
            tenantId: this.options.currentTenant.id,
            success: false,
          }),
          undefined,
          this.options.currentTenant.id,
        ),
      )
    }
    // Send success message if there were enrichedMembers
    else {
      apiPubSubEmitter.emit(
        'user',
        new ApiWebsocketMessage(
          'bulk-enrichment',
          JSON.stringify({
            tenantId: this.options.currentTenant.id,
            success: true,
            organizations: organizations.map(org => org.id),
          }),
          undefined,
          this.options.currentTenant.id,
        ),
      )
    }
  }

  async querytenancyOrganizations(): Promise<IEnrichableOrganization[]> {
    const query = `
      with orgActivities as (
        SELECT memOrgs."organizationId", SUM(actAgg."activityCount") "orgActivityCount"
        FROM "memberActivityAggregatesMVs" actAgg
        INNER JOIN "memberOrganizations" memOrgs ON actAgg."id"=memOrgs."memberId"
        GROUP BY memOrgs."organizationId"
      ) 
      SELECT org.id id
      ,cach.id cachId
      ,org."name"
      ,org."location"
      ,org."website"
      FROM "organizations" as org
      JOIN "organizationCaches" cach ON org."name" = cach."name"
      JOIN orgActivities activity ON activity."organizationId" = org."id"
      WHERE :tenantId = org."tenantId"
      ORDER BY activity."orgActivityCount" DESC, org."createdAt" DESC
      LIMIT :limit
    ;
    `
    return this.options.database.query(
      query,
      {
        type: QueryTypes.SELECT,
        replacements: {
          tenantId: this.tenantId,
          limit: this.maxOrganizationsLimit,
        }
      }
    )
  }
}