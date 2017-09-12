// @flow

import Immutable, { Map, Range } from 'immutable';
import { GraphQLID, GraphQLFloat, GraphQLList, GraphQLObjectType, GraphQLString, GraphQLNonNull } from 'graphql';
import { connectionDefinitions } from 'graphql-relay';
import { ProductPriceService } from 'trolley-smart-parse-server-common';
import { getLimitAndSkipValue, convertStringArgumentToSet } from './Common';
import { NodeInterface } from '../interface';
import multiBuyType from './MultiBuy';
import unitPriceType from './UnitPrice';
import Tag from './Tag';
import Store from './Store';
import { storeLoaderByKey, tagLoaderByKey } from '../loader';

const ProductType = new GraphQLObjectType({
  name: 'Product',
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
    productPageUrl: {
      type: GraphQLString,
      resolve: _ => _.get('productPageUrl'),
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

const ProductConnectionDefinition = connectionDefinitions({
  name: 'Product',
  nodeType: ProductType,
});

const getCriteria = searchArgs =>
  Map({
    include_store: true,
    include_tags: true,
    include_storeProduct: true,
    conditions: Map({
      contains_names: convertStringArgumentToSet(searchArgs.get('name')),
      contains_descriptions: convertStringArgumentToSet(searchArgs.get('description')),
      status: 'A',
      special: searchArgs.has('special') ? searchArgs.get('special') : undefined,
      tagIds: searchArgs.get('tagIds') ? searchArgs.get('tagIds') : undefined,
      storeIds: searchArgs.get('storeIds') ? searchArgs.get('storeIds') : undefined,
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

const getProductPriceCountMatchCriteria = async (searchArgs, sessionToken) =>
  new ProductPriceService().count(addSortOptionToCriteria(getCriteria(searchArgs), searchArgs.get('sortOption')), sessionToken);

const getProductPriceMatchCriteria = async (searchArgs, sessionToken, limit, skip) =>
  new ProductPriceService().search(
    addSortOptionToCriteria(getCriteria(searchArgs), searchArgs.get('sortOption'))
      .set('limit', limit)
      .set('skip', skip),
    sessionToken,
  );

export const getProducts = async (searchArgs, sessionToken) => {
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
  const count = await getProductPriceCountMatchCriteria(finalSearchArgs, sessionToken);
  const { limit, skip, hasNextPage, hasPreviousPage } = getLimitAndSkipValue(finalSearchArgs, count, 10, 1000);
  const productPriceItems = await getProductPriceMatchCriteria(finalSearchArgs, sessionToken, limit, skip);
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

export default { ProductType, ProductConnectionDefinition };
