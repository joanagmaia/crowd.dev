<template>
  <query-renderer
    v-if="cubejsApi"
    :cubejs-api="cubejsApi"
    :query="query"
  >
    <template #default="{ resultSet, loading, error }">
      <div class="bg-white px-6 py-5 rounded-lg shadow">
        <!-- Widget Header -->
        <div
          class="flex grow justify-between items-center pb-5 border-b border-gray-100"
          :class="{ 'mb-8': !loading && !error }"
        >
          <div class="flex gap-1">
            <app-widget-granularity
              template="Members"
              widget="Active members"
              :granularity="granularity"
              @on-update="
                (updatedGranularity) =>
                  (granularity = updatedGranularity)
              "
            />
            <app-widget-title
              title="Active members"
              description="Members who performed any kind of activity in a given time period"
            />
          </div>
          <app-widget-period
            template="Members"
            widget="Active members"
            :period="period"
            :granularity="granularity"
            module="reports"
            @on-update="
              (updatedPeriod) => (period = updatedPeriod)
            "
          />
        </div>

        <!-- Loading -->
        <app-widget-loading v-if="loading" />

        <!-- Error -->
        <app-widget-error v-else-if="error" />

        <!-- Widget Chart -->
        <app-widget-area
          v-else
          :datasets="datasets"
          :result-set="resultSet"
          :chart-options="{
            ...chartOptions('area')
          }"
          :granularity="granularity.value"
          @on-view-more-click="onViewMoreClick"
        />
      </div>
    </template>
  </query-renderer>
  <app-widget-drawer
    v-if="drawerExpanded"
    v-model="drawerExpanded"
    :fetch-fn="getActiveMembers"
    :date="drawerDate"
    :granularity="granularity.value"
    :show-date="true"
    :title="drawerTitle"
    module-name="member"
    size="480px"
    @on-export="onExport"
  ></app-widget-drawer>
</template>

<script>
export default {
  name: 'AppWidgetActiveMembersArea'
}
</script>

<script setup>
import { computed, ref, defineProps } from 'vue'
import AppWidgetTitle from '@/modules/widget/components/v2/shared/widget-title.vue'
import AppWidgetPeriod from '@/modules/widget/components/v2/shared/widget-period.vue'
import AppWidgetGranularity from '@/modules/widget/components/v2/shared/widget-granularity.vue'
import AppWidgetArea from '@/modules/widget/components/v2/shared/widget-area.vue'
import {
  DAILY_GRANULARITY_FILTER,
  SEVEN_DAYS_PERIOD_FILTER
} from '@/modules/widget/widget-constants'
import { QueryRenderer } from '@cubejs-client/vue3'
import {
  mapGetters,
  mapActions
} from '@/shared/vuex/vuex.helpers'
import { chartOptions } from '@/modules/report/templates/template-report-charts'
import {
  TOTAL_ACTIVE_MEMBERS_QUERY,
  TOTAL_ACTIVE_RETURNING_MEMBERS_QUERY,
  ACTIVE_MEMBERS_AREA_FILTER
} from '@/modules/widget/widget-queries'
import AppWidgetLoading from '@/modules/widget/components/v2/shared/widget-loading.vue'
import AppWidgetError from '@/modules/widget/components/v2/shared/widget-error.vue'
import AppWidgetDrawer from '@/modules/widget/components/v2/shared/widget-drawer.vue'
import { MemberService } from '@/modules/member/member-service'

const props = defineProps({
  filters: {
    type: Object,
    default: null
  },
  isPublicView: {
    type: Boolean,
    default: false
  }
})

const period = ref(SEVEN_DAYS_PERIOD_FILTER)
const granularity = ref(DAILY_GRANULARITY_FILTER)

const drawerExpanded = ref()
const drawerDate = ref()
const drawerTitle = ref()

const { doExport } = mapActions('member')
const { cubejsApi } = mapGetters('widget')

const datasets = computed(() => [
  {
    name: 'Total active members',
    borderColor: '#E94F2E',
    measure: 'Members.count',
    granularity: granularity.value.value,
    ...(!props.isPublicView && {
      tooltipBtn: 'View members'
    })
  },
  {
    name: 'Returning members',
    borderDash: [4, 4],
    borderColor: '#E94F2E',
    measure: 'Members.count',
    granularity: granularity.value.value,
    ...(!props.isPublicView && {
      tooltipBtn: 'View members'
    })
  }
])

const query = computed(() => {
  return [
    TOTAL_ACTIVE_MEMBERS_QUERY({
      period: period.value,
      granularity: granularity.value,
      selectedPlatforms: props.filters.platform.value,
      selectedHasTeamMembers: props.filters.teamMembers
    }),
    TOTAL_ACTIVE_RETURNING_MEMBERS_QUERY({
      period: period.value,
      granularity: granularity.value,
      selectedPlatforms: props.filters.platform.value,
      selectedHasTeamMembers: props.filters.teamMembers
    })
  ]
})

// Fetch function to pass to detail drawer
const getActiveMembers = async ({ pagination }) => {
  return await MemberService.list(
    ACTIVE_MEMBERS_AREA_FILTER({
      date: drawerDate.value,
      granularity: granularity.value.value,
      selectedPlatforms: props.filters.platform.value,
      selectedHasTeamMembers: props.filters.teamMembers
    }),
    'joinedAt_DESC',
    pagination.pageSize,
    (pagination.currentPage - 1) * pagination.pageSize,
    false
  )
}

// Open drawer and set title and date
const onViewMoreClick = (date) => {
  window.analytics.track('Open report drawer', {
    template: 'Members',
    widget: 'Active members',
    date,
    granularity: granularity.value
  })

  drawerExpanded.value = true
  drawerDate.value = date

  // Title
  if (granularity.value.value === 'week') {
    drawerTitle.value = 'Weekly active members'
  } else if (granularity.value.value === 'month') {
    drawerTitle.value = 'Monthly active members'
  } else {
    drawerTitle.value = 'Daily active members'
  }
}

const onExport = async () => {
  try {
    await doExport(
      false,
      ACTIVE_MEMBERS_AREA_FILTER({
        date: drawerDate.value,
        granularity: granularity.value.value,
        selectedPlatforms: props.filters.platform.value,
        selectedHasTeamMembers: props.filters.teamMembers
      })
    )
  } catch (error) {
    console.log(error)
  }
}
</script>

<style lang="scss" scoped>
.cube-widget-chart {
  padding: 24px 0;
  min-height: 348px;
}
</style>
