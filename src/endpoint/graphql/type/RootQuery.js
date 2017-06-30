// @flow

import { GraphQLObjectType, GraphQLString, GraphQLNonNull } from 'graphql';
import { connectionArgs } from 'graphql-relay';
import { UserService } from 'micro-business-parse-server-common';
import UserType from './User';
import Tag, { getTags } from './Tag';
import Store, { getStores } from './Store';
import { NodeField } from '../interface';

const rootQueryType = new GraphQLObjectType({
  name: 'Query',
  fields: {
    user: {
      type: UserType,
      args: {
        username: {
          type: new GraphQLNonNull(GraphQLString),
        },
      },
      resolve: (_, args) => UserService.getUserInfo(args.username),
    },
    tags: {
      type: Tag.TagConnectionDefinition.connectionType,
      args: {
        ...connectionArgs,
        description: {
          type: GraphQLString,
        },
      },
      resolve: async (_, args) => getTags(args),
    },
    stores: {
      type: Store.StoreConnectionDefinition.connectionType,
      args: {
        ...connectionArgs,
        name: {
          type: GraphQLString,
        },
      },
      resolve: async (_, args) => getStores(args),
    },
    node: NodeField,
  },
});

export default rootQueryType;
