// @flow

import Immutable, { List, Map } from 'immutable';
import { ParseWrapperService } from 'micro-business-parse-server-common';
import { StapleItemService, StapleTemplateItemService, ShoppingListItemService } from 'trolley-smart-parse-server-common';

const removeNameInvalidCharacters = (name) => {
  if (name) {
    const trimmedName = name.trim();

    if (trimmedName.length === 0) {
      return trimmedName;
    }

    return Immutable.fromJS(trimmedName.split(' '))
      .map(_ => _.trim())
      .filter(_ => _.length > 0)
      .reduce((reduction, value) => `${reduction} ${value}`);
  }

  return '';
};

const getStapleItems = async (name, userId, sessionToken) => new StapleItemService().search(Map({ conditions: Map({ userId, name }) }), sessionToken);

const getStapleTemplateItems = async (name, sessionToken) => new StapleTemplateItemService().search(Map({ conditions: Map({ name }) }), sessionToken);

const getStapleItemById = async (id, sessionToken) => new StapleItemService().read(id, null, sessionToken);

const addStapleItemToShoppingList = async (stapleItemId, userId, shoppingListId, acl, sessionToken) => {
  const stapleItem = await getStapleItemById(stapleItemId, sessionToken);

  return new ShoppingListItemService().create(
    Map({
      name: stapleItem.get('name'),
      description: stapleItem.get('description'),
      imageUrl: stapleItem.get('imageUrl'),
      isPurchased: false,
      shoppingListId,
      addedByUserId: userId,
      stapleItemId,
      tagIds: stapleItem.get('tagIds'),
    }),
    acl,
    sessionToken,
  );
};

export const addStapleItemsToShoppingList = async (stapleItemIds, user, shoppingListId, sessionToken) => {
  if (stapleItemIds.isEmpty()) {
    return List();
  }

  const acl = ParseWrapperService.createACL(user);
  const stapleItemIdsWithoutDuplicate = stapleItemIds
    .groupBy(_ => _)
    .map(_ => _.first())
    .valueSeq();

  return Immutable.fromJS(
    await Promise.all(
      stapleItemIdsWithoutDuplicate
        .map(async stapleItemId => addStapleItemToShoppingList(stapleItemId, user.id, shoppingListId, acl, sessionToken))
        .toArray(),
    ),
  );
};

export const addNewStapleItemsToShoppingList = async (names, user, shoppingListId, sessionToken) => {
  if (names.isEmpty()) {
    return List();
  }

  const trimmedNamesWithoutDuplicate = names
    .map(removeNameInvalidCharacters)
    .groupBy(_ => _.toLowerCase())
    .map(_ => _.first())
    .valueSeq()
    .filter(_ => _.length > 0);

  if (trimmedNamesWithoutDuplicate.isEmpty()) {
    return List();
  }

  const acl = ParseWrapperService.createACL(user);
  const stapleItemService = new StapleItemService();

  return Immutable.fromJS(
    await Promise.all(
      trimmedNamesWithoutDuplicate
        .map(async (name) => {
          const stapleItems = await getStapleItems(name, user.id, sessionToken);
          let stapleItemId;

          if (stapleItems.isEmpty()) {
            const stapleTemplateItems = await getStapleTemplateItems(name, sessionToken);

            if (stapleTemplateItems.isEmpty()) {
              stapleItemId = await stapleItemService.create(Map({ userId: user.id, name, addedByUser: true }), acl, sessionToken);
            } else {
              const stapleTemplateItem = stapleTemplateItems.first();

              stapleItemId = await stapleItemService.create(
                Map({
                  name: stapleTemplateItem.get('name'),
                  description: stapleTemplateItem.get('description'),
                  imageUrl: stapleTemplateItem.get('imageUrl'),
                  userId: user.id,
                }),
                acl,
                sessionToken,
              );
            }
          } else {
            stapleItemId = stapleItems.first().get('id');
          }

          return addStapleItemToShoppingList(stapleItemId, user.id, shoppingListId, acl, sessionToken);
        })
        .toArray(),
    ),
  );
};
