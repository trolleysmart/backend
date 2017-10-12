// @flow

import { StapleTemplateItemService } from 'trolley-smart-parse-server-common';

Parse.Cloud.afterSave('_User', async (request) => {
  if (request.object.createdAt !== request.object.updatedAt) {
    return;
  }

  const { log } = request;
  const user = request.object;
  const userId = user.id;

  try {
    log.info(`Cloning staple template shopping list for user: ${userId}...`);

    await new StapleTemplateItemService().cloneStapleTemplateItems(user);

    log.info(`Successfully cloned staple template shopping list for user: ${userId}`);
  } catch (ex) {
    const errorMessage = ex instanceof Error ? ex.message : ex;

    log.error(`Failed to clone staple shopping list for userId: ${userId}. Error message: ${errorMessage}`);
  }
});
