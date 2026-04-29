export type InsuranceModuleType = 'SLI' | 'GIS'

export interface InsurancePolicyForm {
  empCode: string
  empName: string
  policyNumber: string
  premium: number
  dateOfMaturity: string
}

export interface InsurancePolicyOption extends InsurancePolicyForm {}

export interface InsuranceRemittanceForm {
  empCode: string
  policyNumber: string
  salaryMonth: string
  dueMonth: string
  amountDeducted: number
  chequeId?: string
}

export interface InsuranceChequeForm {
  encashmentDate: string
  receiptNoOrChequeNo: string
  salaryMonth: string
}
