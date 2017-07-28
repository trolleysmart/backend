// @flow

import { GraphQLString, GraphQLNonNull } from 'graphql';
import { mutationWithClientMutationId } from 'graphql-relay';
import { ShoppingList } from '../type';
import { addNewStapleShoppingListToShoppingList } from './StapleShoppingListHelper';

export default mutationWithClientMutationId({
  name: 'AddNewStapleShoppingListToShoppingList',
  inputFields: {
    name: { type: new GraphQLNonNull(GraphQLString) },
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
  mutateAndGetPayload: async ({ name }, request) => addNewStapleShoppingListToShoppingList(request.headers.authorization, name),
});
