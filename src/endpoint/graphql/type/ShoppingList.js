// @flow

import { List, Map } from 'immutable';
import { GraphQLID, GraphQLFloat, GraphQLList, GraphQLInt, GraphQLObjectType, GraphQLString, GraphQLNonNull } from 'graphql';
import { connectionDefinitions, connectionFromArray } from 'graphql-relay';
import { Exception } from 'micro-business-parse-server-common';
import { MasterProductPriceService, ShoppingListService, StapleShoppingListService } from 'smart-grocery-parse-server-common';
import { NodeInterface } from '../interface';
import multiBuyType from './MultiBuy';
import unitPriceType from './UnitPrice';
import { convertStringArgumentToSet } from './Common';

const ShoppingListType = new GraphQLObjectType({
  name: 'ShoppingList',
  fields: {
    id: {
      type: new GraphQLNonNull(GraphQLID),
      resolve: (_) => {
        const stapleShoppingListId = _.get('stapleShoppingListId');
        const specialId = _.get('specialId');

        if (stapleShoppingListId) {
          return `shoppingList-${stapleShoppingListId}`;
        }

        return `shoppingList-${specialId}`;
      },
    },
    shoppingListIds: {
      type: new GraphQLList(new GraphQLNonNull(GraphQLID)),
      resolve: _ => _.get('shoppingListIds').toArray(),
    },
    stapleShoppingListId: {
      type: GraphQLID,
      resolve: _ => _.get('stapleShoppingListId'),
    },
    specialId: {
      type: GraphQLID,
      resolve: _ => _.get('specialId'),
    },
    name: {
      type: GraphQLString,
      resolve: _ => _.get('name'),
    },
    imageUrl: {
      type: GraphQLString,
      resolve: _ => _.get('imageUrl'),
    },
    barcode: {
      type: GraphQLString,
      resolve: _ => _.get('barcode'),
    },
    specialType: {
      type: GraphQLString,
      resolve: _ => _.get('specialType'),
    },
    priceToDisplay: {
      type: GraphQLFloat,
      resolve: _ => _.get('priceToDisplay'),
    },
    currentPrice: {
      type: GraphQLFloat,
      resolve: _ => _.get('currentPrice'),
    },
    wasPrice: {
      type: GraphQLFloat,
      resolve: _ => _.get('wasPrice'),
    },
    multiBuy: {
      type: multiBuyType,
      resolve: _ => _.get('multiBuyInfo'),
    },
    storeName: {
      type: GraphQLString,
      resolve: _ => _.get('storeName'),
    },
    storeImageUrl: {
      type: GraphQLString,
      resolve: _ => _.get('storeImageUrl'),
    },
    unitPrice: {
      type: unitPriceType,
      resolve: _ => _.get('unitPrice'),
    },
    expiryDate: {
      type: GraphQLString,
      resolve: _ => _.get('expiryDate'),
    },
    quantity: {
      type: GraphQLInt,
      resolve: _ => _.get('quantity'),
    },
    comments: {
      type: GraphQLString,
      resolve: _ => _.get('comments'),
    },
  },
  interfaces: [NodeInterface],
});

const ShoppingListConnectionDefinition = connectionDefinitions({
  name: 'ShoppingList',
  nodeType: ShoppingListType,
});

const getShoppingListMatchCriteria = async (userId, names) => {
  let shoppingListItems = List();
  const criteria = Map({
    includeStapleShoppingList: true,
    includeMasterProductPrice: true,
    conditions: Map({
      userId,
      contains_names: names,
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

export const getShoppingList = async (userId, args) => {
  const names = convertStringArgumentToSet(args.name);
  const shoppingListItems = await getShoppingListMatchCriteria(userId, names);
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
          name: foundItem.get('name'),
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
          name: foundItem.getIn(['masterProduct', 'name']),
          imageUrl: foundItem.getIn(['masterProduct', 'imageUrl']),
          barcode: foundItem.getIn(['masterProduct', 'barcode']),
          specialType: foundItem.getIn(['priceDetails', 'specialType']),
          priceToDisplay: foundItem.get('priceToDisplay'),
          currentPrice: foundItem.getIn(['priceDetails', 'currentPrice']),
          wasPrice: foundItem.getIn(['priceDetails', 'wasPrice']),
          multiBuyInfo: foundItem.getIn(['priceDetails', 'multiBuyInfo']),
          storeName: foundItem.getIn(['store', 'name']),
          storeImageUrl: foundItem.getIn(['store', 'imageUrl']),
          unitPrice: foundItem.getIn(['priceDetails', 'unitPrice']),
          expiryDate: new Date().toISOString(),
          quantity: groupedMasterProductPriceIds.get(foundItem.get('id')).size,
          comments: '',
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
    .sort((item1, item2) => item1.get('name').localeCompare(item2.get('name')))
    .take(args.first ? args.first : 10);

  return connectionFromArray(completeList.toArray(), args);
};

export default { ShoppingListType, ShoppingListConnectionDefinition };
