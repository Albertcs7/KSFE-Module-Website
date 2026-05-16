export interface MonthlyReportRow {
	employee_code: string | number;
	employee_name: string;
	policy_no: string;
	amount_deducted: number;
	[key: string]: any;
}

export interface GetMonthlyReportParams {
	policyType: 'GIS' | 'SLI';
	month: string; // MM
	year: string; // YYYY
}

export interface ExcelBufferResult {
	buffer: Buffer;
	filename: string;
}

export interface PolicyReportPolicyRow {
	employee_policy_id: number;
	employee_code: string | number;
	employee_name: string | null;
	policy_no: string;
	policy_type: 'GIS' | 'SLI';
	premium: number | string | null;
	maturity_date: string | null;
	status: number | string | null;
}

export interface PolicyReportRemittanceRow {
	policy_remittance_id: number;
	employee_policy_id: number;
	salary_month: string;
	due_month: string;
	amount_deducted: number | string;
	policy_cheque_id: number | null;
	encashment_date: string | null;
	receipt_no: string | null;
}

export interface PolicyReportData {
	policy: PolicyReportPolicyRow;
	remittances: PolicyReportRemittanceRow[];
	generatedAt: string;
	totalAmountDeducted: number;
}
