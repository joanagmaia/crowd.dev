<template>
  <div class="cube-widget-chart" :class="componentType">
    <component
      :is="componentType"
      ref="chart"
      :data="data"
      v-bind="{
        ...customChartOptions,
        dataset
      }"
    ></component>
  </div>
</template>

<script>
export default {
  name: 'AppWidgetArea'
}
</script>

<script setup>
import {
  defineEmits,
  defineProps,
  computed,
  onMounted,
  ref
} from 'vue'
import cloneDeep from 'lodash/cloneDeep'
import { parseAxisLabel } from '@/utils/reports'
import { externalTooltipHandler } from '@/modules/report/tooltip'

const componentType = 'area-chart'

const emit = defineEmits(['on-view-more-click'])
const props = defineProps({
  datasets: {
    type: Array,
    default: () => []
  },
  resultSet: {
    type: null,
    required: true
  },
  chartOptions: {
    type: Object,
    default: () => {}
  },
  granularity: {
    type: String,
    required: true
  },
  isGridMinMax: {
    type: Boolean,
    default: false
  }
})

const customChartOptions = cloneDeep(props.chartOptions)

// Customize external tooltip
// Handle View more button click
// Get dataPoint from tooltip and extract the date
customChartOptions.library.plugins.tooltip.external = (
  context
) =>
  externalTooltipHandler(context, () => {
    const point = context.tooltip.dataPoints.find(
      (p) => p.datasetIndex === 0
    )
    const date = data.value[0].data[point.dataIndex][0]

    emit('on-view-more-click', date)
  })

// Customize x ticks
customChartOptions.library.scales.x.ticks.callback = (
  value
) => parseAxisLabel(value, props.granularity)

const dataset = ref(null)

const loading = computed(
  () => !props.resultSet?.loadResponses
)

const data = computed(() => {
  if (loading.value) {
    return []
  }

  return series(props.resultSet)
})

onMounted(async () => {
  paintDataSet()
})

const paintDataSet = () => {
  const canvas = document.querySelector(
    '.cube-widget-chart canvas'
  )
  if (canvas && props.chartOptions?.computeDataset) {
    dataset.value =
      props.chartOptions.computeDataset(canvas)
  }
}

// Parse resultSet into data that can be consumed by area-chart component
const series = (resultSet) => {
  // For line & area charts
  const pivot = resultSet.chartPivot()
  const series = []

  if (resultSet.loadResponses.length > 0) {
    resultSet.loadResponses.forEach((_, index) => {
      const prefix =
        resultSet.loadResponses.length === 1
          ? ''
          : `${index},` // has more than 1 dataset
      const data = pivot.map((p) => [
        p.x,
        p[`${prefix}${props.datasets[index].measure}`]
      ])

      // Only show bottom and top grid lines by setting
      // the stepSize to be the maxValue
      if (props.isGridMinMax) {
        const maxValue = Math.max(...data.map((d) => d[1]))
        customChartOptions.library.scales.y.ticks.stepSize =
          maxValue
      }

      series.push({
        name: props.datasets[index].name,
        data,
        ...{
          dataset: props.datasets[index]
        }
      })
    })
  }

  return series
}
</script>
