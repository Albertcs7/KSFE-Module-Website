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
