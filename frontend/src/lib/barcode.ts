/**
 * Pure TypeScript Code 128 (Subset B) Vector SVG Barcode Generator
 * 0 dependencies, produces crisp vector SVGs for label printing.
 */

// Code 128 patterns (widths of bars and spaces)
const CODE128_PATTERNS = [
  "212222", "222122", "222221", "121223", "121322", "131222", "122213", "122312", "132212", "221213", // 0-9
  "221312", "231212", "112232", "122132", "122231", "113222", "123122", "123221", "223211", "221132", // 10-19
  "221231", "213212", "223112", "312131", "311222", "321122", "321221", "312212", "322112", "322211", // 20-29
  "212123", "212321", "232121", "111323", "131123", "131321", "112313", "132113", "132311", "211313", // 30-39
  "231113", "231311", "112133", "112331", "132131", "113123", "113321", "133121", "313121", "211331", // 40-49
  "231131", "213113", "213311", "213131", "311123", "311321", "331121", "312113", "312311", "332111", // 50-59
  "314111", "221411", "431111", "111224", "111422", "121124", "121421", "141122", "141221", "112214", // 60-69
  "112412", "122114", "122411", "142112", "142211", "241211", "221114", "413111", "241112", "134111", // 70-79
  "111242", "121142", "121241", "114212", "124112", "124211", "411212", "421112", "421211", "212141", // 80-89
  "214121", "412121", "111143", "111341", "131141", "114113", "114311", "411113", "411311", "113141", // 90-99
  "114131", "311141", "411131", "211412", "211214", "211232", "2331112" // 100-106 (106 is STOP)
];

const START_CODE_B = 104;
const STOP_CODE = 106;

/**
 * Generate a clean Code 128-B barcode as an SVG string.
 */
export function generateBarcodeSvg(
  text: string,
  options?: {
    height?: number;
    moduleWidth?: number;
    showText?: boolean;
    fontSize?: number;
  }
): string {
  const height = options?.height ?? 50;
  const moduleWidth = options?.moduleWidth ?? 1.5;
  const showText = options?.showText ?? true;
  const fontSize = options?.fontSize ?? 11;

  if (!text) return "";

  // Calculate Code 128 characters and checksum
  const charCodes: number[] = [START_CODE_B];
  let checkSum = START_CODE_B;

  for (let i = 0; i < text.length; i++) {
    const code = text.charCodeAt(i) - 32;
    if (code >= 0 && code <= 95) {
      charCodes.push(code);
      checkSum += code * (i + 1);
    }
  }

  const checkCode = checkSum % 103;
  charCodes.push(checkCode);
  charCodes.push(STOP_CODE);

  // Convert char codes to sequence of bar widths
  let pattern = "";
  for (const code of charCodes) {
    pattern += CODE128_PATTERNS[code] || "";
  }

  // Build SVG rects
  let currentX = 10; // Quiet zone
  const rects: string[] = [];

  for (let i = 0; i < pattern.length; i++) {
    const width = parseInt(pattern[i], 10) * moduleWidth;
    const isBar = i % 2 === 0;
    if (isBar) {
      rects.push(
        `<rect x="${currentX.toFixed(1)}" y="4" width="${width.toFixed(1)}" height="${height}" fill="#000000" />`
      );
    }
    currentX += width;
  }

  const totalWidth = currentX + 10; // Extra quiet zone
  const totalHeight = showText ? height + fontSize + 10 : height + 8;

  const textElement = showText
    ? `<text x="${(totalWidth / 2).toFixed(1)}" y="${height + fontSize + 6}" font-family="monospace, Courier" font-size="${fontSize}" font-weight="600" text-anchor="middle" fill="#000000">${escapeXml(text)}</text>`
    : "";

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${totalWidth.toFixed(1)} ${totalHeight}" width="100%" height="100%">
    ${rects.join("\n")}
    ${textElement}
  </svg>`;
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}
