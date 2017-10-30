'use strict';

var _trolleySmartParseServerCommon = require('trolley-smart-parse-server-common');

var _trolleySmartBackendGraphql = require('trolley-smart-backend-graphql');

function _asyncToGenerator(fn) { return function () { var gen = fn.apply(this, arguments); return new Promise(function (resolve, reject) { function step(key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { return Promise.resolve(value).then(function (value) { step("next", value); }, function (err) { step("throw", err); }); } } return step("next"); }); }; }

Parse.Cloud.afterSave('_User', function () {
  var _ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee(request) {
    var log, user, userId, errorMessage;
    return regeneratorRuntime.wrap(function _callee$(_context) {
      while (1) {
        switch (_context.prev = _context.next) {
          case 0:
            if (!(request.object.createdAt !== request.object.updatedAt)) {
              _context.next = 2;
              break;
            }

            return _context.abrupt('return');

          case 2:
            log = request.log;
            user = request.object;
            userId = user.id;
            _context.prev = 5;

            log.info('Cloning staple template shopping list for user: ' + userId + '...');

            _context.next = 9;
            return new _trolleySmartParseServerCommon.StapleTemplateItemService().cloneStapleTemplateItems(user);

          case 9:

            log.info('Successfully cloned staple template shopping list for user: ' + userId);
            _context.next = 16;
            break;

          case 12:
            _context.prev = 12;
            _context.t0 = _context['catch'](5);
            errorMessage = _context.t0 instanceof Error ? _context.t0.message : _context.t0;


            log.error('Failed to clone staple shopping list for userId: ' + userId + '. Error message: ' + errorMessage);

          case 16:
          case 'end':
            return _context.stop();
        }
      }
    }, _callee, undefined, [[5, 12]]);
  }));

  return function (_x) {
    return _ref.apply(this, arguments);
  };
}());

Parse.Cloud.afterSave('Store', _asyncToGenerator(regeneratorRuntime.mark(function _callee2() {
  return regeneratorRuntime.wrap(function _callee2$(_context2) {
    while (1) {
      switch (_context2.prev = _context2.next) {
        case 0:
          _trolleySmartBackendGraphql.storeLoaderByKey.clearAll();
          _trolleySmartBackendGraphql.storeLoaderById.clearAll();

        case 2:
        case 'end':
          return _context2.stop();
      }
    }
  }, _callee2, undefined);
})));

Parse.Cloud.afterSave('Tag', _asyncToGenerator(regeneratorRuntime.mark(function _callee3() {
  return regeneratorRuntime.wrap(function _callee3$(_context3) {
    while (1) {
      switch (_context3.prev = _context3.next) {
        case 0:
          _trolleySmartBackendGraphql.tagLoaderByKey.clearAll();
          _trolleySmartBackendGraphql.tagLoaderById.clearAll();

        case 2:
        case 'end':
          return _context3.stop();
      }
    }
  }, _callee3, undefined);
})));