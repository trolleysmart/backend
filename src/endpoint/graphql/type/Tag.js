// @flow

import { Map, Range } from 'immutable';
import { GraphQLBoolean, GraphQLID, GraphQLInt, GraphQLObjectType, GraphQLString, GraphQLNonNull } from 'graphql';
import { connectionDefinitions } from 'graphql-relay';
import { TagService } from 'trolley-smart-parse-server-common';
import { getLimitAndSkipValue, convertStringArgumentToSet } from './Common';
import { NodeInterface } from '../interface';

const TagType = new GraphQLObjectType({
  name: 'Tag',
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
    description: {
      type: GraphQLString,
      resolve: _ => _.get('description'),
    },
    imageUrl: {
      type: GraphQLString,
      resolve: _ => _.get('imageUrl'),
    },
    level: {
      type: GraphQLInt,
      resolve: _ => _.get('level'),
    },
    forDisplay: {
      type: GraphQLBoolean,
      resolve: _ => _.get('forDisplay'),
    },
    parentTagId: {
      type: GraphQLID,
      resolve: _ => _.get('parentTagId'),
    },
  },
  interfaces: [NodeInterface],
});

const TagConnectionDefinition = connectionDefinitions({
  name: 'TagType',
  nodeType: TagType,
});

const getCriteria = names =>
  Map({
    orderByFieldAscending: 'name',
    conditions: Map({
      contains_names: names,
      forDisplay: true,
    }),
  });

const getTagsCountMatchCriteria = async (sessionToken, names) => new TagService().count(getCriteria(names), sessionToken);

const getTagsMatchCriteria = async (sessionToken, limit, skip, names) =>
  new TagService().search(
    getCriteria(names)
      .set('limit', limit)
      .set('skip', skip),
    sessionToken,
  );

export const getTags = async (sessionToken, args) => {
  const names = convertStringArgumentToSet(args.name);
  const count = await getTagsCountMatchCriteria(sessionToken, names);
  const { limit, skip, hasNextPage, hasPreviousPage } = getLimitAndSkipValue(args, count, 10, 1000);
  const tags = await getTagsMatchCriteria(sessionToken, limit, skip, names);
  const indexedTags = tags.zip(Range(skip, skip + limit));

  const edges = indexedTags.map(indexedItem => ({
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

export default { TagType, TagConnectionDefinition };
