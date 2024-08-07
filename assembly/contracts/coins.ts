import { Context, generateEvent } from '@massalabs/massa-as-sdk';

export function constructor(_args: StaticArray<u8>): void {
    assert(Context.isDeployingContract());
    generateEvent('coins.ts constructor ok');
}

export function transferCoins(): void {
    const coins = Context.transferredCoins();
    generateEvent(`Coins - received ${coins} coins`);
}