// @flow

import Immutable, { List, Map, Range } from 'immutable';
import { GraphQLID, GraphQLFloat, GraphQLList, GraphQLObjectType, GraphQLString, GraphQLNonNull } from 'graphql';
import { connectionDefinitions } from 'graphql-relay';
import { ProductPriceService } from 'trolley-smart-parse-server-common';
import { NodeInterface } from '../interface';
import multiBuyType from './MultiBuy';
import unitPriceType from './UnitPrice';
import { getLimitAndSkipValue, convertStringArgumentToSet } from './Common';
import Tag from './Tag';

const SpecialType = new GraphQLObjectType({
  name: 'Special',
  fields: {
    id: {
      type: new GraphQLNonNull(GraphQLID),
      resolve: _ => _.get('id'),
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
      resolve: _ => _.getIn(['storeProduct', 'imageUrl']),
    },
    barcode: {
      type: GraphQLString,
      resolve: _ => _.getIn(['storeProduct', 'barcode']),
    },
    size: {
      type: GraphQLString,
      resolve: _ => _.getIn(['storeProduct', 'size']),
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
        const offerEndDate = _.get('offerEndDate');

        return offerEndDate ? offerEndDate.toISOString() : undefined;
      },
    },
    comments: {
      type: GraphQLString,
      resolve: () => '',
    },
    tags: {
      type: new GraphQLList(Tag.TagType),
      resolve: _ => _.get('tags'),
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
    include_store: true,
    include_tags: true,
    include_storeProduct: true,
    conditions: Map({
      contains_names: names,
      contains_descriptions: descriptions,
      status: 'A',
      special: true,
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

  if (sortOption && sortOption.localeCompare('OfferEndDateDescending') === 0) {
    return criteria.set('orderByFieldDescending', 'offerEndDate');
  }

  if (sortOption && sortOption.localeCompare('OfferEndDateAscending') === 0) {
    return criteria.set('orderByFieldAscending', 'offerEndDate');
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
  new ProductPriceService().count(addSortOptionToCriteria(getCriteria(names, descriptions, sortOption, tags, stores), sortOption), sessionToken);

const getMasterProductMatchCriteria = async (sessionToken, limit, skip, names, descriptions, sortOption, tags, stores) =>
  new ProductPriceService().search(
    addSortOptionToCriteria(getCriteria(names, descriptions, sortOption, tags, stores), sortOption)
      .set('limit', limit)
      .set('skip', skip),
    sessionToken,
  );

export const getSpecials = async (sessionToken, args) => {
  const names = convertStringArgumentToSet(args.name);
  const descriptions = convertStringArgumentToSet(args.description);
  const count = await getMasterProductCountMatchCriteria(sessionToken, names, descriptions, args.sortOption, args.tags, args.stores);
  const { limit, skip, hasNextPage, hasPreviousPage } = getLimitAndSkipValue(args, count, 10, 1000);
  const productPriceItems = await getMasterProductMatchCriteria(
    sessionToken,
    limit,
    skip,
    names,
    descriptions,
    args.sortOption,
    args.tags,
    args.stores,
  );
  const indexedProductPriceItems = productPriceItems.zip(Range(skip, skip + limit));
  const edges = indexedProductPriceItems.map(indexedItem => ({
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

export default { SpecialType, SpecialConnectionDefinition };
