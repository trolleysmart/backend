// @flow

import { Map, Range } from 'immutable';
import { GraphQLID, GraphQLObjectType, GraphQLString, GraphQLNonNull } from 'graphql';
import { connectionDefinitions } from 'graphql-relay';
import { ShoppingListService } from 'trolley-smart-parse-server-common';
import { getLimitAndSkipValue, convertStringArgumentToSet } from './Common';
import { NodeInterface } from '../interface';

const ShoppingListType = new GraphQLObjectType({
  name: 'ShoppingList',
  fields: {
    id: {
      type: new GraphQLNonNull(GraphQLID),
      resolve: _ => _.get('id'),
    },
    name: {
      type: GraphQLString,
      resolve: _ => _.get('name'),
    },
  },
  interfaces: [NodeInterface],
});

const ShoppingListConnectionDefinition = connectionDefinitions({
  name: 'ShoppingList',
  nodeType: ShoppingListType,
});

const getCriteria = (searchArgs, userId) =>
  Map({
    ids: searchArgs.has('shoppingListIds') ? searchArgs.get('shoppingListIds') : undefined,
    orderByFieldAscending: 'name',
    conditions: Map({
      userId,
      contains_names: convertStringArgumentToSet(searchArgs.get('name')),
      status: 'A',
    }),
  });

const getShoppingListCountMatchCriteria = async (searchArgs, userId, sessionToken) =>
  new ShoppingListService().count(getCriteria(searchArgs, userId), sessionToken);

const getShoppingListMatchCriteria = async (searchArgs, userId, sessionToken, limit, skip) =>
  new ShoppingListService().search(
    getCriteria(searchArgs, userId)
      .set('limit', limit)
      .set('skip', skip),
    sessionToken,
  );

export const getShoppingLists = async (searchArgs, userId, sessionToken) => {
  const count = await getShoppingListCountMatchCriteria(searchArgs, userId, sessionToken);
  const { limit, skip, hasNextPage, hasPreviousPage } = getLimitAndSkipValue(searchArgs, count, 10, 1000);
  const stapleItems = await getShoppingListMatchCriteria(searchArgs, userId, sessionToken, limit, skip);
  const indexedShoppingLists = stapleItems.zip(Range(skip, skip + limit));
  const edges = indexedShoppingLists.map(indexedItem => ({
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

export default { ShoppingListType, ShoppingListConnectionDefinition };
