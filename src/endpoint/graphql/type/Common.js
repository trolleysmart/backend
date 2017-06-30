// @flow

import Immutable, { Set } from 'immutable';
import { Exception } from 'micro-business-parse-server-common';

export const getLimitAndSkipValue = (args, count, defaultPageSize, maximumPageSize) => {
  const { after, before } = args;
  let { first, last } = args;

  if ((first || after) && (last || before)) {
    throw new Exception('Mixing first and after with last and before is not supported.');
  }

  let limit;
  let skip;

  if (first || after) {
    if (!first) {
      first = defaultPageSize;
    }
  } else if (last || before) {
    if (!last) {
      last = defaultPageSize;
    }
  } else {
    first = defaultPageSize;
  }

  if (first > maximumPageSize) {
    first = maximumPageSize;
  }

  if (last > maximumPageSize) {
    last = maximumPageSize;
  }

  if (first && after) {
    const afterValue = parseInt(after, 10);

    limit = first;
    skip = afterValue;
  } else if (first) {
    limit = first;
    skip = 0;
  } else if (last && before) {
    const beforeValue = parseInt(before, 10);

    limit = last;
    skip = beforeValue.idx - last;

    if (skip < 0) {
      skip = 0;
    }
  } else if (last) {
    limit = last;
    skip = 0;
  }

  const hasNextPage = skip + limit < count;
  const hasPreviousPage = skip !== 0;

  return {
    limit,
    skip,
    hasNextPage,
    hasPreviousPage,
  };
};

export const convertStringArgumentToSet = (string) => {
  if (string) {
    return Immutable.fromJS(string.replace(/\W/g, ' ').trim().toLowerCase().split(' ')).map(_ => _.trim()).filter(_ => _.length > 0).toSet();
  }

  return Set();
};
