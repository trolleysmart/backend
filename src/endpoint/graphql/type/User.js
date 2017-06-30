// @flow

import { List, Map, Range } from 'immutable';
import { GraphQLID, GraphQLObjectType, GraphQLString, GraphQLNonNull } from 'graphql';
import { connectionArgs, connectionFromArray } from 'graphql-relay';
import { Exception } from 'micro-business-parse-server-common';
import { MasterProductPriceService, ShoppingListService, StapleShoppingListService } from 'smart-grocery-parse-server-common';
import { NodeInterface } from '../interface';
import SpecialConnectionDefinition from './Specials';
import ShoppingListConnectionDefinition from './ShoppingList';
import StapleShoppingListConnectionDefinition from './StapleShoppingList';
import { getLimitAndSkipValue, convertStringArgumentToSet } from './Common';

const addSortOptionToCriteria = (criteria, sortOption) => {
  if (sortOption && sortOption.localeCompare('DescriptionDescending') === 0) {
    return criteria.set('orderByFieldDescending', 'description');
  }

  return criteria.set('orderByFieldAscending', 'description');
};

const getMasterProductCountMatchCriteria = async (descriptions, sortOption) => {
  const criteria = Map({
    includeStore: true,
    includeMasterProduct: true,
    conditions: Map({
      contains_descriptions: descriptions,
      not_specialType: 'none',
    }),
  });

  return MasterProductPriceService.count(addSortOptionToCriteria(criteria, sortOption));
};

const getMasterProductMatchCriteria = async (limit, skip, descriptions, sortOption) => {
  const criteria = Map({
    includeStore: true,
    includeMasterProduct: true,
    conditions: Map({
      contains_descriptions: descriptions,
      not_specialType: 'none',
    }),
  });

  return MasterProductPriceService.search(addSortOptionToCriteria(criteria, sortOption).set('limit', limit).set('skip', skip));
};

const getMasterProductPriceItems = async (args) => {
  const descriptions = convertStringArgumentToSet(args.description);
  const count = await getMasterProductCountMatchCriteria(descriptions, args.sortOption);
  const { limit, skip, hasNextPage, hasPreviousPage } = getLimitAndSkipValue(args, count, 10, 1000);
  const masterProductPriceItems = await getMasterProductMatchCriteria(limit, skip, descriptions, args.sortOption);
  const indexedMasterProductPriceItems = masterProductPriceItems.zip(Range(skip, skip + limit));

  const edges = indexedMasterProductPriceItems.map(indexedItem => ({
    node: indexedItem[0],
    cursor: indexedItem[1] + 1,
  }));

  const firstEdge = edges.first();
  const lastEdge = edges.last();

  return {
    edges: edges.toArray(),
    count,
    pageInfo: {
      startCursor: firstEdge ? firstEdge.cursor : null,
      endCursor: lastEdge ? lastEdge.cursor : null,
      hasPreviousPage,
      hasNextPage,
    },
  };
};

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

const getStapleShoppingListCountMatchCriteria = async (userId, descriptions) => {
  const criteria = Map({
    includeTags: true,
    orderByFieldAscending: 'description',
    conditions: Map({
      userId,
      contains_descriptions: descriptions,
    }),
  });

  return StapleShoppingListService.count(criteria);
};

const getStapleShoppingListMatchCriteria = async (limit, skip, userId, descriptions) => {
  const criteria = Map({
    includeTags: true,
    orderByFieldAscending: 'description',
    conditions: Map({
      userId,
      contains_descriptions: descriptions,
    }),
  });

  return StapleShoppingListService.search(criteria.set('limit', limit).set('skip', skip));
};

const getStapleShoppingListItems = async (userId, args) => {
  const descriptions = convertStringArgumentToSet(args.description);
  const count = await getStapleShoppingListCountMatchCriteria(userId, descriptions);
  const { limit, skip, hasNextPage, hasPreviousPage } = getLimitAndSkipValue(args, count, 10, 1000);
  const stapleShoppingListItems = await getStapleShoppingListMatchCriteria(limit, skip, userId, descriptions);
  const indexedStapleShoppingListItems = stapleShoppingListItems.zip(Range(skip, skip + limit));

  const edges = indexedStapleShoppingListItems.map(indexedItem => ({
    node: indexedItem[0],
    cursor: indexedItem[1] + 1,
  }));

  const firstEdge = edges.first();
  const lastEdge = edges.last();

  return {
    edges: edges.toArray(),
    count,
    pageInfo: {
      startCursor: firstEdge ? firstEdge.cursor : null,
      endCursor: lastEdge ? lastEdge.cursor : null,
      hasPreviousPage,
      hasNextPage,
    },
  };
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
      type: SpecialConnectionDefinition.connectionType,
      args: {
        ...connectionArgs,
        description: {
          type: GraphQLString,
        },
        sortOption: {
          type: GraphQLString,
        },
      },
      resolve: async (_, args) => getMasterProductPriceItems(args),
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
      type: StapleShoppingListConnectionDefinition.connectionType,
      args: {
        ...connectionArgs,
        description: {
          type: GraphQLString,
        },
      },
      resolve: async (_, args) => getStapleShoppingListItems(_.get('id'), args),
    },
  },
  interfaces: [NodeInterface],
});
