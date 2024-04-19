import { _add } from '../contracts/add';

describe('_add', () => {
  test('_add dummy test', () => {
    expect<u64>(_add(3, 9)).toBe(12);
  });
});
