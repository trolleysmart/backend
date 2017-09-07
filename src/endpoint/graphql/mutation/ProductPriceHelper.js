// @flow

import BluebirdPromise from 'bluebird';
import Immutable, { List, Map, Range } from 'immutable';
import { ParseWrapperService, UserService } from 'micro-business-parse-server-common';
import { MasterProductPriceService, ShoppingListService } from 'trolley-smart-parse-server-common';

const splitIntoChunks = (list, chunkSize) => Range(0, list.count(), chunkSize).map(chunkStart => list.slice(chunkStart, chunkStart + chunkSize));

const getMasterProductPriceById = async (sessionToken, id) => {
  const masterProductPriceCriteria = Map({
    includeStore: true,
    includeMasterProduct: true,
    id,
  });
  const masterProductPriceItems = await MasterProductPriceService.search(masterProductPriceCriteria, sessionToken);

  if (masterProductPriceItems.isEmpty()) {
    throw new Error('Provided product Id is invalid.');
  }

  return masterProductPriceItems.first();
};

const getAllShoppingListContainsSpecialItemId = async (sessionToken, userId, productPriceIds) => {
  const criteria = Map({
    conditions: Map({
      userId,
      masterProductPriceId: productPriceIds,
      excludeItemsMarkedAsDone: true,
      includeMasterProductPriceOnly: true,
    }),
  });
  const result = await ShoppingListService.searchAll(criteria, sessionToken);
  let shoppingListItems = List();

  try {
    result.event.subscribe((info) => {
      shoppingListItems = shoppingListItems.push(info);
    });

    await result.promise;
  } finally {
    result.event.unsubscribeAll();
  }

  return shoppingListItems;
};

const addProductPriceToUserShoppingList = async (userId, acl, sessionToken, productPriceIds) => {
  const masterProductPrice = await getMasterProductPriceById(sessionToken, productPriceIds);

  await ShoppingListService.create(Map({ userId, masterProductPriceId: productPriceIds, name: masterProductPrice.get('name') }), acl, sessionToken);

  const shoppingListItems = await getAllShoppingListContainsSpecialItemId(sessionToken, userId, productPriceIds);
  const offerEndDate = masterProductPrice.get('offerEndDate');

  return Map({
    shoppingListIds: shoppingListItems.map(item => item.get('id')),
    specialId: masterProductPrice.get('id'),
    name: masterProductPrice.getIn(['masterProduct', 'name']),
    description: masterProductPrice.getIn(['masterProduct', 'description']),
    imageUrl: masterProductPrice.getIn(['masterProduct', 'imageUrl']),
    barcode: masterProductPrice.getIn(['masterProduct', 'barcode']),
    size: masterProductPrice.getIn(['masterProduct', 'size']),
    specialType: masterProductPrice.getIn(['priceDetails', 'specialType']),
    priceToDisplay: masterProductPrice.get('priceToDisplay'),
    saving: masterProductPrice.get('saving'),
    savingPercentage: masterProductPrice.get('savingPercentage'),
    currentPrice: masterProductPrice.getIn(['priceDetails', 'currentPrice']),
    wasPrice: masterProductPrice.getIn(['priceDetails', 'wasPrice']),
    multiBuyInfo: masterProductPrice.getIn(['priceDetails', 'multiBuyInfo']),
    storeName: masterProductPrice.getIn(['store', 'name']),
    storeImageUrl: masterProductPrice.getIn(['store', 'imageUrl']),
    offerEndDate: offerEndDate ? offerEndDate.toISOString() : undefined,
    unitPrice: masterProductPrice.getIn(['priceDetails', 'unitPrice']),
    quantity: shoppingListItems.count(),
    status: masterProductPrice.get('status'),
  });
};

export const addProductPricesToUserShoppingList = async (sessionToken, productPriceIdss) => {
  if (productPriceIdss.isEmpty()) {
    return List();
  }

  const user = await UserService.getUserForProvidedSessionToken(sessionToken);
  const acl = ParseWrapperService.createACL(user);
  const userId = user.id;
  const productPriceIdssWithoutDuplicate = productPriceIdss
    .groupBy(_ => _)
    .map(_ => _.first())
    .valueSeq();

  return Immutable.fromJS(
    await Promise.all(
      productPriceIdssWithoutDuplicate.map(productPriceIds => addProductPriceToUserShoppingList(userId, acl, sessionToken, productPriceIds)),
    ),
  );
};

export const removeSpecialItemFromUserShoppingList = async (sessionToken, productPriceIds) => {
  try {
    const user = await UserService.getUserForProvidedSessionToken(sessionToken);
    const userId = user.id;
    const shoppingListItems = await getAllShoppingListContainsSpecialItemId(sessionToken, userId, productPriceIds);

    if (shoppingListItems.isEmpty()) {
      return {};
    }

    await ShoppingListService.update(shoppingListItems.first().set('doneDate', new Date()), sessionToken);

    if (shoppingListItems.count() === 1) {
      return {};
    }

    const masterProductPrice = await getMasterProductPriceById(sessionToken, productPriceIds);
    const offerEndDate = masterProductPrice.get('offerEndDate');

    return {
      item: Map({
        shoppingListIds: shoppingListItems.skip(1).map(item => item.get('id')),
        specialId: masterProductPrice.get('id'),
        name: masterProductPrice.getIn(['masterProduct', 'name']),
        description: masterProductPrice.getIn(['masterProduct', 'description']),
        imageUrl: masterProductPrice.getIn(['masterProduct', 'imageUrl']),
        barcode: masterProductPrice.getIn(['masterProduct', 'barcode']),
        size: masterProductPrice.getIn(['masterProduct', 'size']),
        specialType: masterProductPrice.getIn(['priceDetails', 'specialType']),
        priceToDisplay: masterProductPrice.get('priceToDisplay'),
        saving: masterProductPrice.get('saving'),
        savingPercentage: masterProductPrice.get('savingPercentage'),
        currentPrice: masterProductPrice.getIn(['priceDetails', 'currentPrice']),
        wasPrice: masterProductPrice.getIn(['priceDetails', 'wasPrice']),
        multiBuyInfo: masterProductPrice.getIn(['priceDetails', 'multiBuyInfo']),
        storeName: masterProductPrice.getIn(['store', 'name']),
        storeImageUrl: masterProductPrice.getIn(['store', 'imageUrl']),
        offerEndDate: offerEndDate ? offerEndDate.toISOString() : undefined,
        unitPrice: masterProductPrice.getIn(['priceDetails', 'unitPrice']),
        quantity: shoppingListItems.count() - 1,
        status: masterProductPrice.get('status'),
      }),
    };
  } catch (ex) {
    return { errorMessage: ex instanceof Error ? ex.message : ex };
  }
};

export const removeSpecialItemsFromUserShoppingList = async (sessionToken, productPriceIds) => {
  try {
    const user = await UserService.getUserForProvidedSessionToken(sessionToken);
    const userId = user.id;
    const shoppingListItems = await getAllShoppingListContainsSpecialItemId(sessionToken, userId, productPriceIds);

    if (shoppingListItems.isEmpty()) {
      return {};
    }

    const splittedShoppingListItems = splitIntoChunks(shoppingListItems, 100);
    await BluebirdPromise.each(splittedShoppingListItems.toArray(), chunck =>
      Promise.all(chunck.map(item => ShoppingListService.update(item.set('doneDate', new Date()), sessionToken))),
    );

    return {};
  } catch (ex) {
    return { errorMessage: ex instanceof Error ? ex.message : ex };
  }
};
