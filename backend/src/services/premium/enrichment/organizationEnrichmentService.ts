import PDLJS from 'peopledatalabs'
import moment from 'moment'
import lodash from 'lodash'
import { QueryTypes } from 'sequelize'
import { LoggingBase } from '../../loggingBase'
import {
  EnrichmentParams,
  IEnrichableOrganization,
  IEnrichmentResponse,
  IOrganization,
  IOrganizations,
} from './types/organizationEnrichmentTypes'
import { IServiceOptions } from '../../IServiceOptions'
import { renameKeys } from '../../../utils/renameKeys'
import OrganizationRepository from '../../../database/repositories/organizationRepository'
import OrganizationCacheRepository from '../../../database/repositories/organizationCacheRepository'
import { ApiWebsocketMessage } from '../../../types/mq/apiWebsocketMessage'
import { createRedisClient } from '../../../utils/redis'
import RedisPubSubEmitter from '../../../utils/redis/pubSubEmitter'
import SequelizeRepository from '../../../database/repositories/sequelizeRepository'

export default class OrganizationEnrichmentService extends LoggingBase {
  tenantId: string

  private readonly apiKey: string

  private readonly maxOrganizationsLimit: number

  private readonly fields = [
    'name',
    'location',
    'website',
    'description',
    'employeeCountByCountry',
    'type',
    'ticker',
    'headline',
    'profiles',
    'naics',
    'industry',
    'founded',
    'size',
    'employees',
    'twitter',
    'lastEnrichedAt',
  ]

  options: IServiceOptions

  constructor({
    options,
    apiKey,
    limit,
    tenantId,
  }: {
    options: OrganizationEnrichmentService['options']
    apiKey: string
    tenantId: string
    limit: number
  }) {
    super(options)
    this.options = options
    this.apiKey = apiKey
    this.maxOrganizationsLimit = limit
    this.tenantId = tenantId
  }

  /**
   * Fetch enrichment data from PDL Company API
   * @param enrichmentInput - The object that contains organization enrichment attributes
   * @returns the PDL company response
   */
  async getEnrichment({ name, website, locality }: EnrichmentParams): Promise<any> {
    const PDLClient = new PDLJS({ apiKey: this.apiKey })
    let data: null | IEnrichmentResponse
    try {
      const data = await PDLClient.company.enrichment({ name, website, locality })
      data.name = name
    } catch (error) {
      this.options.log.warn({ name, website, locality }, error)
      data = null
    }
    return data
  }

  static isRecentlyEnriched(org: IOrganization, lastEnriched=6): boolean {
    return org.lastEnrichedAt && (moment(org.lastEnrichedAt).diff(moment(), 'months') < lastEnriched)
  }


  public async enrichOrganizationsAndSignalDone(): Promise<IOrganizations> {
    const enrichedOrganizations: IOrganizations = []
    const enrichedCacheOrganizations: IOrganizations = []
    for (const instance of await this.queryTenancyOrganizations()) {
      if(OrganizationEnrichmentService.isRecentlyEnriched(instance)) {
        // eslint-disable-next-line no-continue
        continue
      }
      const data = await this.getEnrichment(instance)
      if(data) {
        const org = this.convertEnrichedDataToOrg(data)
        enrichedOrganizations.push({...org, id: instance.id, tenantId: this.tenantId})
        enrichedCacheOrganizations.push({ ...org, id: instance.cachId})
      }
    }
    const orgs = await this.update(enrichedOrganizations, enrichedCacheOrganizations)
    await this.sendDoneSignal(orgs)
    return orgs
  }

  private async update(orgs: IOrganizations, cacheOrgs: IOrganizations): Promise<IOrganizations> {
    // eslint-disable-next-line no-console
    await OrganizationCacheRepository.bulkUpdate(cacheOrgs, this.options)
    return OrganizationRepository.bulkUpdate(orgs, this.fields, this.options)
  }

  private convertEnrichedDataToOrg(data: Awaited<IEnrichmentResponse>): IOrganization {
    data = renameKeys(data, {
      summary: 'description',
      employeeCountByCountry: 'employee_count_by_country',
      twitter_url: 'twitter',
    })
    const lastEnrichedAt = new Date()
    const location = `
      ${data.location.street_address} ${data.location.address_line_2} ${data.location.name}
    `
    const org: IOrganization = lodash.pick(data, this.fields)

    return Object.assign(org, {lastEnrichedAt, location})
  }

  private async sendDoneSignal(organizations: IOrganizations) {
    const redis = await createRedisClient(true)
    const organizationIds = organizations.map((org) => org.id)

    const apiPubSubEmitter = new RedisPubSubEmitter('api-pubsub', redis, (err) => {
      this.log.error({ err }, 'Error in api-ws emitter!')
    })
    if (!organizations.length) {
      apiPubSubEmitter.emit(
        'user',
        new ApiWebsocketMessage(
          'organization-bulk-enrichment',
          JSON.stringify({
            tenantId: this.tenantId,
            success: false,
            organizationIds,
          }),
          undefined,
          this.tenantId,
        ),
      )
    }
    // Send success message if there were enrichedMembers
    else {
      apiPubSubEmitter.emit(
        'user',
        new ApiWebsocketMessage(
          'organization-bulk-enrichment',
          JSON.stringify({
            tenantId: this.tenantId,
            success: true,
            organizationIds,
          }),
          undefined,
          this.tenantId
        ),
      )
    }
  }

  async queryTenancyOrganizations(): Promise<IEnrichableOrganization[]> {
    const options = await SequelizeRepository.getDefaultIRepositoryOptions()
    const query = `
      with orgActivities as (
        SELECT memOrgs."organizationId", SUM(actAgg."activityCount") "orgActivityCount"
        FROM "memberActivityAggregatesMVs" actAgg
        INNER JOIN "memberOrganizations" memOrgs ON actAgg."id"=memOrgs."memberId"
        GROUP BY memOrgs."organizationId"
      ) 
      SELECT org.id "id"
      ,cach.id "cachId"
      ,org."name"
      ,org."location"
      ,org."website"
      ,org."lastEnrichedAt"
      FROM "organizations" as org
      JOIN "organizationCaches" cach ON org."name" = cach."name"
      JOIN orgActivities activity ON activity."organizationId" = org."id"
      WHERE :tenantId = org."tenantId"
      ORDER BY org."lastEnrichedAt" ASC, activity."orgActivityCount" DESC, org."createdAt" DESC
      LIMIT :limit
    ;
    `
    const orgs: IEnrichableOrganization[] = await SequelizeRepository.getSequelize(options).query(query, {
      type: QueryTypes.SELECT,
      replacements: {
        tenantId: this.tenantId,
        limit: this.maxOrganizationsLimit,
      },
    })
    return orgs
  }
}
