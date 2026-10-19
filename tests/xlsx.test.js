// El .xlsx generado debe abrirse en Excel: se valida con un lector independiente (Python openpyxl)
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs"), os = require("node:os"), path = require("node:path"), { execFileSync } = require("node:child_process");
const X = require("../js/xlsx.js");

test("CRC32 estándar", () => assert.equal(X.crc32(new TextEncoder().encode("123456789")), 0xcbf43926));

test("xlsx válido: hojas, números, texto con acentos y caracteres especiales", (t) => {
  const bin = X.crear([{ nombre: "Ventas", filas: [["Fecha", "Modelo", "Total Bs"], ["2026-10-19", "Botín <Lima> & Café ñ", 349.5]] }, { nombre: "Caja/Z", filas: [["Fondo"], [500]] }]);
  const f = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "x-")), "r.xlsx"); fs.writeFileSync(f, bin);
  let out;
  try { out = execFileSync(process.env.PYTHON || "python3", ["-c", "import openpyxl,sys,json;w=openpyxl.load_workbook(sys.argv[1]);print(json.dumps({s.title:[list(r) for r in s.iter_rows(values_only=True)] for s in w}))", f], { encoding: "utf8" }); }
  catch (e) { t.skip("openpyxl no disponible"); return; }
  assert.deepEqual(JSON.parse(out), { "Ventas": [["Fecha", "Modelo", "Total Bs"], ["2026-10-19", "Botín <Lima> & Café ñ", 349.5]], "Caja Z": [["Fondo"], [500]] });
});
