// @flow

import { Map } from 'immutable';
import { GraphQLObjectType, GraphQLString, GraphQLNonNull } from 'graphql';
import { UserService } from 'micro-business-parse-server-common';
import ViewerType from './Viewer';
import UserType from './User';
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
    viewer: {
      type: ViewerType,
      resolve: () => Map({ id: 'ViewerId' }),
    },
    node: NodeField,
  },
});

export default rootQueryType;
