// @flow

import { GraphQLID, GraphQLString, GraphQLNonNull } from 'graphql';
import { mutationWithClientMutationId } from 'graphql-relay';
import { ShoppingListConnectionDefinition } from '../type';
import { removeSpecialItemFromUserShoppingList } from './SpecialItemHelper';

export default mutationWithClientMutationId({
  name: 'RemoveSpecialItemFromUserShoppingList',
  inputFields: {
    userId: { type: new GraphQLNonNull(GraphQLID) },
    specialItemId: { type: new GraphQLNonNull(GraphQLID) },
  },
  outputFields: {
    errorMessage: {
      type: GraphQLString,
    },
    item: {
      type: ShoppingListConnectionDefinition.edgeType,
      resolve: _ => ({
        cursor: 'DummyCursor',
        node: _.item,
      }),
    },
  },
  mutateAndGetPayload: async ({ userId, specialItemId }) => removeSpecialItemFromUserShoppingList(userId, specialItemId),
});
