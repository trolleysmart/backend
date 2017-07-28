// @flow

import { GraphQLID, GraphQLString, GraphQLNonNull } from 'graphql';
import { mutationWithClientMutationId } from 'graphql-relay';
import { ShoppingList } from '../type';
import { addStapleShoppingListItemToUserShoppingList } from './StapleShoppingListHelper';

export default mutationWithClientMutationId({
  name: 'AddStapleShoppingListItemToUserShoppingList',
  inputFields: {
    stapleShoppingListItemId: { type: new GraphQLNonNull(GraphQLID) },
  },
  outputFields: {
    errorMessage: {
      type: GraphQLString,
    },
    item: {
      type: ShoppingList.ShoppingListConnectionDefinition.edgeType,
      resolve: _ => ({
        cursor: 'DummyCursor',
        node: _.item,
      }),
    },
  },
  mutateAndGetPayload: async ({ stapleShoppingListItemId }, request) =>
    addStapleShoppingListItemToUserShoppingList(request.headers.authorization, stapleShoppingListItemId),
});
