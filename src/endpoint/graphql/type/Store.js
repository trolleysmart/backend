// @flow

import { Map, Range } from 'immutable';
import { GraphQLID, GraphQLObjectType, GraphQLString, GraphQLNonNull } from 'graphql';
import { connectionDefinitions } from 'graphql-relay';
import { StoreService } from 'trolley-smart-parse-server-common';
import { getLimitAndSkipValue, convertStringArgumentToSet } from './Common';
import { NodeInterface } from '../interface';

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
    parentStoreId: {
      type: GraphQLID,
      resolve: _ => _.get('parentStoreId'),
    },
  },
  interfaces: [NodeInterface],
});

const StoreConnectionDefinition = connectionDefinitions({
  name: 'StoreType',
  nodeType: StoreType,
});

const getCriteria = names =>
  Map({
    orderByFieldAscending: 'name',
    conditions: Map({
      contains_names: names,
    }),
  });

const getStoresCountMatchCriteria = async (sessionToken, names) => new StoreService().count(getCriteria(names), sessionToken);

const getStoresMatchCriteria = async (sessionToken, limit, skip, names) =>
  new StoreService().search(
    getCriteria(names)
      .set('limit', limit)
      .set('skip', skip),
    sessionToken,
  );

export const getStores = async (sessionToken, args) => {
  const names = convertStringArgumentToSet(args.name);
  const count = await getStoresCountMatchCriteria(sessionToken, names);
  const { limit, skip, hasNextPage, hasPreviousPage } = getLimitAndSkipValue(args, count, 10, 1000);
  const stores = await getStoresMatchCriteria(sessionToken, limit, skip, names);
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
