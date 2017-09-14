// @flow

import Immutable, { List, Map } from 'immutable';
import { GraphQLID, GraphQLList, GraphQLString, GraphQLNonNull } from 'graphql';
import { mutationWithClientMutationId } from 'graphql-relay';
import { UserService } from 'micro-business-parse-server-common';
import { ShoppingListItem, getShoppingListItems } from '../type';
import addProductPricesToShoppingList from './ProductPriceHelper';
import { addStapleItemsToShoppingList, addNewStapleItemsToShoppingList } from './StapleItemHelper';

export default mutationWithClientMutationId({
  name: 'AddItemsToShoppingList',
  inputFields: {
    productPriceIds: { type: new GraphQLList(new GraphQLNonNull(GraphQLID)) },
    stapleItemIds: { type: new GraphQLList(new GraphQLNonNull(GraphQLID)) },
    newStapleItemNames: { type: new GraphQLList(new GraphQLNonNull(GraphQLString)) },
  },
  outputFields: {
    errorMessage: {
      type: GraphQLString,
      resolve: _ => _.get('errorMessage'),
    },
    shoppingListItems: {
      type: new GraphQLList(ShoppingListItem.ShoppingListItemConnectionDefinition.edgeType),
      resolve: _ => _.get('shoppingListItems'),
    },
  },
  mutateAndGetPayload: async ({ productPriceIds, stapleItemIds, newStapleItemNames }, request) => {
    try {
      const sessionToken = request.headers.authorization;
      const user = await UserService.getUserForProvidedSessionToken(sessionToken);
      const userId = user.id;
      const finalProductPriceIds = productPriceIds ? Immutable.fromJS(productPriceIds) : List();
      const finalStapleItemIds = stapleItemIds ? Immutable.fromJS(stapleItemIds) : List();
      const newShoppingListItemIds = Immutable.fromJS(
        (await Promise.all([
          addProductPricesToShoppingList(finalProductPriceIds, user, sessionToken),
          addStapleItemsToShoppingList(finalStapleItemIds, user, sessionToken),
          addNewStapleItemsToShoppingList(newStapleItemNames ? Immutable.fromJS(newStapleItemNames) : List(), user, sessionToken),
        ]))[2],
      );
      const shoppingListItems = (await getShoppingListItems(Map({ first: 1000 }), userId, sessionToken)).edges;
      const shoppingListItemsToReturn = shoppingListItems
        .filter(shoppingListItem => newShoppingListItemIds.find(id => id.localeCompare(shoppingListItem.node.get('id')) === 0))
        .concat(
          shoppingListItems.filter(shoppingListItem =>
            finalProductPriceIds.find(id => id.localeCompare(shoppingListItem.node.get('productPriceId')) === 0),
          ),
        )
        .concat(
          shoppingListItems.filter(shoppingListItem =>
            finalStapleItemIds.find(id => id.localeCompare(shoppingListItem.node.get('stapleItemId')) === 0),
          ),
        );

      return Map({ shoppingListItems: shoppingListItemsToReturn });
    } catch (ex) {
      return Map({ errorMessage: ex instanceof Error ? ex.message : ex });
    }
  },
});
