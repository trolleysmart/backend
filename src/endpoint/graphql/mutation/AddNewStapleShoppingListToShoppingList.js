// @flow

import { GraphQLID, GraphQLString, GraphQLNonNull } from 'graphql';
import { mutationWithClientMutationId } from 'graphql-relay';
import { ShoppingList } from '../type';
import { addNewStapleShoppingListToShoppingList } from './StapleShoppingListHelper';

export default mutationWithClientMutationId({
  name: 'AddNewStapleShoppingListToShoppingList',
  inputFields: {
    userId: { type: new GraphQLNonNull(GraphQLID) },
    description: { type: new GraphQLNonNull(GraphQLID) },
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
  mutateAndGetPayload: async ({ userId, description }) => addNewStapleShoppingListToShoppingList(userId, description),
});
