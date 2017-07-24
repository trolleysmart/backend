// @flow

import BluebirdPromise from 'bluebird';
import Immutable, { List, Map, Range } from 'immutable';
import { Exception, ParseWrapperService, UserService } from 'micro-business-parse-server-common';
import { StapleShoppingListService, StapleTemplateShoppingListService, ShoppingListService } from 'smart-grocery-parse-server-common';

const splitIntoChunks = (list, chunkSize) => Range(0, list.count(), chunkSize).map(chunkStart => list.slice(chunkStart, chunkStart + chunkSize));

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

const getStapleShoppingListItems = async (sessionToken, userId, name) => {
  const criteria = Map({
    conditions: Map({
      userId,
      name,
    }),
  });

  return StapleShoppingListService.search(criteria, sessionToken);
};

const getStapleTemplateShoppingListItems = async (sessionToken, name) => {
  const criteria = Map({
    conditions: Map({
      name,
    }),
  });

  return StapleTemplateShoppingListService.search(criteria, sessionToken);
};

const getStapleShoppingListById = async (sessionToken, userId, id) => {
  const stapleShoppingListCriteria = Map({
    id,
    conditions: Map({
      userId,
    }),
  });
  const stapleShoppingListItems = await StapleShoppingListService.search(stapleShoppingListCriteria, sessionToken);

  if (stapleShoppingListItems.isEmpty()) {
    throw new Exception('Provided staple shopping list item Id is invalid.');
  }

  return stapleShoppingListItems.first();
};

const getAllShoppingListContainsStapleShoppingListItemId = async (sessionToken, userId, stapleShoppingListItemId) => {
  const criteria = Map({
    conditions: Map({
      userId,
      stapleShoppingListId: stapleShoppingListItemId,
      excludeItemsMarkedAsDone: true,
      includeStapleShoppingListOnly: true,
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

export const addStapleShoppingListItemToUserShoppingList = async (sessionToken, userId, stapleShoppingListItemId) => {
  try {
    const stapleShoppingList = await getStapleShoppingListById(sessionToken, userId, stapleShoppingListItemId);
    const user = await UserService.getUserForProvidedSessionToken(sessionToken);
    const acl = ParseWrapperService.createACL(user);

    await ShoppingListService.create(
      Map({ userId, stapleShoppingListId: stapleShoppingListItemId, name: stapleShoppingList.get('name') }),
      acl,
      sessionToken,
    );
    const shoppingListItems = await getAllShoppingListContainsStapleShoppingListItemId(sessionToken, userId, stapleShoppingListItemId);

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

export const addNewStapleShoppingListToShoppingList = async (sessionToken, userId, name) => {
  try {
    const trimmedName = removeNameInvalidCharacters(name);

    if (trimmedName.length === 0) {
      throw new Exception('Name is invalid.');
    }

    const stapleShoppingListItems = await getStapleShoppingListItems(sessionToken, userId, trimmedName);
    let stapleShoppingListItemId;

    if (stapleShoppingListItems.isEmpty()) {
      const stapleTemplateShoppingListItems = await getStapleTemplateShoppingListItems(sessionToken, trimmedName);
      const user = await UserService.getUserForProvidedSessionToken(sessionToken);
      const acl = ParseWrapperService.createACL(user);

      if (stapleTemplateShoppingListItems.isEmpty()) {
        stapleShoppingListItemId = await StapleShoppingListService.create(Map({ userId, name }), acl, sessionToken);
      } else {
        stapleShoppingListItemId = await StapleShoppingListService.create(
          stapleTemplateShoppingListItems.first().set('userId', userId),
          acl,
          sessionToken,
        );
      }
    } else {
      stapleShoppingListItemId = stapleShoppingListItems.first().get('id');
    }

    return await addStapleShoppingListItemToUserShoppingList(sessionToken, userId, stapleShoppingListItemId);
  } catch (ex) {
    return { errorMessage: ex instanceof Exception ? ex.getErrorMessage() : ex };
  }
};

export const removeStapleShoppingListItemFromUserShoppingList = async (sessionToken, userId, stapleShoppingListItemId) => {
  try {
    const shoppingListItems = await getAllShoppingListContainsStapleShoppingListItemId(sessionToken, userId, stapleShoppingListItemId);

    if (shoppingListItems.isEmpty()) {
      return {};
    }

    await ShoppingListService.update(shoppingListItems.first().set('doneDate', new Date()), sessionToken);

    if (shoppingListItems.count() === 1) {
      return {};
    }

    const stapleShoppingList = await getStapleShoppingListById(sessionToken, userId, stapleShoppingListItemId);

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

export const removeStapleShoppingListItemsFromUserShoppingList = async (sessionToken, userId, stapleShoppingListItemId) => {
  try {
    const shoppingListItems = await getAllShoppingListContainsStapleShoppingListItemId(sessionToken, userId, stapleShoppingListItemId);

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
