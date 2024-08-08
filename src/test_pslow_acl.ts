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
let addWasm = path.join(__dirname, 'build', 'add.wasm');
console.log(`add.wasm path: ${addWasm}`);
let operationId0 = await deploySc(
    publicApi,
    deployerAccount,
    chainId,
    addWasm,
    fromMAS(0.1),
    new Args(),
);

console.log(`operationId (deploy add.wasm): ${operationId0}`);
let [opStatus0, events0] = await waitForEvents(client, operationId0, true);
if (traceEvents) {
    console.log('events:');
    console.log(events0);
}
assert.equal(opStatus0, EOperationStatus.FINAL_SUCCESS);
let addScAddr = getScAddressFromEvents(events0);
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

// Install add in the proxy
let operationId3 = await installSmartContract(client, proxyAddr, addScAddr);
console.log(`operationId (install add): ${operationId3}`);
let [opStatus3, events3] = await waitForEvents(client, operationId3, true);
if (traceEvents) {
    console.log('events 3:');
    console.log(events3);
}
assert.equal(opStatus3, EOperationStatus.FINAL_SUCCESS);

// Query ACL flag

console.log(`readSC getACLFlag() on ${proxyAddr}`);
const readAclFlagResponse1a = await readSc(
    client,
    proxyAddr,
    'getACLFlag',
    new Args(),
    MAX_GAS_EXECUTE_SC,
);
const aclFlag = new Args(readAclFlagResponse1a.returnValue).nextBool();
console.log(`aclFlag: ${aclFlag}`);
// assert.equal(ageFromGetAge1, ageFromGetAge1b);

// Enable ACL

const operationId4 = await callSc(client, proxyAddr, "setACLFlag", new Args().addBool(true), MAX_GAS_EXECUTE_SC, 0n);
let [opStatus4, events4] = await waitForEvents(client, operationId4, true);
console.log(`events 4:`);
console.log(events4);
assert.equal(opStatus4, EOperationStatus.FINAL_SUCCESS);

// Query ACL flag

console.log(`readSC getACLFlag() on ${proxyAddr}`);
const readAclFlagResponse1b = await readSc(
    client,
    proxyAddr,
    'getACLFlag',
    new Args(),
    MAX_GAS_EXECUTE_SC,
);
const aclFlagB = new Args(readAclFlagResponse1b.returnValue).nextBool();
console.log(`aclFlag: ${aclFlag}`);
// assert.equal(ageFromGetAge1, ageFromGetAge1b);

assert.notEqual(aclFlag, aclFlagB);

// ACL is enabled (but empty) - check if owner can proxyCall
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
assert.equal(opStatus6, EOperationStatus.FINAL_ERROR);

// Add owner to ACL
let deployerAddress = deployerAccount.address!;
const operationId7 = await callSc(client, proxyAddr, "aclAllow", new Args().addString(deployerAddress), MAX_GAS_EXECUTE_SC, 0n);
let [opStatus7, events7] = await waitForEvents(client, operationId7, true);
console.log(`events 7:`);
console.log(events7);
assert.equal(opStatus7, EOperationStatus.FINAL_SUCCESS);

// Check (2) if owner can proxyCall
let operationId8 = await proxyCall(
    client,
    proxyAddr,
    'add',
    new Args().addU64(a).addU64(b),
);
console.log(`operationId (proxyCall add): ${operationId8}`);
let [opStatus8, events8] = await waitForEvents(client, operationId8, true);
if (traceEvents) {
    console.log('events 8:');
    console.log(events8);
}
assert.equal(opStatus8, EOperationStatus.FINAL_SUCCESS);


