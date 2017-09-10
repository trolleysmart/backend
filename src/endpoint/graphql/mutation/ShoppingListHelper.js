// @flow

import Immutable, { Map } from 'immutable';
import { ShoppingListItemService } from 'trolley-smart-parse-server-common';

const getShoppingListItemById = async (id, userId, sessionToken) => new ShoppingListItemService().read(id, null, sessionToken);

const getAllShoppingListItemsContainProvidedProductPrice = async (productPriceId, userId, sessionToken) =>
  new ShoppingListItemService().search(
    Map({ conditions: Map({ productPriceId, addedByUser: userId, doesNotExist_removedByUser: true }) }),
    sessionToken,
  );

const getAllShoppingListItemsContainProvidedStapleItem = async (stapleItemId, userId, sessionToken) =>
  new ShoppingListItemService().search(
    Map({ conditions: Map({ stapleItemId, addedByUser: userId, doesNotExist_removedByUser: true }) }),
    sessionToken,
  );

const removeItemsFromShoppingList = async (shoppingListItemIds, user, sessionToken) => {
  if (shoppingListItemIds.isEmpty()) {
    return;
  }

  const shoppingListItems = Immutable.fromJS(
    await Promise.all(shoppingListItemIds.map(id => getShoppingListItemById(id, user.id, sessionToken)).toArray()),
  );
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
        productPriceIds.map(productPriceId => getAllShoppingListItemsContainProvidedProductPrice(productPriceId, user.id, sessionToken)).toArray(),
      ),
    );

    Promise.all(itemsToRemove.map(item => shoppingListItemService.update(item.set('removedByUser', user.id), sessionToken)).toArray());
  }

  if (!stapleItemIds.isEmpty()) {
    const itemsToRemove = Immutable.fromJS(
      await Promise.all(
        stapleItemIds.map(stapleItemId => getAllShoppingListItemsContainProvidedStapleItem(stapleItemId, user.id, sessionToken)).toArray(),
      ),
    );

    Promise.all(itemsToRemove.map(item => shoppingListItemService.update(item.set('removedByUser', user.id), sessionToken)).toArray());
  }
};

export default removeItemsFromShoppingList;
