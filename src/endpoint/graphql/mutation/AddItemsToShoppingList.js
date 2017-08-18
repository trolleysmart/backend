// @flow

import Immutable, { List, Map } from 'immutable';
import { GraphQLID, GraphQLList, GraphQLString, GraphQLNonNull } from 'graphql';
import { mutationWithClientMutationId } from 'graphql-relay';
import { Exception } from 'micro-business-parse-server-common';
import { ShoppingList } from '../type';
import { addProductsToUserShoppingList } from './ProductHelper';
import { addStapleShoppingListItemsToUserShoppingList, addNewStapleShoppingListItemsToShoppingList } from './StapleShoppingListHelper';

export default mutationWithClientMutationId({
  name: 'AddItemsToShoppingList',
  inputFields: {
    productIds: { type: new GraphQLList(new GraphQLNonNull(GraphQLID)) },
    stapleShoppingListIds: { type: new GraphQLList(new GraphQLNonNull(GraphQLID)) },
    newStapleShoppingListNames: { type: new GraphQLList(new GraphQLNonNull(GraphQLString)) },
  },
  outputFields: {
    errorMessage: {
      type: GraphQLString,
      resolve: _ => _.get('errorMessage'),
    },
    products: {
      type: new GraphQLList(ShoppingList.ShoppingListConnectionDefinition.edgeType),
      resolve: (result) => {
        if (result.get('errorMessage')) {
          return null;
        }

        return result
          .get('products')
          .map(product => ({
            cursor: 'DummyCursor',
            node: product.get('item'),
          }))
          .toArray();
      },
    },
    stapleShoppingListItems: {
      type: new GraphQLList(ShoppingList.ShoppingListConnectionDefinition.edgeType),
      resolve: (result) => {
        if (result.get('errorMessage')) {
          return null;
        }

        return result
          .get('stapleShoppingListItems')
          .map(stapleShoppingListItem => ({
            cursor: 'DummyCursor',
            node: stapleShoppingListItem.get('item'),
          }))
          .toArray();
      },
    },
  },
  mutateAndGetPayload: async ({ productIds, stapleShoppingListIds, newStapleShoppingListNames }, request) => {
    try {
      const results = Promise.all([
        addProductsToUserShoppingList(request.headers.authorization, productIds ? Immutable.fromJS(productIds) : List()),
        addStapleShoppingListItemsToUserShoppingList(
          request.headers.authorization,
          stapleShoppingListIds ? Immutable.fromJS(stapleShoppingListIds) : List(),
        ),
        addNewStapleShoppingListItemsToShoppingList(
          request.headers.authorization,
          newStapleShoppingListNames ? Immutable.fromJS(newStapleShoppingListNames) : List(),
        ),
      ]);

      return Map({ products: results[0], stapleShoppingListItems: results[1].concat(results[2]) });
    } catch (ex) {
      return Map({ errorMessage: ex instanceof Exception ? ex.getErrorMessage() : ex });
    }
  },
});
