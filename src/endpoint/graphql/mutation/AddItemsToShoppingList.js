// @flow

import Immutable, { List, Map } from 'immutable';
import { GraphQLID, GraphQLList, GraphQLString, GraphQLNonNull } from 'graphql';
import { mutationWithClientMutationId } from 'graphql-relay';
import { UserService } from 'micro-business-parse-server-common';
import { ShoppingListItem, getAllShoppingListItems } from '../type';
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
      type: new GraphQLList(ShoppingListItem.ShoppingListItemType),
      resolve: _ => _.get('shoppingListItems'),
    },
  },
  mutateAndGetPayload: async ({ productPriceIds, stapleItemIds, newStapleItemNames }, request) => {
    try {
      const sessionToken = request.headers.authorization;
      const user = await UserService.getUserForProvidedSessionToken(sessionToken);
      const userId = user.id;

      await Promise.all([
        addProductPricesToShoppingList(productPriceIds ? Immutable.fromJS(productPriceIds) : List(), user, sessionToken),
        addStapleItemsToShoppingList(stapleItemIds ? Immutable.fromJS(stapleItemIds) : List(), user, sessionToken),
        addNewStapleItemsToShoppingList(newStapleItemNames ? Immutable.fromJS(newStapleItemNames) : List(), user, sessionToken),
      ]);

      return Map({ shoppingListItems: await getAllShoppingListItems(Map(), userId, sessionToken) });
    } catch (ex) {
      return Map({ errorMessage: ex instanceof Error ? ex.message : ex });
    }
  },
});
