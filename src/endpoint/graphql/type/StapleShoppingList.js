// @flow

import { Map, Range } from 'immutable';
import { GraphQLID, GraphQLList, GraphQLObjectType, GraphQLString, GraphQLNonNull } from 'graphql';
import { connectionDefinitions } from 'graphql-relay';
import { StapleShoppingListService } from 'smart-grocery-parse-server-common';
import { NodeInterface } from '../interface';
import { getLimitAndSkipValue, convertStringArgumentToSet } from './Common';

const StapleShoppingListType = new GraphQLObjectType({
  name: 'StapleShoppingList',
  fields: {
    id: {
      type: new GraphQLNonNull(GraphQLID),
      resolve: _ => _.get('id'),
    },
    name: {
      type: GraphQLString,
      resolve: _ => _.get('name'),
    },
    tags: {
      type: new GraphQLList(GraphQLID),
      resolve: _ => _.get('tagIds') || [],
    },
  },
  interfaces: [NodeInterface],
});

const StapleShoppingListConnectionDefinition = connectionDefinitions({
  name: 'StapleShoppingList',
  nodeType: StapleShoppingListType,
});

const getCriteria = (userId, names) =>
  Map({
    includeTags: true,
    orderByFieldAscending: 'name',
    conditions: Map({
      userId,
      contains_names: names,
    }),
  });

const getStapleShoppingListCountMatchCriteria = async (userId, names) => StapleShoppingListService.count(getCriteria(userId, names));

const getStapleShoppingListMatchCriteria = async (limit, skip, userId, names) =>
  StapleShoppingListService.search(getCriteria(userId, names).set('limit', limit).set('skip', skip));

export const getStapleShoppingList = async (userId, args) => {
  const names = convertStringArgumentToSet(args.name);
  const count = await getStapleShoppingListCountMatchCriteria(userId, names);
  const { limit, skip, hasNextPage, hasPreviousPage } = getLimitAndSkipValue(args, count, 10, 1000);
  const stapleShoppingListItems = await getStapleShoppingListMatchCriteria(limit, skip, userId, names);
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

export default { StapleShoppingListType, StapleShoppingListConnectionDefinition };
