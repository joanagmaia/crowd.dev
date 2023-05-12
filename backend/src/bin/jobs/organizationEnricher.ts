import cronGenerator from 'cron-time-generator'
import SequelizeRepository from '../../database/repositories/sequelizeRepository'
import { CrowdJob } from '../../types/jobTypes'
import { sendNodeWorkerMessage } from '../../serverless/utils/nodeWorkerSQS'
import { NodeWorkerMessageBase } from '../../types/mq/nodeWorkerMessageBase'
import { NodeWorkerMessageType } from '../../serverless/types/workerTypes'
import TenantRepository from '../../database/repositories/tenantRepository'
import { getServiceLogger } from '../../utils/logging'

const job: CrowdJob = {
  name: 'organization enricher',
  cronTime: cronGenerator.everyHour(),
  onTrigger: sendWorkerMessage,
}

async function sendWorkerMessage() {
  const options = await SequelizeRepository.getDefaultIRepositoryOptions()
  const log = getServiceLogger()

  for (const { id } of await TenantRepository.getPayingTenantIds(options)) {
   const payload = {
    type: NodeWorkerMessageType.NODE_MICROSERVICE,
    service: 'enrich-organizations',
    tenantId: id,
  } as NodeWorkerMessageBase
    log.warn({payload}, 'enricher worker payload')
    await sendNodeWorkerMessage(id, payload)
  }
}

export default job
