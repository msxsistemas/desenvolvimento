// Re-export types
export type { ProviderConfig, Panel } from "./types";
export type { TestStrategy, TestStep } from "./test-types";

// Re-export configs individuais
export { SIGMA_CONFIG } from "./sigma";
export { KOFFICE_API_CONFIG } from "./koffice-api";
export { KOFFICE_V2_CONFIG } from "./koffice-v2";
export { MUNDOGF_CONFIG } from "./mundogf";
export { UNIPLAY_CONFIG } from "./uniplay";
export { PROVEDORES_NAO_INTEGRADOS } from "./outros";

// Re-export estratégias de teste individuais
export { SIGMA_TEST_STRATEGY } from "./sigma-test";
export { KOFFICE_API_TEST_STRATEGY } from "./koffice-api-test";
export { KOFFICE_V2_TEST_STRATEGY } from "./koffice-v2-test";
export { MUNDOGF_TEST_STRATEGY } from "./mundogf-test";
export { UNIPLAY_TEST_STRATEGY } from "./uniplay-test";
export { DEFAULT_TEST_STRATEGY } from "./default-test";

// Importações para montar a lista unificada
import { SIGMA_CONFIG } from "./sigma";
import { KOFFICE_API_CONFIG } from "./koffice-api";
import { KOFFICE_V2_CONFIG } from "./koffice-v2";
import { MUNDOGF_CONFIG } from "./mundogf";
import { UNIPLAY_CONFIG } from "./uniplay";
import { PROVEDORES_NAO_INTEGRADOS } from "./outros";
import { ProviderConfig } from "./types";
import { TestStrategy } from "./test-types";
import { SIGMA_TEST_STRATEGY } from "./sigma-test";
import { KOFFICE_API_TEST_STRATEGY } from "./koffice-api-test";
import { KOFFICE_V2_TEST_STRATEGY } from "./koffice-v2-test";
import { MUNDOGF_TEST_STRATEGY } from "./mundogf-test";
import { UNIPLAY_TEST_STRATEGY } from "./uniplay-test";
import { DEFAULT_TEST_STRATEGY } from "./default-test";

// Lista unificada de todos os provedores
export const PROVEDORES: ProviderConfig[] = [
  KOFFICE_API_CONFIG,
  KOFFICE_V2_CONFIG,
  SIGMA_CONFIG,
  MUNDOGF_CONFIG,
  UNIPLAY_CONFIG,
  ...PROVEDORES_NAO_INTEGRADOS,
];

// Mapa de estratégias de teste por provedor
export const TEST_STRATEGIES: Record<string, TestStrategy> = {
  'sigma-v2': SIGMA_TEST_STRATEGY,
  'koffice-api': KOFFICE_API_TEST_STRATEGY,
  'koffice-v2': KOFFICE_V2_TEST_STRATEGY,
  'mundogf': MUNDOGF_TEST_STRATEGY,
  'uniplay': UNIPLAY_TEST_STRATEGY,
};

/** Retorna a estratégia de teste para um provedor (ou a default) */
export function getTestStrategy(providerId: string): TestStrategy {
  return TEST_STRATEGIES[providerId] || DEFAULT_TEST_STRATEGY;
}
