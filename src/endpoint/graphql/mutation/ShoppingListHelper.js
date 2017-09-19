// @flow

import Immutable, { Map } from 'immutable';
import { ParseWrapperService } from 'micro-business-parse-server-common';
import { ShoppingListService, ShoppingListItemService } from 'trolley-smart-parse-server-common';

const getShoppingListItemById = async (id, sessionToken) => new ShoppingListItemService().read(id, null, sessionToken);

const getAllShoppingListItemsContainProvidedProductPrice = async (productPriceId, userId, sessionToken) =>
  new ShoppingListItemService().search(
    Map({ conditions: Map({ productPriceId, addedByUserId: userId, doesNotExist_removedByUser: true }) }),
    sessionToken,
  );

const getAllShoppingListItemsContainProvidedStapleItem = async (stapleItemId, userId, sessionToken) =>
  new ShoppingListItemService().search(
    Map({ conditions: Map({ stapleItemId, addedByUserId: userId, doesNotExist_removedByUser: true }) }),
    sessionToken,
  );

export const removeItemsFromShoppingList = async (shoppingListItemIds, userId, sessionToken) => {
  if (shoppingListItemIds.isEmpty()) {
    return;
  }

  const shoppingListItems = Immutable.fromJS(await Promise.all(shoppingListItemIds.map(id => getShoppingListItemById(id, sessionToken)).toArray()));
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
        productPriceIds.map(productPriceId => getAllShoppingListItemsContainProvidedProductPrice(productPriceId, userId, sessionToken)).toArray(),
      ),
    ).flatMap(_ => _);

    await Promise.all(itemsToRemove.map(item => shoppingListItemService.update(item.set('removedByUserId', userId), sessionToken)).toArray());
  }

  if (!stapleItemIds.isEmpty()) {
    const itemsToRemove = Immutable.fromJS(
      await Promise.all(
        stapleItemIds.map(stapleItemId => getAllShoppingListItemsContainProvidedStapleItem(stapleItemId, userId, sessionToken)).toArray(),
      ),
    ).flatMap(_ => _);

    await Promise.all(itemsToRemove.map(item => shoppingListItemService.update(item.set('removedByUserId', userId), sessionToken)).toArray());
  }
};

export const addShoppingList = async (name, user, sessionToken) =>
  new ShoppingListService().create(Map({ name, user, status: 'A' }), ParseWrapperService.createACL(user), sessionToken);

export const removeShoppingList = async (shoppingListId, sessionToken) => {
  const shoppingListService = new ShoppingListService();
  const shoppingList = await shoppingListService.read(shoppingListId, sessionToken);

  return shoppingListService.update(shoppingList.set('status', 'I'), sessionToken);
};
