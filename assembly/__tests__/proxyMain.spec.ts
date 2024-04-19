import { findSubArrayIndex } from '../contracts/proxyMain';

describe('find sub array index', () => {
  test('test OK', () => {
    const arr1: StaticArray<u8> = [1, 2, 3, 4];
    const subarr1: StaticArray<u8> = [2, 3, 4];
    const subarr2: StaticArray<u8> = [3, 4];
    const subarr3: StaticArray<u8> = [4];
    let idx1 = findSubArrayIndex(arr1, subarr1);
    expect<i32>(idx1).toBe(1);
    let idx2 = findSubArrayIndex(arr1, subarr2);
    expect<i32>(idx2).toBe(2);
    let idx3 = findSubArrayIndex(arr1, subarr3);
    expect<i32>(idx3).toBe(3);
    let idx4 = findSubArrayIndex(arr1, arr1);
    expect<i32>(idx4).toBe(0);
  });
  test('test KO', () => {
    const arr1: StaticArray<u8> = [255, 254, 253, 252];
    const subarr1: StaticArray<u8> = [255, 254, 254];
    const subarr2: StaticArray<u8> = [255, 251];
    const subarr3: StaticArray<u8> = [250];
    const subarr4: StaticArray<u8> = [255, 254, 253, 252, 251];
    let idx1 = findSubArrayIndex(arr1, subarr1);
    expect<i32>(idx1).toBe(-1);
    let idx2 = findSubArrayIndex(arr1, subarr2);
    expect<i32>(idx2).toBe(-1);
    let idx3 = findSubArrayIndex(arr1, subarr3);
    expect<i32>(idx3).toBe(-1);
    let idx4 = findSubArrayIndex(arr1, subarr4);
    expect<i32>(idx4).toBe(-1);
  });
});
