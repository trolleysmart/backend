// @flow

import { GraphQLID, GraphQLString, GraphQLNonNull } from 'graphql';
import { mutationWithClientMutationId } from 'graphql-relay';
import { removeSpecialItemsFromUserShoppingList } from './ProductHelper';

export default mutationWithClientMutationId({
  name: 'RemoveSpecialItemsFromUserShoppingList',
  inputFields: {
    specialItemId: { type: new GraphQLNonNull(GraphQLID) },
  },
  outputFields: {
    errorMessage: {
      type: GraphQLString,
    },
  },
  mutateAndGetPayload: async ({ specialItemId }, request) => removeSpecialItemsFromUserShoppingList(request.headers.authorization, specialItemId),
});
