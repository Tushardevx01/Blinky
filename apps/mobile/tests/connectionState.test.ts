import { expect, test } from './test-framework';
import { disconnectedConnectionState } from '../connectionState';

test('disconnecting after authentication failure preserves the error state', () => {
  expect(disconnectedConnectionState('The PC rejected the remote token.')).toEqual({
    status: 'error',
    errorMsg: 'The PC rejected the remote token.',
    latestResponse: null,
  });
});
