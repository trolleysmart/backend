// @flow

import BluebirdPromise from 'bluebird';
import Immutable, { List, Map, Range } from 'immutable';
import { Exception, ParseWrapperService, UserService } from 'micro-business-parse-server-common';
import { StapleShoppingListService, StapleTemplateShoppingListService, ShoppingListService } from 'trolley-smart-parse-server-common';

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
    result.event.subscribe((info) => {
      shoppingListItems = shoppingListItems.push(info);
    });

    await result.promise;
  } finally {
    result.event.unsubscribeAll();
  }

  return shoppingListItems;
};

export const addStapleShoppingListItemToUserShoppingList = async (sessionToken, stapleShoppingListItemId) => {
  try {
    const user = await UserService.getUserForProvidedSessionToken(sessionToken);
    const acl = ParseWrapperService.createACL(user);
    const userId = user.id;
    const stapleShoppingList = await getStapleShoppingListById(sessionToken, userId, stapleShoppingListItemId);

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

export const addNewStapleShoppingListToShoppingList = async (sessionToken, names) => {
  try {
    const trimmedNames = names
      .map(removeNameInvalidCharacters)
      .groupBy(_ => _.toLowerCase())
      .map(_ => _.first())
      .valueSeq()
      .filter(_ => _.length > 0);

    if (trimmedNames.isEmpty()) {
      throw new Exception('Names is invalid.');
    }

    const user = await UserService.getUserForProvidedSessionToken(sessionToken);
    const userId = user.id;
    const results = Immutable.fromJS(
      await Promise.all(
        trimmedNames
          .map(async (trimmedName) => {
            const stapleShoppingListItems = await getStapleShoppingListItems(sessionToken, userId, trimmedName);
            let stapleShoppingListItemId;

            if (stapleShoppingListItems.isEmpty()) {
              const acl = ParseWrapperService.createACL(user);
              const stapleTemplateShoppingListItems = await getStapleTemplateShoppingListItems(sessionToken, trimmedName);

              if (stapleTemplateShoppingListItems.isEmpty()) {
                stapleShoppingListItemId = await StapleShoppingListService.create(Map({ userId, name: trimmedName }), acl, sessionToken);
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

            return addStapleShoppingListItemToUserShoppingList(sessionToken, stapleShoppingListItemId);
          })
          .toArray(),
      ),
    );

    const errors = results.filter(result => result.errorMessage);

    if (!errors.isEmpty()) {
      return errors.first();
    }

    return results.toJS();
  } catch (ex) {
    return { errorMessage: ex instanceof Exception ? ex.getErrorMessage() : ex };
  }
};

export const removeStapleShoppingListItemFromUserShoppingList = async (sessionToken, stapleShoppingListItemId) => {
  try {
    const user = await UserService.getUserForProvidedSessionToken(sessionToken);
    const userId = user.id;
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

export const removeStapleShoppingListItemsFromUserShoppingList = async (sessionToken, stapleShoppingListItemId) => {
  try {
    const user = await UserService.getUserForProvidedSessionToken(sessionToken);
    const userId = user.id;
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
