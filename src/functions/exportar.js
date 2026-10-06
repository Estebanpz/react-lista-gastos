//Exportación de los gastos a un archivo que abre Excel. Es CSV con BOM UTF-8 y «;» como separador (el que usa Excel
//en español); el valor va como número plano para poder sumarlo. Módulo puro: la descarga está en descargarArchivo.

//Una celda de texto que empiece por = + - @ se interpretaría como fórmula en Excel; se neutraliza con un apóstrofo
const celda = (valor) => {
  let texto = String(valor ?? "");
  if (/^[=+\-@\t\r]/.test(texto)) texto = `'${texto}`;
  return /[";\n\r]/.test(texto) ? `"${texto.replace(/"/g, '""')}"` : texto;
};

const dosDigitos = (n) => String(n).padStart(2, "0");
export const fechaISO = (segundos) => {
  const d = new Date(segundos * 1000);
  return `${d.getFullYear()}-${dosDigitos(d.getMonth() + 1)}-${dosDigitos(d.getDate())}`;
};

//`gastos`: {descripcion, cantidad, categoria, fecha (segundos Unix)}; `nombreCategoria(id)` devuelve el rótulo
export const gastosACsv = (gastos, nombreCategoria) => {
  const filas = [...gastos].sort((a, b) => b.fecha - a.fecha).map((g) => [fechaISO(g.fecha), g.descripcion, nombreCategoria(g.categoria), g.cantidad].map(celda).join(";"));
  return `﻿${["Fecha", "Descripción", "Categoría", "Valor (COP)"].join(";")}\r\n${filas.join("\r\n")}`;
};

export const descargarArchivo = (nombre, contenido, tipo = "text/csv;charset=utf-8") => {
  const url = URL.createObjectURL(new Blob([contenido], { type: tipo }));
  const enlace = document.createElement("a");
  enlace.href = url;
  enlace.download = nombre;
  document.body.appendChild(enlace);
  enlace.click();
  enlace.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
};
