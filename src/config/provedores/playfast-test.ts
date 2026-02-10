import { TestStrategy } from "./test-types";

export const PLAYFAST_TEST_STRATEGY: TestStrategy = {
  steps: [
    {
      type: 'json-post',
      endpoints: ['/api/auth/login', '/api/login', '/api/v1/login', '/login'],
      label: 'Playfast JSON Login',
    },
    {
      type: 'xtream',
      endpoints: ['/player_api.php', '/panel_api.php'],
      label: 'Playfast Xtream API',
    },
  ],
};
