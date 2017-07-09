// @flow

import { GraphQLFloat, GraphQLInt, GraphQLObjectType } from 'graphql';

export default new GraphQLObjectType({
  name: 'MultiBuy',
  fields: {
    awardQuantity: {
      type: GraphQLInt,
      resolve: _ => _.get('awardQuantity'),
    },
    awardValue: {
      type: GraphQLFloat,
      resolve: _ => _.get('awardValue'),
    },
  },
});
