// @flow

import Immutable from 'immutable';
import { GraphQLList, GraphQLString, GraphQLNonNull } from 'graphql';
import { mutationWithClientMutationId } from 'graphql-relay';
import { ShoppingList } from '../type';
import { addNewStapleShoppingListToShoppingList } from './StapleShoppingListHelper';

export default mutationWithClientMutationId({
  name: 'AddNewStapleShoppingListItemsToShoppingList',
  inputFields: {
    names: { type: new GraphQLList(new GraphQLNonNull(GraphQLString)) },
  },
  outputFields: {
    errorMessage: {
      type: GraphQLString,
    },
    items: {
      type: new GraphQLList(ShoppingList.ShoppingListConnectionDefinition.edgeType),
      resolve: _ =>
        _.map(node => ({
          cursor: 'DummyCursor',
          node,
        })),
    },
  },
  mutateAndGetPayload: async ({ names }, request) => addNewStapleShoppingListToShoppingList(request.headers.authorization, Immutable.fromJS(names)),
});
