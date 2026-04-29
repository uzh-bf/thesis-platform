import { TopicAreas, TopicAreasIBW } from './constants'

export interface TopicAreaVisual {
  label: string
  badge: string
  cardStripe: string
  dot: string
}

const topicAreaVisuals: Record<string, TopicAreaVisual> = {
  [TopicAreas.banking_and_insurance]: {
    label: 'BI',
    badge: 'bg-[#B7E9F4] text-[#147082] ring-[#1EA7C4]/30',
    cardStripe: 'bg-[#1EA7C4]',
    dot: 'bg-[#1EA7C4]',
  },
  [TopicAreas.corporate_finance]: {
    label: 'CF',
    badge: 'bg-[#FFE9B5] text-[#A27200] ring-[#F3AB00]/30',
    cardStripe: 'bg-[#F3AB00]',
    dot: 'bg-[#F3AB00]',
  },
  [TopicAreas.financial_economics]: {
    label: 'FE',
    badge: 'bg-[#BDC9E8] text-[#001E7C] ring-[#3062FF]/30',
    cardStripe: 'bg-[#3062FF]',
    dot: 'bg-[#3062FF]',
  },
  [TopicAreas.quantitative_finance]: {
    label: 'QF',
    badge: 'bg-[#FEB799] text-[#7E2601] ring-[#FC4C02]/30',
    cardStripe: 'bg-[#FC4C02]',
    dot: 'bg-[#FC4C02]',
  },
  [TopicAreas.sustainable_finance]: {
    label: 'SF',
    badge: 'bg-[#DBEDAD] text-[#536B18] ring-[#7CA023]/30',
    cardStripe: 'bg-[#7CA023]',
    dot: 'bg-[#7CA023]',
  },
  [TopicAreasIBW.accounting]: {
    label: 'AC',
    badge: 'bg-[#BDC9E8] text-[#001E7C] ring-[#3062FF]/30',
    cardStripe: 'bg-[#3062FF]',
    dot: 'bg-[#3062FF]',
  },
  [TopicAreasIBW.personnel_and_leadership]: {
    label: 'PL',
    badge: 'bg-[#F78CAA] text-[#60061F] ring-[#BF0D3E]/30',
    cardStripe: 'bg-[#BF0D3E]',
    dot: 'bg-[#BF0D3E]',
  },
  [TopicAreasIBW.strategy_organization_and_innovation]: {
    label: 'SO',
    badge: 'bg-[#B7E9F4] text-[#147082] ring-[#4AC9E3]/30',
    cardStripe: 'bg-[#4AC9E3]',
    dot: 'bg-[#4AC9E3]',
  },
  [TopicAreasIBW.marketing_digital_transformation_and_entrepreneurship]: {
    label: 'MD',
    badge: 'bg-[#FEB799] text-[#7E2601] ring-[#FC4C02]/30',
    cardStripe: 'bg-[#FC4C02]',
    dot: 'bg-[#FC4C02]',
  },
  [TopicAreasIBW.business_analytics_and_operations]: {
    label: 'BA',
    badge: 'bg-[#DBEDAD] text-[#536B18] ring-[#A4D233]/30',
    cardStripe: 'bg-[#A4D233]',
    dot: 'bg-[#A4D233]',
  },
}

const fallbackVisuals: TopicAreaVisual[] = [
  topicAreaVisuals[TopicAreas.banking_and_insurance],
  topicAreaVisuals[TopicAreas.corporate_finance],
  topicAreaVisuals[TopicAreas.financial_economics],
  topicAreaVisuals[TopicAreas.quantitative_finance],
  topicAreaVisuals[TopicAreas.sustainable_finance],
]

function getFallbackIndex(topicAreaName: string) {
  return topicAreaName
    .split('')
    .reduce((sum, char) => sum + char.charCodeAt(0), 0)
}

function getFallbackLabel(topicAreaName: string) {
  const words = topicAreaName
    .split(/[\s&,+-]+/)
    .filter(Boolean)
    .slice(0, 2)

  return (
    words.map((word) => word[0]?.toUpperCase()).join('') ||
    topicAreaName.slice(0, 2).toUpperCase()
  )
}

export function getTopicAreaVisual(topicAreaName: string): TopicAreaVisual {
  const visual = topicAreaVisuals[topicAreaName]

  if (visual) return visual

  const fallback =
    fallbackVisuals[getFallbackIndex(topicAreaName) % fallbackVisuals.length]

  return {
    ...fallback,
    label: getFallbackLabel(topicAreaName),
  }
}
