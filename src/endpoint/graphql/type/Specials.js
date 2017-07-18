// @flow

import Immutable, { List, Map, Range } from 'immutable';
import { GraphQLID, GraphQLFloat, GraphQLObjectType, GraphQLString, GraphQLNonNull } from 'graphql';
import { connectionDefinitions } from 'graphql-relay';
import { MasterProductPriceService } from 'smart-grocery-parse-server-common';
import { NodeInterface } from '../interface';
import multiBuyType from './MultiBuy';
import unitPriceType from './UnitPrice';
import { getLimitAndSkipValue, convertStringArgumentToSet } from './Common';

const SpecialType = new GraphQLObjectType({
  name: 'Special',
  fields: {
    id: {
      type: new GraphQLNonNull(GraphQLID),
      resolve: _ => _.get('id'),
    },
    name: {
      type: GraphQLString,
      resolve: _ => _.getIn(['masterProduct', 'name']),
    },
    description: {
      type: GraphQLString,
      resolve: _ => _.getIn(['masterProduct', 'description']),
    },
    imageUrl: {
      type: GraphQLString,
      resolve: _ => _.getIn(['masterProduct', 'imageUrl']),
    },
    barcode: {
      type: GraphQLString,
      resolve: _ => _.getIn(['masterProduct', 'barcode']),
    },
    size: {
      type: GraphQLString,
      resolve: _ => _.getIn(['masterProduct', 'size']),
    },
    specialType: {
      type: GraphQLString,
      resolve: _ => _.getIn(['priceDetails', 'specialType']),
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
      resolve: _ => _.getIn(['priceDetails', 'currentPrice']),
    },
    wasPrice: {
      type: GraphQLFloat,
      resolve: _ => _.getIn(['priceDetails', 'wasPrice']),
    },
    multiBuy: {
      type: multiBuyType,
      resolve: _ => _.getIn(['priceDetails', 'multiBuyInfo']),
    },
    storeName: {
      type: GraphQLString,
      resolve: _ => _.getIn(['store', 'name']),
    },
    storeImageUrl: {
      type: GraphQLString,
      resolve: _ => _.getIn(['store', 'imageUrl']),
    },
    unitPrice: {
      type: unitPriceType,
      resolve: _ => _.getIn(['priceDetails', 'unitPrice']),
    },
    offerEndDate: {
      type: GraphQLString,
      resolve: (_) => {
        const offerEndDate = _.getIn(['priceDetails', 'offerEndDate']);

        return offerEndDate ? offerEndDate.toISOString() : undefined;
      },
    },
    comments: {
      type: GraphQLString,
      resolve: () => '',
    },
  },
  interfaces: [NodeInterface],
});

const SpecialConnectionDefinition = connectionDefinitions({
  name: 'Special',
  nodeType: SpecialType,
});

const getCriteria = (names, descriptions, sortOption, tags, stores) =>
  Map({
    includeStore: true,
    includeMasterProduct: true,
    conditions: Map({
      contains_names: names,
      contains_descriptions: descriptions,
      status: 'A',
      not_specialType: 'none',
      tagIds: tags ? Immutable.fromJS(tags) : undefined,
      storeIds: stores ? Immutable.fromJS(stores) : List(),
    }),
  });

const addSortOptionToCriteria = (criteria, sortOption) => {
  if (sortOption && sortOption.localeCompare('PriceDescending') === 0) {
    return criteria.set('orderByFieldDescending', 'priceToDisplay');
  }

  if (sortOption && sortOption.localeCompare('PriceAscending') === 0) {
    return criteria.set('orderByFieldAscending', 'priceToDisplay');
  }

  if (sortOption && sortOption.localeCompare('SavingDescending') === 0) {
    return criteria.set('orderByFieldDescending', 'saving');
  }

  if (sortOption && sortOption.localeCompare('SavingAscending') === 0) {
    return criteria.set('orderByFieldAscending', 'saving');
  }

  if (sortOption && sortOption.localeCompare('SavingPercentageDescending') === 0) {
    return criteria.set('orderByFieldDescending', 'savingPercentage');
  }

  if (sortOption && sortOption.localeCompare('SavingPercentageAscending') === 0) {
    return criteria.set('orderByFieldAscending', 'savingPercentage');
  }

  if (sortOption && sortOption.localeCompare('NameDescending') === 0) {
    return criteria.set('orderByFieldDescending', 'name');
  }

  if (sortOption && sortOption.localeCompare('NameAscending') === 0) {
    return criteria.set('orderByFieldAscending', 'name');
  }

  return criteria.set('orderByFieldAscending', 'name');
};

const getMasterProductCountMatchCriteria = async (sessionToken, names, descriptions, sortOption, tags, stores) =>
  MasterProductPriceService.count(addSortOptionToCriteria(getCriteria(names, descriptions, sortOption, tags, stores), sortOption), sessionToken);

const getMasterProductMatchCriteria = async (sessionToken, limit, skip, names, descriptions, sortOption, tags, stores) =>
  MasterProductPriceService.search(
    addSortOptionToCriteria(getCriteria(names, descriptions, sortOption, tags, stores), sortOption).set('limit', limit).set('skip', skip),
    sessionToken,
  );

export const getSpecials = async (sessionToken, args) => {
  const names = convertStringArgumentToSet(args.name);
  const descriptions = convertStringArgumentToSet(args.description);
  const count = await getMasterProductCountMatchCriteria(sessionToken, names, descriptions, args.sortOption, args.tags, args.stores);
  const { limit, skip, hasNextPage, hasPreviousPage } = getLimitAndSkipValue(args, count, 10, 1000);
  const masterProductPriceItems = await getMasterProductMatchCriteria(
    sessionToken,
    limit,
    skip,
    names,
    descriptions,
    args.sortOption,
    args.tags,
    args.stores,
  );
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

export default { SpecialType, SpecialConnectionDefinition };
