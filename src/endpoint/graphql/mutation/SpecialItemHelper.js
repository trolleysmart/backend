// @flow

import BluebirdPromise from 'bluebird';
import { List, Map, Range } from 'immutable';
import { Exception } from 'micro-business-parse-server-common';
import { MasterProductPriceService, ShoppingListService } from 'smart-grocery-parse-server-common';

const splitIntoChunks = (list, chunkSize) => Range(0, list.count(), chunkSize).map(chunkStart => list.slice(chunkStart, chunkStart + chunkSize));

const getMasterProductPriceById = async (id) => {
  const masterProductPriceCriteria = Map({
    includeStore: true,
    includeMasterProduct: true,
    id,
  });
  const masterProductPriceItems = await MasterProductPriceService.search(masterProductPriceCriteria);

  if (masterProductPriceItems.isEmpty()) {
    throw new Exception('Provided special item Id is invalid.');
  }

  return masterProductPriceItems.first();
};

const getAllShoppingListContainsSpecialItemId = async (userId, specialItemId) => {
  const criteria = Map({
    conditions: Map({
      userId,
      masterProductPriceId: specialItemId,
      excludeItemsMarkedAsDone: true,
      includeMasterProductPriceOnly: true,
    }),
  });

  const result = await ShoppingListService.searchAll(criteria);
  let shoppingListItems = List();

  try {
    result.event.subscribe(info => (shoppingListItems = shoppingListItems.push(info)));

    await result.promise;
  } finally {
    result.event.unsubscribeAll();
  }

  return shoppingListItems;
};

export const addSpecialItemToUserShoppingList = async (userId, specialItemId) => {
  try {
    const masterProductPrice = await getMasterProductPriceById(specialItemId);

    await ShoppingListService.create(Map({ userId, masterProductPriceId: specialItemId, name: masterProductPrice.get('name') }));

    const shoppingListItems = await getAllShoppingListContainsSpecialItemId(userId, specialItemId);
    const offerEndDate = masterProductPrice.getIn(['priceDetails', 'offerEndDate']);

    return {
      item: Map({
        shoppingListIds: shoppingListItems.map(item => item.get('id')),
        specialId: masterProductPrice.get('id'),
        name: masterProductPrice.getIn(['masterProduct', 'name']),
        description: masterProductPrice.getIn(['masterProduct', 'description']),
        imageUrl: masterProductPrice.getIn(['masterProduct', 'imageUrl']),
        barcode: masterProductPrice.getIn(['masterProduct', 'barcode']),
        size: masterProductPrice.getIn(['masterProduct', 'size']),
        specialType: masterProductPrice.getIn(['priceDetails', 'specialType']),
        priceToDisplay: masterProductPrice.get('priceToDisplay'),
        currentPrice: masterProductPrice.getIn(['priceDetails', 'currentPrice']),
        wasPrice: masterProductPrice.getIn(['priceDetails', 'wasPrice']),
        multiBuyInfo: masterProductPrice.getIn(['priceDetails', 'multiBuyInfo']),
        storeName: masterProductPrice.getIn(['store', 'name']),
        storeImageUrl: masterProductPrice.getIn(['store', 'imageUrl']),
        offerEndDate: offerEndDate ? offerEndDate.toISOString() : undefined,
        unitPrice: masterProductPrice.getIn(['priceDetails', 'unitPrice']),
        quantity: shoppingListItems.count(),
        status: masterProductPrice.get('status'),
      }),
    };
  } catch (ex) {
    return { errorMessage: ex instanceof Exception ? ex.getErrorMessage() : ex };
  }
};

export const removeSpecialItemFromUserShoppingList = async (userId, specialItemId) => {
  try {
    const shoppingListItems = await getAllShoppingListContainsSpecialItemId(userId, specialItemId);

    if (shoppingListItems.isEmpty()) {
      return {};
    }

    await ShoppingListService.update(shoppingListItems.first().set('doneDate', new Date()));

    if (shoppingListItems.count() === 1) {
      return {};
    }

    const masterProductPrice = await getMasterProductPriceById(specialItemId);
    const offerEndDate = masterProductPrice.getIn(['priceDetails', 'offerEndDate']);

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
    return { errorMessage: ex instanceof Exception ? ex.getErrorMessage() : ex };
  }
};

export const removeSpecialItemsFromUserShoppingList = async (userId, specialItemId) => {
  try {
    const shoppingListItems = await getAllShoppingListContainsSpecialItemId(userId, specialItemId);

    if (shoppingListItems.isEmpty()) {
      return {};
    }

    const splittedShoppingListItems = splitIntoChunks(shoppingListItems, 100);
    await BluebirdPromise.each(splittedShoppingListItems.toArray(), chunck =>
      Promise.all(chunck.map(item => ShoppingListService.update(item.set('doneDate', new Date())))),
    );

    return {};
  } catch (ex) {
    return { errorMessage: ex instanceof Exception ? ex.getErrorMessage() : ex };
  }
};
