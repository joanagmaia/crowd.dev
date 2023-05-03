import { QueryTypes } from 'sequelize'
import cronGenerator from 'cron-time-generator'
import SequelizeRepository from '../../database/repositories/sequelizeRepository'
import { CrowdJob } from '../../types/jobTypes'
import { sendNodeWorkerMessage } from '../../serverless/utils/nodeWorkerSQS'
import { NodeWorkerMessageBase } from '../../types/mq/nodeWorkerMessageBase'
import { NodeWorkerMessageType } from '../../serverless/types/workerTypes'

const job: CrowdJob = {
  name: 'organization enricher',
  cronTime: cronGenerator.everyMonth(),
  onTrigger: sendWorkerMessage,
}

async function sendWorkerMessage() {
  const options = await SequelizeRepository.getDefaultIRepositoryOptions()

  for (const tenantId of await queryEnrichableOrganizations(
    SequelizeRepository.getSequelize(options)
  )) {
    await sendNodeWorkerMessage(tenantId, {
      type: NodeWorkerMessageType.NODE_MICROSERVICE,
      service: 'enrich-organizations',
      tenantId,
    } as NodeWorkerMessageBase)
  }
}
async function queryEnrichableOrganizations(database: any): Promise<string[]> {
  const query = `
    SELECT "id"
    FROM "tenants"
    WHERE tenants."plan" IN ('Growth')
      OR (tenants."isTrialPlan" is true AND tenants."plan" = 'Growth')
    ;
    `
  const tenantIds: string[] = (await database.query(query, {
    type: QueryTypes.SELECT,
  })).map((tenant: { id: string }) => tenant.id)
  return tenantIds
}

export default job
