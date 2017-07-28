// @flow

import { GraphQLID, GraphQLString, GraphQLNonNull } from 'graphql';
import { mutationWithClientMutationId } from 'graphql-relay';
import { removeStapleShoppingListItemsFromUserShoppingList } from './StapleShoppingListHelper';

export default mutationWithClientMutationId({
  name: 'RemoveStapleShoppingListItemsFromUserShoppingList',
  inputFields: {
    stapleShoppingListItemId: { type: new GraphQLNonNull(GraphQLID) },
  },
  outputFields: {
    errorMessage: {
      type: GraphQLString,
    },
  },
  mutateAndGetPayload: async ({ stapleShoppingListItemId }, request) =>
    removeStapleShoppingListItemsFromUserShoppingList(request.headers.authorization, stapleShoppingListItemId),
});
