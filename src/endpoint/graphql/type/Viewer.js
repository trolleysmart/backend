// @flow

import { GraphQLID, GraphQLObjectType, GraphQLString, GraphQLNonNull } from 'graphql';
import { connectionArgs } from 'graphql-relay';
import { NodeInterface } from '../interface';
import Tag, { getTags } from './Tag';
import Store, { getStores } from './Store';

export default new GraphQLObjectType({
  name: 'Viewer',
  fields: {
    id: {
      type: new GraphQLNonNull(GraphQLID),
      resolve: _ => _.get('id'),
    },
    tags: {
      type: Tag.TagConnectionDefinition.connectionType,
      args: {
        ...connectionArgs,
        name: {
          type: GraphQLString,
        },
      },
      resolve: async (_, args, request) => getTags(request.headers.authorization, args),
    },
    stores: {
      type: Store.StoreConnectionDefinition.connectionType,
      args: {
        ...connectionArgs,
        name: {
          type: GraphQLString,
        },
      },
      resolve: async (_, args, request) => getStores(request.headers.authorization, args),
    },
  },
  interfaces: [NodeInterface],
});
