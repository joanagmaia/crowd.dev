import PDLJS from 'peopledatalabs'
import lodash from 'lodash'
import { QueryTypes } from 'sequelize'
import { LoggingBase } from "../../loggingBase"
import { 
  EnrichmentParams, 
  IEnrichmentResponse, 
  IOrganization 
} from "./types/organizationEnrichmentTypes"
import { IServiceOptions } from "../../IServiceOptions"
import { renameKeys } from '../../../utils/renameKeys'
import OrganizationRepository from '../../../database/repositories/organizationRepository'
import OrganizationCacheRepository from '../../../database/repositories/organizationCacheRepository'
import { ApiWebsocketMessage } from '../../../types/mq/apiWebsocketMessage'
import { createRedisClient } from '../../../utils/redis'
import RedisPubSubEmitter from '../../../utils/redis/pubSubEmitter'

export default class OrganizationEnrichmentService extends LoggingBase {
  
  private readonly apiKey: string

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
    apiKey
  }: {
    options: OrganizationEnrichmentService['options'], 
    apiKey: string
  }
    ) {
    super(options)
    this.apiKey = apiKey
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
  public async enrichOrganizationsAndSignalDone(): Promise<void> {
    const enrichedOrganizations: IOrganization[] = []
    const enrichedCachedOrganizations: IOrganization[] = []
    for (const instance of (await this.queryEnrichableOrganizations())) {
      const data = await this.getEnrichment(instance)
      const enrichedOrganization = OrganizationEnrichmentService.convertEnrichedDataToOrg(data)
      enrichedOrganizations.push({...enrichedOrganization, id:instance.id})
      enrichedCachedOrganizations.push({...enrichedOrganization, id:instance.cachId})
    }
    const hasUpdated = await this.saveOrganizationInstances({
      org: enrichedOrganizations,
      cachedOrg: enrichedCachedOrganizations
    })
    await this.sendDoneSignal(hasUpdated)
  }

  private async saveOrganizationInstances({
    org,
    cachedOrg
  }: {
    org: IOrganization[],
    cachedOrg: IOrganization[]
  }): Promise<boolean> {
    try {
      await OrganizationRepository.bulkUpdate(org, this.fields, this.options)
      await OrganizationCacheRepository.bulkUpdate(cachedOrg, this.fields, this.options)
    } catch(error) {
      return false
    }
    return true
      
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

  private async queryEnrichableOrganizations(): Promise<({cachId: string} & IOrganization)[]> {
    const query = `
      with premiumOrgs as (
        SELECT org."id"
          ,org."name"
          ,org."location"
          ,org."website"
          ,org."tenantId"
          ,org."createdAt"
        FROM "organizations" org
        JOIN "tenants" tenant ON tenant."id"=org."tenantId"
        WHERE tenant."plan" IN ('Growth', 'Eagle Eye') 
          OR (tenant."isTrialPlan" is true AND tenant."plan" = 'Growth')
      ),
      orgActivities as (
        SELECT memOrgs."organizationId", SUM(actAgg."activityCount") "orgActivityCount"
        FROM "memberActivityAggregatesMVs" actAgg
        INNER JOIN "memberOrganizations" memOrgs ON actAgg."id"=memOrgs."memberId"
        GROUP BY memOrgs."organizationId"
      ) 
      SELECT 
        ,orgs.id id
        ,cach.id cachId
        ,orgs."name"
        ,orgs."location"
        ,orgs."website"
        orgs."tenantId"
      FROM premiumOrgs orgs
      JOIN "organizationCaches" cach ON orgs."name" = cach."name"
      JOIN orgActivities activity ON activity."organizationId" = orgs."id"
      ORDER BY activity."orgActivityCount" DESC, orgs."createdAt" DESC
      LIMIT :limit
      ;
    `
    const [orgs] = await this.options.database.query(
      query,
      {
        replacements: {limit: 100},
        type: QueryTypes.SELECT,
      }
    )
    return orgs
  }

  private async sendDoneSignal(hasUpdated: boolean){
    const redis = await createRedisClient(true)

    const apiPubSubEmitter = new RedisPubSubEmitter('api-pubsub', redis, (err) => {
      this.log.error({ err }, 'Error in api-ws emitter!')
    })
    if (hasUpdated) {
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
          }),
          undefined,
          this.options.currentTenant.id,
        ),
      )
    }
  }
}