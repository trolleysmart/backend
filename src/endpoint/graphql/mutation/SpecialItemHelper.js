// @flow

import BluebirdPromise from 'bluebird';
import { List, Map, Range } from 'immutable';
import { Exception, ParseWrapperService, UserService } from 'micro-business-parse-server-common';
import { MasterProductPriceService, ShoppingListService } from 'smart-grocery-parse-server-common';

const splitIntoChunks = (list, chunkSize) => Range(0, list.count(), chunkSize).map(chunkStart => list.slice(chunkStart, chunkStart + chunkSize));

const getMasterProductPriceById = async (sessionToken, id) => {
  const masterProductPriceCriteria = Map({
    includeStore: true,
    includeMasterProduct: true,
    id,
  });
  const masterProductPriceItems = await MasterProductPriceService.search(masterProductPriceCriteria, sessionToken);

  if (masterProductPriceItems.isEmpty()) {
    throw new Exception('Provided special item Id is invalid.');
  }

  return masterProductPriceItems.first();
};

const getAllShoppingListContainsSpecialItemId = async (sessionToken, userId, specialItemId) => {
  const criteria = Map({
    conditions: Map({
      userId,
      masterProductPriceId: specialItemId,
      excludeItemsMarkedAsDone: true,
      includeMasterProductPriceOnly: true,
    }),
  });
  const result = await ShoppingListService.searchAll(criteria, sessionToken);
  let shoppingListItems = List();

  try {
    result.event.subscribe(info => (shoppingListItems = shoppingListItems.push(info)));

    await result.promise;
  } finally {
    result.event.unsubscribeAll();
  }

  return shoppingListItems;
};

export const addSpecialItemToUserShoppingList = async (sessionToken, userId, specialItemId) => {
  try {
    console.log(`--------------------- 1) ${sessionToken}`);
    const masterProductPrice = await getMasterProductPriceById(sessionToken, specialItemId);
    const user = await UserService.getUserForProvidedSessionToken(sessionToken);
    console.log(`--------------------- 2) ${user}`);
    const acl = ParseWrapperService.createACL(user);
    console.log(`--------------------- 3) ${acl}`);

    await ShoppingListService.create(Map({ userId, masterProductPriceId: specialItemId, name: masterProductPrice.get('name') }), acl, sessionToken);

    const shoppingListItems = await getAllShoppingListContainsSpecialItemId(sessionToken, userId, specialItemId);
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

export const removeSpecialItemFromUserShoppingList = async (sessionToken, userId, specialItemId) => {
  try {
    const shoppingListItems = await getAllShoppingListContainsSpecialItemId(sessionToken, userId, specialItemId);

    if (shoppingListItems.isEmpty()) {
      return {};
    }

    await ShoppingListService.update(shoppingListItems.first().set('doneDate', new Date()), sessionToken);

    if (shoppingListItems.count() === 1) {
      return {};
    }

    const masterProductPrice = await getMasterProductPriceById(sessionToken, specialItemId);
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

export const removeSpecialItemsFromUserShoppingList = async (sessionToken, userId, specialItemId) => {
  try {
    const shoppingListItems = await getAllShoppingListContainsSpecialItemId(sessionToken, userId, specialItemId);

    if (shoppingListItems.isEmpty()) {
      return {};
    }

    const splittedShoppingListItems = splitIntoChunks(shoppingListItems, 100);
    await BluebirdPromise.each(splittedShoppingListItems.toArray(), chunck =>
      Promise.all(chunck.map(item => ShoppingListService.update(item.set('doneDate', new Date()), sessionToken))),
    );

    return {};
  } catch (ex) {
    return { errorMessage: ex instanceof Exception ? ex.getErrorMessage() : ex };
  }
};
