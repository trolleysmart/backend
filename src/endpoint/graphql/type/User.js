// @flow

import { GraphQLID, GraphQLObjectType, GraphQLString, GraphQLNonNull, GraphQLList } from 'graphql';
import { connectionArgs } from 'graphql-relay';
import { NodeInterface } from '../interface';
import Specials, { getSpecials } from './Specials';
import ShoppingList, { getShoppingList } from './ShoppingList';
import StapleShoppingList, { getStapleShoppingList } from './StapleShoppingList';

export default new GraphQLObjectType({
  name: 'User',
  fields: {
    id: {
      type: new GraphQLNonNull(GraphQLID),
      resolve: _ => _.get('id'),
    },
    username: {
      type: GraphQLString,
      resolve: _ => _.get('username'),
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
      resolve: async (_, args) => getSpecials(args),
    },
    shoppingList: {
      type: ShoppingList.ShoppingListConnectionDefinition.connectionType,
      args: {
        ...connectionArgs,
        name: {
          type: GraphQLString,
        },
      },
      resolve: async (_, args) => getShoppingList(_.get('id'), args),
    },
    stapleShoppingList: {
      type: StapleShoppingList.StapleShoppingListConnectionDefinition.connectionType,
      args: {
        ...connectionArgs,
        name: {
          type: GraphQLString,
        },
      },
      resolve: async (_, args, request) => getStapleShoppingList(_.get('id'), args, request.headers.authorization),
    },
  },
  interfaces: [NodeInterface],
});
