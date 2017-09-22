// @flow

import Immutable, { Map } from 'immutable';
import { ParseWrapperService } from 'micro-business-parse-server-common';
import { ShoppingListService, ShoppingListItemService } from 'trolley-smart-parse-server-common';

const getShoppingListItemById = async (id, sessionToken) => new ShoppingListItemService().read(id, null, sessionToken);

const getAllShoppingListItemsContainProvidedProductPrice = async (productPriceId, shoppingListId, sessionToken) =>
  new ShoppingListItemService().search(Map({ conditions: Map({ productPriceId, shoppingListId, doesNotExist_removedByUser: true }) }), sessionToken);

const getAllShoppingListItemsContainProvidedStapleItem = async (stapleItemId, shoppingListId, sessionToken) =>
  new ShoppingListItemService().search(Map({ conditions: Map({ stapleItemId, shoppingListId, doesNotExist_removedByUser: true }) }), sessionToken);

export const getShoppingListById = async (id, sessionToken) => new ShoppingListService().read(id, null, sessionToken);

export const removeItemsFromShoppingList = async (shoppingListItemIds, userId, shoppingListId, sessionToken) => {
  if (shoppingListItemIds.isEmpty()) {
    return;
  }

  const shoppingListItems = Immutable.fromJS(
    await Promise.all(shoppingListItemIds.map(id => getShoppingListItemById(id, sessionToken)).toArray()),
  ).filter(shoppingListItem => shoppingListItem.get('shoppingListId').localeCompare(shoppingListId) === 0);
  const productPriceIds = shoppingListItems
    .filter(_ => _.get('productPriceId'))
    .map(_ => _.get('productPriceId'))
    .groupBy(_ => _)
    .map(_ => _.first())
    .valueSeq()
    .toList();
  const stapleItemIds = shoppingListItems
    .filter(_ => _.get('stapleItemId'))
    .map(_ => _.get('stapleItemId'))
    .groupBy(_ => _)
    .map(_ => _.first())
    .valueSeq()
    .toList();

  const shoppingListItemService = new ShoppingListItemService();

  if (!productPriceIds.isEmpty()) {
    const itemsToRemove = Immutable.fromJS(
      await Promise.all(
        productPriceIds
          .map(productPriceId => getAllShoppingListItemsContainProvidedProductPrice(productPriceId, shoppingListId, sessionToken))
          .toArray(),
      ),
    ).flatMap(_ => _);

    await Promise.all(itemsToRemove.map(item => shoppingListItemService.update(item.set('removedByUserId', userId), sessionToken)).toArray());
  }

  if (!stapleItemIds.isEmpty()) {
    const itemsToRemove = Immutable.fromJS(
      await Promise.all(
        stapleItemIds.map(stapleItemId => getAllShoppingListItemsContainProvidedStapleItem(stapleItemId, shoppingListId, sessionToken)).toArray(),
      ),
    ).flatMap(_ => _);

    await Promise.all(itemsToRemove.map(item => shoppingListItemService.update(item.set('removedByUserId', userId), sessionToken)).toArray());
  }
};

export const addShoppingList = async (name, user, sessionToken) =>
  new ShoppingListService().create(Map({ name, user, status: 'A' }), ParseWrapperService.createACL(user), sessionToken);

export const updateShoppingList = async (shoppingListId, name, sessionToken) => {
  const shoppingListService = new ShoppingListService();
  const shoppingList = await shoppingListService.read(shoppingListId, null, sessionToken);

  if (!name) {
    return shoppingList;
  }

  return shoppingListService.update(shoppingList.set('name', name), sessionToken);
};

export const removeShoppingList = async (shoppingListId, sessionToken) => {
  const shoppingListService = new ShoppingListService();
  const shoppingList = await shoppingListService.read(shoppingListId, null, sessionToken);

  return shoppingListService.update(shoppingList.set('status', 'I'), sessionToken);
};
