// @flow

import { Map, Range } from 'immutable';
import { GraphQLID, GraphQLObjectType, GraphQLString, GraphQLNonNull } from 'graphql';
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
    description: {
      type: GraphQLString,
      resolve: _ => _.get('description'),
    },
  },
  interfaces: [NodeInterface],
});

const TagConnectionDefinition = connectionDefinitions({
  name: 'TagType',
  nodeType: TagType,
});

const getTagsCountMatchCriteria = async (descriptions) => {
  const criteria = Map({
    orderByFieldAscending: 'description',
    conditions: Map({
      contains_descriptions: descriptions,
    }),
  });

  return TagService.count(criteria);
};

const getTagsMatchCriteria = async (limit, skip, descriptions) => {
  const criteria = Map({
    orderByFieldAscending: 'description',
    conditions: Map({
      contains_descriptions: descriptions,
    }),
  });

  return TagService.search(criteria.set('limit', limit).set('skip', skip));
};

export const getTags = async (args) => {
  const descriptions = convertStringArgumentToSet(args.description);
  const count = await getTagsCountMatchCriteria(descriptions);
  const { limit, skip, hasNextPage, hasPreviousPage } = getLimitAndSkipValue(args, count, 10, 1000);
  const tags = await getTagsMatchCriteria(limit, skip, descriptions);
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
