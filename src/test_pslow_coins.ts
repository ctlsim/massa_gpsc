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

import {installSmartContract, readSc, proxyCall, callSc} from './proxyUtils';
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

// Deploy coins
let coinsWasm = path.join(__dirname, 'build', 'coins.wasm');
console.log(`coins.wasm path: ${coinsWasm}`);
let operationId0 = await deploySc(
    publicApi,
    deployerAccount,
    chainId,
    coinsWasm,
    fromMAS(0.1),
    new Args(),
);

console.log(`operationId (deploy coins): ${operationId0}`);
let [opStatus0, events0] = await waitForEvents(client, operationId0, true);
if (traceEvents) {
    console.log('events:');
    console.log(events0);
}
assert.equal(opStatus0, EOperationStatus.FINAL_SUCCESS);
let add0ScAddr = getScAddressFromEvents(events0);
console.log(`add0 smart contract address: ${add0ScAddr}`);

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

// Install coins in the proxy
let operationId3 = await installSmartContract(client, proxyAddr, add0ScAddr);
console.log(`operationId (install coins): ${operationId3}`);
let [opStatus3, events3] = await waitForEvents(client, operationId3, true);
if (traceEvents) {
    console.log('events 3:');
    console.log(events3);
}
assert.equal(opStatus3, EOperationStatus.FINAL_SUCCESS);

// Transfer coins to proxy
const operationId4 = await callSc(client, proxyAddr, "transferCoins", new Args(), MAX_GAS_EXECUTE_SC, fromMAS(2));
let [opStatus4, events4] = await waitForEvents(client, operationId4, true);
console.log(`events 4:`);
console.log(events4);
assert.equal(opStatus4, EOperationStatus.FINAL_SUCCESS);

// Transfer coins to coins.wasm
let operationId5 = await proxyCall(
    client,
    proxyAddr,
    'transferCoins',
    new Args(),
);
console.log(`operationId (proxyCall transferCoins): ${operationId5}`);
let [opStatus5, events5] = await waitForEvents(client, operationId5, true);
if (traceEvents) {
    console.log('events 5:');
    console.log(events5);
}
assert.equal(opStatus5, EOperationStatus.FINAL_SUCCESS);