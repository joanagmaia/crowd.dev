import { ORGANIZATION_ENRICHMENT_CONFIG } from '../../../../config'
import getUserContext from '../../../../database/utils/getUserContext'
import { PLAN_LIMITS } from '../../../../feature-flags/isFeatureEnabled'
import OrganizationEnrichmentService from '../../../../services/premium/enrichment/organizationEnrichmentService'
import { FeatureFlag, FeatureFlagRedisKey } from '../../../../types/common'
import { createRedisClient } from '../../../../utils/redis'
import { RedisCache } from '../../../../utils/redis/redisCache'
import { getSecondsTillEndOfMonth } from '../../../../utils/timing'

export async function BulkorganizationEnrichmentWorker(tenantId: string) {
  const userContext = await getUserContext(tenantId)
  const enrichmentLimit =
    PLAN_LIMITS[userContext.currentTenant.plan][FeatureFlag.ORGANIZATION_ENRICHMENT]

  const enrichmentService = new OrganizationEnrichmentService({
    options: userContext,
    apiKey: ORGANIZATION_ENRICHMENT_CONFIG.apiKey,
    tenantId: userContext.currentTenant.id,
    limit: enrichmentLimit,
  })
  const successfulEnrichments = await enrichmentService.enrichOrganizationsAndSignalDone()

  const redis = await createRedisClient(true)
  const enrichmentCountCache = new RedisCache(
    FeatureFlagRedisKey.ORGANIZATION_ENRICHMENT_COUNT,
    redis,
  )

  const secondsRemainingUntilEndOfMonth = getSecondsTillEndOfMonth()
  await enrichmentCountCache.setValue(
    userContext.currentTenant.id,
    (successfulEnrichments.length).toString(),
    secondsRemainingUntilEndOfMonth,
  )
}
