// @flow

import { Map } from 'immutable';
import Dataloader from 'dataloader';
import { TagService } from 'trolley-smart-parse-server-common';

const getCriteria = key =>
  Map({
    include_parentTag: true,
    conditions: Map({
      key,
    }),
  });

const tagLoader = new Dataloader(async (keys) => {
  const tagService = new TagService();

  return Promise.all(
    keys.map(async (key) => {
      const tags = await tagService.search(getCriteria(key));

      if (tags.isEmpty()) {
        throw new Error(`Tag not found with provided key: ${key}`);
      } else if (tags.count() > 1) {
        throw new Error(`Multiple tag found with provided key: ${key}`);
      }

      return tags.first();
    }),
  );
});

export default tagLoader;
