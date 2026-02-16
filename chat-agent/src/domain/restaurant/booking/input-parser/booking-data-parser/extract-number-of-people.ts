// === Funciones auxiliares de parsing ===

export function extractNumberOfPeople(message: string): number {
  const text = message.toLowerCase();

  // Patrones principales con ligera tolerancia a errores de escritura
  const patterns = [
    /(?:mes[ae]?|reserv[ae]?|cit[ae]?|event[oe]?)\s+par[ae]?\s+(\d+)/i, // "mesa/reserva/cita/evento para X" with slight misspelling tolerance
    /(?:par[ae]?|d[ei]|c[eo]n|grup[oe]\s+d[ei]|som[oe]s|vam[oe]s\s+a\s+s[er]|vam[oe]s|tot[ae]l|reserv[ae]\s+par[ae])\s*(\d+)\s*(?:personas?|pers|comensales?|chamacos?|pelados?|fiambres?|tíos?|compas?|parce|panas?|muchachos?|cuates?|hermanos?|amigos?|colegas?|compadres?|quilombos?|pibes?|huespedes?|huéspedes?|güeyes?|huev.es?|camaradas?|cuate.s?|principes?|reyes?|capos?|jefes?)/i, // With slight tolerance for common misspellings
    /(\d+)\s*(?:adultos?|niños?|menores?|bebes?|bebés?)/i,
    /^(\d+)\s*(?:personas?|pers|comensales?|chamacos?|pelados?|fiambres?|tíos?|compas?|parce|panas?|muchachos?|cuates?|hermanos?|amigos?|colegas?|compadres?|quilombos?|pibes?|güeyes?|huev.es?|camaradas?|cuate.s?|principes?|reyes?|capos?|jefes?)/i,
    /(?:personas?|pers|comensales?|chamacos?|pelados?|fiambres?|tíos?|compas?|parce|panas?|muchachos?|cuates?|hermanos?|amigos?|colegas?|compadres?|quilombos?|pibes?|güeyes?|huev.es?|camaradas?|cuate.s?|principes?|reyes?|capos?|jefes?)\s*(\d+)$/i,
    /(?:som[oe]s|ser[aá]n|vam[oe]s\s+a\s+s[er]|vam[oe]s|va\s+a\s+ir|van\s+a\s+ir|ir[aá]|ir[aá]n)\s*(\d+)/i, // "somos/vamos" with slight tolerance
    /(?:pa'|pa)\s*(\d+)\s*(?:personas?|pers|...)/i,
    /(\d+)\s*(?:pa'|pa)\s*/i,
    /(\d+)\s+(?:chamacos?|pelados?|...)/i,
    /(?:vam[oe]s|som[oe]s|...)\s+p[ao]'?\s*(\d+)(?:\s+el\s+\w+\s+parce|...)/i, // "vamos/somos" with slight tolerance
    // Additional patterns for common booking expressions in chat apps
    /(?:estamos|estamos\s+en|vamos\s+a\s+ser|vamos\s+ser|vamos\s+en)\s*(\d+)\s+(?:personas?|pers|comensales?|chamacos?|pelados?|fiambres?|tíos?|compas?|parce|panas?|muchachos?|cuates?|hermanos?|amigos?|colegas?|compadres?|quilombos?|pibes?|huespedes?|huéspedes?|güeyes?|huev.es?|camaradas?|cuate.s?|principes?|reyes?|capos?|jefes?)/i, // "estamos 4 personas", "vamos a ser 6"
    /(?:total\s+de|en\s+total|contamos\s+con|sumamos|llevamos)\s*(\d+)\s+(?:personas?|pers|comensales?|chamacos?|pelados?|fiambres?|tíos?|compas?|parce|panas?|muchachos?|cuates?|hermanos?|amigos?|colegas?|compadres?|quilombos?|pibes?|huespedes?|huéspedes?|güeyes?|huev.es?|camaradas?|cuate.s?|principes?|reyes?|capos?|jefes?)/i, // "total de 5 personas", "contamos con 3"
    /(?:nosotros\s+somos|somos\s+en\s+total|somos\s+un\s+grupo\s+de|grupo\s+total\s+de)\s*(\d+)\s+(?:personas?|pers|comensales?|chamacos?|pelados?|fiambres?|tíos?|compas?|parce|panas?|muchachos?|cuates?|hermanos?|amigos?|colegas?|compadres?|quilombos?|pibes?|huespedes?|huéspedes?|güeyes?|huev.es?|camaradas?|cuate.s?|principes?|reyes?|capos?|jefes?)/i, // "nosotros somos 4", "grupo total de 8"
    /(\d+)\s*(?:personas?|pers|comensales?|chamacos?|pelados?|fiambres?|tíos?|compas?|parce|panas?|muchachos?|cuates?|hermanos?|amigos?|colegas?|compadres?|quilombos?|pibes?|huespedes?|huéspedes?|güeyes?|huev.es?|camaradas?|cuate.s?|principes?|reyes?|capos?|jefes?)\s+para\s+(?:reservar|mesa|cita|evento|alojamiento|hotel)/i, // "4 personas para reservar", "2 personas para mesa"
    /(?:confirmamos|queremos|necesitamos|requerimos|solicitamos)\s+(\d+)\s+(?:personas?|pers|comensales?|chamacos?|pelados?|fiambres?|tíos?|compas?|parce|panas?|muchachos?|cuates?|hermanos?|amigos?|colegas?|compadres?|quilombos?|pibes?|huespedes?|huéspedes?|güeyes?|huev.es?|camaradas?|cuate.s?|principes?|reyes?|capos?|jefes?)/i, // "confirmamos 3 personas", "queremos 2"
    /(?:conformamos|formamos\s+grupo|armamos\s+grupo)\s+(?:un\s+)?(?:grupo\s+de)?\s*(\d+)\s+(?:personas?|pers|comensales?|chamacos?|pelados?|fiambres?|tíos?|compas?|parce|panas?|muchachos?|cuates?|hermanos?|amigos?|colegas?|compadres?|quilombos?|pibes?|huespedes?|huéspedes?|güeyes?|huev.es?|camaradas?|cuate.s?|principes?|reyes?|capos?|jefes?)/i, // "conformamos grupo de 5", "armamos grupo 4"
    /(?:reserv[ae]\s+para|cita\s+para|evento\s+para|alojamiento\s+para|hotel\s+para)\s*(\d+)\s+(?:personas?|pers|comensales?|chamacos?|pelados?|fiambres?|tíos?|compas?|parce|panas?|muchachos?|cuates?|hermanos?|amigos?|colegas?|compadres?|quilombos?|pibes?|huespedes?|huéspedes?|güeyes?|huev.es?|camaradas?|cuate.s?|principes?|reyes?|capos?|jefes?)/i, // "reserva para 4 personas", "cita para 2"
    /(?:llegamos\s+a\s+ser|llegaremos\s+a\s+ser|terminamos\s+siendo|quedamos\s+en\s+ser)\s*(\d+)\s+(?:personas?|pers|comensales?|chamacos?|pelados?|fiambres?|tíos?|compas?|parce|panas?|muchachos?|cuates?|hermanos?|amigos?|colegas?|compadres?|quilombos?|pibes?|huespedes?|huéspedes?|güeyes?|huev.es?|camaradas?|cuate.s?|principes?|reyes?|capos?|jefes?)/i, // "llegamos a ser 6", "terminamos siendo 4"
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

  // Casos especiales con tolerancia a errores de escritura
  if (text.match(/s[oó]?l[oe]?|s[oó]?l[oe]?s?/)) {
    if (text.match(/d[oe]?s?|2/) && !text.match(/n[oó]?|n[oe]?/)) return 2; // avoid "no dos"
    if (text.match(/un[oe]?|1/)) return 1;
  }

  // Manejo robusto de números en palabras (hasta 10) con tolerancia a errores
  const numberWordPatterns = [
    {
      pattern:
        /(?:somos|vamos|grupo|equipo|familia|evento|para|con|de)\s+o?n[eo]+s?/i,
      value: 1,
    }, // "uno", "un", etc.
    {
      pattern:
        /(?:somos|vamos|grupo|equipo|familia|evento|para|con|de)\s+d[oe]+s?/i,
      value: 2,
    }, // "dos"
    {
      pattern:
        /(?:somos|vamos|grupo|equipo|familia|evento|para|con|de)\s+tr[ie]+s?/i,
      value: 3,
    }, // "tres"
    {
      pattern:
        /(?:somos|vamos|grupo|equipo|familia|evento|para|con|de)\s+cuatr[oe]+s?/i,
      value: 4,
    }, // "cuatro"
    {
      pattern:
        /(?:somos|vamos|grupo|equipo|familia|evento|para|con|de)\s+cinc[oe]+s?/i,
      value: 5,
    }, // "cinco"
    {
      pattern:
        /(?:somos|vamos|grupo|equipo|familia|evento|para|con|de)\s+se[ií]+s?/i,
      value: 6,
    }, // "seis"
    {
      pattern:
        /(?:somos|vamos|grupo|equipo|familia|evento|para|con|de)\s+s[ií]+et[ey]+s?/i,
      value: 7,
    }, // "siete"
    {
      pattern:
        /(?:somos|vamos|grupo|equipo|familia|evento|para|con|de)\s+och[oe]+s?/i,
      value: 8,
    }, // "ocho"
    {
      pattern:
        /(?:somos|vamos|grupo|equipo|familia|evento|para|con|de)\s+nuev[ey]+s?/i,
      value: 9,
    }, // "nueve"
    {
      pattern:
        /(?:somos|vamos|grupo|equipo|familia|evento|para|con|de)\s+d[ií]+ez?/i,
      value: 10,
    }, // "diez"
  ];

  // Buscar números en palabras en el contexto de personas
  for (const { pattern, value } of numberWordPatterns) {
    const match = text.match(pattern);
    if (match && value > 0 && value <= 50) {
      // Verificar que no sea parte de una frase como "no uno" o "no un"
      const matchStartIndex = match.index || 0;
      const precedingText = text.substring(0, matchStartIndex).trim();
      if (!precedingText.endsWith("no")) {
        return value;
      }
    }
  }

  return 0;
}
