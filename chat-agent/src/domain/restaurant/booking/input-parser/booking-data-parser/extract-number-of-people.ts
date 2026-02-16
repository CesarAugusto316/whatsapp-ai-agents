// === Funciones auxiliares de parsing ===

export function extractNumberOfPeople(message: string): number {
  const text = message.toLowerCase();

  // Patrones principales
  const patterns = [
    /(?:mesa|reserva|cita|evento)\s+para\s+(\d+)/i,
    /(?:para|de|con|grupo de|somos|vamos a ser|vamos|total|reserva para)\s*(\d+)\s*(?:personas?|pers|comensales?|chamacos?|pelados?|fiambres?|tíos?|compas?|parce|panas?|muchachos?|cuates?|hermanos?|amigos?|colegas?|compadres?|quilombos?|pibes?|huespedes?|huéspedes?|güeyes?|huev.es?|camaradas?|cuate.s?|principes?|reyes?|capos?|jefes?)/i,
    /(\d+)\s*(?:adultos?|niños?|menores?|bebes?|bebés?)/i,
    /^(\d+)\s*(?:personas?|pers|comensales?|chamacos?|pelados?|fiambres?|tíos?|compas?|parce|panas?|muchachos?|cuates?|hermanos?|amigos?|colegas?|compadres?|quilombos?|pibes?|güeyes?|huev.es?|camaradas?|cuate.s?|principes?|reyes?|capos?|jefes?)/i,
    /(?:personas?|pers|comensales?|chamacos?|pelados?|fiambres?|tíos?|compas?|parce|panas?|muchachos?|cuates?|hermanos?|amigos?|colegas?|compadres?|quilombos?|pibes?|güeyes?|huev.es?|camaradas?|cuate.s?|principes?|reyes?|capos?|jefes?)\s*(\d+)$/i,
    /(?:somos|serán|vamos a ser|vamos|va a ir|van a ir|irá|irán)\s*(\d+)/i,
    /(?:pa'|pa)\s*(\d+)\s*(?:personas?|pers|...)/i,
    /(\d+)\s*(?:pa'|pa)\s*/i,
    /(\d+)\s+(?:chamacos?|pelados?|...)/i,
    /(?:vamos|somos|...)\s+p[ao]'?\s*(\d+)(?:\s+el\s+\w+\s+parce|...)/i,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      const num = parseInt(match[1], 10);
      if (!isNaN(num) && num > 0 && num <= 50) return num;
    }
  }

  // Términos regionales con tolerancia a errores de escritura
  const regionalTerms = [
    "ch[aá]?m[aá]?c[oe]?s?",
    "p[el][el]?ad[oe]?s?",
    "f[ií]?[aá]?mbres?",
    "t[ií]?[oe]?s?",
    "c[oe]?mp[ae]?s?",
    "parc[ae]?",
    "p[ae]?n[ae]?s?",
    "muchach[oe]?s?",
    "c[uú]?[ae]?t[es]?",
    "h[er]?m[aá]?n[oe]?s?",
    "amig[oe]?s?",
    "c[oe]?l[ey]?g[ae]?s?",
    "c[oe]?mpadr[es]?",
    "qu[ií]?l[em]?b[oe]?s?",
    "p[ií]?b[es]?",
    "g[uü]?[ey]?[ey]?s?",
    "c[aá]?m[ae]?r[ae]?d[ae]?s?",
    "c[uú]?[ae]?t[es]\.?s?",
    "pr[ií]?ncip[es]?",
    "r[ey]?y[es]?",
    "c[aá]?p[oe]?s?",
    "j[ef]?[es]?",
    "c[oe]?mp[ií]?s?",
    "h[er]?m[aá]?n[oe]?",
  ];

  for (const term of regionalTerms) {
    const reg = new RegExp(`(\\d+)\\s+${term}|${term}\\s+(\\d+)`, "i");
    const m = text.match(reg);
    if (m) {
      const n = parseInt(m[1] || m[2], 10);
      if (!isNaN(n) && n > 0 && n <= 50) {
        // Special check to avoid matching "amiguitos" when looking for "amigos"
        if (term.includes("amig") && text.includes("amiguit")) {
          continue; // Skip this match and continue to next term
        }
        return n;
      }
    }
  }

  // Patrón específico
  const vamosPattern = /(?:vamos|somos|...)\s+pa'?s*\s*(\d+)/i;
  const vm = text.match(vamosPattern);
  if (vm?.[1]) {
    const n = parseInt(vm[1], 10);
    if (!isNaN(n) && n > 0 && n <= 50) return n;
  }

  // Patrones generales con tolerancia a errores de escritura
  const generalPatterns = [
    /grup[oe]\s+d[ei]\s+(\d+)\s+p(?:er)?s[oe]n[ae]?s?/i,
    /equ[ií]p[oe]\s+d[ei]\s+(\d+)\s+p(?:er)?s[oe]n[ae]?s?/i,
    /fam[ií]l[ií]a\s+d[ei]\s+(\d+)\s+p(?:er)?s[oe]n[ae]?s?/i,
    /ev[ey][nt][oe]\s+d[ei]\s+(\d+)\s+p(?:er)?s[oe]n[ae]?s?/i,
    /c(?:elebrac|elebr[aá]c|i[eé]lebrac|i[eé]lebr[aá]c)[oó]n\s+d[ei]\s+(\d+)\s+p(?:er)?s[oe]n[ae]?s?/i,
    /(\d+)\s+p(?:er)?s[oe]n[ae]?s?/i,
    /(\d+)\s+c[oe]m[es]ns[ae]l[es]?s?/i,
    /(\d+)\s+[ií]nv[ií]t[ae]d[oe]?s?/i,
    /(\d+)\s+huesp[ed][es]?/i,
    /(\d+)\s+hu[ée]sp[ed][es]?/i,
  ];

  for (const p of generalPatterns) {
    const m = text.match(p);
    if (m?.[1]) {
      const n = parseInt(m[1], 10);
      if (!isNaN(n) && n > 0 && n <= 50) return n;
    }
  }

  // Casos especiales
  if (text.includes("solo") || text.includes("solos")) {
    if (text.includes("dos") || text.includes("2")) return 2;
    if (text.includes("uno") || text.includes("1")) return 1;
  }

  return 0;
}
