export interface SemanticIntent<Intent extends string, Domain extends string> {
  intent: Intent;
  domain: Domain;
  lang: "es" | "en";
  examples: string[];
}
