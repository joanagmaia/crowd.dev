import { ORGANIZATION_ENRICHMENT_CONFIG } from '../../../../config'
import getUserContext from '../../../../database/utils/getUserContext'
import { PLAN_LIMITS } from '../../../../feature-flags/isFeatureEnabled'
import OrganizationEnrichmentService from '../../../../services/premium/enrichment/organizationEnrichmentService'
import { FeatureFlag } from '../../../../types/common'

export async function BulkorganizationEnrichmentWorker(tenantId: string) {
  const userContext = await getUserContext(tenantId)
  // eslint-disable-next-line no-console
  const enrichmentLimit =
    PLAN_LIMITS[userContext.currentTenant.plan][FeatureFlag.ORGANIZATION_ENRICHMENT]

  const enrichmentService = new OrganizationEnrichmentService({
    options: userContext,
    apiKey: ORGANIZATION_ENRICHMENT_CONFIG.apiKey,
    tenantId,
    limit: enrichmentLimit,
  })
  await enrichmentService.enrichOrganizationsAndSignalDone()

}
