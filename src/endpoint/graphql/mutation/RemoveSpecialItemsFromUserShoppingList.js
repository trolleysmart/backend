// @flow

import { GraphQLID, GraphQLString, GraphQLNonNull } from 'graphql';
import { mutationWithClientMutationId } from 'graphql-relay';
import { removeSpecialItemsFromUserShoppingList } from './SpecialItemHelper';

export default mutationWithClientMutationId({
  name: 'RemoveSpecialItemsFromUserShoppingList',
  inputFields: {
    userId: { type: new GraphQLNonNull(GraphQLID) },
    specialItemId: { type: new GraphQLNonNull(GraphQLID) },
  },
  outputFields: {
    errorMessage: {
      type: GraphQLString,
    },
  },
  mutateAndGetPayload: async ({ userId, specialItemId }, request) =>
    removeSpecialItemsFromUserShoppingList(request.headers.authorization, userId, specialItemId),
});
