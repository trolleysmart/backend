// @flow

import { GraphQLObjectType } from 'graphql';
import addItemsToShoppingList from './AddItemsToShoppingList';
import removeItemsFromShoppingList from './RemoveItemsFromShoppingList';
import submitUserFeedback from './SubmitUserFeedback';

export default new GraphQLObjectType({
  name: 'Mutation',
  fields: {
    addItemsToShoppingList,
    removeItemsFromShoppingList,
    submitUserFeedback,
  },
});
