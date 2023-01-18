<template>
  <div class="widget-active-members">
    <div class="grid grid-cols-3">
      <div
        v-for="(widget, index) of widgets"
        :key="index"
        class="p-6"
        :class="
          index !== 0
            ? 'border-l border-r border-gray-100'
            : ''
        "
      >
        <div class="flex items-center justify-between mb-4">
          <app-widget-title
            text-size="text-xs"
            :title="widget.title"
          />
          <button
            v-if="currentUser"
            v-show="!isPublicView"
            type="button"
            class="btn btn-brand--transparent btn--sm"
            @click="handleDrawerOpen(widget)"
          >
            View
          </button>
        </div>

        <query-renderer
          v-if="cubejsApi"
          :cubejs-api="cubejsApi"
          :query="widget.query"
        >
          <template
            #default="{ resultSet, loading, error }"
          >
            <!-- Loading -->
            <app-widget-loading
              v-if="loading || !resultSet?.loadResponses"
              type="kpi"
            />

            <!-- Error -->
            <app-widget-error
              v-else-if="error"
              type="kpi"
            />

            <app-widget-kpi
              v-else
              :current-value="kpiCurrentValue(resultSet)"
              :previous-value="kpiPreviousValue(resultSet)"
              :vs-label="`vs. last ${widget.period}`"
            ></app-widget-kpi>
          </template>
        </query-renderer>
      </div>
    </div>
    <app-widget-drawer
      v-if="drawerExpanded"
      v-model="drawerExpanded"
      :fetch-fn="getActiveMembers"
      :title="drawerTitle"
      module-name="member"
      size="480px"
      @on-export="onExport"
    ></app-widget-drawer>
  </div>
</template>

<script setup>
import { computed, ref, defineProps } from 'vue'
import { QueryRenderer } from '@cubejs-client/vue3'
import {
  mapGetters,
  mapActions
} from '@/shared/vuex/vuex.helpers'
import {
  TOTAL_ACTIVE_MEMBERS_QUERY,
  ACTIVE_MEMBERS_FILTER
} from '@/modules/widget/widget-queries'
import AppWidgetKpi from '@/modules/widget/components/v2/shared/widget-kpi.vue'
import AppWidgetTitle from '@/modules/widget/components/v2/shared/widget-title.vue'
import AppWidgetLoading from '@/modules/widget/components/v2/shared/widget-loading.vue'
import AppWidgetError from '@/modules/widget/components/v2/shared/widget-error.vue'
import AppWidgetDrawer from '@/modules/widget/components/v2/shared/widget-drawer.vue'
import {
  ONE_DAY_PERIOD_FILTER,
  FOURTEEN_DAYS_PERIOD_FILTER,
  THIRTY_DAYS_PERIOD_FILTER,
  DAILY_GRANULARITY_FILTER,
  WEEKLY_GRANULARITY_FILTER,
  MONTHLY_GRANULARITY_FILTER
} from '@/modules/widget/widget-constants'
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

const { currentUser } = mapGetters('auth')
const { cubejsApi } = mapGetters('widget')
const { doExport } = mapActions('member')

const drawerExpanded = ref()
const drawerTitle = ref()
const drawerPeriod = ref()

const widgets = computed(() => {
  return [
    {
      title: 'Active members today',
      filter: ONE_DAY_PERIOD_FILTER,
      query: query(
        ONE_DAY_PERIOD_FILTER,
        DAILY_GRANULARITY_FILTER
      ),
      period: 'day'
    },
    {
      title: 'Active members this week',
      filter: FOURTEEN_DAYS_PERIOD_FILTER,
      query: query(
        FOURTEEN_DAYS_PERIOD_FILTER,
        WEEKLY_GRANULARITY_FILTER
      ),
      period: 'week'
    },
    {
      title: 'Active members this month',
      filter: THIRTY_DAYS_PERIOD_FILTER,
      query: query(
        THIRTY_DAYS_PERIOD_FILTER,
        MONTHLY_GRANULARITY_FILTER
      ),
      period: 'month'
    }
  ]
})

const query = (period, granularity) => {
  return TOTAL_ACTIVE_MEMBERS_QUERY({
    period,
    granularity,
    selectedPlatforms: props.filters.platform.value,
    selectedHasTeamMembers: props.filters.teamMembers
  })
}

const kpiCurrentValue = (resultSet) => {
  if (resultSet.loadResponses[0].data.length === 0) {
    // if we get an empty data points array from cube
    return 0
  }
  const pivot = resultSet.chartPivot()
  return Number(pivot[pivot.length - 1]['Members.count'])
}

const kpiPreviousValue = (resultSet) => {
  if (resultSet.loadResponses[0].data.length === 0) {
    // if we get an empty data points array from cube
    return 0
  }
  const pivot = resultSet.chartPivot()
  return Number(pivot[pivot.length - 2]['Members.count'])
}

// Fetch function to pass to detail drawer
const getActiveMembers = async ({
  pagination,
  period = drawerPeriod.value
}) => {
  return await MemberService.list(
    ACTIVE_MEMBERS_FILTER({
      period,
      selectedPlatforms: props.filters.platform.value,
      selectedHasTeamMembers: props.filters.teamMembers
    }),
    'lastActive_DESC',
    pagination.pageSize,
    (pagination.currentPage - 1) * pagination.pageSize,
    false
  )
}

// Open drawer and set title and period
const handleDrawerOpen = async (widget) => {
  window.analytics.track('Open report drawer', {
    template: 'Members',
    widget: widget.title,
    period: widget.filter
  })

  drawerExpanded.value = true
  drawerTitle.value = widget.title
  drawerPeriod.value = widget.filter
}

const onExport = async () => {
  try {
    await doExport(
      false,
      ACTIVE_MEMBERS_FILTER({
        period: drawerPeriod.value,
        selectedPlatforms: props.filters.platform.value,
        selectedHasTeamMembers: props.filters.teamMembers
      })
    )
  } catch (error) {
    console.log(error)
  }
}
</script>

<style lang="scss">
.widget-active-members {
  @apply bg-white shadow rounded-lg;
}
</style>
