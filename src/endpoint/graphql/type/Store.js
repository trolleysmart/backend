// @flow

import { Map, Range } from 'immutable';
import { GraphQLID, GraphQLObjectType, GraphQLString, GraphQLNonNull } from 'graphql';
import { connectionDefinitions } from 'graphql-relay';
import { StoreService } from 'trolley-smart-parse-server-common';
import { getLimitAndSkipValue, convertStringArgumentToSet } from './Common';
import { NodeInterface } from '../interface';
import { storeLoaderById } from '../loader';

const ParentStoreType = new GraphQLObjectType({
  name: 'ParentStore',
  fields: {
    id: {
      type: new GraphQLNonNull(GraphQLID),
      resolve: _ => _.get('id'),
    },
    key: {
      type: GraphQLString,
      resolve: _ => _.get('key'),
    },
    name: {
      type: GraphQLString,
      resolve: _ => _.get('name'),
    },
    imageUrl: {
      type: GraphQLString,
      resolve: _ => _.get('imageUrl'),
    },
    address: {
      type: GraphQLString,
      resolve: _ => _.get('address'),
    },
  },
  interfaces: [NodeInterface],
});

const StoreType = new GraphQLObjectType({
  name: 'Store',
  fields: {
    id: {
      type: new GraphQLNonNull(GraphQLID),
      resolve: _ => _.get('id'),
    },
    key: {
      type: GraphQLString,
      resolve: _ => _.get('key'),
    },
    name: {
      type: GraphQLString,
      resolve: _ => _.get('name'),
    },
    imageUrl: {
      type: GraphQLString,
      resolve: _ => _.get('imageUrl'),
    },
    address: {
      type: GraphQLString,
      resolve: _ => _.get('address'),
    },
    parentStore: {
      type: ParentStoreType,
      resolve: (_) => {
        const parentStoreId = _.get('parentStoreId');

        if (parentStoreId) {
          return storeLoaderById.load(parentStoreId);
        }

        const parentStore = _.get('parentStore');

        if (parentStore) {
          return parentStore;
        }

        return null;
      },
    },
  },
  interfaces: [NodeInterface],
});

const StoreConnectionDefinition = connectionDefinitions({
  name: 'StoreType',
  nodeType: StoreType,
});

const getCriteria = searchArgs =>
  Map({
    include_parentStore: true,
    orderByFieldAscending: 'name',
    conditions: Map({
      contains_names: convertStringArgumentToSet(searchArgs.get('name')),
    }),
  });

const getStoresCountMatchCriteria = async (searchArgs, sessionToken) => new StoreService().count(getCriteria(searchArgs), sessionToken);

const getStoresMatchCriteria = async (searchArgs, sessionToken, limit, skip) =>
  new StoreService().search(
    getCriteria(searchArgs)
      .set('limit', limit)
      .set('skip', skip),
    sessionToken,
  );

export const getStores = async (searchArgs, sessionToken) => {
  const count = await getStoresCountMatchCriteria(searchArgs, sessionToken);
  const { limit, skip, hasNextPage, hasPreviousPage } = getLimitAndSkipValue(searchArgs, count, 10, 1000);
  const stores = await getStoresMatchCriteria(searchArgs, sessionToken, limit, skip);
  const indexedStores = stores.zip(Range(skip, skip + limit));

  const edges = indexedStores.map(indexedItem => ({
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

export default { StoreType, StoreConnectionDefinition };
