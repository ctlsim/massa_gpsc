import * as dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { WalletClient } from '@massalabs/massa-sc-deployer';
import {
  Args,
  CHAIN_ID,
  ClientFactory,
  DefaultProviderUrls,
  EOperationStatus,
  fromMAS,
  MAX_GAS_EXECUTE_SC,
} from '@massalabs/massa-web3';
import {
  deploySc,
  getEnv,
  getScAddressFromEvents,
  waitForEvents,
} from './utils';
import {
  installSmartContract,
  getProxyCallerAddressFromEvents,
  callSc,
  readSc,
  proxyCall,
  proxyRead,
} from './proxyUtils';
import assert from 'node:assert';

// Obtain the current file name and directory paths
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(path.dirname(__filename));

// Load .env file content into process.env
dotenv.config();

const publicApi = getEnv('JSON_RPC_URL_PUBLIC');
const secretKey = getEnv('WALLET_SECRET_KEY');
// Define deployment parameters
const chainId = CHAIN_ID.BuildNet; // Choose the chain ID corresponding to the network you want to deploy to
const traceEvents = true;

const deployerAccount = await WalletClient.getAccountFromSecretKey(secretKey);

let client = await ClientFactory.createDefaultClient(
  publicApi as DefaultProviderUrls,
  chainId,
  false,
  deployerAccount,
);

let storageWasm = path.join(__dirname, 'build', 'storage1.wasm');
console.log(`storage.wasm path: ${storageWasm}`);
let operationId1 = await deploySc(
  publicApi,
  deployerAccount,
  chainId,
  storageWasm,
  0n,
  new Args(),
);
console.log(`operationId (deploy storage sc): ${operationId1}`);
let [opStatus, events] = await waitForEvents(client, operationId1, true);
if (traceEvents) {
  console.log('events:');
  console.log(events);
}
assert.equal(opStatus, EOperationStatus.FINAL_SUCCESS);
let storageScAddr = getScAddressFromEvents(events);
console.log(`storage smart contract address: ${storageScAddr}`);

let proxyWasm = path.join(__dirname, 'build', 'proxyMain.wasm');
console.log(`proxyMain.wasm: ${proxyWasm}`);
let operationId2 = await deploySc(
  publicApi,
  deployerAccount,
  chainId,
  proxyWasm,
  fromMAS(1.6),
  new Args(),
);
console.log(`operationId (deploy proxy): ${operationId2}`);
let [opStatus2, events2] = await waitForEvents(client, operationId2, true);
if (traceEvents) {
  console.log('events:');
  console.log(events2);
}
assert.equal(opStatus2, EOperationStatus.FINAL_SUCCESS);
let proxyAddr = getScAddressFromEvents(events2);
console.log(`proxyMain smart contract address: ${proxyAddr}`);
let proxyCallerAddr = getProxyCallerAddressFromEvents(events2);
console.log(`proxy caller smart contract address: ${proxyCallerAddr}`);

let operationId3 = await installSmartContract(client, proxyAddr, storageScAddr);
console.log(`operationId (install storage sc): ${operationId3}`);
let [opStatus3, events3] = await waitForEvents(client, operationId3, true);
if (traceEvents) {
  console.log('events:');
  console.log(events3);
}
assert.equal(opStatus3, EOperationStatus.FINAL_SUCCESS);

let operationId4 = await proxyCall(
  client,
  proxyCallerAddr,
  'setAge',
  new Args().addU32(17535),
);
console.log(`operationId (proxyCall setAge): ${operationId4}`);
let [opStatus4, events4] = await waitForEvents(client, operationId4, true);
if (traceEvents) {
  console.log('events:');
  console.log(events4);
}
assert.equal(opStatus4, EOperationStatus.FINAL_SUCCESS);

// Read age

console.log(`proxyRead age1()`);
const readAgeResponse1 = await proxyRead(
  client,
  proxyCallerAddr,
  'getAge1',
  new Args(),
);
const ageFromGetAge1 = new Args(readAgeResponse1.returnValue).nextU32();
console.log(`ageFromGetAge1: ${ageFromGetAge1}`);

console.log(`readSC age1() on ${storageScAddr}`);
try {
  // Will fail because storage is set on proxyCaller
  const _readAgeResponse1b = await readSc(
    client,
    storageScAddr,
    'getAge1',
    new Args(),
    MAX_GAS_EXECUTE_SC,
  );
} catch (e) {
  console.log(`e:`);
  console.log(e);
}

console.log(`proxyRead age2()`);
const readAgeResponse2 = await proxyRead(
  client,
  proxyCallerAddr,
  'getAge2',
  new Args(),
);
const ageFromGetAge2 = new Args(readAgeResponse2.returnValue).nextU32();
console.log(`ageFromGetAge2: ${ageFromGetAge2}`);
assert.equal(ageFromGetAge1, ageFromGetAge2);
