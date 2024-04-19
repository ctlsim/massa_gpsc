import {
  Args,
  Client,
  fromMAS,
  IEvent,
  IReadData,
  MAX_GAS_EXECUTE_SC,
} from '@massalabs/massa-web3';

export function callSc(
  client: Client,
  scAddr: string,
  functionName: string,
  args: Args,
  gas: bigint,
  coins: bigint,
) {
  const deployerAccount = client.wallet().getBaseAccount()!;
  return client.smartContracts().callSmartContract(
    {
      fee: 0n,
      maxGas: gas,
      coins: coins,
      targetAddress: scAddr,
      functionName: functionName,
      parameter: args.serialize(),
    },
    deployerAccount,
  );
}

export function installSmartContract(
  client: Client,
  proxyAddr: string,
  scAddr: string,
): Promise<string> {
  let args = new Args().addString(scAddr);
  return callSc(
    client,
    proxyAddr,
    'installSmartContract',
    args,
    MAX_GAS_EXECUTE_SC,
    fromMAS(1),
  );
}

export function proxyCall(
  client: Client,
  proxyAddr: string,
  functionName: string,
  args: Args,
): Promise<string> {
  let arr = new Uint8Array(args.serialize());
  let proxyCallArgs = new Args().addString(functionName).addUint8Array(arr);
  return callSc(
    client,
    proxyAddr,
    'proxyCall',
    proxyCallArgs,
    MAX_GAS_EXECUTE_SC,
    fromMAS(1),
  );
}

export function readSc(
  client: Client,
  scAddr: string,
  functionName: string,
  args: Args,
  gas: bigint,
) {
  let readData: IReadData = {
    maxGas: gas,
    targetAddress: scAddr,
    targetFunction: functionName,
    parameter: args,
  };

  return client.smartContracts().readSmartContract(readData);
}

export function proxyRead(
  client: Client,
  proxyAddr: string,
  functionName: string,
  args: Args,
) {
  let arr = new Uint8Array(args.serialize());
  let proxyCallArgs = new Args().addString(functionName).addUint8Array(arr);
  return readSc(
    client,
    proxyAddr,
    'proxyCall',
    proxyCallArgs,
    MAX_GAS_EXECUTE_SC,
  );
}

export function getProxyCallerAddressFromEvents(events: IEvent[]): string {
  const deployedSCEvent = events?.find((e) =>
    e.data.includes('Proxy caller contract deployed at address'),
  );

  if (!deployedSCEvent) {
    throw new Error('failed to retrieve deploy address');
  }

  return deployedSCEvent.data.substring(
    'Proxy caller contract deployed at address: '.length,
    deployedSCEvent.data.length,
  );
}
