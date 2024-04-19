import { Args } from '@massalabs/as-types';
import {
  Address,
  Storage,
  Context,
  functionExists,
  localCall,
  getOf,
} from '@massalabs/massa-as-sdk';
// Debug
// import {stringToBytes} from "@massalabs/as-types";
// import {generateEvent} from "@massalabs/massa-as-sdk";

const PROXY_KEY: StaticArray<u8> = [80, 88]; // == stringToBytes("PX");
const PROXY_CALLEE_KEY: StaticArray<u8> = [80, 88, 67]; // == stringToBytes("PXC");
const TARGET_SC_ADDRESS_KEY: StaticArray<u8> = [84, 83, 67]; // == stringToBytes("TSC");

const toPatch: StaticArray<u8> = [
  // PREFIX (u32)
  255, 254, 253, 10,
  // SIZE (u32) will be 52 or 53
  255, 255, 255, 255,
  // ADDR BYTES
  255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255,
  255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255,
  255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255,
  255, 255, 255, 255, 255, 255, 255, 255,
  // SUFFIX (u32)
  11, 252, 255, 11,
];

export function proxyCall(args: StaticArray<u8>): StaticArray<u8> {
  const _args = new Args(args);
  const targetFunction = _args
    .nextString()
    .expect('Unable to deserialize target function');

  // Deserialize proxyMain address
  let proxyAddrBytes = toPatch.slice<StaticArray<u8>>(4, toPatch.length - 4);
  let proxyAddrBytesLen = proxyAddrBytes.length;
  // Address length can be 52 or 53
  if (proxyAddrBytes[proxyAddrBytesLen - 1] == 255) {
    proxyAddrBytes = toPatch.slice<StaticArray<u8>>(4, toPatch.length - 5);
  }
  // generateEvent(`proxy addr bytes: ${proxyAddrBytes.toString()}`);
  let proxyAddr = new Args(proxyAddrBytes)
    .nextString()
    .expect('Unable to get proxy address');
  // generateEvent(`proxy addr: ${proxyAddr}`);

  // Read target smart contract address from proxyMain
  let targetScBytes = getOf(new Address(proxyAddr), TARGET_SC_ADDRESS_KEY);

  let targetScStr = new Args(targetScBytes).nextString().expect('');
  // generateEvent(`targetScStr: ${targetScStr}`);
  const targetSc = new Address(targetScStr);
  // Forbid call to proxyMain or proxyCaller itself
  assert(proxyAddr != targetScStr, 'Forbidden call on proxyMain');
  assert(Context.callee() != targetSc, 'Forbidden call on proxyCaller');
  assert(
    functionExists(targetSc, targetFunction),
    `Invalid function ${targetFunction} for SC: ${targetSc}`,
  );

  // Setup temp Storage
  Storage.set(PROXY_KEY, [1]); // == Storage.set(PROXY_KEY, new Args().add(true).serialize());
  Storage.set(PROXY_CALLEE_KEY, targetScBytes);

  // Add +4 as we need to skip the size of the original byte array
  let argsAtOffset_ = args.slice<StaticArray<u8>>(_args.offset + 4);
  let argsAtOffset = new Args(argsAtOffset_);

  return localCall(targetSc, targetFunction, argsAtOffset);
}
