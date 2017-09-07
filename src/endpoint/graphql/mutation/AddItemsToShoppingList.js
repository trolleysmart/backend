// @flow

import Immutable, { List, Map } from 'immutable';
import { GraphQLID, GraphQLList, GraphQLString, GraphQLNonNull } from 'graphql';
import { mutationWithClientMutationId } from 'graphql-relay';
import { ShoppingList } from '../type';
import { addProductPricesToUserShoppingList } from './ProductPriceHelper';
import { addStapleShoppingListItemsToUserShoppingList, addNewStapleShoppingListItemsToShoppingList } from './StapleShoppingListHelper';

export default mutationWithClientMutationId({
  name: 'AddItemsToShoppingList',
  inputFields: {
    productPriceIds: { type: new GraphQLList(new GraphQLNonNull(GraphQLID)) },
    stapleShoppingListIds: { type: new GraphQLList(new GraphQLNonNull(GraphQLID)) },
    newStapleShoppingListNames: { type: new GraphQLList(new GraphQLNonNull(GraphQLString)) },
  },
  outputFields: {
    errorMessage: {
      type: GraphQLString,
      resolve: _ => _.get('errorMessage'),
    },
    productPrices: {
      type: new GraphQLList(ShoppingList.ShoppingListConnectionDefinition.edgeType),
      resolve: (result) => {
        if (result.get('errorMessage')) {
          return [];
        }

        return result
          .get('productPrices')
          .map(productPrice => ({
            cursor: 'DummyCursor',
            node: productPrice,
          }))
          .toArray();
      },
    },
    stapleShoppingListItems: {
      type: new GraphQLList(ShoppingList.ShoppingListConnectionDefinition.edgeType),
      resolve: (result) => {
        if (result.get('errorMessage')) {
          return [];
        }

        return result
          .get('stapleShoppingListItems')
          .map(stapleShoppingListItem => ({
            cursor: 'DummyCursor',
            node: stapleShoppingListItem,
          }))
          .toArray();
      },
    },
  },
  mutateAndGetPayload: async ({ productPriceIds, stapleShoppingListIds, newStapleShoppingListNames }, request) => {
    try {
      const results = await Promise.all([
        addProductPricesToUserShoppingList(request.headers.authorization, productPriceIds ? Immutable.fromJS(productPriceIds) : List()),
        addStapleShoppingListItemsToUserShoppingList(
          request.headers.authorization,
          stapleShoppingListIds ? Immutable.fromJS(stapleShoppingListIds) : List(),
        ),
        addNewStapleShoppingListItemsToShoppingList(
          request.headers.authorization,
          newStapleShoppingListNames ? Immutable.fromJS(newStapleShoppingListNames) : List(),
        ),
      ]);

      return Map({ productPrices: results[0], stapleShoppingListItems: results[1].concat(results[2]) });
    } catch (ex) {
      return Map({ errorMessage: ex instanceof Error ? ex.message : ex });
    }
  },
});
