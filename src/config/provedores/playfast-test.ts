import { TestStrategy } from "./test-types";

export const PLAYFAST_TEST_STRATEGY: TestStrategy = {
  steps: [
    {
      type: 'json-post',
      endpoints: ['/profile/{username}'],
      label: 'Playfast Profile Check',
    },
  ],
};
