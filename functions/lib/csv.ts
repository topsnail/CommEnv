/** CSV 单元格转义（RFC 4180 风格） */
export function escapeCsv(val: unknown): string {
  return `"${String(val ?? "").replace(/"/g, '""')}"`;
}
