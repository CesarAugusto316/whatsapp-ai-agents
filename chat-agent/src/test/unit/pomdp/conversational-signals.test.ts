import { describe, it, expect } from "bun:test";
import {
  patterns,
  shouldSkipEmbedding,
} from "@/application/services/pomdp/intents/helpers/skip-embedding";

const { conversationalSignals, socialProtocols } = patterns;

describe("socialProtocols", () => {
  describe("greeting", () => {
    const regex = socialProtocols.greeting;

    it("should match basic greetings", () => {
      expect(regex.test("hola")).toBe(true);
      expect(regex.test("ola")).toBe(true);
      expect(regex.test("holaa")).toBe(true);
      expect(regex.test("holaaa")).toBe(true);
      expect(regex.test("holi")).toBe(true);
      expect(regex.test("holis")).toBe(true);
    });

    it("should match greetings with repeated letters", () => {
      expect(regex.test("holaaaa")).toBe(true);
      expect(regex.test("ollaa")).toBe(true);
    });

    it("should match regional greetings", () => {
      expect(regex.test("quiubo")).toBe(true);
      expect(regex.test("xou")).toBe(true);
      expect(regex.test("epa")).toBe(true);
    });

    it("should match time-based greetings", () => {
      expect(regex.test("buenas")).toBe(true);
      expect(regex.test("buenas tardes")).toBe(true);
      expect(regex.test("buenas noches")).toBe(true);
    });

    it("should match greetings with punctuation", () => {
      expect(regex.test("hola!")).toBe(true);
      expect(regex.test("hola!!")).toBe(true);
    });
  });

  describe("goodbye", () => {
    const regex = socialProtocols.goodbye;

    it("should match basic goodbyes", () => {
      expect(regex.test("chau")).toBe(true);
      expect(regex.test("chauu")).toBe(true);
      expect(regex.test("chao")).toBe(true);
      expect(regex.test("chaoito")).toBe(true);
      expect(regex.test("adios")).toBe(true);
    });

    it("should match hasta luego variations", () => {
      expect(regex.test("hasta luego")).toBe(true);
      expect(regex.test("hasta pronto")).toBe(true);
      expect(regex.test("hasta la vista")).toBe(true);
      expect(regex.test("hasta lueguito")).toBe(true);
      expect(regex.test("hasta prontito")).toBe(true);
    });

    it("should match regional goodbyes", () => {
      expect(regex.test("nos vemos")).toBe(true);
      expect(regex.test("nos vemo")).toBe(true);
      expect(regex.test("nos vidrios")).toBe(true);
      expect(regex.test("me voy")).toBe(true);
      expect(regex.test("hasta otra")).toBe(true);
      expect(regex.test("nos vemos luego")).toBe(true);
    });
  });

  describe("thanks", () => {
    const regex = socialProtocols.thanks;

    it("should match basic thanks", () => {
      expect(regex.test("gracias")).toBe(true);
      expect(regex.test("graciass")).toBe(true);
    });

    it("should match thanks variations", () => {
      expect(regex.test("muchas gracias")).toBe(true);
      expect(regex.test("mil gracias")).toBe(true);
      expect(regex.test("millones de gracias")).toBe(true);
      expect(regex.test("grax")).toBe(true);
      expect(regex.test("graxias")).toBe(true);
      expect(regex.test("te lo agradezco")).toBe(true);
    });

    it("should match English thanks", () => {
      expect(regex.test("thx")).toBe(true);
      expect(regex.test("thanks")).toBe(true);
      expect(regex.test("ty")).toBe(true);
      expect(regex.test("thank you")).toBe(true);
    });
  });
});

describe("conversationalSignals", () => {
  describe("affirmation", () => {
    const regex = conversationalSignals.affirmation;

    it("should match basic affirmations", () => {
      expect(regex.test("si")).toBe(true);
      expect(regex.test("sii")).toBe(true);
      expect(regex.test("siii")).toBe(true);
      expect(regex.test("ok")).toBe(true);
      expect(regex.test("oki")).toBe(true);
      expect(regex.test("claro")).toBe(true);
      expect(regex.test("clarisimo")).toBe(true);
      expect(regex.test("perfecto")).toBe(true);
      expect(regex.test("exacto")).toBe(true);
      expect(regex.test("correcto")).toBe(true);
      expect(regex.test("vale")).toBe(true);
    });

    it("should match regional affirmations", () => {
      expect(regex.test("dale")).toBe(true);
      expect(regex.test("sip")).toBe(true);
      expect(regex.test("simon")).toBe(true);
      expect(regex.test("de una")).toBe(true);
      expect(regex.test("de una vez")).toBe(true);
      expect(regex.test("orale")).toBe(true);
      expect(regex.test("obvio")).toBe(true);
      expect(regex.test("por supuesto")).toBe(true);
      expect(regex.test("asi es")).toBe(true);
    });
  });

  describe("negation", () => {
    const regex = conversationalSignals.negation;

    it("should match basic negations", () => {
      expect(regex.test("no")).toBe(true);
      expect(regex.test("noo")).toBe(true);
      expect(regex.test("nooo")).toBe(true);
      expect(regex.test("nop")).toBe(true);
      expect(regex.test("nopp")).toBe(true);
      expect(regex.test("nope")).toBe(true);
      expect(regex.test("tampoco")).toBe(true);
      expect(regex.test("nada")).toBe(true);
      expect(regex.test("nunca")).toBe(true);
    });

    it("should match regional negations", () => {
      expect(regex.test("nel")).toBe(true);
      expect(regex.test("nell")).toBe(true);
      expect(regex.test("nanai")).toBe(true);
      expect(regex.test("ya no")).toBe(true);
      expect(regex.test("para nada")).toBe(true);
      expect(regex.test("ni loco")).toBe(true);
      expect(regex.test("de ninguna manera")).toBe(true);
      expect(regex.test("ni hablar")).toBe(true);
    });
  });

  describe("uncertainty", () => {
    const regex = conversationalSignals.uncertainty;

    it("should match basic uncertainty", () => {
      expect(regex.test("no se")).toBe(true);
      expect(regex.test("nose")).toBe(true);
      expect(regex.test("tal vez")).toBe(true);
      expect(regex.test("quizas")).toBe(true);
      expect(regex.test("puede ser")).toBe(true);
      expect(regex.test("mmm")).toBe(true);
      expect(regex.test("mmmm")).toBe(true);
    });

    it("should match uncertainty variations", () => {
      expect(regex.test("mas o menos")).toBe(true);
      expect(regex.test("mas o menos asi")).toBe(true);
      expect(regex.test("medio")).toBe(true);
      expect(regex.test("no creo")).toBe(true);
      expect(regex.test("tengo dudas")).toBe(true);
      expect(regex.test("esta dificil")).toBe(true);
      expect(regex.test("veremos")).toBe(true);
      expect(regex.test("ya vere")).toBe(true);
    });
  });
});

describe("shouldSkipProcessing", () => {
  it("should skip social protocols", () => {
    expect(shouldSkipEmbedding("hola").skip).toBe(true);
    expect(shouldSkipEmbedding("hola").kind).toBe("social-protocol");
    expect(shouldSkipEmbedding("gracias").skip).toBe(true);
    expect(shouldSkipEmbedding("chau").skip).toBe(true);
  });

  it("should skip conversational signals", () => {
    expect(shouldSkipEmbedding("si").skip).toBe(true);
    expect(shouldSkipEmbedding("no").skip).toBe(true);
    expect(shouldSkipEmbedding("no se").skip).toBe(true);
    expect(shouldSkipEmbedding("dale").skip).toBe(true);
  });

  it("should not skip long messages", () => {
    expect(shouldSkipEmbedding("hola como estas hoy").skip).toBe(false);
    expect(
      shouldSkipEmbedding("quiero hacer una reserva para manana").skip,
    ).toBe(false);
  });

  it("should not skip unrecognized messages", () => {
    expect(shouldSkipEmbedding("que hora es").skip).toBe(false);
    expect(shouldSkipEmbedding("donde estan ubicados").skip).toBe(false);
  });
});
