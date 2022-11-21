export enum ProposalStatus {
  OPEN = 'OPEN',
  WAITING_FOR_STUDENT = 'WAITING_FOR_STUDENT',
  WAITING_FOR_SUPERVISOR = 'WAITING_FOR_SUPERVISOR',
  MATCHED = 'MATCHED',
  SUBMITTED = 'SUBMITTED',
  REVIEWED = 'REVIEWED',
  CLOSED = 'CLOSED',
}

export enum ApplicationStatus {
  OPEN = 'OPEN',
  DECLINED = 'DECLINED',
  ACCEPTED = 'ACCEPTED',
  WITHDRAWN = 'WITHDRAWN',
}

export enum ProposalType {
  STUDENT = 'STUDENT',
  SUPERVISOR = 'SUPERVISOR',
}

export enum ProposalFeedbackType {
  ACCEPTED = 'ACCEPTED',
  REJECTED_CONTENT = 'REJECTED_CONTENT',
  REJECTED_FORMAT = 'REJECTED_FORMAT',
  DECLINED_INTEREST = 'DECLINED_INTEREST',
  DECLINED_WORKLOAD = 'DECLINED_WORKLOAD',
}

export enum UserRole {
  STUDENT = 'STUDENT',
  SUPERVISOR = 'SUPERVISOR',
  ADMIN = 'ADMIN',
}

export enum TopicAreas {
  banking_and_insurance = 'Banking and Insurance',
  corporate_finance = 'Corporate Finance',
  financial_economics = 'Financial Economics',
  quantitative_finance = 'Quantitative Finance',
  sustainable_finance = 'Sustainable Finance',
}
