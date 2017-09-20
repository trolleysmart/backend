// @flow

import { GraphQLObjectType } from 'graphql';
import addShoppingList from './AddShoppingList';
import updateShoppingList from './UpdateShoppingList';
import removeShoppingList from './RemoveShoppingList';
import addItemsToShoppingList from './AddItemsToShoppingList';
import removeItemsFromShoppingList from './RemoveItemsFromShoppingList';
import submitUserFeedback from './SubmitUserFeedback';

export default new GraphQLObjectType({
  name: 'Mutation',
  fields: {
    addShoppingList,
    removeShoppingList,
    updateShoppingList,
    addItemsToShoppingList,
    removeItemsFromShoppingList,
    submitUserFeedback,
  },
});
