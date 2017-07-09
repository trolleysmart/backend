// @flow

import BluebirdPromise from 'bluebird';
import Immutable, { List, Map, Range } from 'immutable';
import { Exception } from 'micro-business-parse-server-common';
import { StapleShoppingListService, StapleTemplateShoppingListService, ShoppingListService } from 'smart-grocery-parse-server-common';

const splitIntoChunks = (list, chunkSize) => Range(0, list.count(), chunkSize).map(chunkStart => list.slice(chunkStart, chunkStart + chunkSize));

const removeNameInvalidCharacters = (name) => {
  if (name) {
    return Immutable.fromJS(name.replace(/\W/g, ' ').trim().split(' '))
      .map(_ => _.trim())
      .filter(_ => _.length > 0)
      .reduce((reduction, value) => `${reduction} ${value}`);
  }

  return '';
};

const getStapleShoppingListItems = async (userId, name) => {
  const criteria = Map({
    conditions: Map({
      userId,
      name: name.toLowerCase(),
    }),
  });

  return StapleShoppingListService.search(criteria);
};

const getStapleTemplateShoppingListItems = async (name) => {
  const criteria = Map({
    conditions: Map({
      name: name.toLowerCase(),
    }),
  });

  return StapleTemplateShoppingListService.search(criteria);
};

const getStapleShoppingListById = async (userId, id) => {
  const stapleShoppingListCriteria = Map({
    id,
    conditions: Map({
      userId,
    }),
  });
  const stapleShoppingListItems = await StapleShoppingListService.search(stapleShoppingListCriteria);

  if (stapleShoppingListItems.isEmpty()) {
    throw new Exception('Provided staple shopping list item Id is invalid.');
  }

  return stapleShoppingListItems.first();
};

const getAllShoppingListContainsStapleShoppingListItemId = async (userId, stapleShoppingListItemId) => {
  const criteria = Map({
    conditions: Map({
      userId,
      stapleShoppingListId: stapleShoppingListItemId,
      excludeItemsMarkedAsDone: true,
      includeStapleShoppingListOnly: true,
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

export const addStapleShoppingListItemToUserShoppingList = async (userId, stapleShoppingListItemId) => {
  try {
    const stapleShoppingList = await getStapleShoppingListById(userId, stapleShoppingListItemId);
    await ShoppingListService.create(Map({ userId, stapleShoppingListId: stapleShoppingListItemId, name: stapleShoppingList.get('name') }));
    const shoppingListItems = await getAllShoppingListContainsStapleShoppingListItemId(userId, stapleShoppingListItemId);

    return {
      item: Map({
        shoppingListIds: shoppingListItems.map(item => item.get('id')),
        stapleShoppingListId: stapleShoppingList.get('id'),
        name: stapleShoppingList.get('name'),
        quantity: shoppingListItems.count(),
      }),
    };
  } catch (ex) {
    return { errorMessage: ex instanceof Exception ? ex.getErrorMessage() : ex };
  }
};

export const addNewStapleShoppingListToShoppingList = async (userId, name) => {
  try {
    const trimmedName = removeNameInvalidCharacters(name);

    if (trimmedName.length === 0) {
      throw new Exception('Name is invalid.');
    }

    const stapleShoppingListItems = await getStapleShoppingListItems(userId, trimmedName);
    let stapleShoppingListItemId;

    if (stapleShoppingListItems.isEmpty()) {
      const stapleTemplateShoppingListItems = await getStapleTemplateShoppingListItems(trimmedName);

      if (stapleTemplateShoppingListItems.isEmpty()) {
        stapleShoppingListItemId = await StapleShoppingListService.create(Map({ userId, name }));
      } else {
        stapleShoppingListItemId = await StapleShoppingListService.create(stapleTemplateShoppingListItems.first().set('userId', userId));
      }
    } else {
      stapleShoppingListItemId = stapleShoppingListItems.first().get('id');
    }

    return await addStapleShoppingListItemToUserShoppingList(userId, stapleShoppingListItemId);
  } catch (ex) {
    return { errorMessage: ex instanceof Exception ? ex.getErrorMessage() : ex };
  }
};

export const removeStapleShoppingListItemFromUserShoppingList = async (userId, stapleShoppingListItemId) => {
  try {
    const shoppingListItems = await getAllShoppingListContainsStapleShoppingListItemId(userId, stapleShoppingListItemId);

    if (shoppingListItems.isEmpty()) {
      return {};
    }

    await ShoppingListService.update(shoppingListItems.first().set('doneDate', new Date()));

    if (shoppingListItems.count() === 1) {
      return {};
    }

    const stapleShoppingList = await getStapleShoppingListById(userId, stapleShoppingListItemId);

    return {
      item: Map({
        shoppingListIds: shoppingListItems.skip(1).map(item => item.get('id')),
        stapleShoppingListId: stapleShoppingList.get('id'),
        name: stapleShoppingList.get('name'),
        quantity: shoppingListItems.count() - 1,
      }),
    };
  } catch (ex) {
    return { errorMessage: ex instanceof Exception ? ex.getErrorMessage() : ex };
  }
};

export const removeStapleShoppingListItemsFromUserShoppingList = async (userId, stapleShoppingListItemId) => {
  try {
    const shoppingListItems = await getAllShoppingListContainsStapleShoppingListItemId(userId, stapleShoppingListItemId);

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
