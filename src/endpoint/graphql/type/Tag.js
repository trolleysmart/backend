// @flow

import { Map, Range } from 'immutable';
import { GraphQLBoolean, GraphQLID, GraphQLInt, GraphQLList, GraphQLObjectType, GraphQLString, GraphQLNonNull } from 'graphql';
import { connectionDefinitions } from 'graphql-relay';
import { TagService } from 'smart-grocery-parse-server-common';
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
    weight: {
      type: GraphQLInt,
      resolve: _ => _.get('weight'),
    },
    forDisplay: {
      type: GraphQLBoolean,
      resolve: _ => _.get('forDisplay'),
    },
    parentTagIds: {
      type: new GraphQLList(GraphQLID),
      resolve: _ => _.get('tagIds') || [],
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

const getTagsCountMatchCriteria = async names => TagService.count(getCriteria(names));

const getTagsMatchCriteria = async (limit, skip, names) => TagService.search(getCriteria(names).set('limit', limit).set('skip', skip));

export const getTags = async (args) => {
  const names = convertStringArgumentToSet(args.name);
  const count = await getTagsCountMatchCriteria(names);
  const { limit, skip, hasNextPage, hasPreviousPage } = getLimitAndSkipValue(args, count, 10, 1000);
  const tags = await getTagsMatchCriteria(limit, skip, names);
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
      startCursor: firstEdge ? firstEdge.cursor : null,
      endCursor: lastEdge ? lastEdge.cursor : null,
      hasPreviousPage,
      hasNextPage,
    },
  };
};

export default { TagType, TagConnectionDefinition };
