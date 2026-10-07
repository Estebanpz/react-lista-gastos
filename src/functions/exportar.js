//Descarga de un archivo generado en el navegador (Excel o PDF). El contenido lo arman utils/exportarExcel.js y
//utils/exportarPdf.js, que se cargan solo al pedir el reporte.
export const descargarBlob = (nombre, blob) => {
  const url = URL.createObjectURL(blob);
  const enlace = document.createElement("a");
  enlace.href = url;
  enlace.download = nombre;
  document.body.appendChild(enlace);
  enlace.click();
  enlace.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
};
