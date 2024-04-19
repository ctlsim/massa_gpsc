import { Context, generateEvent, Storage } from '@massalabs/massa-as-sdk';
import { Args, stringToBytes } from '@massalabs/as-types';
import {
  onlyOwner,
  setOwner,
} from '@massalabs/sc-standards/assembly/contracts/utils/ownership';

export function msg(): void {
  let bytes = Storage.get(stringToBytes('PX'));
  let callProxy = new Args(bytes).nextBool().expect('Unable to get PX');
  if (callProxy == true) {
    generateEvent('Proxy call!');
  } else {
    generateEvent('Regular call!');
  }

  let bytes2 = new Args().add(Context.caller().toString()).serialize();
  setOwner(bytes2);
}

export function ownerMsg(): void {
  onlyOwner();
  generateEvent('Owner msg: hello you!');

  let bytes = Storage.get(stringToBytes('PX'));
  const callProxy = new Args(bytes).nextBool().expect('Cannot get PX');
  if (callProxy == true) {
    generateEvent('Owner msg using proxy!');
  }
}
