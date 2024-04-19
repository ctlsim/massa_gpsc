import path from 'path';
import { fileURLToPath } from 'url';
import * as assert from 'node:assert';

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

import {
  installSmartContract,
  getProxyCallerAddressFromEvents,
  readSc,
} from './proxyUtils';

// Obtain the current file name and directory paths
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(path.dirname(__filename));

// Load .env file content into process.env
dotenv.config();

const publicApi = getEnv('JSON_RPC_URL_PUBLIC');
const secretKey = getEnv('WALLET_SECRET_KEY');
// Define deployment parameters
const chainId = CHAIN_ID.BuildNet; // Choose the chain ID corresponding to the network you want to deploy to
// const maxGas = MAX_GAS_DEPLOYMENT; // Gas for deployment Default is the maximum gas allowed for deployment
// const fees = 0n; // Fees to be paid for deployment
// const waitFirstEvent = true;
const traceEvents = false;

const deployerAccount = await WalletClient.getAccountFromSecretKey(secretKey);

const client = await ClientFactory.createDefaultClient(
  publicApi as DefaultProviderUrls,
  chainId,
  false,
  deployerAccount,
);

// Deploy add0
const addWasm = path.join(__dirname, 'build', 'add.wasm');
console.log(`add.wasm path: ${addWasm}`);
const operationId0 = await deploySc(
  publicApi,
  deployerAccount,
  chainId,
  addWasm,
  fromMAS(0.1),
  new Args(),
);

console.log(`operationId (deploy add): ${operationId0}`);
let [opStatus0, events0] = await waitForEvents(client, operationId0, true);
if (traceEvents) {
  console.log('events:');
  console.log(events0);
}
assert.equal(opStatus0, EOperationStatus.FINAL_SUCCESS);
let addScAddr = getScAddressFromEvents(events0);
console.log('add smart contract address:', addScAddr);

// Deploy proxy

const proxyWasm = path.join(__dirname, 'build', 'proxyMain.wasm');
console.log(`proxyWasm path: ${proxyWasm}`);
const operationId2 = await deploySc(
  publicApi,
  deployerAccount,
  chainId,
  proxyWasm,
  fromMAS(2), // TODO: check this
  new Args(),
);
console.log(`operationId (deploy proxy): ${operationId2}`);
let [opStatus2, events2] = await waitForEvents(client, operationId2, true);
if (traceEvents) {
  console.log('events:');
  console.log(events2);
}
assert.equal(opStatus2, EOperationStatus.FINAL_SUCCESS);

const proxyAddr = getScAddressFromEvents(events2);
console.log(`proxy smart contract address: ${proxyAddr}`);
const proxyCallerAddr = getProxyCallerAddressFromEvents(events2);
console.log(`proxy caller smart contract address: ${proxyCallerAddr}`);

// Get proxy caller addr
const response = await readSc(
  client,
  proxyAddr,
  'getProxyCaller',
  new Args(),
  MAX_GAS_EXECUTE_SC,
);
const sc = new Args(response.returnValue).nextString();
// console.log(`Read proxy caller address from proxyMain: ${sc}`);
assert.equal(sc, proxyCallerAddr);

// Get smart contract addr from proxy
const response2 = await readSc(
  client,
  proxyAddr,
  'getSmartContract',
  new Args(),
  MAX_GAS_EXECUTE_SC,
);
const sc2 = new Args(response2.returnValue).nextString();
// console.log(`Read installed sc from proxyMain: ${sc2}`);
assert.equal(sc2, '');

// Install add in the proxy
let operationId3 = await installSmartContract(client, proxyAddr, addScAddr);
console.log(`operationId (install add): ${operationId3}`);
let [opStatus3, events3] = await waitForEvents(client, operationId3, true);
if (traceEvents) {
  console.log('events 3:');
  console.log(events3);
}
assert.equal(opStatus3, EOperationStatus.FINAL_SUCCESS);

// Get smart contract addr from proxy
const response3 = await readSc(
  client,
  proxyAddr,
  'getSmartContract',
  new Args(),
  MAX_GAS_EXECUTE_SC,
);
const sc3 = new Args(response3.returnValue).nextString();
// console.log(`Read installed sc from proxyMain: ${sc}`);
assert.equal(sc3, addScAddr);
