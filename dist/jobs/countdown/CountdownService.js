'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _immutable = require('immutable');

var _immutable2 = _interopRequireDefault(_immutable);

var _microBusinessParseServerCommon = require('micro-business-parse-server-common');

var _smartGroceryParseServerCommon = require('smart-grocery-parse-server-common');

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _asyncToGenerator(fn) { return function () { var gen = fn.apply(this, arguments); return new Promise(function (resolve, reject) { function step(key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { return Promise.resolve(value).then(function (value) { step("next", value); }, function (err) { step("throw", err); }); } } return step("next"); }); }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var CountdownService = function CountdownService(_ref) {
  var _this = this;

  var logVerboseFunc = _ref.logVerboseFunc,
      logInfoFunc = _ref.logInfoFunc,
      logErrorFunc = _ref.logErrorFunc;

  _classCallCheck(this, CountdownService);

  this.updateStoreCralwerProductCategoriesConfiguration = function () {
    var _ref2 = _asyncToGenerator(regeneratorRuntime.mark(function _callee(config) {
      var finalConfig, currentConfig, crawlSessionInfos, crawlResults, highLevelProductCategories, newConfig;
      return regeneratorRuntime.wrap(function _callee$(_context) {
        while (1) {
          switch (_context.prev = _context.next) {
            case 0:
              _context.t0 = config;

              if (_context.t0) {
                _context.next = 5;
                break;
              }

              _context.next = 4;
              return CountdownService.getConfig();

            case 4:
              _context.t0 = _context.sent;

            case 5:
              finalConfig = _context.t0;


              _this.logInfo(finalConfig, function () {
                return 'Fetching store crawler configuration...';
              }); // eslint-disable-line max-len

              _context.next = 9;
              return _smartGroceryParseServerCommon.StoreCrawlerConfigurationService.search((0, _immutable.Map)({
                conditions: (0, _immutable.Map)({
                  name: 'Countdown'
                }),
                topMost: true
              }));

            case 9:
              currentConfig = _context.sent;


              _this.logInfo(finalConfig, function () {
                return 'Fetched store crawler configuration.';
              }); // eslint-disable-line max-len

              _this.logInfo(finalConfig, function () {
                return 'Fetching the most recent Countdown crawling result for Countdown High Level Product Categories...';
              }); // eslint-disable-line max-len

              _context.next = 14;
              return _smartGroceryParseServerCommon.CrawlSessionService.search((0, _immutable.Map)({
                conditions: (0, _immutable.Map)({
                  sessionKey: 'Countdown High Level Product Categories'
                }),
                topMost: true
              }));

            case 14:
              crawlSessionInfos = _context.sent;


              _this.logInfo(finalConfig, function () {
                return 'Fetched the most recent Countdown crawling result for Countdown High Level Product Categories.';
              }); // eslint-disable-line max-len

              _this.logVerbose(finalConfig, function () {
                return 'Current Store Crawler config for Countdown: ' + currentConfig;
              });

              _context.next = 19;
              return _smartGroceryParseServerCommon.CrawlResultService.search((0, _immutable.Map)({
                conditions: (0, _immutable.Map)({
                  crawlSessionId: crawlSessionInfos.first().get('id')
                })
              }));

            case 19:
              crawlResults = _context.sent;
              highLevelProductCategories = crawlResults.first().getIn(['resultSet', 'highLevelProductCategories']);


              _this.logInfo(finalConfig, function () {
                return 'Updating new Store Crawler config for Countdown...';
              });

              newConfig = currentConfig.setIn(['config', 'productCategories'], highLevelProductCategories);


              _this.logVerbose(finalConfig, function () {
                return 'New Store Crawler config for Countdown: ' + JSON.stringify(newConfig);
              });

              _context.next = 26;
              return _smartGroceryParseServerCommon.StoreCrawlerConfigurationService.create(newConfig);

            case 26:

              _this.logInfo(finalConfig, function () {
                return 'Updated new Store Crawler config for Countdown.';
              });

            case 27:
            case 'end':
              return _context.stop();
          }
        }
      }, _callee, _this);
    }));

    return function (_x) {
      return _ref2.apply(this, arguments);
    };
  }();

  this.syncToMasterProductList = function () {
    var _ref3 = _asyncToGenerator(regeneratorRuntime.mark(function _callee2(config) {
      var finalConfig, crawlSessionInfos, sessionInfo, sessionId, products, result, productsWithoutDuplication, results, indexes, productsWithIndexes, newProducts, newProductInfo;
      return regeneratorRuntime.wrap(function _callee2$(_context2) {
        while (1) {
          switch (_context2.prev = _context2.next) {
            case 0:
              _context2.t0 = config;

              if (_context2.t0) {
                _context2.next = 5;
                break;
              }

              _context2.next = 4;
              return CountdownService.getConfig();

            case 4:
              _context2.t0 = _context2.sent;

            case 5:
              finalConfig = _context2.t0;


              _this.logInfo(finalConfig, function () {
                return 'Fetching the most recent Countdown crawling result for Countdown Products...';
              });

              _context2.next = 9;
              return _smartGroceryParseServerCommon.CrawlSessionService.search((0, _immutable.Map)({
                conditions: (0, _immutable.Map)({
                  sessionKey: 'Countdown Products'
                }),
                topMost: true
              }));

            case 9:
              crawlSessionInfos = _context2.sent;
              sessionInfo = crawlSessionInfos.first();
              sessionId = sessionInfo.get('id');
              products = (0, _immutable.List)();


              _this.logInfo(finalConfig, function () {
                return 'Fetched the most recent Countdown crawling result for Countdown Products. Session Id: ' + sessionId;
              });

              result = _smartGroceryParseServerCommon.CrawlResultService.searchAll((0, _immutable.Map)({
                conditions: (0, _immutable.Map)({
                  crawlSessionId: sessionId
                })
              }));
              _context2.prev = 15;

              result.event.subscribe(function (info) {
                return products = products.concat(info.getIn(['resultSet', 'products']).filterNot(function (_) {
                  return _.get('description').trim().length === 0;
                }));
              });

              _context2.next = 19;
              return result.promise;

            case 19:
              _context2.prev = 19;

              result.event.unsubscribeAll();
              return _context2.finish(19);

            case 22:
              productsWithoutDuplication = products.groupBy(function (_) {
                return _.get('description');
              }).map(function (_) {
                return _.first();
              }).valueSeq();


              _this.logVerbose(finalConfig, function () {
                return 'Checking whether products already exist...';
              });

              _context2.next = 26;
              return Promise.all(productsWithoutDuplication.map(function (product) {
                return _smartGroceryParseServerCommon.MasterProductService.exists((0, _immutable.Map)({
                  conditions: product
                }));
              }).toArray());

            case 26:
              results = _context2.sent;


              _this.logVerbose(finalConfig, function () {
                return 'Finished checking whether products already exist.';
              });

              indexes = (0, _immutable.Range)(0, productsWithoutDuplication.size);
              productsWithIndexes = productsWithoutDuplication.zipWith(function (product, index) {
                return (0, _immutable.Map)({
                  product: product,
                  index: index
                });
              }, indexes);
              newProducts = productsWithIndexes.filterNot(function (_) {
                return results[_.get('index')];
              }).map(function (_) {
                return _.get('product');
              });

              if (!newProducts.isEmpty()) {
                _context2.next = 33;
                break;
              }

              return _context2.abrupt('return');

            case 33:

              _this.logInfo(finalConfig, function () {
                return 'Saving new products...';
              });

              newProductInfo = newProducts.map(function (_) {
                return (0, _immutable.Map)({
                  description: _.get('description'),
                  barcode: _.get('barcode'),
                  imageUrl: _.get('imageUrl')
                });
              });
              _context2.next = 37;
              return Promise.all(newProductInfo.map(_smartGroceryParseServerCommon.MasterProductService.create).toArray());

            case 37:
            case 'end':
              return _context2.stop();
          }
        }
      }, _callee2, _this, [[15,, 19, 22]]);
    }));

    return function (_x2) {
      return _ref3.apply(this, arguments);
    };
  }();

  this.syncToMasterProductPriceList = function () {
    var _ref4 = _asyncToGenerator(regeneratorRuntime.mark(function _callee4(config) {
      var finalConfig, stores, crawlSessionInfos, sessionInfo, sessionId, products, result, productsWithoutDuplication, capturedDate;
      return regeneratorRuntime.wrap(function _callee4$(_context4) {
        while (1) {
          switch (_context4.prev = _context4.next) {
            case 0:
              _context4.t0 = config;

              if (_context4.t0) {
                _context4.next = 5;
                break;
              }

              _context4.next = 4;
              return CountdownService.getConfig();

            case 4:
              _context4.t0 = _context4.sent;

            case 5:
              finalConfig = _context4.t0;
              _context4.next = 8;
              return CountdownService.getCountdownStore();

            case 8:
              stores = _context4.sent;


              _this.logInfo(finalConfig, function () {
                return 'Fetching the most recent Countdown crawling result for Countdown Products Price...';
              });

              _context4.next = 12;
              return _smartGroceryParseServerCommon.CrawlSessionService.search((0, _immutable.Map)({
                conditions: (0, _immutable.Map)({
                  sessionKey: 'Countdown Products'
                }),
                topMost: true
              }));

            case 12:
              crawlSessionInfos = _context4.sent;
              sessionInfo = crawlSessionInfos.first();
              sessionId = sessionInfo.get('id');
              products = (0, _immutable.List)();


              _this.logInfo(finalConfig, function () {
                return 'Fetched the most recent Countdown crawling result for Countdown Products Price. Session Id: ' + sessionId;
              });

              result = _smartGroceryParseServerCommon.CrawlResultService.searchAll((0, _immutable.Map)({
                conditions: (0, _immutable.Map)({
                  crawlSessionId: sessionId
                })
              }));
              _context4.prev = 18;

              result.event.subscribe(function (info) {
                return products = products.concat(info.getIn(['resultSet', 'products']).filterNot(function (_) {
                  return _.get('description').trim().length === 0;
                }));
              });

              _context4.next = 22;
              return result.promise;

            case 22:
              _context4.prev = 22;

              result.event.unsubscribeAll();
              return _context4.finish(22);

            case 25:
              productsWithoutDuplication = products.groupBy(function (_) {
                return _.get('description');
              }).map(function (_) {
                return _.first();
              }).valueSeq();


              _this.logVerbose(finalConfig, function () {
                return 'Finding the product in master product...';
              });

              capturedDate = new Date();
              _context4.next = 30;
              return Promise.all(productsWithoutDuplication.map(function (product) {
                return _asyncToGenerator(regeneratorRuntime.mark(function _callee3() {
                  var results, masterProduct, masterProductPriceInfo;
                  return regeneratorRuntime.wrap(function _callee3$(_context3) {
                    while (1) {
                      switch (_context3.prev = _context3.next) {
                        case 0:
                          _context3.next = 2;
                          return _smartGroceryParseServerCommon.MasterProductService.search((0, _immutable.Map)({
                            conditions: product
                          }));

                        case 2:
                          results = _context3.sent;

                          if (!results.isEmpty()) {
                            _context3.next = 7;
                            break;
                          }

                          throw new _microBusinessParseServerCommon.Exception('No master product found for: ' + JSON.stringify(product.toJS()));

                        case 7:
                          if (!(results.size > 1)) {
                            _context3.next = 9;
                            break;
                          }

                          throw new _microBusinessParseServerCommon.Exception('Multiple master products found for: ' + JSON.stringify(product.toJS()));

                        case 9:
                          masterProduct = results.first();
                          masterProductPriceInfo = (0, _immutable.Map)({
                            masterProductId: masterProduct.get('id'),
                            storeId: stores.find(function (_) {
                              return _.get('name').localeCompare('Countdown') === 0;
                            }).get('id'),
                            capturedDate: capturedDate,
                            priceDetails: (0, _immutable.Map)({
                              specialType: CountdownService.getSpecialType(product),
                              price: CountdownService.convertPriceStringToDecimal(CountdownService.getPrice(product)),
                              wasPrice: CountdownService.convertPriceStringToDecimal(CountdownService.getWasPrice(product)),
                              multiBuyInfo: CountdownService.getMultiBuyInfo(product)
                            })
                          });
                          _context3.next = 13;
                          return _smartGroceryParseServerCommon.MasterProductPriceService.create(masterProductPriceInfo);

                        case 13:
                        case 'end':
                          return _context3.stop();
                      }
                    }
                  }, _callee3, _this);
                }));
              }).toArray());

            case 30:
            case 'end':
              return _context4.stop();
          }
        }
      }, _callee4, _this, [[18,, 22, 25]]);
    }));

    return function (_x3) {
      return _ref4.apply(this, arguments);
    };
  }();

  this.syncToTagList = function () {
    var _ref6 = _asyncToGenerator(regeneratorRuntime.mark(function _callee5(config) {
      var finalConfig, existingTags, crawlSessionInfos, sessionInfo, sessionId, tags, result, newTags;
      return regeneratorRuntime.wrap(function _callee5$(_context5) {
        while (1) {
          switch (_context5.prev = _context5.next) {
            case 0:
              _context5.t0 = config;

              if (_context5.t0) {
                _context5.next = 5;
                break;
              }

              _context5.next = 4;
              return CountdownService.getConfig();

            case 4:
              _context5.t0 = _context5.sent;

            case 5:
              finalConfig = _context5.t0;
              _context5.next = 8;
              return CountdownService.getExistingTags();

            case 8:
              existingTags = _context5.sent;


              _this.logInfo(finalConfig, function () {
                return 'Fetching the most recent Countdown crawling result for Countdown Products Price...';
              });

              _context5.next = 12;
              return _smartGroceryParseServerCommon.CrawlSessionService.search((0, _immutable.Map)({
                conditions: (0, _immutable.Map)({
                  sessionKey: 'Countdown Products'
                }),
                topMost: true
              }));

            case 12:
              crawlSessionInfos = _context5.sent;
              sessionInfo = crawlSessionInfos.first();
              sessionId = sessionInfo.get('id');
              tags = (0, _immutable.Set)();


              _this.logInfo(finalConfig, function () {
                return 'Fetched the most recent Countdown crawling result for Countdown Products Price. Session Id: ' + sessionId;
              });

              result = _smartGroceryParseServerCommon.CrawlResultService.searchAll((0, _immutable.Map)({
                conditions: (0, _immutable.Map)({
                  crawlSessionId: sessionId
                })
              }));
              _context5.prev = 18;

              result.event.subscribe(function (info) {
                return tags = tags.add(info.getIn(['resultSet', 'productCategory']));
              });

              _context5.next = 22;
              return result.promise;

            case 22:
              _context5.prev = 22;

              result.event.unsubscribeAll();
              return _context5.finish(22);

            case 25:
              newTags = tags.filterNot(function (tag) {
                return existingTags.find(function (_) {
                  return _.get('name').toLowerCase().trim().localeCompare(tag.toLowerCase().trim()) === 0;
                });
              });
              _context5.next = 28;
              return Promise.all(newTags.map(function (tag) {
                return _smartGroceryParseServerCommon.TagService.create((0, _immutable.Map)({
                  name: tag,
                  weight: 1
                }));
              }).toArray());

            case 28:
            case 'end':
              return _context5.stop();
          }
        }
      }, _callee5, _this, [[18,, 22, 25]]);
    }));

    return function (_x4) {
      return _ref6.apply(this, arguments);
    };
  }();

  this.syncMasterProductTags = function () {
    var _ref7 = _asyncToGenerator(regeneratorRuntime.mark(function _callee7(config) {
      var finalConfig, existingTags, crawlSessionInfos, sessionInfo, sessionId, products, result, productsGroupedByDescription;
      return regeneratorRuntime.wrap(function _callee7$(_context7) {
        while (1) {
          switch (_context7.prev = _context7.next) {
            case 0:
              _context7.t0 = config;

              if (_context7.t0) {
                _context7.next = 5;
                break;
              }

              _context7.next = 4;
              return CountdownService.getConfig();

            case 4:
              _context7.t0 = _context7.sent;

            case 5:
              finalConfig = _context7.t0;
              _context7.next = 8;
              return CountdownService.getExistingTags();

            case 8:
              existingTags = _context7.sent;


              _this.logInfo(finalConfig, function () {
                return 'Fetching the most recent Countdown crawling result for Countdown Products Price...';
              });

              _context7.next = 12;
              return _smartGroceryParseServerCommon.CrawlSessionService.search((0, _immutable.Map)({
                conditions: (0, _immutable.Map)({
                  sessionKey: 'Countdown Products'
                }),
                topMost: true
              }));

            case 12:
              crawlSessionInfos = _context7.sent;
              sessionInfo = crawlSessionInfos.first();
              sessionId = sessionInfo.get('id');
              products = (0, _immutable.List)();


              _this.logInfo(finalConfig, function () {
                return 'Fetched the most recent Countdown crawling result for Countdown Products Price. Session Id: ' + sessionId;
              });

              result = _smartGroceryParseServerCommon.CrawlResultService.searchAll((0, _immutable.Map)({
                conditions: (0, _immutable.Map)({
                  crawlSessionId: sessionId
                })
              }));
              _context7.prev = 18;

              result.event.subscribe(function (info) {
                var resultSet = info.get('resultSet');

                products = products.concat(resultSet.get('products').filterNot(function (_) {
                  return _.get('description').trim().length === 0;
                }).map(function (_) {
                  return _.set('productCategory', resultSet.get('productCategory'));
                }));
              });

              _context7.next = 22;
              return result.promise;

            case 22:
              _context7.prev = 22;

              result.event.unsubscribeAll();
              return _context7.finish(22);

            case 25:
              productsGroupedByDescription = products.groupBy(function (_) {
                return _.get('description');
              });


              _this.logVerbose(finalConfig, function () {
                return 'Finding the product in master product...';
              });

              _context7.next = 29;
              return Promise.all(productsGroupedByDescription.keySeq().map(function (key) {
                return _asyncToGenerator(regeneratorRuntime.mark(function _callee6() {
                  var product, results, existingProduct, tags, notFoundTags, tagIds, newTagIds;
                  return regeneratorRuntime.wrap(function _callee6$(_context6) {
                    while (1) {
                      switch (_context6.prev = _context6.next) {
                        case 0:
                          product = productsGroupedByDescription.get(key).first();
                          _context6.next = 3;
                          return _smartGroceryParseServerCommon.MasterProductService.search((0, _immutable.Map)({
                            conditions: product
                          }));

                        case 3:
                          results = _context6.sent;

                          if (!results.isEmpty()) {
                            _context6.next = 8;
                            break;
                          }

                          throw new _microBusinessParseServerCommon.Exception('No master product found for: ' + JSON.stringify(product.toJS()));

                        case 8:
                          if (!(results.size > 1)) {
                            _context6.next = 10;
                            break;
                          }

                          throw new _microBusinessParseServerCommon.Exception('Multiple master products found for: ' + JSON.stringify(product.toJS()));

                        case 10:
                          existingProduct = results.first();
                          tags = productsGroupedByDescription.get(key).map(function (_) {
                            return _.get('productCategory');
                          }).toSet();
                          notFoundTags = tags.filterNot(function (tag) {
                            return existingTags.find(function (existingTag) {
                              return existingTag.get('name').toLowerCase().trim().localeCompare(tag.toLowerCase().trim()) === 0;
                            });
                          });

                          if (notFoundTags.isEmpty()) {
                            _context6.next = 15;
                            break;
                          }

                          throw new _microBusinessParseServerCommon.Exception('Multiple master products found for: ' + JSON.stringify(notFoundTags.toJS()));

                        case 15:
                          tagIds = tags.map(function (tag) {
                            return existingTags.find(function (existingTag) {
                              return existingTag.get('name').toLowerCase().trim().localeCompare(tag.toLowerCase().trim()) === 0;
                            }).get('id');
                          });
                          newTagIds = tagIds.filterNot(function (tagId) {
                            return existingProduct.get('tagIds').find(function (id) {
                              return id === tagId;
                            });
                          });

                          if (!newTagIds.isEmpty()) {
                            _context6.next = 19;
                            break;
                          }

                          return _context6.abrupt('return');

                        case 19:
                          _context6.next = 21;
                          return _smartGroceryParseServerCommon.MasterProductService.update(existingProduct.update('tagIds', function (currentTags) {
                            if (currentTags) {
                              return currentTags.concat(newTagIds);
                            }

                            return newTagIds;
                          }));

                        case 21:
                        case 'end':
                          return _context6.stop();
                      }
                    }
                  }, _callee6, _this);
                }));
              }).toArray());

            case 29:
            case 'end':
              return _context7.stop();
          }
        }
      }, _callee7, _this, [[18,, 22, 25]]);
    }));

    return function (_x5) {
      return _ref7.apply(this, arguments);
    };
  }();

  this.logVerbose = function (config, messageFunc) {
    if (_this.logVerboseFunc && config && config.get('logLevel') && config.get('logLevel') >= 3 && messageFunc) {
      _this.logVerboseFunc(messageFunc());
    }
  };

  this.logInfo = function (config, messageFunc) {
    if (_this.logInfoFunc && config && config.get('logLevel') && config.get('logLevel') >= 2 && messageFunc) {
      _this.logInfoFunc(messageFunc());
    }
  };

  this.logError = function (config, messageFunc) {
    if (_this.logErrorFunc && config && config.get('logLevel') && config.get('logLevel') >= 1 && messageFunc) {
      _this.logErrorFunc(messageFunc());
    }
  };

  this.logVerboseFunc = logVerboseFunc;
  this.logInfoFunc = logInfoFunc;
  this.logErrorFunc = logErrorFunc;
};

CountdownService.getConfig = _asyncToGenerator(regeneratorRuntime.mark(function _callee8() {
  var config, jobConfig;
  return regeneratorRuntime.wrap(function _callee8$(_context8) {
    while (1) {
      switch (_context8.prev = _context8.next) {
        case 0:
          _context8.next = 2;
          return _microBusinessParseServerCommon.ParseWrapperService.getConfig();

        case 2:
          config = _context8.sent;
          jobConfig = config.get('Job');

          if (!jobConfig) {
            _context8.next = 6;
            break;
          }

          return _context8.abrupt('return', _immutable2.default.fromJS(jobConfig));

        case 6:
          throw new _microBusinessParseServerCommon.Exception('No config found called Job.');

        case 7:
        case 'end':
          return _context8.stop();
      }
    }
  }, _callee8, undefined);
}));
CountdownService.getCountdownStore = _asyncToGenerator(regeneratorRuntime.mark(function _callee9() {
  var criteria, results;
  return regeneratorRuntime.wrap(function _callee9$(_context9) {
    while (1) {
      switch (_context9.prev = _context9.next) {
        case 0:
          criteria = (0, _immutable.Map)({
            conditions: (0, _immutable.Map)({
              name: 'Countdown'
            })
          });
          _context9.next = 3;
          return _smartGroceryParseServerCommon.StoreService.search(criteria);

        case 3:
          results = _context9.sent;

          if (!results.isEmpty()) {
            _context9.next = 8;
            break;
          }

          throw new _microBusinessParseServerCommon.Exception('No store found called Countdown.');

        case 8:
          if (!(results.size === 1)) {
            _context9.next = 12;
            break;
          }

          return _context9.abrupt('return', results.first());

        case 12:
          throw new _microBusinessParseServerCommon.Exception('Multiple store found called Countdown.');

        case 13:
        case 'end':
          return _context9.stop();
      }
    }
  }, _callee9, undefined);
}));
CountdownService.getExistingTags = _asyncToGenerator(regeneratorRuntime.mark(function _callee10() {
  var result, tags;
  return regeneratorRuntime.wrap(function _callee10$(_context10) {
    while (1) {
      switch (_context10.prev = _context10.next) {
        case 0:
          result = _smartGroceryParseServerCommon.TagService.searchAll((0, _immutable.Map)());
          _context10.prev = 1;
          tags = (0, _immutable.List)();


          result.event.subscribe(function (info) {
            return tags = tags.push(info);
          });

          _context10.next = 6;
          return result.promise;

        case 6:
          return _context10.abrupt('return', tags);

        case 7:
          _context10.prev = 7;

          result.event.unsubscribeAll();
          return _context10.finish(7);

        case 10:
        case 'end':
          return _context10.stop();
      }
    }
  }, _callee10, undefined, [[1,, 7, 10]]);
}));

CountdownService.getSpecialType = function (product) {
  if (product.has('special') && product.get('special')) {
    return 'special';
  }

  if (product.has('onecard') && product.get('onecard')) {
    return 'onecard';
  }

  if (product.has('specialMultiBuyText') && product.get('specialMultiBuyText') || product.has('multiBuyText') && product.get('multiBuyText')) {
    return 'multibuy';
  }

  return 'none';
};

CountdownService.getPrice = function (product) {
  var specialType = CountdownService.getSpecialType(product);
  var price = product.get('price');

  if (specialType.localeCompare('special') === 0) {
    return price.substring(1, price.indexOf(' '));
  } else if (specialType.localeCompare('onecard') === 0) {
    if (product.has('nonClubPrice')) {
      var nonClubPrice = product.get('nonClubPrice');

      return nonClubPrice.substring(nonClubPrice.indexOf('$') + 1);
    }

    return price.substring(1, price.indexOf(' '));
  } else if (specialType.localeCompare('multibuy') === 0) {
    return price.substring(1, price.indexOf(' '));
  }

  return price.substring(1, price.indexOf(' '));
};

CountdownService.getWasPrice = function (product) {
  var specialType = CountdownService.getSpecialType(product);

  if (specialType.localeCompare('special') === 0) {
    return product.has('wasPrice') ? product.get('wasPrice').substring(product.get('wasPrice').indexOf('$') + 1) : undefined;
  } else if (specialType.localeCompare('onecard') === 0) {
    if (product.has('clubPrice')) {
      var clubPrice = product.get('clubPrice');

      return clubPrice.substring(1, clubPrice.indexOf(' '));
    }

    return undefined;
  } else if (specialType.localeCompare('multibuy') === 0) {
    return undefined;
  }

  return undefined;
};

CountdownService.getMultiBuyInfo = function (product) {
  var specialType = CountdownService.getSpecialType(product);

  if (specialType.localeCompare('multibuy') === 0) {
    if (product.has('specialMultiBuyText')) {
      var specialMultiBuyText = product.get('specialMultiBuyText');

      return (0, _immutable.Map)({
        count: parseInt(specialMultiBuyText.substring(0, specialMultiBuyText.indexOf('for')), 10),
        price: CountdownService.convertPriceStringToDecimal(specialMultiBuyText.substring(specialMultiBuyText.indexOf('for') + 'for'.length))
      });
    } else if (product.has('multiBuyText')) {
      var multiBuyText = product.get('multiBuyText');

      return (0, _immutable.Map)({
        count: parseInt(multiBuyText.substring(0, multiBuyText.indexOf(' ')), 10),
        price: CountdownService.convertPriceStringToDecimal(multiBuyText.substring(multiBuyText.indexOf('for ') + 'for '.length))
      });
    }

    return undefined;
  }

  return undefined;
};

CountdownService.convertPriceStringToDecimal = function (price) {
  if (price) {
    return parseFloat(price);
  }

  return undefined;
};

exports.default = CountdownService;