import { Context, generateEvent } from '@massalabs/massa-as-sdk';
import { Args, stringToBytes } from '@massalabs/as-types';
import { Storage } from '@massalabs/massa-as-sdk';

export function constructor(_args: StaticArray<u8>): void {
  assert(Context.isDeployingContract());
  generateEvent('storage1.ts constructor ok');
}

export function setAge(args: StaticArray<u8>): void {
  let age = new Args(args).nextU32().expect('No age (u32)?');
  Storage.set(stringToBytes('age'), new Args().add(age).serialize());
  generateEvent(`Set age to: ${age}`);
}

export function getAge1(_args: StaticArray<u8>): StaticArray<u8> {
  let bytes = Storage.get(stringToBytes('age'));
  let age = new Args(bytes).nextU32().expect('No age (u32) ?');
  generateEvent(`Read age 1: ${age}`);
  return bytes;
}

export function getAge2(): StaticArray<u8> {
  let bytes = Storage.get(stringToBytes('age'));
  let age = new Args(bytes).nextU32().expect('No age (u32) ?');
  generateEvent(`Read age 2: ${age}`);
  return bytes;
}
