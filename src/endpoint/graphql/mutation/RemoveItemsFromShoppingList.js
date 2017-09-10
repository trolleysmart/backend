// @flow

import Immutable, { List, Map } from 'immutable';
import { GraphQLID, GraphQLList, GraphQLString, GraphQLNonNull } from 'graphql';
import { mutationWithClientMutationId } from 'graphql-relay';
import { UserService } from 'micro-business-parse-server-common';
import { ShoppingListItem, getAllShoppingListItems } from '../type';
import removeItemsFromShoppingList from './ShoppingListHelper';

export default mutationWithClientMutationId({
  name: 'RemoveItemsFromShoppingList',
  inputFields: {
    shoppingListItemIds: { type: new GraphQLList(new GraphQLNonNull(GraphQLID)) },
  },
  outputFields: {
    errorMessage: {
      type: GraphQLString,
      resolve: _ => _.get('errorMessage'),
    },
    shoppingListItems: {
      type: new GraphQLList(ShoppingListItem.ShoppingListItemType),
      resolve: _ => _.get('shoppingListItems'),
    },
  },
  mutateAndGetPayload: async ({ shoppingListItemIds }, request) => {
    try {
      const sessionToken = request.headers.authorization;
      const userId = (await UserService.getUserForProvidedSessionToken(sessionToken)).id;

      await removeItemsFromShoppingList(shoppingListItemIds ? Immutable.fromJS(shoppingListItemIds) : List(), userId, sessionToken);

      return Map({ shoppingListItems: await getAllShoppingListItems(Map(), userId, sessionToken) });
    } catch (ex) {
      return Map({ errorMessage: ex instanceof Error ? ex.message : ex });
    }
  },
});
