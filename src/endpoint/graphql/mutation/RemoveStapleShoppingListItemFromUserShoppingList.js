// @flow

import { GraphQLID, GraphQLString, GraphQLNonNull } from 'graphql';
import { mutationWithClientMutationId } from 'graphql-relay';
import { ShoppingList } from '../type';
import { removeStapleShoppingListItemFromUserShoppingList } from './StapleShoppingListHelper';

export default mutationWithClientMutationId({
  name: 'RemoveStapleShoppingListItemFromUserShoppingList',
  inputFields: {
    stapleShoppingListItemId: { type: new GraphQLNonNull(GraphQLID) },
  },
  outputFields: {
    errorMessage: {
      type: GraphQLString,
    },
    item: {
      type: ShoppingList.ShoppingListConnectionDefinition.edgeType,
      resolve: (_) => {
        if (_.errorMessage) {
          return null;
        }

        return {
          cursor: 'DummyCursor',
          node: _.item,
        };
      },
    },
  },
  mutateAndGetPayload: async ({ stapleShoppingListItemId }, request) =>
    removeStapleShoppingListItemFromUserShoppingList(request.headers.authorization, stapleShoppingListItemId),
});
