// @flow

import { Map } from 'immutable';
import { GraphQLID, GraphQLString, GraphQLNonNull } from 'graphql';
import { mutationWithClientMutationId } from 'graphql-relay';
import { removeShoppingList } from './ShoppingListHelper';

export default mutationWithClientMutationId({
  name: 'RemoveShoppingList',
  inputFields: {
    shoppingListId: { type: new GraphQLNonNull(GraphQLID) },
  },
  outputFields: {
    errorMessage: {
      type: GraphQLString,
      resolve: _ => _.get('errorMessage'),
    },
  },
  mutateAndGetPayload: async ({ shoppingListId }, request) => {
    try {
      const sessionToken = request.headers.authorization;

      await removeShoppingList(shoppingListId, sessionToken);

      return Map();
    } catch (ex) {
      return Map({ errorMessage: ex instanceof Error ? ex.message : ex });
    }
  },
});
