// @flow

import Immutable, { Map } from 'immutable';
import { GraphQLString } from 'graphql';
import { mutationWithClientMutationId } from 'graphql-relay';
import { ParseWrapperService, UserService } from 'micro-business-parse-server-common';
import { UserFeedbackService } from 'trolley-smart-parse-server-common';

export default mutationWithClientMutationId({
  name: 'SubmitUserFeedback',
  inputFields: {
    feedback: { type: GraphQLString },
  },
  outputFields: {
    errorMessage: {
      type: GraphQLString,
    },
  },
  mutateAndGetPayload: async ({ feedback }, request) => {
    const sessionToken = request.headers.authorization;
    const user = await UserService.getUserForProvidedSessionToken(sessionToken);
    const acl = ParseWrapperService.createACL(user);

    return new UserFeedbackService().create(Map({ userId: user.id, feedback: Immutable.fromJS(JSON.parse(feedback)) }), acl, sessionToken);
  },
});
