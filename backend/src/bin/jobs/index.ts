import { CrowdJob } from '../../types/jobTypes'
import integrationTicks from './integrationTicks'
import weeklyAnalyticsEmailsCoordinator from './weeklyAnalyticsEmailsCoordinator'
import memberScoreCoordinator from './memberScoreCoordinator'
import checkSqsQueues from './checkSqsQueues'
import refreshMaterializedViews from './refreshMaterializedViews'
import downgradeExpiredPlans from './downgradeExpiredPlans'
import eagleEyeEmailDigestTicks from './eagleEyeEmailDigestTicks'
import integrationDataChecker from './integrationDataChecker'
import refreshSampleData from './refreshSampleData'
import cleanUpIntegrationRuns from './cleanUpIntegrationRuns'

const jobs: CrowdJob[] = [
  weeklyAnalyticsEmailsCoordinator,
  integrationTicks,
  memberScoreCoordinator,
  checkSqsQueues,
  refreshMaterializedViews,
  downgradeExpiredPlans,
  eagleEyeEmailDigestTicks,
  integrationDataChecker,
  refreshSampleData,
  cleanUpIntegrationRuns,
]

export default jobs
