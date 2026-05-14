/**
 * Template Service
 * Handles dynamic placeholder replacement for notification messages.
 */

export interface TemplateData {
  client_name: string;
  loan_amount: string;
  due_date: string;
  outstanding_balance: string;
  installment_amount?: string;
  payment_amount?: string;
  company_name?: string;
  [key: string]: string | undefined;
}

export function renderTemplate(template: string, data: TemplateData): string {
  let rendered = template;

  // Default company name if not provided
  const companyName = data.company_name || "El Elyon Credit & Capital Solutions Limited";
  const allData = { ...data, company_name: companyName };

  Object.entries(allData).forEach(([key, value]) => {
    if (value !== undefined) {
      const placeholder = new RegExp(`{{${key}}}`, 'g');
      rendered = rendered.replace(placeholder, value);
    }
  });

  return rendered;
}
