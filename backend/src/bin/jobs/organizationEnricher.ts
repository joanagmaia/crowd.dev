import cronGenerator from 'cron-time-generator'
import SequelizeRepository from '../../database/repositories/sequelizeRepository'
import { CrowdJob } from '../../types/jobTypes'
import { sendNodeWorkerMessage } from '../../serverless/utils/nodeWorkerSQS'
import { NodeWorkerMessageBase } from '../../types/mq/nodeWorkerMessageBase'
import { NodeWorkerMessageType } from '../../serverless/types/workerTypes'
import TenantRepository from '../../database/repositories/tenantRepository'

const job: CrowdJob = {
  name: 'organization enricher',
  cronTime: cronGenerator.everyMonth(),
  onTrigger: sendWorkerMessage,
}

async function sendWorkerMessage() {
  const options = await SequelizeRepository.getDefaultIRepositoryOptions()

  for (const { id } of await TenantRepository.getPayingTenantIds(options)) {
    await sendNodeWorkerMessage(id, {
      type: NodeWorkerMessageType.NODE_MICROSERVICE,
      service: 'enrich-organizations',
      tenantId: id,
    } as NodeWorkerMessageBase)
  }
}

export default job
