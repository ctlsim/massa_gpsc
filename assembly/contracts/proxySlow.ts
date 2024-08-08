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
  ownerAddress
} from '@massalabs/sc-standards/assembly/contracts/utils/ownership';

const PROXY_KEY: StaticArray<u8> = [80, 88]; // == stringToBytes("PX");
const TARGET_SC_ADDRESS_KEY: StaticArray<u8> = [84, 83, 67]; // == stringToBytes("TSC");
const ACL_ENABLE_KEY: StaticArray<u8> = [70, 65, 67, 76]; // == stringToBytes("FACL"); // ACL FLAG
const ACL_PREFIX: StaticArray<u8> = [65]; // == stringToBytes("A"); // ACL PREFIX

function _installSmartContract(targetSc: string): void {
  const bytes = new Args().add(targetSc).serialize();
  Storage.set(TARGET_SC_ADDRESS_KEY, bytes);
}

export function constructor(_args: StaticArray<u8>): void {
  assert(Context.isDeployingContract());
  setOwner(new Args().add(Context.caller()).serialize());

  // Init PROXY_KEY here otherwise the first call to proxyCall will forward fewer MAS
  Storage.set(PROXY_KEY, [0]); // == Storage.set(PROXY_KEY, new Args().add(false).serialize());

  // Init ACL_ENABLE_KEY (default: disabled)
  Storage.set(ACL_ENABLE_KEY, [0])
}

export function changeOwner(args: StaticArray<u8>): void {
  onlyOwner();
  const owner = new Args(args).nextString().expect('Invalid owner');
  setOwner(args);
  generateEvent(`Proxy new owner: ${owner}`);
}

export function getOwner(args: StaticArray<u8>): StaticArray<u8> {
  return new Args().add(ownerAddress(args)).serialize();
}

export function transferCoins(): void {
  const coins = Context.transferredCoins();
  generateEvent(`ProxySlow - received ${coins} coins`);
}

/*
export function transferCoinsSmartContract(): void {
  const args = new Args().add("transferCoins");
  proxyCall(args);
}
*/

export function installSmartContract(args: StaticArray<u8>): void {
  onlyOwner();
  generateEvent(`ProxySlow - installing smart contract...`);
  const _args = new Args(args);
  const targetSc = _args.nextString().expect('Invalid target sc');
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

  // Check ACL (if enabled)
  if (Storage.get(ACL_ENABLE_KEY).at(0) == 1) {
    const caller = Context.caller().toString();
    const keyData = new Args().add(caller).serialize();
    const aclKey = ACL_PREFIX.concat(keyData);
    assert(Storage.has(aclKey), `ProxySlow - addr ${caller} not in ACL`);
  }

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

// ACL flag toggle
export function setACLFlag(args: StaticArray<u8>): void {
  onlyOwner();
  const _args = new Args(args);
  const aclFlag = _args
      .nextBool()
      .expect('Unable to deserialize acl flag');
  Storage.set(ACL_ENABLE_KEY, args);
  generateEvent(`ProxySlow - acl flag changed to ${aclFlag}`);
}

export function getACLFlag(): StaticArray<u8> {
  return Storage.get(ACL_ENABLE_KEY);
}

export function aclAllow(args: StaticArray<u8>): void {
  // Add address to ACL list
  onlyOwner();
  const _args = new Args(args);
  const allowAddr = _args
      .nextString()
      .expect('Unable to deserialize acl address');

  const aclKey = ACL_PREFIX.concat(args);

  if (!Storage.has(aclKey)) {
    Storage.set(aclKey, []);
    generateEvent(`ProxySlow - acl allow: ${allowAddr}`);
  }
}

export function aclDisallow(args: StaticArray<u8>): void {
  // Remove address from ACL list
  onlyOwner();
  const _args = new Args(args);
  const disallowAddr = _args
      .nextString()
      .expect('Unable to deserialize acl address');

  const aclKey = ACL_PREFIX.concat(args);
  if (Storage.has(aclKey)) {
    Storage.del(aclKey);
    generateEvent(`ProxySlow - acl disallow: ${disallowAddr}`);
  }
}
