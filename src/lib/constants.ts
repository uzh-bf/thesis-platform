export enum ProposalStatus {
  OPEN = 'OPEN',
  WAITING_FOR_STUDENT = 'WAITING_FOR_STUDENT',
  WAITING_FOR_SUPERVISOR = 'WAITING_FOR_SUPERVISOR',
  MATCHED_TENTATIVE = 'MATCHED_TENTATIVE',
  MATCHED = 'MATCHED',
  SUBMITTED = 'SUBMITTED',
  REVIEWED = 'REVIEWED',
  CLOSED = 'CLOSED',
}

export enum ApplicationStatus {
  OPEN = 'OPEN',
  DECLINED = 'DECLINED',
  ACCEPTED = 'ACCEPTED',
  ACCEPTED_TENTATIVE = 'ACCEPTED_TENTATIVE',
  WITHDRAWN = 'WITHDRAWN',
}

export enum ProposalType {
  STUDENT = 'STUDENT',
  SUPERVISOR = 'SUPERVISOR',
}

export enum ProposalFeedbackType {
  ACCEPTED = 'ACCEPTED',
  ACCEPTED_TENTATIVE = 'ACCEPTED_TENTATIVE',
  REJECTED_TOO_BROAD = 'REJECTED_TOO_BROAD',
  REJECTED_FORMAT = 'REJECTED_FORMAT',
  REJECTED_NOT_SCIENTIFIC = 'REJECTED_NOT_SCIENTIFIC',
  REJECTED_NOT_CLEAR = 'REJECTED_NOT_CLEAR',
  REJECTED_FORMAT_UNSUITABLE = 'REJECTED_FORMAT_UNSUITABLE',
  REJECTED_TOPIC_AREA_INVALID = 'REJECTED_TOPIC_AREA_INVALID',
  DECLINED_LACKING_INTEREST = 'DECLINED_LACKING_INTEREST',
  DECLINED_PERSONAL_WORKLOAD = 'DECLINED_PERSONAL_WORKLOAD',
  DECLINED_LANGUAGE = 'DECLINED_LANGUAGE',
}

export enum UserRole {
  STUDENT = 'STUDENT',
  SUPERVISOR = 'SUPERVISOR',
  DEVELOPER = 'DEVELOPER',
}

export enum TopicAreas {
  banking_and_insurance = 'Banking and Insurance',
  corporate_finance = 'Corporate Finance',
  financial_economics = 'Financial Economics',
  quantitative_finance = 'Quantitative Finance',
  sustainable_finance = 'Sustainable Finance',
}
