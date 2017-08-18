// @flow

import { GraphQLID, GraphQLString, GraphQLNonNull } from 'graphql';
import { mutationWithClientMutationId } from 'graphql-relay';
import { ShoppingList } from '../type';
import { removeSpecialItemFromUserShoppingList } from './ProductHelper';

export default mutationWithClientMutationId({
  name: 'RemoveSpecialItemFromUserShoppingList',
  inputFields: {
    specialItemId: { type: new GraphQLNonNull(GraphQLID) },
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
  mutateAndGetPayload: async ({ specialItemId }, request) => removeSpecialItemFromUserShoppingList(request.headers.authorization, specialItemId),
});
