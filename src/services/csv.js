const escapeCell = (value) => {
  if (value === null || value === undefined) return "";
  let text = Array.isArray(value) ? value.join("; ") : value instanceof Date ? value.toISOString() : String(value);
  // Neutralize spreadsheet formula injection.
  if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`;
  return /[",\n\r]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
};

export function toCsv(rows, columns) {
  const header = columns.map((column) => escapeCell(column.label)).join(",");
  const lines = rows.map((row) => columns.map((column) => escapeCell(row[column.key])).join(","));
  return [header, ...lines].join("\r\n");
}
