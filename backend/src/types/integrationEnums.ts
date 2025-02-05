export enum PlatformType {
  DEVTO = 'devto',
  SLACK = 'slack',
  DISCORD = 'discord',
  GITHUB = 'github',
  TWITTER = 'twitter',
  REDDIT = 'reddit',
  HACKERNEWS = 'hackernews',
  LINKEDIN = 'linkedin',
  CROWD = 'crowd',
  ENRICHMENT = 'enrichment',
  HASHNODE = 'hashnode',
  KAGGLE = 'kaggle',
  MEDIUM = 'medium',
  PRODUCTHUNT = 'producthunt',
  YOUTUBE = 'youtube',
  STACKOVERFLOW = 'stackoverflow',
  GIT = 'git',
  CRUNCHBASE = 'crunchbase',
  OTHER = 'other',
}

export const ALL_PLATFORM_TYPES = Object.keys(PlatformType) as PlatformType[]

export enum IntegrationType {
  DEVTO = 'devto',
  SLACK = 'slack',
  REDDIT = 'reddit',
  DISCORD = 'discord',
  GITHUB = 'github',
  TWITTER = 'twitter',
  TWITTER_REACH = 'twitter-reach',
  HACKER_NEWS = 'hackernews',
  LINKEDIN = 'linkedin',
  CROWD = 'crowd',
  STACKOVERFLOW = 'stackoverflow',
  GIT = 'git',
}

export const integrationLabel: Record<IntegrationType, string> = {
  [IntegrationType.DEVTO]: 'DEV',
  [IntegrationType.SLACK]: 'Slack',
  [IntegrationType.REDDIT]: 'Reddit',
  [IntegrationType.DISCORD]: 'Discord',
  [IntegrationType.GITHUB]: 'GitHub',
  [IntegrationType.TWITTER]: 'Twitter',
  [IntegrationType.TWITTER_REACH]: 'Twitter',
  [IntegrationType.HACKER_NEWS]: 'Hacker news',
  [IntegrationType.LINKEDIN]: 'LinkedIn',
  [IntegrationType.CROWD]: 'Crowd',
  [IntegrationType.STACKOVERFLOW]: 'Stack Overflow',
  [IntegrationType.GIT]: 'Git',
}
