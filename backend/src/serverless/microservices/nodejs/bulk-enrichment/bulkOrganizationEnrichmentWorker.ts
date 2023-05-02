import { ORGANIZATION_ENRICHMENT_CONFIG } from "../../../../config"
import getUserContext from "../../../../database/utils/getUserContext"
import { PLAN_LIMITS } from "../../../../feature-flags/isFeatureEnabled"
import OrganizationEnrichmentService from "../../../../services/premium/enrichment/organizationEnrichmentService"
import { FeatureFlag, FeatureFlagRedisKey } from "../../../../types/common"
import { createRedisClient } from "../../../../utils/redis"
import { RedisCache } from "../../../../utils/redis/redisCache"
import { getSecondsTillEndOfMonth } from "../../../../utils/timing"

async function BulkorganizationEnrichmentWorker(tenantId: string) {
  const userContext = await getUserContext(tenantId)
  const enrichmentLimit = PLAN_LIMITS[userContext.currentTenant.plan
  ][FeatureFlag.ORGANIZATION_ENRICHMENT]

  const redis = await createRedisClient(true)
  const enrichmentCountCache = new RedisCache(
    FeatureFlagRedisKey.ORGANIZATION_ENRICHMENT_COUNT,
    redis,
  )
  enrichmentCountCache.setValueIfNotExistsAlready(
    userContext.currentTenant.id,
    `${enrichmentLimit}`
  )

  let unusedEnrichmentCount = parseInt(
    await enrichmentCountCache.getValue(userContext.currentTenant.id), 
    10
  )
  const enrichmentService = new OrganizationEnrichmentService({
    options: userContext,
    apiKey: ORGANIZATION_ENRICHMENT_CONFIG.apiKey,
    tenantId: userContext.currentTenant.id,
    limit: unusedEnrichmentCount
  })
  const successfulEnrichments = await enrichmentService.enrichOrganizationsAndSignalDone()
  unusedEnrichmentCount -= successfulEnrichments.length
  
  const secondsRemainingUntilEndOfMonth = getSecondsTillEndOfMonth()

  if (!unusedEnrichmentCount) {
    await enrichmentCountCache.setValue(
      userContext.currentTenant.id,
      '0',
      secondsRemainingUntilEndOfMonth,
    )
  } else {
    // Before sending the queue message, we increase the memberEnrichmentCount with all member Ids that are sent,
    // assuming that we'll be able to enrich all.
    // If any of enrichments failed, we should add these credits back, reducing memberEnrichmentCount
    await enrichmentCountCache.setValue(
      userContext.currentTenant.id,
      (unusedEnrichmentCount + enrichmentLimit).toString(),
      secondsRemainingUntilEndOfMonth,
    )
  }
}

export {BulkorganizationEnrichmentWorker}
