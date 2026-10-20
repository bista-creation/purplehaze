import { describe, expect, it } from "vitest";
import { csvValue } from "./csv";

describe("csvValue", () => {
  it("neutralises spreadsheet formulas", () => {
    expect(csvValue("=1+1")).toBe("'=1+1");
    expect(csvValue("+SUM(A1:A2)")).toBe("'+SUM(A1:A2)");
    expect(csvValue("-10")).toBe("'-10");
    expect(csvValue("@SUM(A1:A2)")).toBe("'@SUM(A1:A2)");
    expect(csvValue("\t=1")).toBe("'\t=1");
    expect(csvValue("  =SUM(A1)")).toBe("'  =SUM(A1)");
  });

  it("does not alter numeric values", () => {
    expect(csvValue(-42)).toBe("-42");
    expect(csvValue(0)).toBe("0");
  });

  it("escapes commas, quotes, newlines and edge whitespace", () => {
    expect(csvValue('He said "hi", ok')).toBe('"He said ""hi"", ok"');
    expect(csvValue("line\nbreak")).toBe('"line\nbreak"');
    expect(csvValue(" leading")).toBe('" leading"');
    expect(csvValue("trailing ")).toBe('"trailing "');
  });
});
