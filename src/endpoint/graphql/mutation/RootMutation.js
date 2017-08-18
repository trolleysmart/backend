// @flow

import { GraphQLObjectType } from 'graphql';
import addItemsToShoppingList from './AddItemsToShoppingList';
import removeSpecialItemFromUserShoppingList from './RemoveSpecialItemFromUserShoppingList';
import removeSpecialItemsFromUserShoppingList from './RemoveSpecialItemsFromUserShoppingList';
import removeStapleShoppingListItemFromUserShoppingList from './RemoveStapleShoppingListItemFromUserShoppingList';
import removeStapleShoppingListItemsFromUserShoppingList from './RemoveStapleShoppingListItemsFromUserShoppingList';
import submitUserFeedback from './SubmitUserFeedback';

export default new GraphQLObjectType({
  name: 'Mutation',
  fields: {
    addItemsToShoppingList,
    removeSpecialItemFromUserShoppingList,
    removeSpecialItemsFromUserShoppingList,
    removeStapleShoppingListItemFromUserShoppingList,
    removeStapleShoppingListItemsFromUserShoppingList,
    submitUserFeedback,
  },
});
