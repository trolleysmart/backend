// @flow

import Immutable, { Set } from 'immutable';

export const getLimitAndSkipValue = (searchArgs, count, defaultPageSize, maximumPageSize) => {
  const after = searchArgs.get('after');
  const before = searchArgs.get('before');
  let first = searchArgs.get('first');
  let last = searchArgs.get('last');

  if ((first || after) && (last || before)) {
    throw new Error('Mixing first and after with last and before is not supported.');
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
    const trimmedString = string.trim();

    if (trimmedString.length === 0) {
      return Set();
    }

    return Immutable.fromJS(trimmedString.toLowerCase().split(' '))
      .map(_ => _.trim())
      .filter(_ => _.length > 0)
      .toSet();
  }

  return Set();
};
