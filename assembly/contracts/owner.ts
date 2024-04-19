import { Context, generateEvent } from '@massalabs/massa-as-sdk';
import { Args } from '@massalabs/as-types';
import {
  onlyOwner,
  setOwner,
} from '@massalabs/sc-standards/assembly/contracts/utils/ownership';

export function msg(): void {
  generateEvent('msg!!!');
  let bytes2 = new Args().add(Context.caller().toString()).serialize();
  setOwner(bytes2);
}

export function ownerMsg(): void {
  onlyOwner();
  generateEvent(`Owner msg`);
}
