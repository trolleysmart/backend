// @flow

import { GraphQLFloat, GraphQLString, GraphQLObjectType } from 'graphql';

export default new GraphQLObjectType({
  name: 'UnitPrice',
  fields: {
    price: {
      type: GraphQLFloat,
      resolve: _ => _.get('price'),
    },
    size: {
      type: GraphQLString,
      resolve: _ => _.get('size'),
    },
  },
});
