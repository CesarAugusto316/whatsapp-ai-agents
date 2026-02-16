import { describe, test, expect } from "bun:test";
import { parseCartCommand } from "./cart-command";

describe("parseCartCommand - WhatsApp E-commerce", () => {
  // AGREGAR productos
  test("should parse 'agrega la opción X'", () => {
    expect(parseCartCommand("agrega la opción 1")).toEqual({
      action: "ADD",
      optionNumbers: [1],
    });
    expect(parseCartCommand("agrega las opciones 1, 2, 3")).toEqual({
      action: "ADD",
      optionNumbers: [1, 2, 3],
    });
    expect(parseCartCommand("agrega opción 5")).toEqual({
      action: "ADD",
      optionNumbers: [5],
    });
  });

  test("should parse 'quiero el/la X'", () => {
    expect(parseCartCommand("quiero el 1")).toEqual({
      action: "ADD",
      optionNumbers: [1],
    });
    expect(parseCartCommand("quiero la 2")).toEqual({
      action: "ADD",
      optionNumbers: [2],
    });
    expect(parseCartCommand("quiero las 1, 2, 3")).toEqual({
      action: "ADD",
      optionNumbers: [1, 2, 3],
    });
  });

  test("should parse 'ponme X'", () => {
    expect(parseCartCommand("ponme el 1")).toEqual({
      action: "ADD",
      optionNumbers: [1],
    });
    expect(parseCartCommand("ponme 2 y 3")).toEqual({
      action: "ADD",
      optionNumbers: [2, 3],
    });
    expect(parseCartCommand("ponme 1, 2, 3")).toEqual({
      action: "ADD",
      optionNumbers: [1, 2, 3],
    });
  });

  test("should parse ordinals (primero, segundo, etc.)", () => {
    expect(parseCartCommand("quiero el primero")).toEqual({
      action: "ADD",
      optionNumbers: [1],
    });
    expect(parseCartCommand("agrega el segundo")).toEqual({
      action: "ADD",
      optionNumbers: [2],
    });
    expect(parseCartCommand("ponme el tercero")).toEqual({
      action: "ADD",
      optionNumbers: [3],
    });
  });

  test("should parse LATAM expressions", () => {
    expect(parseCartCommand("súmale la opción 1")).toEqual({
      action: "ADD",
      optionNumbers: [1],
    });
    expect(parseCartCommand("agrégame el 2")).toEqual({
      action: "ADD",
      optionNumbers: [2],
    });
    expect(parseCartCommand("pásame el 3")).toEqual({
      action: "ADD",
      optionNumbers: [3],
    });
  });

  // QUITAR productos
  test("should parse 'quita la opción X'", () => {
    expect(parseCartCommand("quita la opción 1")).toEqual({
      action: "REMOVE",
      optionNumbers: [1],
    });
    expect(parseCartCommand("quita las opciones 1, 2")).toEqual({
      action: "REMOVE",
      optionNumbers: [1, 2],
    });
  });

  test("should parse 'no quiero X'", () => {
    expect(parseCartCommand("no quiero el 1")).toEqual({
      action: "REMOVE",
      optionNumbers: [1],
    });
    expect(parseCartCommand("no quiero la 2")).toEqual({
      action: "REMOVE",
      optionNumbers: [2],
    });
  });

  // Múltiples opciones
  test("should handle multiple formats", () => {
    expect(parseCartCommand("agrega 1, 2, 3")).toEqual({
      action: "ADD",
      optionNumbers: [1, 2, 3],
    });
    expect(parseCartCommand("agrega 1 y 2")).toEqual({
      action: "ADD",
      optionNumbers: [1, 2],
    });
    expect(parseCartCommand("agrega 1,2,3")).toEqual({
      action: "ADD",
      optionNumbers: [1, 2, 3],
    }); // Sin espacios
  });

  // No-cart commands
  test("should return null for non-cart commands", () => {
    expect(parseCartCommand("hola")).toBeNull();
    expect(parseCartCommand("quiero una pizza picante")).toBeNull();
    expect(parseCartCommand("muéstrame las opciones")).toBeNull();
    expect(parseCartCommand("para 4 personas")).toBeNull();
  });
});
