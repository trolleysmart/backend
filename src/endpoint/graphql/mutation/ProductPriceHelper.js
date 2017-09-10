// @flow

import { Map } from 'immutable';
import { ParseWrapperService } from 'micro-business-parse-server-common';
import { ProductPriceService, ShoppingListItemService } from 'trolley-smart-parse-server-common';

const getProductPriceById = async (id, sessionToken) => new ProductPriceService().read(id, null, sessionToken);

const addProductPriceToShoppingList = async (productPriceId, userId, acl, sessionToken) => {
  const productPrice = await getProductPriceById(productPriceId, sessionToken);

  await new ShoppingListItemService().create(
    Map({
      name: productPrice.get('name'),
      description: productPrice.get('description'),
      imageUrl: productPrice.get('imageUrl'),
      isPurchased: false,
      addedByUserId: userId,
      productPriceId,
      storeId: productPrice.get('storeId'),
      tagIds: productPrice.get('tagIds'),
    }),
    acl,
    sessionToken,
  );
};

const addProductPricesToShoppingList = async (productPriceIds, user, sessionToken) => {
  if (productPriceIds.isEmpty()) {
    return;
  }

  const acl = ParseWrapperService.createACL(user);
  const productPriceIdsWithoutDuplicate = productPriceIds
    .groupBy(_ => _)
    .map(_ => _.first())
    .valueSeq();

  await Promise.all(
    productPriceIdsWithoutDuplicate.map(async productPriceId => addProductPriceToShoppingList(productPriceId, user.id, acl, sessionToken)).toArray(),
  );
};

export default addProductPricesToShoppingList;
