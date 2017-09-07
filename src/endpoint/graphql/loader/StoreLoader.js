// @flow

import { Map } from 'immutable';
import Dataloader from 'dataloader';
import { StoreService } from 'trolley-smart-parse-server-common';

const getCriteria = key =>
  Map({
    include_parentStore: true,
    conditions: Map({
      key,
    }),
  });

const storeLoader = new Dataloader(async (keys) => {
  const storeService = new StoreService();

  return Promise.all(
    keys.map(async (key) => {
      const stores = await storeService.search(getCriteria(key));

      if (stores.isEmpty()) {
        throw new Error(`Store not found with provided key: ${key}`);
      } else if (stores.count() > 1) {
        throw new Error(`Multiple store found with provided key: ${key}`);
      }

      return stores.first();
    }),
  );
});

export default storeLoader;
