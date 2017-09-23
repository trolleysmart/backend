// @flow

import Immutable, { List, Map, Range } from 'immutable';
import { GraphQLID, GraphQLFloat, GraphQLList, GraphQLInt, GraphQLObjectType, GraphQLString, GraphQLNonNull } from 'graphql';
import { connectionDefinitions } from 'graphql-relay';
import { ShoppingListItemService } from 'trolley-smart-parse-server-common';
import { getLimitAndSkipValue, convertStringArgumentToSet } from './Common';
import { NodeInterface } from '../interface';
import multiBuyType from './MultiBuy';
import unitPriceType from './UnitPrice';
import Tag from './Tag';
import Store from './Store';
import { storeLoaderByKey, tagLoaderByKey } from '../loader';

const ShoppingListItemType = new GraphQLObjectType({
  name: 'ShoppingListItem',
  fields: {
    id: {
      type: new GraphQLNonNull(GraphQLID),
      resolve: _ => _.get('id'),
    },
    itemType: {
      type: GraphQLString,
      resolve: _ => _.get('itemType'),
    },
    stapleItemId: {
      type: GraphQLID,
      resolve: _ => _.get('stapleItemId'),
    },
    productPriceId: {
      type: GraphQLID,
      resolve: _ => _.get('productPriceId'),
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
      resolve: _ => (_.get('stapleItemId') ? _.get('imageUrl') : _.getIn(['productPrice', 'imageUrl'])),
    },
    barcode: {
      type: GraphQLString,
      resolve: _ => _.getIn(['productPrice', 'barcode']),
    },
    size: {
      type: GraphQLString,
      resolve: _ => _.getIn(['productPrice', 'size']),
    },
    productPageUrl: {
      type: GraphQLString,
      resolve: _ => _.getIn(['productPrice', 'productPageUrl']),
    },
    specialType: {
      type: GraphQLString,
      resolve: _ => _.getIn(['productPrice', 'specialType']),
    },
    priceToDisplay: {
      type: GraphQLFloat,
      resolve: _ => _.getIn(['productPrice', 'priceToDisplay']),
    },
    saving: {
      type: GraphQLFloat,
      resolve: _ => _.getIn(['productPrice', 'saving']),
    },
    savingPercentage: {
      type: GraphQLFloat,
      resolve: _ => _.getIn(['productPrice', 'savingPercentage']),
    },
    currentPrice: {
      type: GraphQLFloat,
      resolve: _ => _.getIn(['productPrice', 'priceDetails', 'currentPrice']),
    },
    wasPrice: {
      type: GraphQLFloat,
      resolve: _ => _.getIn(['productPrice', 'priceDetails', 'wasPrice']),
    },
    multiBuy: {
      type: multiBuyType,
      resolve: _ => _.getIn(['productPrice', 'priceDetails', 'multiBuyInfo']),
    },
    unitPrice: {
      type: unitPriceType,
      resolve: _ => _.getIn(['productPrice', 'priceDetails', 'unitPrice']),
    },
    offerEndDate: {
      type: GraphQLString,
      resolve: (_) => {
        const offerEndDate = _.getIn(['productPrice', 'offerEndDate']);

        return offerEndDate ? offerEndDate.toISOString() : undefined;
      },
    },
    quantity: {
      type: GraphQLInt,
      resolve: _ => _.get('quantity'),
    },
    comments: {
      type: GraphQLString,
      resolve: _ => _.get('comments'),
    },
    store: {
      type: Store.StoreType,
      resolve: _ => _.get('store'),
    },
    tags: {
      type: new GraphQLList(Tag.TagType),
      resolve: _ => _.get('tags'),
    },
  },
  interfaces: [NodeInterface],
});

const ShoppingListItemConnectionDefinition = connectionDefinitions({
  name: 'ShoppingListItem',
  nodeType: ShoppingListItemType,
});

const getShoppingListItemsMatchCriteria = async (searchArgs, shoppingListId, sessionToken) => {
  let shoppingListItems = List();
  const criteria = Map({
    include_productPrice: true,
    include_stapleItem: true,
    include_store: true,
    include_tags: true,
    conditions: Map({
      shoppingListId,
      addedByUserId: searchArgs.get('addedByUserId') ? searchArgs.get('addedByUserId') : undefined,
      contains_names: convertStringArgumentToSet(searchArgs.get('name')),
      doesNotExist_removedByUser: true,
      tagIds: searchArgs.get('tagIds') ? searchArgs.get('tagIds') : undefined,
      storeIds: searchArgs.get('storeIds') ? searchArgs.get('storeIds') : undefined,
    }),
  });

  const result = await new ShoppingListItemService().searchAll(criteria, sessionToken);

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

export const getShoppingListItems = async (searchArgs, shoppingListId, sessionToken) => {
  const finalSearchArgs = searchArgs
    .merge(
      searchArgs.has('storeKeys') && searchArgs.get('storeKeys')
        ? Map({ storeIds: Immutable.fromJS(await storeLoaderByKey.loadMany(searchArgs.get('storeKeys').toJS())).map(store => store.get('id')) })
        : Map(),
    )
    .merge(
      searchArgs.has('tagKeys') && searchArgs.get('tagKeys')
        ? Map({ tagIds: Immutable.fromJS(await tagLoaderByKey.loadMany(searchArgs.get('tagKeys').toJS())).map(tag => tag.get('id')) })
        : Map(),
    );
  const shoppingListItems = await getShoppingListItemsMatchCriteria(finalSearchArgs, shoppingListId, sessionToken);
  const stapleItems = shoppingListItems.filter(item => item.get('stapleItem')).groupBy(item => item.get('stapleItemId'));
  const productPrices = shoppingListItems.filter(item => item.get('productPrice')).groupBy(item => item.get('productPriceId'));
  const allShoppingListItems = stapleItems
    .keySeq()
    .map((key) => {
      const groupedStapleItems = stapleItems.get(key);

      return groupedStapleItems.first().merge(Map({ quantity: groupedStapleItems.count(), itemType: 'StapleItem' }));
    })
    .concat(
      productPrices.keySeq().map((key) => {
        const groupedProductPrices = productPrices.get(key);

        return groupedProductPrices.first().merge(Map({ quantity: groupedProductPrices.count(), itemType: 'ProductPrice' }));
      }),
    );
  const count = allShoppingListItems.count();
  const { limit, skip, hasNextPage, hasPreviousPage } = getLimitAndSkipValue(searchArgs, count, 10, 1000);
  const indexedList = allShoppingListItems
    .skip(skip)
    .take(limit)
    .zip(Range(skip, skip + limit));
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

export default { ShoppingListItemType, ShoppingListItemConnectionDefinition };
