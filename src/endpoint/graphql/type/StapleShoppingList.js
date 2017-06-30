// @flow

import { GraphQLID, GraphQLList, GraphQLObjectType, GraphQLString, GraphQLNonNull } from 'graphql';
import { connectionDefinitions } from 'graphql-relay';
import { NodeInterface } from '../interface';
import Tag from './Tag';

const stapleShoppingListType = new GraphQLObjectType({
  name: 'StapleShoppingList',
  fields: {
    id: {
      type: new GraphQLNonNull(GraphQLID),
      resolve: _ => _.get('id'),
    },
    description: {
      type: GraphQLString,
      resolve: _ => _.get('description'),
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
  nodeType: stapleShoppingListType,
});

export default StapleShoppingListConnectionDefinition;
