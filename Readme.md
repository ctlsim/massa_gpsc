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

### proxyMain && proxyCaller

* deploy proxyMain SC
  * deploy process will deploy proxyCaller SC (with proxyMain address patched)
* call(installSmartContract, targetSc)
* proxyCaller SC -> read(proxyMain, "targetSc") -> proxyCall(targetFunction, targetArgs) -> localCall(targetSc, targetFunction)

### Notes

* Both solutions have limitations described (and tested) below

### Comparison

* proxySlow requires less gas to deploy & needs fewer coins to deploy (0.1 MAS only versus 1.6 MAS)
  * limitations: owner sc standards 
* proxyMain && proxyCaller: less gas to do a proxyCall (localCall compared to call)
  * limitations: storage is set on proxyCaller SC

## Features (proxyMain && proxyCaller)

* Forward call using `proxyCaller.proxyCall`
* Upgrade the logic contract using `proxyMain.installSmartContract`
  * only owner can update the logic contract
* Secure:
  * Proxy storage (proxyMain) cannot be accessed by the logic contract
  * proxyCall is immutable & use no storage (thus read logic contract address from proxyMain)
* Efficient gas usage
* Generic:
  * Using the proxy is transparent for other smart contract (but it can be detected)
    * proxyCaller.proxyCall update the storage key: "PX" with a boolean
* Easy to use: deploy the logic contract, deploy the proxy and update it

## Limitations & Bugs (proxyMain && proxyCaller)

* Storage is set on the proxyCaller address
* There is a bug exposed in test_storage2.ts unit test where:
  * the proxy caller use localCall to its logic contract
    * the logic contract fetch its address using key: PROXY_CALLEE_KEY
      * Bug 1: Context.AddressStack does not expose logic contract address
    * Bug 2: the logic contract cannot set Storage on its own address, error message:
      * `writing in the datastore of address AS12[...] is not allowed in this context`

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

## Buildnet tests (proxyMain && proxyCaller)

### Setup

* cp -v .env.sample .env
* EDIT .env
  * WALLET_SECRET_KEY requires an account with some coins to deploy
  * WALLET_SECRET_KEY_2 is only for the tests (non owner)
* npm install

### Run

* Test proxy (basic):
  * deploy add.wasm, deploy proxy and read some proxyMain (proxyCaller & logic contract)
    * npm run test_basic

* Test smart contract upgrade (Demonstrate proxy updatability):
  * deploy add0.wasm, add.wasm + proxy, install add0, call add, install add1 then call add again
    * npm run test_add

* Test detect proxy (Demonstrate proxy detection + transparent context caller address handling):
  * deploy detectProxy.wasm + proxy
    * npm run test_detect

* Test storage (Demonstrate proxy + Storage: call & read)
  * deploy storage1.wasm + proxy
    * npm run test_storage1

* Test storage 2 (Demonstrate localCall bugs - see Limitations & Bugs section)
  * npm run test_storage2

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
