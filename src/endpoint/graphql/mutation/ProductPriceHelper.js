// @flow

import Immutable, { List, Map } from 'immutable';
import { ParseWrapperService } from 'micro-business-parse-server-common';
import { ProductPriceService, ShoppingListItemService } from 'trolley-smart-parse-server-common';

const getProductPriceById = async (id, sessionToken) => new ProductPriceService().read(id, null, sessionToken);

const addProductPriceToShoppingList = async (productPriceId, userId, shoppingListId, acl, sessionToken) => {
  const productPrice = await getProductPriceById(productPriceId, sessionToken);

  return new ShoppingListItemService().create(
    Map({
      name: productPrice.get('name'),
      description: productPrice.get('description'),
      isPurchased: false,
      shoppingListId,
      addedByUserId: userId,
      productPriceId,
      storeId: productPrice.get('storeId'),
      tagIds: productPrice.get('tagIds'),
    }),
    acl,
    sessionToken,
  );
};

const addProductPricesToShoppingList = async (productPriceIds, user, shoppingListId, sessionToken) => {
  if (productPriceIds.isEmpty()) {
    return List();
  }

  const acl = ParseWrapperService.createACL(user);
  const productPriceIdsWithoutDuplicate = productPriceIds
    .groupBy(_ => _)
    .map(_ => _.first())
    .valueSeq();

  return Immutable.fromJS(
    await Promise.all(
      productPriceIdsWithoutDuplicate
        .map(async productPriceId => addProductPriceToShoppingList(productPriceId, user.id, shoppingListId, acl, sessionToken))
        .toArray(),
    ),
  );
};

export default addProductPricesToShoppingList;
