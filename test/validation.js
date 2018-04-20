import { isValidStatusCode } from '../src/validate';

describe('validation', () => {
  test('close frame status codes', () => {
    const closeCodes = [
      1000,
      1001,
      1002,
      1003,
      1007,
      1008,
      1009,
      1010,
      1011,
      1012,
      1013,
      3000,
      3604,
      4505,
      4999
    ];

    const value = reduceBoolArray(closeCodes.map(isValidStatusCode));

    expect(value).toBe(true);
  });

  test('invalid close frame status code fail', () => {
    const invalidCodes = [
      0,
      52,
      484,
      999,
      1014,
      1015,
      2000,
      2305,
      2752,
      2998,
      5000,
      7505
    ];

    const value = reduceBoolArray(
      invalidCodes.map(code => !isValidStatusCode(code))
    );

    expect(value).toBe(true);
  });
});

function reduceBoolArray(array) {
  return array.reduce((prev, current) => prev && current);
}
