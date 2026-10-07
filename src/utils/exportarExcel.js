//Libro de Excel (.xlsx real) del reporte. Cada dato vive en su propia celda tipada (texto, número o fecha), así que
//un nombre con espacios, comas o «;» nunca se parte en columnas, a diferencia de un CSV. Se carga bajo demanda (chunk
//«exportar-xlsx»): no pesa en la carga inicial de la app. Solo se usa para ESCRIBIR archivos propios.
import * as XLSX from "xlsx-js-style";

const MARCA = "5B69E2";
const BORDE = { style: "thin", color: { rgb: "D5DCE0" } };
const BORDES = { top: BORDE, bottom: BORDE, left: BORDE, right: BORDE };
const FUENTE = { name: "Calibri", sz: 10 };

const estilos = {
  titulo: { font: { name: "Calibri", sz: 16, bold: true, color: { rgb: "FFFFFF" } }, fill: { patternType: "solid", fgColor: { rgb: MARCA } }, alignment: { horizontal: "left", vertical: "center", indent: 1 } },
  subtitulo: { font: { name: "Calibri", sz: 11, color: { rgb: "FFFFFF" } }, fill: { patternType: "solid", fgColor: { rgb: "8792F1" } }, alignment: { horizontal: "left", vertical: "center", indent: 1 } },
  seccion: { font: { name: "Calibri", sz: 12, bold: true, color: { rgb: "3E4BC7" } }, alignment: { vertical: "center" } },
  encabezado: { font: { name: "Calibri", sz: 10, bold: true, color: { rgb: "FFFFFF" } }, fill: { patternType: "solid", fgColor: { rgb: MARCA } }, alignment: { horizontal: "center", vertical: "center", wrapText: true }, border: BORDES },
  etiqueta: { font: { ...FUENTE, bold: true, color: { rgb: "4A5568" } }, fill: { patternType: "solid", fgColor: { rgb: "EEF0FE" } }, border: BORDES },
};
const fondo = (i) => ({ patternType: "solid", fgColor: { rgb: i % 2 ? "F6F8FA" : "FFFFFF" } });
const celda = (i, extra = {}) => ({ font: FUENTE, fill: fondo(i), border: BORDES, alignment: { vertical: "center", wrapText: true }, ...extra });

//Fecha «AAAA-MM-DD» → número de serie de Excel (así la celda es una fecha real que se puede ordenar y filtrar)
const serial = (ymd) => {
  if (!ymd) return null;
  const [a, m, d] = ymd.split("-").map(Number);
  return Date.UTC(a, m - 1, d) / 86400000 + 25569;
};
const FORMATO_FECHA = "dd/mm/yyyy";
const FORMATO_PESOS = '"$"#,##0';

const texto = (valor, estilo) => ({ v: valor == null ? "" : String(valor), t: "s", s: estilo }); //siempre texto: «=…» no se ejecuta
const numero = (valor, estilo, z) => ({ v: Number(valor), t: "n", s: estilo, ...(z ? { z } : {}) });
const fecha = (ymd, estilo) => (ymd ? { v: serial(ymd), t: "n", z: FORMATO_FECHA, s: { ...estilo, alignment: { ...estilo.alignment, horizontal: "center" } } } : texto("—", { ...estilo, alignment: { ...estilo.alignment, horizontal: "center" } }));

//Hoja de tabla: encabezados + filas; anchos, filtro y encabezado fijo
const hojaTabla = (encabezados, filas, anchos, { desdeFila = 0, titulo } = {}) => {
  const aoa = [];
  if (titulo) aoa.push([texto(titulo, estilos.seccion)]);
  aoa.push(encabezados.map((h) => texto(h, estilos.encabezado)));
  filas.forEach((f) => aoa.push(f));
  const hoja = XLSX.utils.aoa_to_sheet(aoa);
  hoja["!cols"] = anchos.map((wch) => ({ wch }));
  const filaEncabezado = titulo ? 1 : 0;
  hoja["!rows"] = [];
  hoja["!rows"][filaEncabezado] = { hpt: 24 };
  if (filas.length) {
    const ultima = XLSX.utils.encode_cell({ r: filaEncabezado + filas.length, c: encabezados.length - 1 });
    hoja["!autofilter"] = { ref: `A${filaEncabezado + 1}:${ultima}` };
  }
  hoja["!freeze"] = { xSplit: "0", ySplit: String(filaEncabezado + 1 + desdeFila), topLeftCell: `A${filaEncabezado + 2 + desdeFila}`, activePane: "bottomLeft", state: "frozen" };
  return hoja;
};

const hojaResumen = (r) => {
  const k = r.resumen;
  const filas = [
    [texto("Finanzas · Reporte de gastos variables y fijos", estilos.titulo), ...Array(3).fill(texto("", estilos.titulo))],
    [texto(`${r.meta.correo || "Cuenta"} · ${r.meta.etiquetaPeriodo}${r.meta.desde ? ` (${r.meta.desde} a ${r.meta.hasta})` : ""} · generado el ${r.meta.generado}`, estilos.subtitulo), ...Array(3).fill(texto("", estilos.subtitulo))],
    [],
    [texto("Total del periodo", estilos.seccion)],
    [texto("Total gastado", estilos.etiqueta), numero(k.total, celda(0, { font: { ...FUENTE, bold: true } }), FORMATO_PESOS)],
    [texto("Número de gastos", estilos.etiqueta), numero(k.cantidad, celda(1), "0")],
    [texto("De ellos, gastos fijos (pagos)", estilos.etiqueta), numero(k.totalPagosRecurrentes, celda(0), FORMATO_PESOS)],
    [texto("Gastos fijos (pagos) activos", estilos.etiqueta), numero(k.pagosActivos, celda(1), "0")],
    [texto("Costo mensual aproximado de esos pagos", estilos.etiqueta), numero(k.pagosMensualEstimado, celda(0), FORMATO_PESOS)],
    [],
    [texto("Por categoría", estilos.seccion)],
    ["Categoría", "Gastos", "Total", "% del total"].map((h) => texto(h, estilos.encabezado)),
    ...r.porCategoria.map((c, i) => [texto(c.categoria, celda(i)), numero(c.cantidad, celda(i), "0"), numero(c.total, celda(i), FORMATO_PESOS), numero(c.porcentaje / 100, celda(i), "0.0%")]),
  ];
  const hoja = XLSX.utils.aoa_to_sheet(filas);
  hoja["!cols"] = [{ wch: 38 }, { wch: 16 }, { wch: 18 }, { wch: 14 }];
  hoja["!merges"] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 3 } }, { s: { r: 1, c: 0 }, e: { r: 1, c: 3 } }];
  hoja["!rows"] = [{ hpt: 30 }, { hpt: 22 }];
  return hoja;
};

const hojaPorNombre = (r) =>
  hojaTabla(
    ["Nombre", "Categoría", "Veces", "Total", "Promedio", "Primera fecha", "Última fecha", "Tipo"],
    r.porNombre.map((n, i) => [
      texto(n.nombre, celda(i)), texto(n.categoria, celda(i)), numero(n.veces, celda(i), "0"), numero(n.total, celda(i), FORMATO_PESOS),
      numero(n.promedio, celda(i), FORMATO_PESOS), fecha(n.primera, celda(i)), fecha(n.ultima, celda(i)), texto(n.esPago ? "Gasto fijo (pago)" : "Gasto variable", celda(i)),
    ]),
    [38, 20, 9, 16, 16, 15, 15, 17]
  );

const hojaPagos = (r) =>
  hojaTabla(
    ["Nombre del gasto fijo (pago)", "Categoría", "Frecuencia", "Próximo vencimiento", "Monto", "Estado", "Veces pagado en el periodo", "Total pagado en el periodo", "Última fecha pagada"],
    r.pagos.map((p, i) => [
      texto(p.nombre, celda(i)), texto(p.categoria, celda(i)), texto(p.frecuencia, celda(i)), fecha(p.proximoVencimiento, celda(i)), numero(p.monto, celda(i), FORMATO_PESOS),
      texto(p.estado, celda(i, { font: { ...FUENTE, bold: true, color: { rgb: p.estado === "Vencido" ? "B42318" : p.estado === "Pausado" ? "6B7280" : p.estado === "Al día" ? "1F6F3A" : "93370D" } }, alignment: { horizontal: "center", vertical: "center" } })),
      numero(p.vecesPagado, celda(i), "0"), numero(p.totalPagado, celda(i), FORMATO_PESOS), fecha(p.ultimaFechaPagada, celda(i)),
    ]),
    [34, 20, 26, 18, 16, 14, 16, 18, 18]
  );

const hojaGastos = (r) =>
  hojaTabla(
    ["Fecha", "Nombre", "Categoría", "Origen", "Monto"],
    r.detalle.map((g, i) => [fecha(g.fecha, celda(i)), texto(g.nombre, celda(i)), texto(g.categoria, celda(i)), texto(g.origen, celda(i)), numero(g.monto, celda(i), FORMATO_PESOS)]),
    [14, 46, 22, 18, 16]
  );

//Libro completo del reporte (sin escribirlo): útil para pruebas
export const construirLibro = (reporte) => {
  const libro = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(libro, hojaResumen(reporte), "Resumen");
  XLSX.utils.book_append_sheet(libro, hojaPorNombre(reporte), "Por nombre");
  XLSX.utils.book_append_sheet(libro, hojaPagos(reporte), "Gastos fijos (pagos)");
  XLSX.utils.book_append_sheet(libro, hojaGastos(reporte), "Gastos variables (gastos)");
  return libro;
};

//Bytes del .xlsx
export const construirExcel = (reporte) => XLSX.write(construirLibro(reporte), { bookType: "xlsx", type: "array" });

export default construirExcel;
