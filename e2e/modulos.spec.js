// Módulos v24: proveedores, compras, transferencias, clientes y Excel — por la interfaz real
const { test, expect } = require("@playwright/test");
const fs = require("node:fs");

const entrar = async (page, rol, tienda = "La Paz - El Prado") => {
  await page.evaluate(() => abrirInicio()); await expect(page.locator("#inicio")).toBeVisible();
  await page.locator("#inicioTienda").selectOption(tienda);
  await page.locator(`[data-rol="${rol}"]`).click();
};
const aceptar = page => page.locator('[role=dialog][aria-modal]').last().locator("[data-r=si]").click();
const nav = (page, v) => page.locator(`#navBottom [data-v="${v}"]`).click();

test("compras, transferencias, clientes y Excel", async ({ page }) => {
  const errores = []; page.on("pageerror", e => errores.push(e.message));
  await page.goto("/");

  // Gerente registra un proveedor
  await entrar(page, "gerente");
  await nav(page, "admin");
  await page.locator("#fProv [name=nombre]").fill("Proveedor E2E");
  await page.locator("#fProv [name=nit]").fill("55667788");
  await page.locator("#fProv button").click();
  await expect(page.locator("#admBody")).toContainText("Proveedor E2E");

  // Encargado La Paz: compra con factura → stock sube y costo promedio cambia
  await entrar(page, "encargado");
  await nav(page, "movimientos");
  const id = await page.locator("#coMod").inputValue();
  const antes = await page.evaluate(id => S.stock[id]["La Paz - El Prado"], id);
  await page.locator("#coProv").selectOption({ label: "Proveedor E2E" });
  await page.locator("#coFac").fill("F-900");
  await page.locator("#coCant").fill("12"); await page.locator("#coCosto").fill("150");
  await page.getByRole("button", { name: "+ Agregar" }).click();
  await expect(page.locator("#movBody")).toContainText("Crédito fiscal");
  await page.getByRole("button", { name: "Registrar compra" }).click(); await aceptar(page);
  await expect(page.locator("#toast")).toContainText("Compra registrada");
  expect(await page.evaluate(id => S.stock[id]["La Paz - El Prado"], id)).toBe(antes + 12);

  // Transferencia La Paz → Cochabamba
  await page.getByRole("tab", { name: "Transferencias" }).click();
  await page.locator("#trMod").selectOption(id); await page.locator("#trCant").fill("3");
  await page.locator("#trDest").selectOption("Cochabamba - Heroínas");
  await page.getByRole("button", { name: "Enviar", exact: true }).click(); await aceptar(page);
  await expect(page.locator("#movBody")).toContainText("en tránsito");
  await entrar(page, "encargado", "Cochabamba - Heroínas");
  await nav(page, "movimientos");
  await page.getByRole("tab", { name: "Transferencias" }).click();
  const cb = await page.evaluate(id => S.stock[id]["Cochabamba - Heroínas"], id);
  await page.getByRole("button", { name: "Recibir" }).first().click();
  expect(await page.evaluate(id => S.stock[id]["Cochabamba - Heroínas"], id)).toBe(cb + 3);

  // Abrir caja y vender con cliente (suma puntos)
  await nav(page, "caja"); await page.locator("#fondoIni").fill("100"); await page.getByRole("button", { name: "Abrir caja" }).click();
  await entrar(page, "vendedor", "Cochabamba - Heroínas");
  await nav(page, "ventas");
  await page.locator("#vCliBox summary").click();
  await page.locator("#vCliDoc").fill("9988776"); await page.locator("#vCliNom").fill("Cliente E2E");
  await page.locator("#vBtn").click();
  await expect(page.locator("#toast")).toContainText("puntos");
  expect(await page.evaluate(() => S.clientes["9988776"].nombre)).toBe("Cliente E2E");

  // Gerente: clientes segmentados y descarga del Excel completo
  await entrar(page, "gerente");
  await nav(page, "clientes");
  await expect(page.locator("#cliBody")).toContainText("Acción comercial por segmento");
  await nav(page, "admin");
  const [descarga] = await Promise.all([page.waitForEvent("download"), page.getByRole("button", { name: /Reporte completo/ }).click()]);
  expect(descarga.suggestedFilename()).toMatch(/^Manaco_completo_.*\.xlsx$/);
  const bytes = fs.readFileSync(await descarga.path());
  expect(bytes.subarray(0, 2).toString()).toBe("PK"); // es un ZIP (formato .xlsx)

  expect(await page.evaluate(() => Dominio.verificarKardex(S).length)).toBe(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  expect(errores).toEqual([]);
});
