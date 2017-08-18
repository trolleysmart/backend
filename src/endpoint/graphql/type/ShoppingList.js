// @flow

import Immutable, { List, Map, Range } from 'immutable';
import { GraphQLID, GraphQLFloat, GraphQLList, GraphQLInt, GraphQLObjectType, GraphQLString, GraphQLNonNull } from 'graphql';
import { connectionDefinitions } from 'graphql-relay';
import { Exception } from 'micro-business-parse-server-common';
import { MasterProductPriceService, ShoppingListService, StapleShoppingListService } from 'trolley-smart-parse-server-common';
import { NodeInterface } from '../interface';
import multiBuyType from './MultiBuy';
import unitPriceType from './UnitPrice';
import { getLimitAndSkipValue, convertStringArgumentToSet } from './Common';

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
    description: {
      type: GraphQLString,
      resolve: _ => _.get('description'),
    },
    imageUrl: {
      type: GraphQLString,
      resolve: _ => _.get('imageUrl'),
    },
    barcode: {
      type: GraphQLString,
      resolve: _ => _.get('barcode'),
    },
    size: {
      type: GraphQLString,
      resolve: _ => _.get('size'),
    },
    specialType: {
      type: GraphQLString,
      resolve: _ => _.get('specialType'),
    },
    priceToDisplay: {
      type: GraphQLFloat,
      resolve: _ => _.get('priceToDisplay'),
    },
    saving: {
      type: GraphQLFloat,
      resolve: _ => _.get('saving'),
    },
    savingPercentage: {
      type: GraphQLFloat,
      resolve: _ => _.get('savingPercentage'),
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
    offerEndDate: {
      type: GraphQLString,
      resolve: _ => _.get('offerEndDate'),
    },
    quantity: {
      type: GraphQLInt,
      resolve: _ => _.get('quantity'),
    },
    comments: {
      type: GraphQLString,
      resolve: _ => _.get('comments'),
    },
    status: {
      type: GraphQLString,
      resolve: _ => _.get('status'),
    },
  },
  interfaces: [NodeInterface],
});

const ShoppingListConnectionDefinition = connectionDefinitions({
  name: 'ShoppingList',
  nodeType: ShoppingListType,
});

const getShoppingListMatchCriteria = async (sessionToken, userId, names) => {
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

  const result = await ShoppingListService.searchAll(criteria, sessionToken);

  try {
    result.event.subscribe((info) => {
      shoppingListItems = shoppingListItems.push(info);
    });

    await result.promise;
  } finally {
    result.event.unsubscribeAll();
  }

  return shoppingListItems;
};

const getStapleShoppingListInfo = async (sessionToken, userId, ids) => {
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
  const masterProductPriceSearchResult = await StapleShoppingListService.searchAll(criteria, sessionToken);

  try {
    masterProductPriceSearchResult.event.subscribe((info) => {
      stapleShoppingListInfo = stapleShoppingListInfo.push(info);
    });

    await masterProductPriceSearchResult.promise;
  } finally {
    masterProductPriceSearchResult.event.unsubscribeAll();
  }

  return stapleShoppingListInfo;
};

const getMasterProductPriceInfo = async (sessionToken, ids) => {
  if (ids.isEmpty()) {
    return List();
  }

  const criteria = Map({
    includeStore: true,
    includeMasterProduct: true,
    ids,
  });

  let masterProductPriceInfo = List();
  const masterProductPriceSearchResult = await MasterProductPriceService.searchAll(criteria, sessionToken);

  try {
    masterProductPriceSearchResult.event.subscribe((info) => {
      masterProductPriceInfo = masterProductPriceInfo.push(info);
    });

    await masterProductPriceSearchResult.promise;
  } finally {
    masterProductPriceSearchResult.event.unsubscribeAll();
  }

  return masterProductPriceInfo;
};

const getActiveMasterProductPrice = async (sessionToken, inactiveMasterProduct) => {
  const criteria = Map({
    includeStore: true,
    includeMasterProduct: true,
    topMost: true,
    conditions: Map({
      masterProductId: inactiveMasterProduct.get('masterProductId'),
      storeId: inactiveMasterProduct.get('storeId'),
      status: 'A',
    }),
  });

  const activeMasterProducts = await MasterProductPriceService.search(criteria, sessionToken);

  return activeMasterProducts.isEmpty() ? null : activeMasterProducts.first();
};

export const getShoppingList = async (sessionToken, userId, args) => {
  const names = convertStringArgumentToSet(args.name);
  const shoppingListItems = await getShoppingListMatchCriteria(sessionToken, userId, names);
  const stapleShoppingListInInShoppingList = shoppingListItems.filter(item => item.get('stapleShoppingList'));
  const masterProductPriceInShoppingList = shoppingListItems.filter(item => item.get('masterProductPrice'));
  const stapleShoppingListIds = stapleShoppingListInInShoppingList.map(item => item.get('stapleShoppingListId'));
  const masterProductPriceIds = masterProductPriceInShoppingList.map(item => item.get('masterProductPriceId'));
  const results = await Promise.all([
    getStapleShoppingListInfo(sessionToken, userId, stapleShoppingListIds.toSet()),
    getMasterProductPriceInfo(sessionToken, masterProductPriceIds.toSet()),
  ]);
  const groupedStapleShoppingListIds = stapleShoppingListIds.groupBy(id => id);
  const groupedMasterProductPriceIds = masterProductPriceIds.groupBy(id => id);
  const stapleShoppingListItems = results[0];
  const masterProductPrices = results[1];
  const inactiveMasterProductPrices = masterProductPrices.filter(masterProductPrice => masterProductPrice.get('status').localeCompare('I') === 0);
  const matchedActiveMasterProductPrices = inactiveMasterProductPrices.isEmpty()
    ? List()
    : Immutable.fromJS(
      await Promise.all(
        inactiveMasterProductPrices
          .map(inactiveMasterProductPrice => getActiveMasterProductPrice(sessionToken, inactiveMasterProductPrice))
          .toArray(),
      ),
    ).filter(masterProductPrice => masterProductPrice);

  const completeListWithDuplication = shoppingListItems.map((shoppingListItem) => {
    if (shoppingListItem.get('stapleShoppingList')) {
      const foundItem = stapleShoppingListItems.find(item => item.get('id').localeCompare(shoppingListItem.get('stapleShoppingListId')) === 0);

      if (foundItem) {
        return Map({
          id: shoppingListItem.get('id'),
          stapleShoppingListId: foundItem.get('id'),
          name: foundItem.get('name'),
          quantity: groupedStapleShoppingListIds.get(foundItem.get('id')).size,
          status: 'A',
        });
      }

      throw new Exception(`Staple Shopping List not found: ${shoppingListItem.getIn(['stapleShoppingList', 'id'])}`);
    } else {
      const foundItem = masterProductPrices.find(item => item.get('id').localeCompare(shoppingListItem.get('masterProductPriceId')) === 0);

      if (foundItem) {
        let foundActiveProductPrice = null;

        if (foundItem.get('status').localeCompare('I') === 0) {
          const foundMatchActiveMasterProductPrice = matchedActiveMasterProductPrices.find(
            activeMasterProduct =>
              activeMasterProduct.get('masterProductId').localeCompare(foundItem.get('masterProductId')) === 0 &&
              activeMasterProduct.get('storeId').localeCompare(foundItem.get('storeId')) === 0,
          );

          if (foundMatchActiveMasterProductPrice) {
            foundActiveProductPrice = foundMatchActiveMasterProductPrice;
          }
        }

        const itemWithDataToFecth = foundActiveProductPrice || foundItem;
        const offerEndDate = itemWithDataToFecth.get('offerEndDate');

        return Map({
          id: shoppingListItem.get('id'),
          specialId: foundItem.get('id'),
          name: itemWithDataToFecth.getIn(['masterProduct', 'name']),
          description: itemWithDataToFecth.getIn(['masterProduct', 'description']),
          imageUrl: itemWithDataToFecth.getIn(['masterProduct', 'imageUrl']),
          barcode: itemWithDataToFecth.getIn(['masterProduct', 'barcode']),
          size: itemWithDataToFecth.getIn(['masterProduct', 'size']),
          specialType: itemWithDataToFecth.getIn(['priceDetails', 'specialType']),
          priceToDisplay: itemWithDataToFecth.get('priceToDisplay'),
          saving: itemWithDataToFecth.get('saving'),
          savingPercentage: itemWithDataToFecth.get('savingPercentage'),
          currentPrice: itemWithDataToFecth.getIn(['priceDetails', 'currentPrice']),
          wasPrice: itemWithDataToFecth.getIn(['priceDetails', 'wasPrice']),
          multiBuyInfo: itemWithDataToFecth.getIn(['priceDetails', 'multiBuyInfo']),
          storeName: itemWithDataToFecth.getIn(['store', 'name']),
          storeImageUrl: itemWithDataToFecth.getIn(['store', 'imageUrl']),
          unitPrice: itemWithDataToFecth.getIn(['priceDetails', 'unitPrice']),
          offerEndDate: offerEndDate ? offerEndDate.toISOString() : undefined,
          quantity: groupedMasterProductPriceIds.get(foundItem.get('id')).size,
          comments: '',
          status: itemWithDataToFecth.get('status'),
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
    .toList();
  const count = completeList.count();
  const { limit, skip, hasNextPage, hasPreviousPage } = getLimitAndSkipValue(args, count, 10, 1000);
  const indexedList = completeList.skip(skip).take(limit).zip(Range(skip, skip + limit));
  const edges = indexedList.map(indexedItem => ({
    node: indexedItem[0],
    cursor: indexedItem[1] + 1,
  }));
  const firstEdge = edges.first();
  const lastEdge = edges.last();

  return {
    edges: edges.toArray(),
    count,
    pageInfo: {
      startCursor: firstEdge ? firstEdge.cursor : 'cursor not available',
      endCursor: lastEdge ? lastEdge.cursor : 'cursor not available',
      hasPreviousPage,
      hasNextPage,
    },
  };
};

export default { ShoppingListType, ShoppingListConnectionDefinition };
