import {
  Context,
  generateEvent,
  Storage,
  createSC,
} from '@massalabs/massa-as-sdk';
import { Args, stringToBytes } from '@massalabs/as-types';
import {
  setOwner,
  onlyOwner,
} from '@massalabs/sc-standards/assembly/contracts/utils/ownership';

const PROXY_CALLER_ADDRESS_KEY = stringToBytes('PXC');
const TARGET_SC_ADDRESS_KEY = stringToBytes('TSC');
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
const toPatchPrefix: StaticArray<u8> = [255, 254, 253, 10];

export function findSubArrayIndex(
  array: StaticArray<u8>,
  subarray: StaticArray<u8>,
): i32 {
  if (array.length < subarray.length) {
    return -1;
  }

  let j: i32 = 0;
  let foundIndex: i32 = -1;
  for (let i = 0; i < array.length; i++) {
    if (array[i] == subarray[j]) {
      if (j == 0) {
        foundIndex = i;
      }
      j += 1;
      if (j == subarray.length) {
        break;
      }
    } else {
      j = 0;
      foundIndex = -1;
    }
  }

  return foundIndex;
}

function _setSmartContract(targetSc: string): void {
  const bytes = new Args().add(targetSc).serialize();
  Storage.set(TARGET_SC_ADDRESS_KEY, bytes);
}

function _getSmartContract(): string {
  if (Storage.has(TARGET_SC_ADDRESS_KEY)) {
    const bytes = Storage.get(TARGET_SC_ADDRESS_KEY);
    return new Args(bytes)
      .nextString()
      .expect('Unable to deserialize smart contract');
  } else {
    return '';
  }
}

function _setProxyCaller(proxyCaller: string): void {
  const bytes = new Args().add(proxyCaller).serialize();
  Storage.set(PROXY_CALLER_ADDRESS_KEY, bytes);
}

function _getProxyCaller(): string {
  let bytes = Storage.get(PROXY_CALLER_ADDRESS_KEY);
  return new Args(bytes)
    .nextString()
    .expect('Unable to deserialize smart contract');
}

export function constructor(_args: StaticArray<u8>): void {
  assert(Context.isDeployingContract());
  setOwner(new Args().add(Context.caller()).serialize());

  const calleeAddress = Context.callee();

  // Deploy proxyCaller sc
  const bytecode: StaticArray<u8> = fileToByteArray('build/proxyCaller.wasm');

  // Patch proxyCaller bytecode with proxyMain address
  let index = findSubArrayIndex(bytecode, toPatch);
  assert(index != -1, 'Unable to find section to patch in proxy caller');
  let section = toPatchPrefix.concat(
    new Args().add(calleeAddress.toString()).serialize(),
  );
  // Add bytecode start + patched section
  let bytecodeNew: StaticArray<u8> = bytecode
    .slice<StaticArray<u8>>(0, index)
    .concat(section);
  // Add remaining bytecode
  bytecodeNew = bytecodeNew.concat(
    bytecode.slice<StaticArray<u8>>(index + section.length),
  );

  // Deploy proxyCaller
  let proxyCallerAddress = createSC(bytecodeNew);
  // Store proxyCaller address
  _setProxyCaller(proxyCallerAddress.toString());
  generateEvent(
    `Proxy caller contract deployed at address: ${proxyCallerAddress.toString()}`,
  );
}

export function installSmartContract(args: StaticArray<u8>): void {
  onlyOwner();
  generateEvent(`Installing smart contract...`);
  const _args = new Args(args);
  const targetSc = _args.nextString().expect('');
  _setSmartContract(targetSc);
  generateEvent(`Done install smart contract: ${targetSc}`);
}

export function getSmartContract(): StaticArray<u8> {
  return new Args().add(_getSmartContract()).serialize();
}

export function getProxyCaller(): StaticArray<u8> {
  return new Args().add(_getProxyCaller()).serialize();
}
