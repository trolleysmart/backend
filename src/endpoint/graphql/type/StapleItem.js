// @flow

import Immutable, { Map, Range } from 'immutable';
import { GraphQLBoolean, GraphQLID, GraphQLList, GraphQLObjectType, GraphQLString, GraphQLNonNull } from 'graphql';
import { connectionDefinitions } from 'graphql-relay';
import { StapleItemService } from 'trolley-smart-parse-server-common';
import { NodeInterface } from '../interface';
import { getLimitAndSkipValue, convertStringArgumentToSet } from './Common';
import Tag from './Tag';
import { tagLoader } from '../loader';

const StapleItemType = new GraphQLObjectType({
  name: 'StapleItem',
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
      resolve: _ => _.get('imageUrl'),
    },
    popular: {
      type: GraphQLBoolean,
      resolve: _ => (_.has('popular') ? _.get('popular') : false),
    },
    tags: {
      type: new GraphQLList(Tag.TagType),
      resolve: _ => _.get('tags'),
    },
  },
  interfaces: [NodeInterface],
});

const StapleItemConnectionDefinition = connectionDefinitions({
  name: 'StapleItem',
  nodeType: StapleItemType,
});

const getCriteria = (searchArgs, userId) =>
  Map({
    include_tags: true,
    orderByFieldAscending: 'name',
    conditions: Map({
      userId,
      contains_names: convertStringArgumentToSet(searchArgs.get('name')),
      tagIds: searchArgs.get('tagIds') ? searchArgs.get('tagIds') : undefined,
      popular: searchArgs.has('popular') ? searchArgs.get('popular') : undefined,
    }),
  });

const getStapleItemCountMatchCriteria = async (searchArgs, userId, sessionToken) =>
  new StapleItemService().count(getCriteria(searchArgs, userId), sessionToken);

const getStapleItemMatchCriteria = async (searchArgs, userId, sessionToken, limit, skip) =>
  new StapleItemService().search(
    getCriteria(searchArgs, userId)
      .set('limit', limit)
      .set('skip', skip),
    sessionToken,
  );

export const getStapleItem = async (searchArgs, userId, sessionToken) => {
  const finalSearchArgs = searchArgs.merge(
    searchArgs.has('tagKeys') && searchArgs.get('tagKeys')
      ? Map({ tagIds: Immutable.fromJS(await tagLoader.loadMany(searchArgs.get('tagKeys').toJS())).map(tag => tag.get('id')) })
      : Map(),
  );
  const count = await getStapleItemCountMatchCriteria(finalSearchArgs, userId, sessionToken);
  const { limit, skip, hasNextPage, hasPreviousPage } = getLimitAndSkipValue(finalSearchArgs, userId, count, 10, 1000);
  const stapleItems = await getStapleItemMatchCriteria(finalSearchArgs, userId, sessionToken, limit, skip);
  const indexedStapleItemItems = stapleItems.zip(Range(skip, skip + limit));
  const edges = indexedStapleItemItems.map(indexedItem => ({
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

export default { StapleItemType, StapleItemConnectionDefinition };
