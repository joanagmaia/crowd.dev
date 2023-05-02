import { QueryTypes } from "sequelize"
import cronGenerator from 'cron-time-generator'
import { IEnrichableOrganization } from "../../services/premium/enrichment/types/organizationEnrichmentTypes"
import SequelizeRepository from "../../database/repositories/sequelizeRepository"
import { CrowdJob } from "../../types/jobTypes"
import { sendNodeWorkerMessage } from "../../serverless/utils/nodeWorkerSQS"
import { NodeWorkerMessageBase } from "../../types/mq/nodeWorkerMessageBase"
import { NodeWorkerMessageType } from "../../serverless/types/workerTypes"

const job: CrowdJob = {
  name: 'organization enricher',
  cronTime: cronGenerator.everyMonth(),
  onTrigger: sendWorkerMessage
}

async function sendWorkerMessage() {
  const options = await SequelizeRepository.getDefaultIRepositoryOptions()
  const orgsByTenantId = (await queryEnrichableOrganizations(options.database))
  for(const [tenant, orgs] of Object.entries(orgsByTenantId)) {
    await sendNodeWorkerMessage(
      tenant, 
      {
        type: NodeWorkerMessageType.NODE_MICROSERVICE,
        service: 'enrich-organizations',
        organizations: orgs
      } as NodeWorkerMessageBase
    )
  }
}
async function queryEnrichableOrganizations(database: any): Promise<{[index: string]: IEnrichableOrganization[]}>{
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
    const [orgs]: [IEnrichableOrganization][] =  await database.query(
      query,
      {
        replacements: {limit: 100},
        type: QueryTypes.SELECT,
      }
    )
    // Group organizations by tenant ID
    return orgs.reduce((orgs, org) => (
      orgs[org.tenantId]? 
      {...orgs, [org.tenantId] : [...orgs[org.tenantId], org]}: {[org.tenantId]: [org]}), 
      {}
    )
}

export default job
