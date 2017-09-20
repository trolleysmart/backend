// @flow

import { List, Map } from 'immutable';
import { GraphQLID, GraphQLString, GraphQLNonNull } from 'graphql';
import { mutationWithClientMutationId } from 'graphql-relay';
import { UserService } from 'micro-business-parse-server-common';
import { ShoppingList, getShoppingLists } from '../type';
import { updateShoppingList } from './ShoppingListHelper';

export default mutationWithClientMutationId({
  name: 'UpdateShoppingList',
  inputFields: {
    shoppingListId: { type: new GraphQLNonNull(GraphQLID) },
    name: { type: GraphQLString },
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
  mutateAndGetPayload: async ({ shoppingListId, name }, request) => {
    try {
      const sessionToken = request.headers.authorization;
      const user = await UserService.getUserForProvidedSessionToken(sessionToken);

      await updateShoppingList(shoppingListId, name, sessionToken);
      return Map({ shoppingList: (await getShoppingLists(Map({ shoppingListIds: List.of(shoppingListId) }), user.id, sessionToken)).edges[0] });
    } catch (ex) {
      return Map({ errorMessage: ex instanceof Error ? ex.message : ex });
    }
  },
});
