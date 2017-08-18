// @flow

import { Map, Range } from 'immutable';
import { GraphQLID, GraphQLList, GraphQLObjectType, GraphQLString, GraphQLNonNull } from 'graphql';
import { connectionDefinitions } from 'graphql-relay';
import { StapleShoppingListService } from 'trolley-smart-parse-server-common';
import { NodeInterface } from '../interface';
import { getLimitAndSkipValue, convertStringArgumentToSet } from './Common';
import Tag from './Tag';

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
      type: new GraphQLList(Tag.TagType),
      resolve: _ => _.get('tags'),
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

const getStapleShoppingListCountMatchCriteria = async (sessionToken, userId, names) =>
  StapleShoppingListService.count(getCriteria(userId, names), sessionToken);

const getStapleShoppingListMatchCriteria = async (sessionToken, limit, skip, userId, names) =>
  StapleShoppingListService.search(getCriteria(userId, names).set('limit', limit).set('skip', skip), sessionToken);

export const getStapleShoppingList = async (sessionToken, userId, args) => {
  const names = convertStringArgumentToSet(args.name);
  const count = await getStapleShoppingListCountMatchCriteria(sessionToken, userId, names);
  const { limit, skip, hasNextPage, hasPreviousPage } = getLimitAndSkipValue(args, count, 10, 1000);
  const stapleShoppingListItems = await getStapleShoppingListMatchCriteria(sessionToken, limit, skip, userId, names);
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
      startCursor: firstEdge ? firstEdge.cursor : 'cursor not available',
      endCursor: lastEdge ? lastEdge.cursor : 'cursor not available',
      hasPreviousPage,
      hasNextPage,
    },
  };
};

export default { StapleShoppingListType, StapleShoppingListConnectionDefinition };
