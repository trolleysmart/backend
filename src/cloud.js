// @flow

import { Exception, ParseWrapperService } from 'micro-business-parse-server-common';
import { StapleShoppingListService } from 'smart-grocery-parse-server-common';

Parse.Cloud.afterSave('_User', async (request) => {
  if (request.original) {
    return;
  }

  // eslint-disable-line no-undef
  const log = request.log;
  const user = request.object;
  const userId = user.id;

  try {
    log.info(`Cloning staple template shopping list for user: ${userId}...`);

    const acl = ParseWrapperService.createACL(user);

    await StapleShoppingListService.cloneStapleShoppingList(userId, acl);

    log.info(`Successfully cloned staple template shopping list for user: ${userId}`);
  } catch (ex) {
    const errorMessage = ex instanceof Exception ? ex.getErrorMessage() : ex;

    log.error(`Failed to clone stapel shopping list for userId: ${userId}. Error message: ${errorMessage}`);
  }
});
