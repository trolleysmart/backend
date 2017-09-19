// @flow

import { List, Map } from 'immutable';
import { GraphQLString, GraphQLNonNull } from 'graphql';
import { mutationWithClientMutationId } from 'graphql-relay';
import { UserService } from 'micro-business-parse-server-common';
import { ShoppingList, getShoppingLists } from '../type';
import { addShoppingList } from './ShoppingListHelper';

export default mutationWithClientMutationId({
  name: 'AddShoppingList',
  inputFields: {
    name: { type: new GraphQLNonNull(GraphQLString) },
  },
  outputFields: {
    errorMessage: {
      type: GraphQLString,
      resolve: _ => _.get('errorMessage'),
    },
    shoppingList: {
      type: ShoppingList.ShoppingListConnectionDefinition.edgeType,
      resolve: _ => _.get('shoppingList'),
    },
  },
  mutateAndGetPayload: async ({ name }, request) => {
    try {
      const sessionToken = request.headers.authorization;
      const user = await UserService.getUserForProvidedSessionToken(sessionToken);
      const shoppingListId = await addShoppingList(name, user, sessionToken);

      return Map({ shoppingList: (await getShoppingLists(Map({ shoppingListIds: List.of(shoppingListId) }), user.id, sessionToken)).edges[0] });
    } catch (ex) {
      return Map({ errorMessage: ex instanceof Error ? ex.message : ex });
    }
  },
});
