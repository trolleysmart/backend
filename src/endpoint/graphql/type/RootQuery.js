// @flow

import { Map } from 'immutable';
import { GraphQLObjectType } from 'graphql';
import { UserService } from 'micro-business-parse-server-common';
import ViewerType from './Viewer';
import UserType from './User';
import { NodeField } from '../interface';

const rootQueryType = new GraphQLObjectType({
  name: 'Query',
  fields: {
    user: {
      type: UserType,
      resolve: async (_, args, request) => {
        const user = await UserService.getUserForProvidedSessionToken(request.headers.authorization);

        return Map({ id: user.id });
      },
    },
    viewer: {
      type: ViewerType,
      resolve: () => Map({ id: 'ViewerId' }),
    },
    node: NodeField,
  },
});

export default rootQueryType;
