// @ts-check
/* Generador mínimo de archivos Excel (.xlsx, Office Open XML) sin dependencias.
   Un .xlsx es un ZIP con XML; aquí se arma con compresión "store" (sin comprimir), suficiente para reportes.
   Uso: Xlsx.crear([{ nombre: "Ventas", filas: [["Fecha","Total"], ["2026-10-19", 349]] }]) → Uint8Array */
(function (global) {
  "use strict";
  const enc = new TextEncoder();
  const escXml = s => String(s).replace(/[<>&"]/g, c => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" }[c])).replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, "");

  /* ---------- CRC32 y ZIP (método 0 = store) ---------- */
  const TABLA = Array.from({ length: 256 }, (_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c >>> 0; });
  const crc32 = b => { let c = 0xffffffff; for (let i = 0; i < b.length; i++) c = TABLA[(c ^ b[i]) & 0xff] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
  function zip(archivos) {
    const partes = [], central = []; let offset = 0;
    for (const [nombre, texto] of archivos) {
      const n = enc.encode(nombre), d = enc.encode(texto), crc = crc32(d);
      const h = new DataView(new ArrayBuffer(30));
      h.setUint32(0, 0x04034b50, true); h.setUint16(4, 20, true); h.setUint16(6, 0x0800, true); // UTF-8
      h.setUint32(14, crc, true); h.setUint32(18, d.length, true); h.setUint32(22, d.length, true); h.setUint16(26, n.length, true);
      partes.push(new Uint8Array(h.buffer), n, d);
      const c = new DataView(new ArrayBuffer(46));
      c.setUint32(0, 0x02014b50, true); c.setUint16(4, 20, true); c.setUint16(6, 20, true); c.setUint16(8, 0x0800, true);
      c.setUint32(16, crc, true); c.setUint32(20, d.length, true); c.setUint32(24, d.length, true); c.setUint16(28, n.length, true); c.setUint32(42, offset, true);
      central.push(new Uint8Array(c.buffer), n);
      offset += 30 + n.length + d.length;
    }
    const tamCentral = central.reduce((s, p) => s + p.length, 0);
    const fin = new DataView(new ArrayBuffer(22));
    fin.setUint32(0, 0x06054b50, true); fin.setUint16(8, archivos.length, true); fin.setUint16(10, archivos.length, true);
    fin.setUint32(12, tamCentral, true); fin.setUint32(16, offset, true);
    const todo = [...partes, ...central, new Uint8Array(fin.buffer)], out = new Uint8Array(todo.reduce((s, p) => s + p.length, 0));
    let i = 0; for (const p of todo) { out.set(p, i); i += p.length; }
    return out;
  }

  /* ---------- Hojas ---------- */
  const col = n => { let s = ""; n++; while (n) { const m = (n - 1) % 26; s = String.fromCharCode(65 + m) + s; n = Math.floor((n - 1) / 26); } return s; };
  function hoja(filas) {
    const anchos = (filas[0] || []).map((_, j) => Math.min(50, Math.max(8, ...filas.slice(0, 200).map(f => String(f[j] ?? "").length + 2))));
    const xmlFilas = filas.map((f, i) => `<row r="${i + 1}">${f.map((v, j) => {
      const ref = col(j) + (i + 1), est = i === 0 ? ' s="1"' : "";
      if (v == null || v === "") return "";
      return typeof v === "number" && Number.isFinite(v) ? `<c r="${ref}"${est}><v>${v}</v></c>` : `<c r="${ref}" t="inlineStr"${est}><is><t xml:space="preserve">${escXml(v)}</t></is></c>`;
    }).join("")}</row>`).join("");
    return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">` +
      `<sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>` +
      `<cols>${anchos.map((w, j) => `<col min="${j + 1}" max="${j + 1}" width="${w}" customWidth="1"/>`).join("")}</cols>` +
      `<sheetData>${xmlFilas}</sheetData></worksheet>`;
  }
  /** @param {{nombre:string, filas:(string|number|null)[][]}[]} hojas @returns {Uint8Array} */
  function crear(hojas) {
    const nombres = hojas.map((h, i) => escXml(h.nombre.replace(/[\\/?*[\]:]/g, " ").slice(0, 31) || "Hoja" + (i + 1)));
    const ct = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">` +
      `<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/>` +
      `<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>` +
      `<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>` +
      hojas.map((_, i) => `<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join("") + `</Types>`;
    const rels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`;
    const wb = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>` +
      nombres.map((n, i) => `<sheet name="${n}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`).join("") + `</sheets></workbook>`;
    const wbRels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">` +
      hojas.map((_, i) => `<Relationship Id="rId${i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`).join("") +
      `<Relationship Id="rId${hojas.length + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`;
    const estilos = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">` +
      `<fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><color rgb="FFFFFFFF"/><name val="Calibri"/></font></fonts>` +
      `<fills count="3"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FFE40140"/></patternFill></fill></fills>` +
      `<borders count="1"><border/></borders><cellStyleXfs count="1"><xf/></cellStyleXfs>` +
      `<cellXfs count="2"><xf/><xf fontId="1" fillId="2" applyFont="1" applyFill="1"/></cellXfs></styleSheet>`;
    return zip([["[Content_Types].xml", ct], ["_rels/.rels", rels], ["xl/workbook.xml", wb], ["xl/_rels/workbook.xml.rels", wbRels], ["xl/styles.xml", estilos],
      ...hojas.map((h, i) => [`xl/worksheets/sheet${i + 1}.xml`, hoja(h.filas)])]);
  }

  const Xlsx = { crear, crc32 };
  if (typeof module !== "undefined" && module.exports) module.exports = Xlsx; else global.Xlsx = Xlsx;
})(typeof window !== "undefined" ? window : globalThis);
