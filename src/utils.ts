import { deploySC, IAccount, ISCData } from '@massalabs/massa-sc-deployer';
import {
  Args,
  Client,
  EOperationStatus,
  IEvent,
  MAX_GAS_DEPLOYMENT,
  MAX_GAS_EXECUTE_SC,
} from '@massalabs/massa-web3';
import { readFileSync } from 'fs';

export function getEnv(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing ${key} in .env file`);
  }
  return value;
}

export async function deploySc(
  api: string,
  account: IAccount,
  chainId: bigint,
  scPath: string,
  coins: bigint,
  args: Args,
): Promise<string> {
  const wasmBuffer = readFileSync(scPath);
  const deploySc = await deploySC(
    api,
    account,
    [
      {
        data: wasmBuffer,
        coins: coins,
        args: args,
      } as ISCData,
    ],
    chainId,
    0n, // fees
    MAX_GAS_DEPLOYMENT,
    false, // wait for the first event to be emitted and print it into the console.
  );
  return deploySc.opId;
}

export async function waitForEvents(
  client: Client,
  operationId: string,
  final = false,
): Promise<[EOperationStatus, IEvent[]]> {
  let result = EOperationStatus.NOT_FOUND;

  const finalSuccess = client
    .smartContracts()
    .awaitRequiredOperationStatus(operationId, EOperationStatus.FINAL_SUCCESS);

  const finalError = client
    .smartContracts()
    .awaitRequiredOperationStatus(operationId, EOperationStatus.FINAL_ERROR);

  const finalResult = await Promise.race([finalSuccess, finalError]);
  result = finalResult;
  const events: IEvent[] = await client
    .smartContracts()
    .getFilteredScOutputEvents({
      emitter_address: null,
      start: null,
      end: null,
      original_caller_address: null,
      original_operation_id: operationId,
      is_final: final,
    });
  return [result, events];
}

export function getScAddressFromEvents(events: IEvent[]): string {
  const deployedSCEvent = events?.find((e) =>
    e.data.includes('Contract deployed at address'),
  );

  if (!deployedSCEvent) {
    throw new Error('failed to retrieve deploy address');
  }

  return deployedSCEvent.data.substring(
    'Contract deployed at address: '.length,
    deployedSCEvent.data.length,
  );
}
