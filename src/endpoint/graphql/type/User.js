// @flow

import Immutable from 'immutable';
import { GraphQLBoolean, GraphQLID, GraphQLObjectType, GraphQLString, GraphQLNonNull, GraphQLList } from 'graphql';
import { connectionArgs } from 'graphql-relay';
import { NodeInterface } from '../interface';
import ShoppingListItem, { getShoppingListItems } from './ShoppingListItem';
import Product, { getProducts } from './Product';
import StapleItem, { getStapleItem } from './StapleItem';

export default new GraphQLObjectType({
  name: 'User',
  fields: {
    id: {
      type: new GraphQLNonNull(GraphQLID),
      resolve: _ => _.get('id'),
    },
    shoppingListItems: {
      type: ShoppingListItem.ShoppingListItemConnectionDefinition.connectionType,
      args: {
        ...connectionArgs,
        name: {
          type: GraphQLString,
        },
        tagKeys: {
          type: new GraphQLList(GraphQLString),
        },
        storeKeys: {
          type: new GraphQLList(GraphQLString),
        },
      },
      resolve: async (_, args, request) => getShoppingListItems(Immutable.fromJS(args), _.get('id'), request.headers.authorization),
    },
    products: {
      type: Product.ProductConnectionDefinition.connectionType,
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
        tagKeys: {
          type: new GraphQLList(GraphQLString),
        },
        storeKeys: {
          type: new GraphQLList(GraphQLString),
        },
        special: {
          type: GraphQLBoolean,
        },
      },
      resolve: async (_, args, request) => getProducts(Immutable.fromJS(args), request.headers.authorization),
    },
    stapleItems: {
      type: StapleItem.StapleItemConnectionDefinition.connectionType,
      args: {
        ...connectionArgs,
        name: {
          type: GraphQLString,
        },
        tagKeys: {
          type: new GraphQLList(GraphQLString),
        },
      },
      resolve: async (_, args, request) => getStapleItem(Immutable.fromJS(args), _.get('id'), request.headers.authorization),
    },
  },
  interfaces: [NodeInterface],
});
