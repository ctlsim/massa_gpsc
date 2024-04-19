import {
  Context,
  generateEvent,
  Storage,
  Address,
  functionExists,
  call,
} from '@massalabs/massa-as-sdk';
import { Args } from '@massalabs/as-types';
import {
  setOwner,
  onlyOwner,
} from '@massalabs/sc-standards/assembly/contracts/utils/ownership';

const PROXY_KEY: StaticArray<u8> = [80, 88]; // == stringToBytes("PX");
const TARGET_SC_ADDRESS_KEY: StaticArray<u8> = [84, 83, 67]; // == stringToBytes("TSC");

function _installSmartContract(targetSc: string): void {
  const bytes = new Args().add(targetSc).serialize();
  Storage.set(TARGET_SC_ADDRESS_KEY, bytes);
}

export function constructor(_args: StaticArray<u8>): void {
  assert(Context.isDeployingContract());
  setOwner(new Args().add(Context.caller()).serialize());
}

export function installSmartContract(args: StaticArray<u8>): void {
  onlyOwner();
  generateEvent(`ProxySlow - installing smart contract...`);
  const _args = new Args(args);
  const targetSc = _args.nextString().expect('');
  _installSmartContract(targetSc);
  generateEvent(`Done install smart contract: ${targetSc}`);
}

function _getSmartContract(): string {
  let bytes = Storage.get(TARGET_SC_ADDRESS_KEY);
  return new Args(bytes)
    .nextString()
    .expect('Unable to deserialize smart contract');
}

export function proxyCall(args: StaticArray<u8>): StaticArray<u8> {
  const _args = new Args(args);
  const targetFunction = _args
    .nextString()
    .expect('Unable to deserialize target function');
  const _targetSc = _getSmartContract();
  const targetSc = new Address(_targetSc);

  assert(Context.callee() != targetSc, 'Forbidden call on proxy');
  assert(
    functionExists(targetSc, targetFunction),
    `Invalid function ${targetFunction} for sc ${targetSc}`,
  );

  // Setup temp Storage
  Storage.set(PROXY_KEY, [1]); // == Storage.set(PROXY_KEY, new Args().add(true).serialize());

  // Add +4 as we need to skip the size of the original byte array
  let argsAtOffset_ = args.slice<StaticArray<u8>>(_args.offset + 4);
  let argsAtOffset = new Args(argsAtOffset_);

  return call(
    targetSc,
    targetFunction,
    argsAtOffset,
    Context.transferredCoins(),
  );
}

export function getSmartContract(): StaticArray<u8> {
  return new Args().add(_getSmartContract()).serialize();
}
