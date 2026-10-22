import { ApiError } from './ApiError.js';

export const ALLOWED_RECEIPT_PLACEHOLDERS = new Set([
  'bill_number',
  'invoice_no',
  'order_id',
  'order_number',
  'order_type',
  'token_number',
  'table_number',
  'date',
  'time',
  'datetime',
  'restaurant_name',
  'branch_name',
  'branch_address',
  'branch_phone',
  'branch_email',
  'tax_number',
  'gstin',
  'customer_name',
  'customer_phone',
  'customer_address',
  'cashier_name',
  'server_name',
  'waiter_name',
  'terminal_code',
  'terminal_name',
  'items',
  'item_name',
  'quantity',
  'unit_price',
  'item_total',
  'subtotal',
  'tax_amount',
  'tax_rate',
  'tax_breakdown',
  'discount_amount',
  'service_charge',
  'total_amount',
  'grand_total',
  'payment_method',
  'payment_status',
  'amount_paid',
  'change_due',
  'notes',
  'footer_content',
  'footer_message',
  'logo_url',
  'qr_code',
  'barcode',
]);

/**
 * Validates that all placeholders in the template text match the allowlist.
 */
export function validateTemplatePlaceholders(content?: string | null): void {
  if (!content) return;
  const regex = /\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g;
  let match: RegExpExecArray | null;
  const invalidPlaceholders: string[] = [];

  while ((match = regex.exec(content)) !== null) {
    const placeholder = match[1].toLowerCase();
    if (!ALLOWED_RECEIPT_PLACEHOLDERS.has(placeholder)) {
      invalidPlaceholders.push(`{{${match[1]}}}`);
    }
  }

  if (invalidPlaceholders.length > 0) {
    throw new ApiError(
      400,
      `Invalid template placeholder(s): ${Array.from(new Set(invalidPlaceholders)).join(', ')}. Placeholders must be drawn from the allowlist.`
    );
  }
}

/**
 * Strips script tags, unsafe tags, event handlers, and javascript protocols
 * to prevent XSS and code injection.
 */
export function sanitizeTemplateContent(content?: string | null): string {
  if (!content) return '';
  return content
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
    .replace(/<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi, '')
    .replace(/<embed\b[^<]*(?:(?!<\/embed>)<[^<]*)*<\/embed>/gi, '')
    .replace(/<link\b[^>]*>/gi, '')
    .replace(/<meta\b[^>]*>/gi, '')
    .replace(/\son\w+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, '')
    .replace(/javascript\s*:/gi, '')
    .replace(/data\s*:\s*text\/html/gi, '')
    .replace(/vbscript\s*:/gi, '');
}

/**
 * Default sample data for receipt rendering and previews.
 */
export const DEFAULT_RECEIPT_SAMPLE_DATA: Record<string, any> = {
  restaurant_name: 'Dal Ghar Fine Dining',
  branch_name: 'Connaught Place Main Branch',
  branch_address: '14/B Inner Circle, Connaught Place, New Delhi',
  branch_phone: '+91 11 4151 2200',
  branch_email: 'cp@dalghar.com',
  tax_number: '07AAAAA0000A1Z5',
  gstin: '07AAAAA0000A1Z5',
  bill_number: 'INV-2026-000125',
  invoice_no: 'INV-2026-000125',
  order_number: 'ORD-108',
  order_type: 'Dine-In',
  token_number: '42',
  table_number: 'Table 7',
  date: new Date().toISOString().split('T')[0],
  time: new Date().toLocaleTimeString('en-US', { hour12: true }),
  datetime: new Date().toLocaleString('en-US', { hour12: true }),
  cashier_name: 'Rahul Sharma',
  server_name: 'Pooja Verma',
  terminal_code: 'POS-01',
  terminal_name: 'Counter Main POS',
  customer_name: 'Amit Patel',
  customer_phone: '+91 98765 43210',
  customer_address: 'Barakhamba Road, New Delhi',
  items: [
    { name: 'Dal Makhani Special', qty: 2, price: 340, total: 680 },
    { name: 'Butter Naan', qty: 4, price: 65, total: 260 },
    { name: 'Paneer Tikka Masala', qty: 1, price: 380, total: 380 },
    { name: 'Jeera Rice', qty: 1, price: 190, total: 190 },
    { name: 'Gulab Jamun (2 pcs)', qty: 2, price: 95, total: 190 },
  ],
  subtotal: '1700.00',
  discount_amount: '85.00',
  tax_rate: '5%',
  tax_amount: '80.75',
  tax_breakdown: 'CGST (2.5%): ₹40.38 | SGST (2.5%): ₹40.37',
  service_charge: '0.00',
  total_amount: '1695.75',
  grand_total: '1695.75',
  payment_method: 'UPI / GooglePay',
  payment_status: 'PAID',
  amount_paid: '1695.75',
  change_due: '0.00',
  notes: 'Customer requested mild spice',
  footer_message: 'Thank you for dining with Dal Ghar! Visit again.',
  footer_content: 'FSSAI Lic No: 13321008000451 | Have a great day!',
  barcode: '|||||| | |||| |||||| || |',
  qr_code: '[QR: https://dalghar.com/feedback]',
};

/**
 * Interpolates placeholders and generates HTML and plain-text preview of receipt.
 */
export function renderReceiptPreview(
  template: {
    paper_width_mm: number;
    header_content?: string | null;
    body_template: string;
    footer_content?: string | null;
    show_logo?: boolean;
    show_tax_breakdown?: boolean;
    show_cashier_name?: boolean;
    show_terminal_code?: boolean;
    template_config?: Record<string, any> | null;
  },
  customData?: Record<string, any>
) {
  const data = { ...DEFAULT_RECEIPT_SAMPLE_DATA, ...(customData || {}) };

  const replacePlaceholders = (text?: string | null): string => {
    if (!text) return '';
    return text.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_, key) => {
      const lowerKey = key.toLowerCase();
      if (lowerKey === 'items' && Array.isArray(data.items)) {
        return data.items
          .map((item: any) => `${item.qty}x ${item.name} - ₹${item.total}`)
          .join('\n');
      }
      return data[lowerKey] !== undefined ? String(data[lowerKey]) : `{{${key}}}`;
    });
  };

  const headerRendered = replacePlaceholders(template.header_content);
  const bodyRendered = replacePlaceholders(template.body_template);
  const footerRendered = replacePlaceholders(template.footer_content);

  const paperWidth = template.paper_width_mm === 58 ? 58 : 80;
  const config = template.template_config || {};
  const fontSize = config.font_size || 12;
  const alignment = config.alignment || 'left';
  const fontFamily = config.font_family || 'monospace, Courier New, sans-serif';

  const rendered_text = [
    template.show_logo ? `[ *** ${data.restaurant_name.toUpperCase()} *** ]` : '',
    headerRendered,
    '------------------------------------------------',
    template.show_terminal_code ? `Terminal: ${data.terminal_code}` : '',
    template.show_cashier_name ? `Cashier: ${data.cashier_name}` : '',
    `Date: ${data.date} ${data.time}`,
    `Bill No: ${data.bill_number}`,
    '------------------------------------------------',
    bodyRendered,
    '------------------------------------------------',
    template.show_tax_breakdown ? `Tax Breakdown: ${data.tax_breakdown}` : '',
    `Total: ₹${data.total_amount}`,
    '------------------------------------------------',
    footerRendered,
  ]
    .filter((line) => line !== '')
    .join('\n');

  const rendered_html = `
<div class="pos-receipt-preview" style="
  width: ${paperWidth}mm;
  max-width: 100%;
  font-family: ${fontFamily};
  font-size: ${fontSize}px;
  line-height: 1.4;
  color: #111;
  background: #fff;
  padding: 12px;
  margin: 0 auto;
  box-shadow: 0 4px 12px rgba(0,0,0,0.1);
  border: 1px solid #e2e8f0;
  border-radius: 4px;
">
  ${
    template.show_logo
      ? `<div style="text-align: center; margin-bottom: 8px; font-weight: bold; font-size: ${fontSize + 4}px;">
          ${data.restaurant_name}
        </div>`
      : ''
  }
  ${
    headerRendered
      ? `<div style="text-align: ${alignment}; margin-bottom: 8px; white-space: pre-line;">${headerRendered}</div>`
      : ''
  }
  <hr style="border: none; border-top: 1px dashed #4a5568; margin: 8px 0;" />
  <div style="font-size: ${fontSize - 1}px; color: #4a5568; margin-bottom: 6px;">
    ${template.show_terminal_code ? `<div><strong>Terminal:</strong> ${data.terminal_code}</div>` : ''}
    ${template.show_cashier_name ? `<div><strong>Cashier:</strong> ${data.cashier_name}</div>` : ''}
    <div><strong>Bill No:</strong> ${data.bill_number}</div>
    <div><strong>Date:</strong> ${data.date} ${data.time}</div>
  </div>
  <hr style="border: none; border-top: 1px dashed #4a5568; margin: 8px 0;" />
  <div style="text-align: ${alignment}; white-space: pre-line; margin: 8px 0;">
    ${bodyRendered}
  </div>
  ${
    template.show_tax_breakdown
      ? `<hr style="border: none; border-top: 1px dashed #4a5568; margin: 8px 0;" />
         <div style="font-size: ${fontSize - 2}px; color: #718096;">
           ${data.tax_breakdown}
         </div>`
      : ''
  }
  <hr style="border: none; border-top: 1px solid #1a202c; margin: 8px 0;" />
  <div style="font-weight: bold; font-size: ${fontSize + 2}px; display: flex; justify-content: space-between;">
    <span>TOTAL:</span>
    <span>₹${data.total_amount}</span>
  </div>
  ${
    footerRendered
      ? `<hr style="border: none; border-top: 1px dashed #4a5568; margin: 8px 0;" />
         <div style="text-align: center; font-size: ${fontSize - 1}px; color: #4a5568; white-space: pre-line;">
           ${footerRendered}
         </div>`
      : ''
  }
</div>`.trim();

  return {
    rendered_html,
    rendered_text,
    paper_width_mm: paperWidth,
    sample_data_used: data,
  };
}
