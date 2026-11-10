
import { steam, matchmaking, friends } from '@node-3d/steam-api';

try {
  steam.initEx();

  console.log('\n=== MATCHMAKING ===');
  console.log('Właściwości:', Object.keys(matchmaking));

  let proto = Object.getPrototypeOf(matchmaking);
  while (proto) {
    console.log(
      'Prototyp:',
      Object.getOwnPropertyNames(proto)
    );
    proto = Object.getPrototypeOf(proto);
  }

  console.log('\n=== FRIENDS ===');
  console.log('Właściwości:', Object.keys(friends));

  proto = Object.getPrototypeOf(friends);
  while (proto) {
    console.log(
      'Prototyp:',
      Object.getOwnPropertyNames(proto)
    );
    proto = Object.getPrototypeOf(proto);
  }

} catch (error) {
  console.error(error);
} finally {
  steam.shutdown();
}
