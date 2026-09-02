// ============================================================================
// STORE OWNER WHATSAPP CONFIGURATION
// Replace the placeholder below with your personal WhatsApp number.
// Example: "081234567890" or "6281234567890"
// Note: You can edit this directly; the assistant will never read your number.
// ============================================================================
export const STORE_OWNER_WHATSAPP = "PUT_YOUR_PHONE_NUMBER_HERE";

export interface WhatsAppReceiptItem {
  name: string;
  qty: number;
  unitPrice: number;
  lineTotal: number;
  imeis?: string[];
}

export interface WhatsAppReceiptData {
  invoiceNumber: string;
  saleTime: string | Date;
  cashierName?: string;
  customerName?: string;
  items: WhatsAppReceiptItem[];
  subtotal: number;
  discountTotal?: number;
  taxTotal?: number;
  grandTotal: number;
  paymentMethod?: string;
  paidTotal?: number;
  change?: number;
  storeName?: string;
  storeAddress?: string;
  storePhone?: string;
  portalBaseUrl?: string;
}

/**
 * Normalizes phone numbers to international WhatsApp format (e.g. 62812xxx)
 */
export function normalizeWhatsAppNumber(phone: string): string {
  if (!phone) return "";
  let cleaned = phone.replace(/[^0-9]/g, "");
  if (cleaned.startsWith("0")) {
    cleaned = "62" + cleaned.slice(1);
  } else if (!cleaned.startsWith("62") && cleaned.length >= 8) {
    cleaned = "62" + cleaned;
  }
  return cleaned;
}

/**
 * Builds a clean, professional WhatsApp text receipt
 */
export function buildWhatsAppReceiptMessage(data: WhatsAppReceiptData): string {
  const store = data.storeName || "SmartStore Central";
  const address = data.storeAddress || "Jl. Sudirman No. 45, Jakarta Pusat";
  const phone = data.storePhone || "+62 812-3456-7890";
  const dateStr = new Date(data.saleTime).toLocaleString("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
  });

  const baseUrl =
    data.portalBaseUrl ||
    (typeof window !== "undefined"
      ? window.location.origin
      : "https://smartstore.id");

  // Collect primary IMEI for quick lookup link
  let primaryImei = "";
  for (const item of data.items) {
    if (item.imeis && item.imeis.length > 0) {
      primaryImei = item.imeis[0];
      break;
    }
  }

  const lookupParam = primaryImei || data.invoiceNumber;
  const warrantyLink = `${baseUrl}/warranty?q=${encodeURIComponent(lookupParam)}`;

  let lines: string[] = [];

  lines.push(`📱 *${store.toUpperCase()}*`);
  lines.push(`📍 ${address}`);
  lines.push(`📞 Telp/WA: ${phone}`);
  lines.push(`────────────────────────`);
  lines.push(`🧾 *NOTA PEMBELIAN & KARTU GARANSI*`);
  lines.push(`No. Nota : *${data.invoiceNumber}*`);
  lines.push(`Waktu    : ${dateStr}`);
  if (data.cashierName) lines.push(`Kasir    : ${data.cashierName}`);
  if (data.customerName && data.customerName !== "Walk-in Customer") {
    lines.push(`Pelanggan: ${data.customerName}`);
  }
  lines.push(`────────────────────────`);
  lines.push(`*RINCIAN ITEM:*`);

  data.items.forEach((it, idx) => {
    const unitPriceStr = Number(it.unitPrice).toLocaleString("id-ID");
    const lineTotalStr = Number(it.lineTotal).toLocaleString("id-ID");
    lines.push(
      `${idx + 1}. *${it.name}*\n   ${it.qty}x @ Rp ${unitPriceStr} = *Rp ${lineTotalStr}*`,
    );

    if (it.imeis && it.imeis.length > 0) {
      it.imeis.forEach((imei) => {
        lines.push(`   🏷️ *IMEI/SN:* \`${imei}\``);
      });
    }
  });

  lines.push(`────────────────────────`);
  lines.push(
    `Subtotal     : Rp ${Number(data.subtotal).toLocaleString("id-ID")}`,
  );
  if (data.discountTotal && data.discountTotal > 0) {
    lines.push(
      `Diskon       : -Rp ${Number(data.discountTotal).toLocaleString("id-ID")}`,
    );
  }
  if (data.taxTotal && data.taxTotal > 0) {
    lines.push(
      `PPN/Pajak    : Rp ${Number(data.taxTotal).toLocaleString("id-ID")}`,
    );
  }
  lines.push(
    `*TOTAL BAYAR : Rp ${Number(data.grandTotal).toLocaleString("id-ID")}*`,
  );

  if (data.paymentMethod) {
    lines.push(`Metode Bayar : ${data.paymentMethod.toUpperCase()}`);
  }
  if (data.paidTotal !== undefined && data.paidTotal > 0) {
    lines.push(
      `Jumlah Bayar : Rp ${Number(data.paidTotal).toLocaleString("id-ID")}`,
    );
  }
  if (data.change !== undefined && data.change > 0) {
    lines.push(
      `Kembalian    : Rp ${Number(data.change).toLocaleString("id-ID")}`,
    );
  }

  lines.push(`────────────────────────`);
  lines.push(`🛡️ *KARTU GARANSI RESMI DIGITAL:*`);
  lines.push(`Cek status & masa aktif garansi device Anda:`);
  lines.push(`${warrantyLink}`);
  lines.push(``);
  lines.push(`*Ketentuan Garansi:*`);
  lines.push(`• Garansi unit second: 30 Hari toko (mesin & fungsi).`);
  lines.push(`• Garansi unit baru: 1 Tahun Brand Resmi.`);
  lines.push(`• Segel baut toko wajib utuh & tidak sobek.`);
  lines.push(`• Tidak terkena cairan, jatuh, atau root/jailbreak.`);
  lines.push(`────────────────────────`);
  lines.push(`Terima kasih telah berbelanja di *${store}*! 🙏`);

  return lines.join("\n");
}

/**
 * Returns a direct wa.me link to launch WhatsApp
 */
export function getWhatsAppShareUrl(phone: string, text: string): string {
  const normPhone = normalizeWhatsAppNumber(phone);
  const encodedText = encodeURIComponent(text);
  if (!normPhone) {
    return `https://wa.me/?text=${encodedText}`;
  }
  return `https://wa.me/${normPhone}?text=${encodedText}`;
}
