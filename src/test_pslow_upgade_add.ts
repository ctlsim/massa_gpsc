import path from 'path';
import { fileURLToPath } from 'url';

import * as dotenv from 'dotenv';
import { WalletClient } from '@massalabs/massa-sc-deployer';
import {
  Args,
  fromMAS,
  CHAIN_ID,
  ClientFactory,
  DefaultProviderUrls,
  EOperationStatus,
  MAX_GAS_EXECUTE_SC,
} from '@massalabs/massa-web3';

import {
  deploySc,
  getEnv,
  getScAddressFromEvents,
  waitForEvents,
} from './utils';

import { installSmartContract, readSc, proxyCall } from './proxyUtils';
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

// Deploy add0
let add0Wasm = path.join(__dirname, 'build', 'add0.wasm');
console.log(`add0.wasm path: ${add0Wasm}`);
let operationId0 = await deploySc(
  publicApi,
  deployerAccount,
  chainId,
  add0Wasm,
  fromMAS(0.1),
  new Args(),
);

console.log(`operationId (deploy add0): ${operationId0}`);
let [opStatus0, events0] = await waitForEvents(client, operationId0, true);
if (traceEvents) {
  console.log('events:');
  console.log(events0);
}
assert.equal(opStatus0, EOperationStatus.FINAL_SUCCESS);
let add0ScAddr = getScAddressFromEvents(events0);
console.log(`add0 smart contract address: ${add0ScAddr}`);

// Deploy add
let addWasm = path.join(__dirname, 'build', 'add.wasm');
console.log(`add.wasm path: ${addWasm}`);
let operationId1 = await deploySc(
  publicApi,
  deployerAccount,
  chainId,
  addWasm,
  fromMAS(0.1),
  new Args(),
);
console.log(`operationId (deploy add): ${operationId1}`);
let [opStatus1, events1] = await waitForEvents(client, operationId1, true);
if (traceEvents) {
  console.log('events:');
  console.log(events1);
}
assert.equal(opStatus1, EOperationStatus.FINAL_SUCCESS);
let addScAddr = getScAddressFromEvents(events1);
console.log(`add smart contract address: ${addScAddr}`);

// Deploy proxy

let proxyWasm = path.join(__dirname, 'build', 'proxySlow.wasm');
console.log(`proxySlow.wasm path: ${proxyWasm}`);
let operationId2 = await deploySc(
  publicApi,
  deployerAccount,
  chainId,
  proxyWasm,
  fromMAS(0.1),
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
// let proxyCallerAddr = getProxyCallerAddressFromEvents(events2);
// console.log(`proxy caller smart contract address: ${proxyCallerAddr}`);

// Install add0 in the proxy
let operationId3 = await installSmartContract(client, proxyAddr, add0ScAddr);
console.log(`operationId (install add0): ${operationId3}`);
let [opStatus3, events3] = await waitForEvents(client, operationId3, true);
if (traceEvents) {
  console.log('events 3:');
  console.log(events3);
}
assert.equal(opStatus3, EOperationStatus.FINAL_SUCCESS);

// Check installed sc
const response = await readSc(
  client,
  proxyAddr,
  'getSmartContract',
  new Args(),
  MAX_GAS_EXECUTE_SC,
);
const sc = new Args(response.returnValue).nextString();
assert.equal(sc, add0ScAddr);

let operationId4 = await proxyCall(
  client,
  proxyAddr,
  'add',
  new Args().addU64(18000n).addU64(18000n),
);
console.log(`operationId (proxyCall add0): ${operationId4}`);
let [opStatus4, events4] = await waitForEvents(client, operationId4, true);
if (traceEvents) {
  console.log('events 4:');
  console.log(events4);
}
assert.equal(opStatus4, EOperationStatus.FINAL_SUCCESS);

// Note: add0 does not generate an event here, so we cannot check the result

// TODO: try to do an install using non owner

// Upgrade proxy and install add in the proxy
let operationId5 = await installSmartContract(client, proxyAddr, addScAddr);
console.log(`operationId (update to add sc): ${operationId5}`);
let [opStatus5, events5] = await waitForEvents(client, operationId5, true);
if (traceEvents) {
  console.log('events 5:');
  console.log(events5);
}
assert.equal(opStatus5, EOperationStatus.FINAL_SUCCESS);

// Check installed sc
const response2 = await readSc(
  client,
  proxyAddr,
  'getSmartContract',
  new Args(),
  MAX_GAS_EXECUTE_SC,
);
const sc2 = new Args(response2.returnValue).nextString();
assert.equal(sc2, addScAddr);

let a = 18000n;
let b = 18000n;
let operationId6 = await proxyCall(
  client,
  proxyAddr,
  'add',
  new Args().addU64(a).addU64(b),
);
console.log(`operationId (proxyCall add): ${operationId6}`);
let [opStatus6, events6] = await waitForEvents(client, operationId6, true);
if (traceEvents) {
  console.log('events 6:');
  console.log(events6);
}
assert.equal(opStatus6, EOperationStatus.FINAL_SUCCESS);

// Check last event
const lastEvent = events6[events6.length - 1];
assert.equal(lastEvent.data.endsWith((a + b).toString()), true);
