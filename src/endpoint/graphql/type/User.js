// @flow

import { List, Map } from 'immutable';
import { GraphQLID, GraphQLObjectType, GraphQLString, GraphQLNonNull, GraphQLList } from 'graphql';
import { connectionArgs, connectionFromArray } from 'graphql-relay';
import { Exception } from 'micro-business-parse-server-common';
import { MasterProductPriceService, ShoppingListService, StapleShoppingListService } from 'smart-grocery-parse-server-common';
import { NodeInterface } from '../interface';
import Specials, { getSpecials } from './Specials';
import ShoppingListConnectionDefinition from './ShoppingList';
import StapleShoppingList, { getStapleShoppingList } from './StapleShoppingList';
import { convertStringArgumentToSet } from './Common';

const getShoppingListMatchCriteria = async (userId, descriptions) => {
  let shoppingListItems = List();
  const criteria = Map({
    includeStapleShoppingList: true,
    includeMasterProductPrice: true,
    conditions: Map({
      userId,
      contains_descriptions: descriptions,
      excludeItemsMarkedAsDone: true,
      includeSpecialsOnly: true,
    }),
  });

  const result = await ShoppingListService.searchAll(criteria);

  try {
    result.event.subscribe(info => (shoppingListItems = shoppingListItems.push(info)));

    await result.promise;
  } finally {
    result.event.unsubscribeAll();
  }

  return shoppingListItems;
};

const getStapleShoppingListInfo = async (userId, ids) => {
  if (ids.isEmpty()) {
    return List();
  }

  const criteria = Map({
    ids,
    conditions: Map({
      userId,
    }),
  });

  let stapleShoppingListInfo = List();
  const masterProductPriceSearchResult = await StapleShoppingListService.searchAll(criteria);

  try {
    masterProductPriceSearchResult.event.subscribe(info => (stapleShoppingListInfo = stapleShoppingListInfo.push(info)));

    await masterProductPriceSearchResult.promise;
  } finally {
    masterProductPriceSearchResult.event.unsubscribeAll();
  }

  return stapleShoppingListInfo;
};

const getMasterProductPriceInfo = async (ids) => {
  if (ids.isEmpty()) {
    return List();
  }

  const criteria = Map({
    includeStore: true,
    includeMasterProduct: true,
    ids,
  });

  let masterProductPriceInfo = List();
  const masterProductPriceSearchResult = await MasterProductPriceService.searchAll(criteria);

  try {
    masterProductPriceSearchResult.event.subscribe(info => (masterProductPriceInfo = masterProductPriceInfo.push(info)));

    await masterProductPriceSearchResult.promise;
  } finally {
    masterProductPriceSearchResult.event.unsubscribeAll();
  }

  return masterProductPriceInfo;
};

const getShoppingListItems = async (userId, args) => {
  const descriptions = convertStringArgumentToSet(args.description);
  const shoppingListItems = await getShoppingListMatchCriteria(userId, descriptions);

  const stapleShoppingListInInShoppingList = shoppingListItems.filter(item => item.get('stapleShoppingList'));
  const masterProductPriceInShoppingList = shoppingListItems.filter(item => item.get('masterProductPrice'));
  const stapleShoppingListIds = stapleShoppingListInInShoppingList.map(item => item.get('stapleShoppingListId'));
  const masterProductPriceIds = masterProductPriceInShoppingList.map(item => item.get('masterProductPriceId'));
  const results = await Promise.all([
    getStapleShoppingListInfo(userId, stapleShoppingListIds.toSet()),
    getMasterProductPriceInfo(masterProductPriceIds.toSet()),
  ]);
  const groupedStapleShoppingListIds = stapleShoppingListIds.groupBy(id => id);
  const groupedMasterProductPriceIds = masterProductPriceIds.groupBy(id => id);
  const completeListWithDuplication = shoppingListItems.map((shoppingListItem) => {
    if (shoppingListItem.get('stapleShoppingList')) {
      const info = results[0];
      const foundItem = info.find(item => item.get('id').localeCompare(shoppingListItem.get('stapleShoppingListId')) === 0);

      if (foundItem) {
        return Map({
          id: shoppingListItem.get('id'),
          stapleShoppingListId: foundItem.get('id'),
          description: foundItem.get('description'),
          quantity: groupedStapleShoppingListIds.get(foundItem.get('id')).size,
        });
      }

      throw new Exception(`Staple Shopping List not found: ${shoppingListItem.getIn(['stapleShoppingList', 'id'])}`);
    } else {
      const info = results[1];
      const foundItem = info.find(item => item.get('id').localeCompare(shoppingListItem.get('masterProductPriceId')) === 0);

      if (foundItem) {
        return Map({
          id: shoppingListItem.get('id'),
          specialId: foundItem.get('id'),
          description: foundItem.getIn(['masterProduct', 'description']),
          imageUrl: foundItem.getIn(['masterProduct', 'imageUrl']),
          barcode: foundItem.getIn(['masterProduct', 'barcode']),
          specialType: foundItem.getIn(['priceDetails', 'specialType']),
          price: foundItem.getIn(['priceDetails', 'price']),
          wasPrice: foundItem.getIn(['priceDetails', 'wasPrice']),
          multiBuyInfo: foundItem.getIn(['priceDetails', 'multiBuyInfo']),
          storeName: foundItem.getIn(['store', 'name']),
          storeImageUrl: foundItem.getIn(['store', 'imageUrl']),
          comments: '',
          unitSize: '',
          expiryDate: new Date().toISOString(),
          quantity: groupedMasterProductPriceIds.get(foundItem.get('id')).size,
        });
      }

      throw new Exception(`Master Product Price not found: ${shoppingListItem.getIn(['masterProductPrice', 'id'])}`);
    }
  });

  const completeStapleShoppingList = completeListWithDuplication
    .filter(item => item.get('stapleShoppingListId'))
    .groupBy(item => item.get('stapleShoppingListId'))
    .map(item => item.first().set('shoppingListIds', item.map(_ => _.get('id'))));
  const completeMasterProductPrice = completeListWithDuplication
    .filter(item => item.get('specialId'))
    .groupBy(item => item.get('specialId'))
    .map(item => item.first().set('shoppingListIds', item.map(_ => _.get('id'))));
  const completeList = completeStapleShoppingList
    .concat(completeMasterProductPrice)
    .sort((item1, item2) => item1.get('description').localeCompare(item2.get('description')))
    .take(args.first ? args.first : 10);

  return connectionFromArray(completeList.toArray(), args);
};

export default new GraphQLObjectType({
  name: 'User',
  fields: {
    id: {
      type: new GraphQLNonNull(GraphQLID),
      resolve: _ => _.get('id'),
    },
    username: {
      type: GraphQLString,
      resolve: _ => _.get('username'),
    },
    specials: {
      type: Specials.SpecialConnectionDefinition.connectionType,
      args: {
        ...connectionArgs,
        name: {
          type: GraphQLString,
        },
        description: {
          type: GraphQLString,
        },
        sortOption: {
          type: GraphQLString,
        },
        tags: {
          type: new GraphQLList(GraphQLString),
        },
      },
      resolve: async (_, args) => getSpecials(args),
    },
    shoppingList: {
      type: ShoppingListConnectionDefinition.connectionType,
      args: {
        ...connectionArgs,
        description: {
          type: GraphQLString,
        },
      },
      resolve: async (_, args) => getShoppingListItems(_.get('id'), args),
    },
    stapleShoppingList: {
      type: StapleShoppingList.StapleShoppingListConnectionDefinition.connectionType,
      args: {
        ...connectionArgs,
        name: {
          type: GraphQLString,
        },
      },
      resolve: async (_, args) => getStapleShoppingList(_.get('id'), args),
    },
  },
  interfaces: [NodeInterface],
});
