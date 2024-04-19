# EIP-1967

* https://eips.ethereum.org/EIPS/eip-1967
  * A consistent location where proxies store the address of the logic contract they delegate to, as well as other proxy-specific information.

`
[...]

To avoid clashes in storage usage between the proxy and logic contract, the address of the logic contract is typically 
saved in a specific storage slot (for example 0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc in OpenZeppelin contracts) 
guaranteed to be never allocated by a compiler.

[...]

This EIP standardises the storage slot for the logic contract address, instead of a public method on the proxy contract. 
The rationale for this is that proxies should never expose functions to end users that could potentially clash 
with those of the logic contract.
`

Solution:

* Separate proxyMain (store target SC address) && proxyCaller (no state - hardcoded proxyMain address)
* proxyMain can update the target SC address

Architecture:

* The proxy SC (proxyMain.ts) when deployed will deploy another contract: the proxyCaller SC with the proxyMain addr hardcoded.
  * proxyMain SC stores the target SC address (in Storage)
  * proxyCaller implements the "proxyCall" function
    * when "proxyCall" is called, the proxyMain addr is used to query the target SC address
    * localCall is used (preserving Context.caller() original address)

* proxyCaller: has predefined Storage location to:
  * PROXY_CALL: bool => the target SC can then check if it is called via a proxy or not)

# EIP-1822 

* https://eips.ethereum.org/EIPS/eip-1822
  * reco. to write proxy contract

## Parity wallet multisig hack 

* https://blog.openzeppelin.com/on-the-parity-wallet-multisig-hack-405a8c12e8f7
  * constructor (which set owner) can be called by delegatecall 

Solution:
* Prevent proxyCaller to do a localCall on proxyMain or on itself
