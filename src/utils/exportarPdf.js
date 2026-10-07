//PDF del reporte (A4), con el diseño del reporte de ZF Manager adaptado a Finanzas: banner de marca, tarjetas de
//resumen, tablas con encabezado de color y pie «Página x de y». Se carga bajo demanda (chunk «exportar-pdf»).
//Usa la fuente Helvetica integrada del PDF: cubre tildes y ñ, no emojis (se reemplazan por «?»).
import JsPDF from "jspdf";
import autoTable from "jspdf-autotable";

const MARCA = [91, 105, 226];
const MARCA_OSCURA = [62, 75, 199];
const SUAVE = [238, 240, 254];
const TINTA = [20, 22, 31];
const GRIS = [74, 85, 104];
const MARGEN = 36;

const moneda = (n) => new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(n);
export const fechaCorta = (ymd) => (ymd ? ymd.split("-").reverse().join("/") : "—");

//Caracteres que Helvetica (WinAnsi) sí dibuja: ASCII, Latin-1 y algunos signos comunes; el resto («😀») pasa a «?»
const SOPORTADOS = "–—‘’“”•…€™";
export const limpiarParaPdf = (texto) =>
  Array.from(String(texto ?? ""))
    .map((c) => {
      const cp = c.codePointAt(0);
      return (cp >= 32 && cp <= 126) || (cp >= 160 && cp <= 255) || SOPORTADOS.includes(c) ? c : cp === 9 || cp === 10 ? " " : "?";
    })
    .join("");

const COLOR_ESTADO = { Vencido: [180, 35, 24], "Vence hoy": [147, 55, 13], "Vence pronto": [147, 55, 13], "Al día": [31, 111, 58], Pausado: [107, 114, 128] };

export const construirPdf = (reporte) => {
  const doc = new JsPDF({ unit: "pt", format: "a4" });
  const ancho = doc.internal.pageSize.getWidth();
  const k = reporte.resumen;

  //Banner
  doc.setFillColor(...MARCA);
  doc.rect(0, 0, ancho, 78, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  doc.text("Finanzas", MARGEN, 38);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text("Reporte de gastos variables y gastos fijos (pagos)", MARGEN, 56);
  doc.text(limpiarParaPdf(`Generado el ${fechaCorta(reporte.meta.generado)}`), ancho - MARGEN, 56, { align: "right" });
  doc.setFillColor(255, 255, 255);
  doc.rect(MARGEN, 63, 30, 2.5, "F");

  //Quién y qué periodo
  doc.setTextColor(...GRIS);
  doc.setFontSize(9);
  const periodo = reporte.meta.desde ? `${reporte.meta.etiquetaPeriodo} (${fechaCorta(reporte.meta.desde)} al ${fechaCorta(reporte.meta.hasta)})` : `${reporte.meta.etiquetaPeriodo} (hasta ${fechaCorta(reporte.meta.hasta)})`;
  doc.text(limpiarParaPdf(`${reporte.meta.correo || "Cuenta"}  ·  ${periodo}`), MARGEN, 98);

  //Tarjetas
  const tarjetas = [
    ["TOTAL GASTADO", moneda(k.total), `${k.cantidad} ${k.cantidad === 1 ? "gasto" : "gastos"}`],
    ["GASTOS FIJOS (PAGOS)", String(k.pagosActivos), `activos · ${moneda(k.pagosMensualEstimado)} al mes aprox.`],
    ["PAGADO EN GASTOS FIJOS", moneda(k.totalPagosRecurrentes), "dentro del periodo"],
  ];
  const separacion = 10;
  const anchoTarjeta = (ancho - MARGEN * 2 - separacion * 2) / 3;
  tarjetas.forEach(([rotulo, valor, nota], i) => {
    const x = MARGEN + i * (anchoTarjeta + separacion);
    doc.setFillColor(...SUAVE);
    doc.setDrawColor(...MARCA);
    doc.roundedRect(x, 110, anchoTarjeta, 62, 6, 6, "FD");
    doc.setTextColor(...MARCA_OSCURA);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    doc.text(rotulo, x + anchoTarjeta / 2, 125, { align: "center" });
    doc.setFontSize(15);
    doc.setTextColor(...TINTA);
    doc.text(limpiarParaPdf(valor), x + anchoTarjeta / 2, 146, { align: "center" });
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(...GRIS);
    doc.text(limpiarParaPdf(nota), x + anchoTarjeta / 2, 162, { align: "center" });
  });

  let y = 196;
  const estiloBase = {
    margin: { left: MARGEN, right: MARGEN, bottom: 46 },
    styles: { font: "helvetica", fontSize: 8, cellPadding: 4, overflow: "linebreak", textColor: TINTA, lineColor: [213, 220, 224], lineWidth: 0.4 },
    headStyles: { fillColor: MARCA, textColor: 255, fontStyle: "bold", halign: "center", valign: "middle" },
    alternateRowStyles: { fillColor: [246, 248, 250] },
    showHead: "everyPage",
  };

  const seccion = (titulo, nota, fn) => {
    if (y > doc.internal.pageSize.getHeight() - 120) {
      doc.addPage();
      y = MARGEN;
    }
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(...MARCA_OSCURA);
    doc.text(titulo, MARGEN, y);
    if (nota) {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(...GRIS);
      doc.text(limpiarParaPdf(nota), MARGEN, y + 12);
    }
    fn(y + (nota ? 20 : 8));
    y = doc.lastAutoTable.finalY + 26;
  };
  const vacio = (inicio, mensaje) => {
    doc.setFont("helvetica", "italic");
    doc.setFontSize(9);
    doc.setTextColor(...GRIS);
    doc.text(mensaje, MARGEN, inicio + 12);
    doc.lastAutoTable = { finalY: inicio + 14 };
  };

  seccion("Resumen por categoría", null, (inicio) => {
    if (!reporte.porCategoria.length) return vacio(inicio, "Sin gastos en este periodo.");
    autoTable(doc, {
      ...estiloBase, startY: inicio,
      head: [["Categoría", "Gastos", "Total", "% del total"]],
      body: reporte.porCategoria.map((c) => [limpiarParaPdf(c.categoria), String(c.cantidad), moneda(c.total), `${String(c.porcentaje).replace(".", ",")} %`]),
      columnStyles: { 1: { halign: "center" }, 2: { halign: "right" }, 3: { halign: "center" } },
    });
  });

  seccion("Gastos fijos (pagos)", "Nombre de cada gasto fijo, cuándo vence y cuánto se ha pagado en el periodo.", (inicio) => {
    if (!reporte.pagos.length) return vacio(inicio, "No hay gastos fijos (pagos) programados.");
    autoTable(doc, {
      ...estiloBase, startY: inicio,
      head: [["Nombre del gasto fijo", "Frecuencia", "Próx. vencimiento", "Monto", "Estado", "Pagado en el periodo", "Última fecha pagada"]],
      body: reporte.pagos.map((p) => [limpiarParaPdf(p.nombre), limpiarParaPdf(p.frecuencia), fechaCorta(p.proximoVencimiento), moneda(p.monto), p.estado, `${p.vecesPagado} · ${moneda(p.totalPagado)}`, fechaCorta(p.ultimaFechaPagada)]),
      columnStyles: { 0: { cellWidth: 100 }, 2: { halign: "center" }, 3: { halign: "right" }, 4: { halign: "center", fontStyle: "bold" }, 5: { halign: "right" }, 6: { halign: "center" } },
      didParseCell: (d) => {
        if (d.section === "body" && d.column.index === 4 && COLOR_ESTADO[d.cell.raw]) d.cell.styles.textColor = COLOR_ESTADO[d.cell.raw];
      },
    });
  });

  seccion("Gastos por nombre", "Cada nombre agrupado: cuántas veces, total y promedio.", (inicio) => {
    if (!reporte.porNombre.length) return vacio(inicio, "Sin gastos en este periodo.");
    autoTable(doc, {
      ...estiloBase, startY: inicio,
      head: [["Nombre", "Categoría", "Veces", "Total", "Promedio", "Última fecha"]],
      body: reporte.porNombre.map((n) => [limpiarParaPdf(n.nombre), limpiarParaPdf(n.categoria), String(n.veces), moneda(n.total), moneda(n.promedio), fechaCorta(n.ultima)]),
      columnStyles: { 0: { cellWidth: 150 }, 2: { halign: "center" }, 3: { halign: "right" }, 4: { halign: "right" }, 5: { halign: "center" } },
    });
  });

  seccion("Detalle: gastos variables (gastos) y fijos (pagos)", "Cada uno con su fecha, de más reciente a más antiguo.", (inicio) => {
    if (!reporte.detalle.length) return vacio(inicio, "Sin gastos en este periodo.");
    autoTable(doc, {
      ...estiloBase, startY: inicio,
      head: [["Fecha", "Nombre", "Categoría", "Origen", "Monto"]],
      body: reporte.detalle.map((g) => [fechaCorta(g.fecha), limpiarParaPdf(g.nombre), limpiarParaPdf(g.categoria), g.origen, moneda(g.monto)]),
      columnStyles: { 0: { halign: "center", cellWidth: 56 }, 1: { cellWidth: 190 }, 3: { halign: "center" }, 4: { halign: "right" } },
    });
  });

  //Pie en todas las páginas (el total de páginas se conoce al final)
  const paginas = doc.getNumberOfPages();
  const alto = doc.internal.pageSize.getHeight();
  for (let i = 1; i <= paginas; i++) {
    doc.setPage(i);
    doc.setDrawColor(213, 220, 224);
    doc.line(MARGEN, alto - 34, ancho - MARGEN, alto - 34);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(...GRIS);
    doc.text("Finanzas · finanzas.zfmanager.com", MARGEN, alto - 20);
    doc.text(`Página ${i} de ${paginas}`, ancho - MARGEN, alto - 20, { align: "right" });
  }
  return doc;
};

//Bytes del PDF
export const construirPdfBytes = (reporte) => construirPdf(reporte).output("arraybuffer");

export default construirPdfBytes;
