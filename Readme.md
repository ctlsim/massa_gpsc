# A generic proxy for Massa smart contracts

A light and easy to use proxy smart contracts for others smart contracts.

## Proxy documentation (Ethereum)

### EIP

* https://eips.ethereum.org/EIPS/eip-1967
* https://eips.ethereum.org/EIPS/eip-1822

### OpenZeppelin proxy

* https://blog.openzeppelin.com/the-transparent-proxy-pattern
* https://github.com/OpenZeppelin/openzeppelin-contracts/tree/master/contracts/proxy

### Other

* Proxy hack
  * https://blog.openzeppelin.com/on-the-parity-wallet-multisig-hack-405a8c12e8f7  
  * https://blog.openzeppelin.com/parity-wallet-hack-reloaded

## Architecture

### proxySlow

* deploy proxySlow SC
* call(installSmartContract, targetSc) // targetSc is the logic contract
* proxySlow SC -> proxyCall(targetFunction, targetArgs) -> call(targetSc, targetFunction)

## Features (proxySlow)

* Upgrade the logic contract using `proxySlow.installSmartContract`
  * only owner can update the logic contract
* Storage is set on logic contract
* Proxy storage cannot be accessed by the logic contract
* Easy to use: deploy the logic contract, deploy the proxy and update it

## Limitations (proxySlow)

* owner standard use Context.caller() and thus owner is proxySlow
  * Cannot call directly on sc (if function is protected by: onlyOnwer), only using proxy

## Code organisation

* assembly/contracts: proxy smart contract code
* src/proxyUtils.ts: massa-web3 helper functions related to proxy

### Tests

* assembly/\_\_tests\_\_: smart contract unit test
* src/test_XXX.ts: Buildnet tests (see Buildnet tests section below)

## Unit tests

### Setup

npm install

### Run

npm run test

## Buildnet tests (proxySlow)

### Setup

* cp -v .env.sample .env
* EDIT .env
  * WALLET_SECRET_KEY requires an account with some coins to deploy
  * WALLET_SECRET_KEY_2 is only for the tests (non owner)
* npm install

### Run

* Test smart contract upgrade (Demonstrate proxy updatability, low coin amount to deploy):
  * deploy add0.wasm, add.wasm + proxy, install add0, call add, install add1 then call add again
    * npm run test_pslow_add
* Test storage (Demonstrate proxy + Storage)
  * npm run test_pslow_storage1
* Test detect (Demonstrate proxy detection)
  * npm run test_pslow_detect
* Test owner (Demonstrate that the proxy is the owner) 
 * npm run test_pslow_owner
