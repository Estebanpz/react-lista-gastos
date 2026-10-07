const { test, expect } = require("@playwright/test");
const { correoUnico, registrarUsuario, enviarGasto, elegirFecha, irA, deslizar, documentosEnEmulador } = require("./utilidades");

const nav = (page) => page.getByRole("navigation", { name: "Principal" });

test.describe("Pantallas nuevas en escritorio", () => {
  test("Inicio: registro rápido con las categorías nuevas, resumen y navegación", async ({ page }) => {
    await registrarUsuario(page, correoUnico("inicio"));
    for (const c of ["Comida", "Nómina", "Recibos", "Créditos", "Impuestos"]) {
      await expect(page.getByRole("radio", { name: c })).toBeVisible();
    }
    await expect(page.getByText("Aún no hay gastos este mes")).toBeVisible(); //estado vacío con ilustración

    await enviarGasto(page, "Pago quincena", 1200000, "Nómina");
    await expect(page.getByText("¡Gasto guardado!")).toBeVisible();
    await expect(page.getByText(/1\.200\.000.*en Nómina/)).toBeVisible();

    await page.getByRole("button", { name: "Registrar otro gasto" }).click();
    await enviarGasto(page, "Almuerzo", 35000);
    await expect(page.getByText("¡Gasto guardado!")).toBeVisible();

    await expect(page.getByRole("heading", { name: "Total gastado en el mes" })).toBeVisible();
    await expect(page.getByText(/1\.235\.000/).first()).toBeVisible();
    await expect(page.getByRole("img", { name: /gasto acumulado/i })).toBeVisible();
    await expect(nav(page).getByRole("link", { name: "Inicio" })).toHaveAttribute("aria-current", "page");
  });

  test("Validación del registro: errores en línea y foco en el primero", async ({ page }) => {
    await registrarUsuario(page, correoUnico("valida"));
    await page.getByRole("button", { name: /^guardar gasto/i }).click();
    await expect(page.getByText("Escribe cuánto gastaste.")).toBeVisible();
    await expect(page.getByText("Cuéntanos en qué gastaste.")).toBeVisible();
    await expect(page.getByLabel("Valor del gasto (COP)")).toBeFocused();
  });

  test("Crear una categoría propia: se guarda con las reglas reales y se puede usar en un gasto", async ({ page }) => {
    await registrarUsuario(page, correoUnico("cat"));
    await irA(page, "Categorías");
    await expect(page.getByRole("heading", { name: "Categorías", level: 1 })).toBeVisible();
    await expect(page.getByText("Organiza tus gastos a tu manera")).toBeVisible(); //explicación con ilustración

    await page.getByRole("button", { name: "Nueva categoría" }).click();
    const hoja = page.getByRole("dialog", { name: "Crear categoría" });
    await hoja.getByLabel("Nombre").fill("Publicidad");
    await hoja.getByRole("radio", { name: "Megáfono" }).click();
    await hoja.getByRole("radio", { name: "Rosa" }).click();
    await hoja.getByRole("button", { name: "Crear categoría" }).click();
    await expect(hoja).toBeHidden();

    //aparece en el ranking marcada como propia y queda guardada en Firestore
    const fila = page.getByRole("region", { name: /ranking/i }).getByRole("listitem").filter({ hasText: "Publicidad" });
    await expect(fila).toContainText("Mía");
    await expect.poll(async () => (await documentosEnEmulador("categorias")).map((d) => d.nombre)).toContain("Publicidad");

    //se puede elegir al registrar un gasto
    await irA(page, "Inicio");
    await enviarGasto(page, "Pauta en redes", 300000, "Publicidad");
    await expect(page.getByText(/en Publicidad/)).toBeVisible();
    const propia = (await documentosEnEmulador("categorias")).find((d) => d.nombre === "Publicidad");
    const gasto = (await documentosEnEmulador("gastos")).find((d) => d.descripcion === "Pauta en redes");
    expect(gasto.categoria).toBe(propia.id);

    //y el ranking la refleja
    await irA(page, "Categorías");
    await expect(page.getByRole("region", { name: /ranking/i }).getByRole("listitem").filter({ hasText: "Publicidad" })).toContainText(/300\.000/);
  });

  test("Crear categoría: no permite nombres repetidos ni vacíos", async ({ page }) => {
    await registrarUsuario(page, correoUnico("rep"));
    await irA(page, "Categorías");
    await page.getByRole("button", { name: "Nueva categoría" }).click();
    const hoja = page.getByRole("dialog", { name: "Crear categoría" });
    await hoja.getByRole("button", { name: "Crear categoría" }).click();
    await expect(hoja.getByText("Escribe un nombre para la categoría.")).toBeVisible();
    await hoja.getByLabel("Nombre").fill("nómina");
    await hoja.getByRole("button", { name: "Crear categoría" }).click();
    await expect(hoja.getByText("Ya existe una categoría con ese nombre.")).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(hoja).toBeHidden();
  });

  test("Calendario: registrar un gasto de hace dos meses y verlo con los filtros de período", async ({ page }) => {
    await registrarUsuario(page, correoUnico("calendario"));
    const hoy = new Date();
    const antes = new Date(hoy.getFullYear(), hoy.getMonth() - 2, 10);
    await elegirFecha(page, antes.getFullYear(), antes.getMonth() + 1, 10);
    await enviarGasto(page, "Gasto de hace dos meses", 40000, "Comida");
    await expect(page.getByText("¡Gasto guardado!")).toBeVisible();
    const guardado = (await documentosEnEmulador("gastos")).find((d) => d.descripcion === "Gasto de hace dos meses");
    const f = new Date(Number(guardado.fecha) * 1000);
    expect([f.getFullYear(), f.getMonth(), f.getDate()]).toEqual([antes.getFullYear(), antes.getMonth(), 10]);

    await irA(page, "Lista");
    await expect(page.getByText("Gasto de hace dos meses")).toBeHidden(); //período «Mes»: no aparece
    await page.getByRole("group", { name: "Período" }).getByRole("button", { name: "3 meses" }).click();
    await expect(page.getByText("Gasto de hace dos meses")).toBeVisible();
    await expect(page.getByLabel("Resumen de 3 meses")).toContainText(/40\.000/);
    await page.getByRole("group", { name: "Período" }).getByRole("button", { name: "Semana" }).click();
    await expect(page.getByText("Gasto de hace dos meses")).toBeHidden();

    //Personalizado: rango de calendario que incluye ese día
    await page.getByRole("group", { name: "Período" }).getByRole("button", { name: "Personalizado" }).click();
    const hoja = page.getByRole("dialog", { name: "Elegir período" });
    await hoja.getByLabel("Año").first().selectOption(String(antes.getFullYear()));
    await hoja.getByLabel("Mes", { exact: true }).first().selectOption(String(antes.getMonth()));
    const meses = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
    const dia = (n) => hoja.getByRole("gridcell", { name: `${n} de ${meses[antes.getMonth()]} de ${antes.getFullYear()}` }).first();
    await dia(5).click();
    await dia(15).click();
    await hoja.getByRole("button", { name: "Aplicar" }).click();
    await expect(hoja).toBeHidden();
    await expect(page.getByLabel("Resumen del período")).toContainText(/40\.000/);
    await expect(page.getByText("Gasto de hace dos meses")).toBeVisible();
  });

  test("Lista: filtros, detalle, edición y borrado con confirmación", async ({ page }) => {
    await registrarUsuario(page, correoUnico("lista"));
    await enviarGasto(page, "Almuerzo de trabajo", 85000, "Comida");
    await expect(page.getByText("¡Gasto guardado!")).toBeVisible();
    await page.getByRole("button", { name: "Registrar otro gasto" }).click();
    await enviarGasto(page, "Pago de nómina", 1200000, "Nómina");
    await expect(page.getByText("¡Gasto guardado!")).toBeVisible();

    await irA(page, "Lista");
    await expect(page.getByText("Pago de nómina")).toBeVisible();
    await expect(page.getByLabel("Resumen del mes")).toContainText(/1\.285\.000/);

    //búsqueda y filtro por categoría
    await page.getByLabel("Buscar gastos").fill("nomina");
    await expect(page.getByText("Almuerzo de trabajo")).toBeHidden();
    await page.getByLabel("Buscar gastos").fill("zzzz");
    await expect(page.getByText("Nada coincide con tu búsqueda")).toBeVisible();
    await page.getByRole("button", { name: "Limpiar filtros" }).first().click();
    await page.getByRole("group", { name: "Filtrar por categoría" }).getByRole("button", { name: "Comida" }).click();
    await expect(page.getByText("Pago de nómina")).toBeHidden();
    await page.getByRole("button", { name: "Limpiar filtros" }).first().click();

    //detalle en el panel lateral y edición
    await page.getByText("Almuerzo de trabajo").click();
    const detalle = page.getByLabel("Detalle del gasto");
    await expect(detalle).toContainText(/85\.000/);
    //el cuadro del icono no debe perder su centrado por reglas del contenedor (bug visto en el detalle)
    expect(await detalle.locator("h3").locator("xpath=../preceding-sibling::span").evaluate((el) => getComputedStyle(el).display)).toMatch(/flex$/); //dentro de otra caja flex el navegador lo calcula como «flex»; el bug lo dejaba en «block»
    await detalle.getByRole("link", { name: /editar/i }).click();
    await expect(page.getByRole("heading", { name: "Editar gasto" })).toBeVisible();
    await expect(page.getByLabel("Valor del gasto (COP)")).toHaveValue("85000");
    await page.getByLabel("Valor del gasto (COP)").fill("90000");
    await page.getByRole("button", { name: "Guardar cambios" }).click();
    await expect(page.getByText("Cambios guardados")).toBeVisible();
    await page.getByRole("button", { name: "Volver a la lista" }).first().click();
    await expect(page.getByText(/90\.000/).first()).toBeVisible();

    //borrado con confirmación
    await page.getByText("Almuerzo de trabajo").click();
    await detalle.getByRole("button", { name: /borrar/i }).click();
    const confirmacion = page.getByRole("alertdialog", { name: "¿Borrar este gasto?" });
    await expect(confirmacion).toContainText("Almuerzo de trabajo");
    await confirmacion.getByRole("button", { name: "Cancelar" }).click();
    expect(await documentosEnEmulador("gastos").then((l) => l.map((d) => d.descripcion))).toContain("Almuerzo de trabajo");
    await detalle.getByRole("button", { name: /borrar/i }).click();
    await confirmacion.getByRole("button", { name: /^borrar$/i }).click();
    await expect(page.getByRole("button", { name: /Almuerzo de trabajo/ })).toHaveCount(0);
    await expect.poll(async () => (await documentosEnEmulador("gastos")).map((d) => d.descripcion)).not.toContain("Almuerzo de trabajo");
  });

  test("Categorías: ranking, filtros y dona", async ({ page }) => {
    await registrarUsuario(page, correoUnico("rank"));
    await enviarGasto(page, "Quincena", 800000, "Nómina");
    await expect(page.getByText("¡Gasto guardado!")).toBeVisible();
    await irA(page, "Categorías");
    await expect(page.getByRole("img", { name: /distribución del gasto/i })).toBeVisible();
    const primera = page.getByRole("region", { name: /ranking/i }).getByRole("listitem").filter({ hasText: "Nuevo" }).first();
    await expect(primera).toContainText("Nómina");
    await expect(primera).toContainText("100,0 %");
    await page.getByRole("button", { name: "Para negocio" }).click();
    await expect(page.getByRole("region", { name: /ranking/i }).getByRole("listitem").filter({ hasText: "Comida" })).toHaveCount(0);
    await page.getByRole("button", { name: "Mis categorías" }).click();
    await expect(page.getByText("Aún no tienes categorías propias").first()).toBeVisible();
    await page.getByRole("button", { name: "Año" }).click();
    await expect(page.getByRole("button", { name: "Año" })).toHaveAttribute("aria-pressed", "true");
  });

  test("La navegación por teclado llega al contenido con el enlace «Saltar al contenido»", async ({ page }) => {
    await registrarUsuario(page, correoUnico("teclado"));
    await page.keyboard.press("Tab");
    await expect(page.getByRole("link", { name: "Saltar al contenido" })).toBeFocused();
  });
});

test.describe("Pantallas nuevas en el móvil (táctil)", () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });

  test("Barra inferior, botón «Agregar gasto» con hoja, gestos y detalle", async ({ page }) => {
    await registrarUsuario(page, correoUnico("movil"));
    await expect(nav(page).getByRole("link", { name: "Lista" })).toBeVisible();

    //el registro se abre como hoja que sube desde abajo
    await page.getByRole("button", { name: "Agregar gasto" }).tap();
    const hoja = page.getByRole("dialog", { name: "Nuevo gasto" });
    await expect(hoja).toBeVisible();
    await hoja.getByLabel("Valor del gasto (COP)").fill("45000");
    await hoja.getByLabel("Detalle").fill("Taxi a la oficina");
    await hoja.getByRole("button", { name: /^guardar gasto/i }).tap();
    await expect(hoja.getByText("¡Gasto guardado!")).toBeVisible();
    await hoja.getByRole("link", { name: "Ver mi lista" }).tap();
    await expect(page.getByRole("heading", { name: "Gastos variables (gastos)", level: 1 })).toBeVisible();

    //deslizar la fila muestra «Editar» y «Borrar»
    const fila = page.getByRole("button", { name: /Taxi a la oficina/ });
    await expect(fila).toBeVisible();
    const caja = await fila.boundingBox();
    await deslizar(page, 340, 80, caja.y + caja.height / 2);
    await expect(page.getByRole("button", { name: "Borrar", exact: true })).toBeVisible();
    //click (no tap): tras el deslizamiento sintético por CDP, Playwright no entrega bien el siguiente toque
    await page.getByRole("button", { name: "Editar", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Editar gasto" })).toBeVisible();
  });

  test("En el móvil, tocar un gasto abre el detalle como hoja y se cierra arrastrando o con Escape", async ({ page }) => {
    await registrarUsuario(page, correoUnico("detalle"));
    await page.getByRole("button", { name: "Agregar gasto" }).tap();
    const hoja = page.getByRole("dialog", { name: "Nuevo gasto" });
    await hoja.getByLabel("Valor del gasto (COP)").fill("12000");
    await hoja.getByLabel("Detalle").fill("Parqueadero");
    await hoja.getByRole("button", { name: /^guardar gasto/i }).tap();
    await hoja.getByRole("link", { name: "Ver mi lista" }).tap();
    await page.getByRole("button", { name: /Parqueadero/ }).tap();
    const detalle = page.getByRole("dialog", { name: "Detalle del gasto" });
    await expect(detalle).toContainText(/12\.000/);
    await page.keyboard.press("Escape");
    await expect(detalle).toBeHidden();
  });
});
