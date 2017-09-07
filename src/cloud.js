// @flow

import { Map } from 'immutable';
import { ParseWrapperService } from 'micro-business-parse-server-common';
import { StapleItemService, StapleTemplateItemService } from 'trolley-smart-parse-server-common';

Parse.Cloud.afterSave('_User', async (request) => {
  if (request.object.createdAt !== request.object.updatedAt) {
    return;
  }

  const log = request.log;
  const user = request.object;
  const userId = user.id;

  try {
    log.info(`Cloning staple template shopping list for user: ${userId}...`);

    const acl = ParseWrapperService.createACL(user);
    const stapleTemplateItems = await new StapleTemplateItemService().search(Map({ limit: 1000 }));
    const stapleItemService = new StapleItemService();

    await Promise.all(
      stapleTemplateItems
        .map(stapleTemplateItem =>
          stapleItemService.create(stapleTemplateItem.merge({ userId, stapleTemplateItemId: stapleTemplateItem.get('id') }), acl),
        )
        .toArray(),
    );

    log.info(`Successfully cloned staple template shopping list for user: ${userId}`);
  } catch (ex) {
    const errorMessage = ex instanceof Error ? ex.message : ex;

    log.error(`Failed to clone staple shopping list for userId: ${userId}. Error message: ${errorMessage}`);
  }
});
