// @flow

import { GraphQLID, GraphQLString, GraphQLNonNull } from 'graphql';
import { mutationWithClientMutationId } from 'graphql-relay';
import { ShoppingList } from '../type';
import { addSpecialItemToUserShoppingList } from './SpecialItemHelper';

export default mutationWithClientMutationId({
  name: 'AddSpecialItemToUserShoppingList',
  inputFields: {
    specialItemId: { type: new GraphQLNonNull(GraphQLID) },
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
  mutateAndGetPayload: async ({ specialItemId }, request) => addSpecialItemToUserShoppingList(request.headers.authorization, specialItemId),
});
