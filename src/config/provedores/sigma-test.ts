import { TestStrategy } from "./test-types";

/**
 * Estratégia de teste do PAINEL SIGMA
 * 
 * O Sigma usa autenticação via JSON POST.
 * Tenta múltiplos endpoints comuns em painéis Sigma:
 * /api/auth/login, /login, /api/login
 * O form login serve como fallback final.
 */
export const SIGMA_TEST_STRATEGY: TestStrategy = {
  steps: [
    {
      type: 'json-post',
      endpoints: ['/api/auth/login', '/login', '/api/login'],
      label: 'Sigma JSON API',
    },
    {
      type: 'form',
      endpoints: ['/login'],
      label: 'Sigma Form Fallback',
    },
  ],
};
