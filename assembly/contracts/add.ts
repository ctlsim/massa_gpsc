// Test Smart Contract (Version 1, Version 0: add0.ts)

import { Args } from '@massalabs/as-types';

import { Context, generateEvent } from '@massalabs/massa-as-sdk';

export function _add(a: u64, b: u64): u64 {
  return a + b;
}

export function add(args: StaticArray<u8>): void {
  let args_ = new Args(args);
  let a = args_.nextU64().expect('Unable to deserialize: a as a u64');
  let b = args_.nextU64().expect('Unable to deserialize: b as a u64');
  let c = _add(a, b);
  generateEvent(`${a} + ${b} = ${c}`);
}

export function constructor(_args: StaticArray<u8>): void {
  assert(Context.isDeployingContract());
  generateEvent('add.ts constructor done!');
}
