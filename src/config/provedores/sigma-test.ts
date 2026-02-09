import { TestStrategy } from "./test-types";

/**
 * Estratégia de teste do PAINEL SIGMA
 * 
 * O Sigma usa autenticação via JSON POST no endpoint /api/auth/login
 * com payload incluindo captcha e campos de 2FA.
 * Também tenta form login como fallback para painéis baseados em Sigma
 * que usam interfaces web tradicionais.
 */
export const SIGMA_TEST_STRATEGY: TestStrategy = {
  steps: [
    {
      type: 'json-post',
      endpoints: ['/api/auth/login'],
      label: 'Sigma JSON API',
    },
    {
      type: 'form',
      endpoints: ['/login'],
      label: 'Sigma Form Fallback',
    },
  ],
};
