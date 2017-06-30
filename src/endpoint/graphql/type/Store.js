// @flow

import { Map, Range } from 'immutable';
import { GraphQLID, GraphQLObjectType, GraphQLString, GraphQLNonNull } from 'graphql';
import { connectionDefinitions } from 'graphql-relay';
import { StoreService } from 'smart-grocery-parse-server-common';
import { getLimitAndSkipValue, convertStringArgumentToSet } from './Common';
import { NodeInterface } from '../interface';

const StoreType = new GraphQLObjectType({
  name: 'Store',
  fields: {
    id: {
      type: new GraphQLNonNull(GraphQLID),
      resolve: _ => _.get('id'),
    },
    name: {
      type: GraphQLString,
      resolve: _ => _.get('name'),
    },
    imageUrl: {
      type: GraphQLString,
      resolve: _ => _.get('imageUrl'),
    },
  },
  interfaces: [NodeInterface],
});

const StoreConnectionDefinition = connectionDefinitions({
  name: 'StoreType',
  nodeType: StoreType,
});

const getStoresCountMatchCriteria = async (names) => {
  const criteria = Map({
    orderByFieldAscending: 'name',
    conditions: Map({
      contains_names: names,
    }),
  });

  return StoreService.count(criteria);
};

const getStoresMatchCriteria = async (limit, skip, names) => {
  const criteria = Map({
    orderByFieldAscending: 'name',
    conditions: Map({
      contains_names: names,
    }),
  });

  return StoreService.search(criteria.set('limit', limit).set('skip', skip));
};

export const getStores = async (args) => {
  const names = convertStringArgumentToSet(args.name);
  const count = await getStoresCountMatchCriteria(names);
  const { limit, skip, hasNextPage, hasPreviousPage } = getLimitAndSkipValue(args, count, 10, 1000);
  const stores = await getStoresMatchCriteria(limit, skip, names);
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
      startCursor: firstEdge ? firstEdge.cursor : null,
      endCursor: lastEdge ? lastEdge.cursor : null,
      hasPreviousPage,
      hasNextPage,
    },
  };
};

export default { StoreType, StoreConnectionDefinition };
