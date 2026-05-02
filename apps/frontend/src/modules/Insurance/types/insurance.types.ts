export type InsuranceModuleType = 'SLI' | 'GIS'

export interface InsurancePolicyForm {
  empCode: string
  empName: string
  policyNumber: string
  policyType?: 'SLI' | 'GIS'
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

export interface CreateRemittancePayload {
  employee_policy_id: number
  salary_month: string
  due_month: string
  amount_deducted: number
  policy_cheque_id?: number
}

export interface InsurancePolicyOption extends InsurancePolicyForm {
  id: number   // 👈 ADD THIS
}
