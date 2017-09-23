// @flow

import Immutable from 'immutable';
import { GraphQLBoolean, GraphQLID, GraphQLObjectType, GraphQLString, GraphQLNonNull, GraphQLList } from 'graphql';
import { connectionArgs } from 'graphql-relay';
import { NodeInterface } from '../interface';
import ShoppingList, { getShoppingLists } from './ShoppingList';
import ShoppingListItem, { getShoppingListItems } from './ShoppingListItem';
import Product, { getProducts } from './Product';
import StapleItem, { getStapleItems } from './StapleItem';

export default new GraphQLObjectType({
  name: 'User',
  fields: {
    id: {
      type: new GraphQLNonNull(GraphQLID),
      resolve: _ => _.get('id'),
    },
    shoppingLists: {
      type: ShoppingList.ShoppingListConnectionDefinition.connectionType,
      args: {
        ...connectionArgs,
        name: {
          type: GraphQLString,
        },
        shoppingListIds: {
          type: new GraphQLList(GraphQLID),
        },
      },
      resolve: async (_, args, request) => getShoppingLists(Immutable.fromJS(args), _.get('id'), request.headers.authorization),
    },
    shoppingListItems: {
      type: ShoppingListItem.ShoppingListItemConnectionDefinition.connectionType,
      args: {
        ...connectionArgs,
        shoppingListId: {
          type: new GraphQLNonNull(GraphQLID),
        },
        name: {
          type: GraphQLString,
        },
        addedByUserId: {
          type: GraphQLID,
        },
        tagKeys: {
          type: new GraphQLList(GraphQLString),
        },
        storeKeys: {
          type: new GraphQLList(GraphQLString),
        },
      },
      resolve: async (_, args, request) => getShoppingListItems(Immutable.fromJS(args), args.shoppingListId, request.headers.authorization),
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
      resolve: async (_, args, request) => getStapleItems(Immutable.fromJS(args), _.get('id'), request.headers.authorization),
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
  },
  interfaces: [NodeInterface],
});
