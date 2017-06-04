// @flow

import hasha from 'hasha';
import { GraphQLID, GraphQLFloat, GraphQLList, GraphQLInt, GraphQLObjectType, GraphQLString, GraphQLNonNull } from 'graphql';
import { connectionDefinitions } from 'graphql-relay';
import { NodeInterface } from '../interface';
import multiBuyType from './MultiBuy';

const shoppingListType = new GraphQLObjectType({
  name: 'ShoppingList',
  fields: {
    id: {
      type: new GraphQLNonNull(GraphQLID),
      resolve: _ => hasha(_.get('shoppingListIds').sort((id1, id2) => id1.localeCompare(id2)).toArray().join(), { algorithm: 'md5' }),
    },
    shoppingListIds: {
      type: new GraphQLList(new GraphQLNonNull(GraphQLID)),
      resolve: _ => _.get('shoppingListIds').toArray(),
    },
    stapleShoppingListId: {
      type: GraphQLID,
      resolve: _ => _.get('stapleShoppingListId'),
    },
    specialId: {
      type: GraphQLID,
      resolve: _ => _.get('specialId'),
    },
    description: {
      type: GraphQLString,
      resolve: _ => _.get('description'),
    },
    imageUrl: {
      type: GraphQLString,
      resolve: _ => _.get('imageUrl'),
    },
    barcode: {
      type: GraphQLString,
      resolve: _ => _.get('barcode'),
    },
    specialType: {
      type: GraphQLString,
      resolve: _ => _.get('specialType'),
    },
    price: {
      type: GraphQLFloat,
      resolve: _ => _.get('price'),
    },
    wasPrice: {
      type: GraphQLFloat,
      resolve: _ => _.get('wasPrice'),
    },
    multiBuy: {
      type: multiBuyType,
      resolve: _ => _.get('multiBuyInfo'),
    },
    storeName: {
      type: GraphQLString,
      resolve: _ => _.get('storeName'),
    },
    storeImageUrl: {
      type: GraphQLString,
      resolve: _ => _.get('storeImageUrl'),
    },
    comments: {
      type: GraphQLString,
      resolve: _ => _.get('comments'),
    },
    unitSize: {
      type: GraphQLString,
      resolve: _ => _.get('unitSize'),
    },
    expiryDate: {
      type: GraphQLString,
      resolve: _ => _.get('expiryDate'),
    },
    quantity: {
      type: GraphQLInt,
      resolve: _ => _.get('quantity'),
    },
  },
  interfaces: [NodeInterface],
});

const ShoppingListConnectionDefinition = connectionDefinitions({
  name: 'ShoppingList',
  nodeType: shoppingListType,
});

export default ShoppingListConnectionDefinition;
