export function csvValue(value: unknown) {
  if (value === null || value === undefined) return "";
  if (value instanceof Date) return value.toISOString();
  let text = String(value);
  // Neutralise spreadsheet formulas. Leading whitespace is included because
  // some spreadsheet apps trim it before evaluating a cell.
  if (typeof value !== "number" && /^\s*[=+\-@\t\r]/.test(text)) {
    text = `'${text}`;
  }
  if (/[",\r\n]/.test(text) || /^\s|\s$/.test(text)) {
    return `"${text.replaceAll('"', '""')}"`;
  }
  return text;
}

export function toCsv(
  headers: Array<{ key: string; label: string }>,
  rows: Array<Record<string, unknown>>,
) {
  const lines = [
    headers.map((header) => csvValue(header.label)).join(","),
    ...rows.map((row) =>
      headers.map((header) => csvValue(row[header.key])).join(","),
    ),
  ];
  return `\uFEFF${lines.join("\r\n")}\r\n`;
}

export function csvResponse(filename: string, body: string) {
  return new Response(body, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename.replace(/[^a-zA-Z0-9._-]/g, "-")}"`,
      "Cache-Control": "no-store",
    },
  });
}
