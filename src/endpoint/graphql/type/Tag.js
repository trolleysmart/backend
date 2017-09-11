// @flow

import { Map, Range } from 'immutable';
import { GraphQLBoolean, GraphQLID, GraphQLInt, GraphQLObjectType, GraphQLString, GraphQLNonNull } from 'graphql';
import { connectionDefinitions } from 'graphql-relay';
import { TagService } from 'trolley-smart-parse-server-common';
import { getLimitAndSkipValue, convertStringArgumentToSet } from './Common';
import { NodeInterface } from '../interface';
import { tagLoaderById } from '../loader';

const ParentTagType = new GraphQLObjectType({
  name: 'ParentTag',
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
  },
  interfaces: [NodeInterface],
});

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
    parentTag: {
      type: ParentTagType,
      resolve: (_) => {
        const parentTagId = _.get('parentTagId');

        if (parentTagId) {
          return tagLoaderById.load(parentTagId);
        }

        const parentTag = _.get('parentTag');

        if (parentTag) {
          return parentTag;
        }

        return null;
      },
    },
  },
  interfaces: [NodeInterface],
});

const TagConnectionDefinition = connectionDefinitions({
  name: 'TagType',
  nodeType: TagType,
});

const getCriteria = searchArgs =>
  Map({
    include_parentTag: true,
    orderByFieldAscending: 'name',
    conditions: Map({
      contains_names: convertStringArgumentToSet(searchArgs.get('name')),
      forDisplay: searchArgs.has('forDisplay') ? searchArgs.get('forDisplay') : undefined,
      level: searchArgs.has('level') ? searchArgs.get('level') : undefined,
    }),
  });

const getTagsCountMatchCriteria = async (searchArgs, sessionToken) => new TagService().count(getCriteria(searchArgs), sessionToken);

const getTagsMatchCriteria = async (searchArgs, sessionToken, limit, skip) =>
  new TagService().search(
    getCriteria(searchArgs)
      .set('limit', limit)
      .set('skip', skip),
    sessionToken,
  );

export const getTags = async (searchArgs, sessionToken) => {
  const count = await getTagsCountMatchCriteria(searchArgs, sessionToken);
  const { limit, skip, hasNextPage, hasPreviousPage } = getLimitAndSkipValue(searchArgs, count, 10, 1000);
  const tags = await getTagsMatchCriteria(searchArgs, sessionToken, limit, skip);
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
