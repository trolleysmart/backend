// @flow

import { GraphQLID, GraphQLObjectType, GraphQLString, GraphQLNonNull, GraphQLList } from 'graphql';
import { connectionArgs } from 'graphql-relay';
import { NodeInterface } from '../interface';
import ShoppingList, { getShoppingList } from './ShoppingList';
import Specials, { getSpecials } from './Specials';
import StapleShoppingList, { getStapleShoppingList } from './StapleShoppingList';

export default new GraphQLObjectType({
  name: 'User',
  fields: {
    id: {
      type: new GraphQLNonNull(GraphQLID),
      resolve: _ => _.get('id'),
    },
    shoppingList: {
      type: ShoppingList.ShoppingListConnectionDefinition.connectionType,
      args: {
        ...connectionArgs,
        name: {
          type: GraphQLString,
        },
      },
      resolve: async (_, args, request) => getShoppingList(request.headers.authorization, _.get('id'), args),
    },
    specials: {
      type: Specials.SpecialConnectionDefinition.connectionType,
      args: {
        ...connectionArgs,
        name: {
          type: GraphQLString,
        },
        description: {
          type: GraphQLString,
        },
        sortOption: {
          type: GraphQLString,
        },
        tags: {
          type: new GraphQLList(GraphQLID),
        },
        stores: {
          type: new GraphQLList(GraphQLID),
        },
      },
      resolve: async (_, args, request) => getSpecials(request.headers.authorization, args),
    },
    stapleShoppingList: {
      type: StapleShoppingList.StapleShoppingListConnectionDefinition.connectionType,
      args: {
        ...connectionArgs,
        name: {
          type: GraphQLString,
        },
      },
      resolve: async (_, args, request) => getStapleShoppingList(request.headers.authorization, _.get('id'), args),
    },
  },
  interfaces: [NodeInterface],
});
