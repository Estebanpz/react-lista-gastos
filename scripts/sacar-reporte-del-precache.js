//Después de compilar: saca del precaché del service worker los chunks pesados que solo usa el reporte (Excel y PDF).
//CRA/webpack deja las librerías (xlsx-js-style y jsPDF, ~1,5 MB) en chunks numéricos compartidos, no en los
//«exportar-*» que nombra el código, así que el filtro por nombre del service worker no basta. Aquí se reconocen por su
//contenido y se quitan de la lista de precaché; el service worker los guarda en caché al usarlos por primera vez.
//Uso: node scripts/sacar-reporte-del-precache.js [carpeta-de-build]   (por defecto «build»)
const fs = require("fs");
const path = require("path");

const carpeta = path.resolve(process.argv[2] || path.join(__dirname, "..", "build"));
const js = path.join(carpeta, "static", "js");
const MARCAS = ["jsPDF", "[Content_Types]"]; //firmas de jsPDF y de xlsx-js-style

const pesados = fs
  .readdirSync(js)
  .filter((f) => /\.js$/.test(f) && !/^main\./.test(f) && !/^runtime/.test(f))
  .filter((f) => /^exportar-/.test(f) || MARCAS.some((m) => fs.readFileSync(path.join(js, f), "utf8").includes(m)));

const sw = path.join(carpeta, "service-worker.js");
let texto = fs.readFileSync(sw, "utf8");
let quitados = 0;
for (const f of pesados) {
  const antes = texto;
  texto = texto.replace(new RegExp(`\\{'revision':null,'url':'/static/js/${f.replace(/[.]/g, "\\.")}'\\},?`), "");
  if (texto !== antes) quitados++;
}
fs.writeFileSync(sw, texto);
console.log(`Precaché: ${quitados} chunks del reporte fuera (${pesados.join(", ") || "ninguno"}).`);
if (!pesados.some((f) => !/^exportar-/.test(f))) {
  console.error("AVISO: no se encontraron los chunks de jsPDF/xlsx; revisa las marcas en scripts/sacar-reporte-del-precache.js");
  process.exit(1);
}
