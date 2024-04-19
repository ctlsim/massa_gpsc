import { Context, generateEvent } from '@massalabs/massa-as-sdk';
import { Args, stringToBytes } from '@massalabs/as-types';
import { Storage } from '@massalabs/massa-as-sdk';
import { env } from '@massalabs/massa-as-sdk/assembly/env';

const PROXY_CALLEE_KEY: StaticArray<u8> = stringToBytes('PXC');

export function constructor(_args: StaticArray<u8>): void {
  assert(Context.isDeployingContract());
  generateEvent('storage1.ts constructor ok');
}

export function setAge(args: StaticArray<u8>): void {
  let age = new Args(args).nextU32().expect('No age (u32)?');
  const calleeBytes = Storage.get(PROXY_CALLEE_KEY);
  const callee = new Args(calleeBytes)
    .nextString()
    .expect('Unable to deserialize proxy callee');
  env.setOf(callee, stringToBytes('age'), new Args().add(age).serialize());
  generateEvent(`AA Set age to: ${age} on ${callee}`);
}

export function getAge1(_args: StaticArray<u8>): StaticArray<u8> {
  const calleeBytes = Storage.get(PROXY_CALLEE_KEY);
  const callee = new Args(calleeBytes)
    .nextString()
    .expect('Unable to deserialize proxy callee');
  let bytes = env.getOf(callee, stringToBytes('age'));
  let age = new Args(bytes).nextU32().expect('No age (u32) ?');
  generateEvent(`Read age 1: ${age}`);
  return bytes;
}

export function getAge2(): StaticArray<u8> {
  const calleeBytes = Storage.get(PROXY_CALLEE_KEY);
  const callee = new Args(calleeBytes)
    .nextString()
    .expect('Unable to deserialize proxy callee');
  let bytes = env.getOf(callee, stringToBytes('age'));
  let age = new Args(bytes).nextU32().expect('No age (u32) ?');
  generateEvent(`Read age 2: ${age}`);
  return bytes;
}
