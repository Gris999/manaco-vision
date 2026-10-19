// Flujos completos por la interfaz real (todo menos la cámara)
const { test, expect } = require("@playwright/test");

const entrarDemo = async (page, rol, tienda = "La Paz - El Prado") => {
  if (await page.locator("#inicio").isHidden()) await page.locator(".btnRol:visible").first().click();
  await page.locator("#inicioTienda").selectOption(tienda);
  await page.locator(`[data-rol="${rol}"]`).click();
};
const aceptarDialogo = async (page, opcion, detalle) => {
  const d = page.locator('[role=dialog][aria-modal]').last();
  if (opcion) await d.locator(`[name=dlgOp][value="${opcion}"]`).check();
  if (detalle) await d.locator("#dlgCampo").fill(detalle);
  await d.locator("[data-r=si]").click();
};

test("modo demo: día completo de una tienda con los 3 roles", async ({ page }) => {
  const errores = []; page.on("pageerror", e => errores.push(e.message));
  await page.goto("/");
  await expect(page.locator("#rolesGrid [data-rol]")).toHaveCount(3);

  // Vendedor sin caja: no puede vender
  await entrarDemo(page, "vendedor");
  await page.locator('#navBottom [data-v="ventas"]').click();
  await expect(page.locator("#vCaja")).toContainText("no está abierta");
  await expect(page.locator("#vBtn")).toBeDisabled();

  // Encargado: fondo vacío rechazado, luego abre con 200
  await entrarDemo(page, "encargado");
  await page.locator("#fondoIni").fill("");
  await page.getByRole("button", { name: "Abrir caja" }).click();
  await expect(page.locator("#toast")).toContainText("fondo inicial");
  await page.locator("#fondoIni").fill("200");
  await page.getByRole("button", { name: "Abrir caja" }).click();
  await expect(page.locator("#toast")).toContainText("Caja abierta");

  // Vendedor: cantidad inválida rechazada; venta válida por QR
  await entrarDemo(page, "vendedor");
  await page.locator('#navBottom [data-v="ventas"]').click();
  await page.locator("#vBuscar").fill("ballerina");
  await page.waitForTimeout(400);
  await page.locator("#vCant").fill("0");
  await page.locator("#vBtn").click();
  await expect(page.locator("#toast")).toContainText("entero de 1 a 99");
  await page.locator("#vCant").fill("1");
  await page.locator('.pagos [data-pago="qr"]').first().click();
  await page.locator("#vBtn").click();
  await expect(page.locator("#toast")).toContainText("Vendido");
  await expect(page.locator("#listaVentas")).toContainText("QR");

  // Encargado: anula por defecto con el diálogo propio
  await entrarDemo(page, "encargado");
  await page.locator('#navBottom [data-v="caja"]').click();
  await page.getByRole("button", { name: "Anular" }).first().click();
  await aceptarDialogo(page, "defecto", "suela despegada");
  await expect(page.locator("#toast")).toContainText("anulada");

  // Conteo: marcar página, cerrar con aviso de pendientes
  await page.locator('#navBottom [data-v="cierre"]').click();
  await page.locator("#cPagOk").click();
  await page.locator("#cBtn").click();
  await expect(page.locator('[role=dialog][aria-modal]').last()).toContainText("faltan");
  await aceptarDialogo(page);
  await expect(page.locator("#cRes")).toContainText("Conteo cíclico: contaste 10");

  // Cierre de caja: sin arqueo bloqueado, con arqueo cierra y muestra Reporte Z
  await page.locator('#navBottom [data-v="caja"]').click();
  await page.locator('[data-den="200"]').fill("1");
  await page.getByRole("button", { name: /Cerrar caja/ }).click();
  await aceptarDialogo(page);
  await expect(page.locator("#reporteZ")).toContainText("Reporte Z");

  // Gerente: ve el defecto de hoy en Calidad y pide reposición una sola vez
  await entrarDemo(page, "gerente");
  await page.locator('[data-per="1"]').click();
  await expect(page.locator("#calidad")).toContainText("1 por defecto");
  const pedir = page.locator("#acciones").getByRole("button", { name: "Pedir" }).first();
  await pedir.click();
  await expect(page.locator("#acciones button", { hasText: "Pedido ✓" }).first()).toBeDisabled();
  await page.locator('#navBottom [data-v="mercado"]').click();
  await expect(page.locator("#v-mercado")).toContainText("Mercado de calzado");

  expect(await page.evaluate(() => Dominio.verificarKardex(S).length)).toBe(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  expect(errores).toEqual([]);
});

test("modo servidor: dos celulares comparten datos y el rol lo impone el servidor", async ({ browser }) => {
  const login = async (usuario, clave) => {
    const ctx = await browser.newContext({ serviceWorkers: "block" }); const page = await ctx.newPage();
    await page.goto("/");
    const f = page.locator("#fLogin");
    await f.locator("[name=usuario]").fill(usuario); await f.locator("[name=clave]").fill(clave);
    await f.getByRole("button", { name: "Iniciar sesión" }).click();
    return page;
  };
  // contraseña incorrecta
  const malo = await login("encargado.cb", "x");
  await expect(malo.locator("#toast")).toContainText("incorrectos");

  const enc = await login("encargado.cb", "Manaco-CB-2026");
  await expect(enc.locator(".syncTxt").first()).toContainText("Sincronizado");
  await enc.locator("#fondoIni").fill("100");
  await enc.getByRole("button", { name: "Abrir caja" }).click();
  await expect(enc.locator(".syncTxt").first()).toContainText("Sincronizado");

  const ven = await login("vendedor.cb", "Manaco-VCB-2026");
  await ven.locator('#navBottom [data-v="ventas"]').click();
  await expect(ven.locator("#vCaja")).toContainText("Caja abierta");   // ve la caja que abrió OTRO celular
  await ven.locator("#vBtn").click();
  await expect(ven.locator("#toast")).toContainText("Vendido");
  await expect(ven.locator(".syncTxt").first()).toContainText("Sincronizado");

  // el encargado recibe la venta del vendedor
  await enc.evaluate(() => Sync.sincronizar());
  expect(await enc.evaluate(() => S.ventas.at(-1).usuario)).toBe("vendedor.cb");
  // el vendedor no puede tomar otro rol
  await ven.locator(".btnRol:visible").first().click();
  await ven.locator('[data-rol="gerente"]').click();
  await expect(ven.locator("#toast")).toContainText("cierra sesión");
});
