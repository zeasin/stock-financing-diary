/*!
 * jQuery Typeahead
 * Copyright (C) 2017 RunningCoder.org
 * Licensed under the MIT license
 *
 * @author Tom Bertrand
 * @version 2.8.0 (2017-3-1)
 * @link http://www.runningcoder.org/jquerytypeahead/
 */
;
(function(factory) {
	if (typeof define === 'function' && define.amd) {
		define('jquery-typeahead', ['jquery'], function(jQuery) {
			return factory(jQuery);
		});
	} else if (typeof module === 'object' && module.exports) {
		module.exports = function(jQuery, root) {
			if (jQuery === undefined) {
				if (typeof window !== 'undefined') {
					jQuery = require('jquery');
				} else {
					jQuery = require('jquery')(root);
				}
			}
			return factory(jQuery);
		}();
	} else {
		factory(jQuery);
	}
}(function($) {
	"use strict";
	window.Typeahead = {
		version: '2.8.0'
	};
	var _options = {
		input: null,
		minLength: 2,
		maxLength: false,
		maxItem: 8,
		dynamic: false,
		delay: 300,
		order: null,
		offset: false,
		hint: false,
		accent: false,
		highlight: true,
		group: false,
		groupOrder: null,
		maxItemPerGroup: null,
		dropdownFilter: false,
		dynamicFilter: null,
		backdrop: false,
		backdropOnFocus: false,
		cache: false,
		ttl: 3600000,
		compression: false,
		searchOnFocus: false,
		blurOnTab: true,
		resultContainer: null,
		generateOnLoad: null,
		mustSelectItem: false,
		href: null,
		display: ["display"],
		template: null,
		templateValue: null,
		groupTemplate: null,
		correlativeTemplate: false,
		emptyTemplate: false,
		cancelButton: true,
		loadingAnimation: true,
		filter: true,
		matcher: null,
		source: null,
		callback: {
			onInit: null,
			onReady: null,
			onShowLayout: null,
			onHideLayout: null,
			onSearch: null,
			onResult: null,
			onLayoutBuiltBefore: null,
			onLayoutBuiltAfter: null,
			onNavigateBefore: null,
			onNavigateAfter: null,
			onMouseEnter: null,
			onMouseLeave: null,
			onClickBefore: null,
			onClickAfter: null,
			onDropdownFilter: null,
			onSendRequest: null,
			onReceiveRequest: null,
			onPopulateSource: null,
			onCacheSave: null,
			onSubmit: null,
			onCancel: null
		},
		selector: {
			container: "typeahead__container",
			result: "typeahead__result",
			list: "typeahead__list",
			group: "typeahead__group",
			item: "typeahead__item",
			empty: "typeahead__empty",
			display: "typeahead__display",
			query: "typeahead__query",
			filter: "typeahead__filter",
			filterButton: "typeahead__filter-button",
			dropdown: "typeahead__dropdown",
			dropdownItem: "typeahead__dropdown-item",
			button: "typeahead__button",
			backdrop: "typeahead__backdrop",
			hint: "typeahead__hint",
			cancelButton: "typeahead__cancel-button"
		},
		debug: false
	};
	var _namespace = ".typeahead";
	var _accent = {
		from: "茫脿谩盲芒岷矫┟得裁趁睹疵姑好济幻泵�",
		to: "aaaaaeeeeeiiiiooooouuuunc"
	};
	var _isIE9 = ~window.navigator.appVersion.indexOf("MSIE 9.");
	var _isIE10 = ~window.navigator.appVersion.indexOf("MSIE 10");
	var _isIE11 = ~window.navigator.userAgent.indexOf("Trident") && ~window.navigator.userAgent.indexOf("rv:11");
	var Typeahead = function(node, options) {
			this.rawQuery = node.val() || '';
			this.query = node.val() || '';
			this.selector = node[0].selector;
			this.deferred = null;
			this.tmpSource = {};
			this.source = {};
			this.dynamicGroups = [];
			this.hasDynamicGroups = false;
			this.generatedGroupCount = 0;
			this.groupBy = "group";
			this.groups = [];
			this.searchGroups = [];
			this.generateGroups = [];
			this.requestGroups = [];
			this.result = {};
			this.groupTemplate = '';
			this.resultHtml = null;
			this.resultCount = 0;
			this.resultCountPerGroup = {};
			this.options = options;
			this.node = node;
			this.namespace = '.' + this.helper.slugify.call(this, this.selector) + _namespace;
			this.container = null;
			this.resultContainer = null;
			this.item = null;
			this.xhr = {};
			this.hintIndex = null;
			this.filters = {
				dropdown: {},
				dynamic: {}
			};
			this.dropdownFilter = {
				static: [],
				dynamic: []
			};
			this.dropdownFilterAll = null;
			this.isDropdownEvent = false;
			this.requests = {};
			this.backdrop = {};
			this.hint = {};
			this.hasDragged = false;
			this.focusOnly = false;
			this.__construct();
		};
	Typeahead.prototype = {
		_validateCacheMethod: function(cache) {
			var supportedCache = ['localStorage', 'sessionStorage'],
				supported;
			if (cache === true) {
				cache = 'localStorage';
			} else if (typeof cache === "string" && !~supportedCache.indexOf(cache)) {
				if (this.options.debug) {
					_debug.log({
						'node': this.selector,
						'function': 'extendOptions()',
						'message': 'Invalid options.cache, possible options are "localStorage" or "sessionStorage"'
					});
					_debug.print();
				}
				return false;
			}
			supported = typeof window[cache] !== "undefined";
			try {
				window[cache].setItem("typeahead", "typeahead");
				window[cache].removeItem("typeahead");
			} catch (e) {
				supported = false;
			}
			return supported && cache || false;
		},
		extendOptions: function() {
			this.options.cache = this._validateCacheMethod(this.options.cache);
			if (this.options.compression) {
				if (typeof LZString !== 'object' || !this.options.cache) {
					if (this.options.debug) {
						_debug.log({
							'node': this.selector,
							'function': 'extendOptions()',
							'message': 'Missing LZString Library or options.cache, no compression will occur.'
						});
						_debug.print();
					}
					this.options.compression = false;
				}
			}
			if (!this.options.maxLength || isNaN(this.options.maxLength)) {
				this.options.maxLength = Infinity;
			}
			if (typeof this.options.maxItem !== "undefined" && ~ [0, false].indexOf(this.options.maxItem)) {
				this.options.maxItem = Infinity;
			}
			if (this.options.maxItemPerGroup && !/^\d+$/.test(this.options.maxItemPerGroup)) {
				this.options.maxItemPerGroup = null;
			}
			if (this.options.display && !Array.isArray(this.options.display)) {
				this.options.display = [this.options.display];
			}
			if (this.options.group) {
				if (!Array.isArray(this.options.group)) {
					if (typeof this.options.group === "string") {
						this.options.group = {
							key: this.options.group
						};
					} else if (typeof this.options.group === "boolean") {
						this.options.group = {
							key: 'group'
						};
					}
					this.options.group.key = this.options.group.key || "group";
				} else {
					if (this.options.debug) {
						_debug.log({
							'node': this.selector,
							'function': 'extendOptions()',
							'message': 'options.group must be a boolean|string|object as of 2.5.0'
						});
						_debug.print();
					}
				}
			}
			if (this.options.highlight && !~ ["any", true].indexOf(this.options.highlight)) {
				this.options.highlight = false;
			}
			if (this.options.dropdownFilter && this.options.dropdownFilter instanceof Object) {
				if (!Array.isArray(this.options.dropdownFilter)) {
					this.options.dropdownFilter = [this.options.dropdownFilter];
				}
				for (var i = 0, ii = this.options.dropdownFilter.length; i < ii; ++i) {
					this.dropdownFilter[this.options.dropdownFilter[i].value ? 'static' : 'dynamic'].push(this.options.dropdownFilter[i]);
				}
			}
			if (this.options.dynamicFilter && !Array.isArray(this.options.dynamicFilter)) {
				this.options.dynamicFilter = [this.options.dynamicFilter];
			}
			if (this.options.accent) {
				if (typeof this.options.accent === "object") {
					if (this.options.accent.from && this.options.accent.to && this.options.accent.from.length === this.options.accent.to.length) {} else {
						if (this.options.debug) {
							_debug.log({
								'node': this.selector,
								'function': 'extendOptions()',
								'message': 'Invalid "options.accent", from and to must be defined and same length.'
							});
							_debug.print();
						}
					}
				} else {
					this.options.accent = _accent;
				}
			}
			if (this.options.groupTemplate) {
				this.groupTemplate = this.options.groupTemplate;
			}
			if (this.options.resultContainer) {
				if (typeof this.options.resultContainer === "string") {
					this.options.resultContainer = $(this.options.resultContainer);
				}
				if (!(this.options.resultContainer instanceof $) || !this.options.resultContainer[0]) {
					if (this.options.debug) {
						_debug.log({
							'node': this.selector,
							'function': 'extendOptions()',
							'message': 'Invalid jQuery selector or jQuery Object for "options.resultContainer".'
						});
						_debug.print();
					}
				} else {
					this.resultContainer = this.options.resultContainer;
				}
			}
			if (this.options.maxItemPerGroup && this.options.group && this.options.group.key) {
				this.groupBy = this.options.group.key;
			}
			if (this.options.callback && this.options.callback.onClick) {
				this.options.callback.onClickBefore = this.options.callback.onClick;
				delete this.options.callback.onClick;
			}
			if (this.options.callback && this.options.callback.onNavigate) {
				this.options.callback.onNavigateBefore = this.options.callback.onNavigate;
				delete this.options.callback.onNavigate;
			}
			this.options = $.extend(true, {}, _options, this.options);
		},
		unifySourceFormat: function() {
			this.dynamicGroups = [];
			if (Array.isArray(this.options.source)) {
				this.options.source = {
					group: {
						data: this.options.source
					}
				};
			}
			if (typeof this.options.source === "string") {
				this.options.source = {
					group: {
						ajax: {
							url: this.options.source
						}
					}
				};
			}
			if (this.options.source.ajax) {
				this.options.source = {
					group: {
						ajax: this.options.source.ajax
					}
				};
			}
			if (this.options.source.url || this.options.source.data) {
				this.options.source = {
					group: this.options.source
				};
			}
			var group, groupSource, tmpAjax;
			for (group in this.options.source) {
				if (!this.options.source.hasOwnProperty(group)) continue;
				groupSource = this.options.source[group];
				if (typeof groupSource === "string") {
					groupSource = {
						ajax: {
							url: groupSource
						}
					};
				}
				tmpAjax = groupSource.url || groupSource.ajax;
				if (Array.isArray(tmpAjax)) {
					groupSource.ajax = typeof tmpAjax[0] === "string" ? {
						url: tmpAjax[0]
					} : tmpAjax[0];
					groupSource.ajax.path = groupSource.ajax.path || tmpAjax[1] || null;
					delete groupSource.url;
				} else {
					if (typeof groupSource.url === "object") {
						groupSource.ajax = groupSource.url;
					} else if (typeof groupSource.url === "string") {
						groupSource.ajax = {
							url: groupSource.url
						};
					}
					delete groupSource.url;
				}
				if (!groupSource.data && !groupSource.ajax) {
					if (this.options.debug) {
						_debug.log({
							'node': this.selector,
							'function': 'unifySourceFormat()',
							'arguments': JSON.stringify(this.options.source),
							'message': 'Undefined "options.source.' + group + '.[data|ajax]" is Missing - Typeahead dropped'
						});
						_debug.print();
					}
					return false;
				}
				if (groupSource.display && !Array.isArray(groupSource.display)) {
					groupSource.display = [groupSource.display];
				}
				groupSource.minLength = typeof groupSource.minLength === "number" ? groupSource.minLength : this.options.minLength;
				groupSource.maxLength = typeof groupSource.maxLength === "number" ? groupSource.maxLength : this.options.maxLength;
				groupSource.dynamic = typeof groupSource.dynamic === "boolean" || this.options.dynamic;
				if (groupSource.minLength > groupSource.maxLength) {
					groupSource.minLength = groupSource.maxLength;
				}
				this.options.source[group] = groupSource;
				if (this.options.source[group].dynamic) {
					this.dynamicGroups.push(group);
				}
				groupSource.cache = typeof groupSource.cache !== "undefined" ? this._validateCacheMethod(groupSource.cache) : this.options.cache;
				if (groupSource.compression) {
					if (typeof LZString !== 'object' || !groupSource.cache) {
						if (this.options.debug) {
							_debug.log({
								'node': this.selector,
								'function': 'unifySourceFormat()',
								'message': 'Missing LZString Library or group.cache, no compression will occur on group: ' + group
							});
							_debug.print();
						}
						groupSource.compression = false;
					}
				}
			}
			this.hasDynamicGroups = this.options.dynamic || !! this.dynamicGroups.length;
			return true;
		},
		init: function() {
			this.helper.executeCallback.call(this, this.options.callback.onInit, [this.node]);
			this.container = this.node.closest('.' + this.options.selector.container);
			if (this.options.debug) {
				_debug.log({
					'node': this.selector,
					'function': 'init()',
					'message': 'OK - Typeahead activated on ' + this.selector
				});
				_debug.print();
			}
		},
		delegateEvents: function() {
			var scope = this,
				events = ['focus' + this.namespace, 'input' + this.namespace, 'propertychange' + this.namespace, 'keydown' + this.namespace, 'keyup' + this.namespace, 'search' + this.namespace, 'generate' + this.namespace];
			$('html').on("touchmove", function() {
				scope.hasDragged = true;
			}).on("touchstart", function() {
				scope.hasDragged = false;
			});
			this.node.closest('form').on("submit", function(e) {
				if (scope.options.mustSelectItem && scope.helper.isEmpty(scope.item)) {
					e.preventDefault();
					return;
				}
				if (!scope.options.backdropOnFocus) {
					scope.hideLayout();
				}
				if (scope.options.callback.onSubmit) {
					return scope.helper.executeCallback.call(scope, scope.options.callback.onSubmit, [scope.node, this, scope.item, e]);
				}
			}).on("reset", function() {
				setTimeout(function() {
					scope.node.trigger('input' + scope.namespace);
					scope.hideLayout();
				});
			});
			var preventNextEvent = false;
			if (this.node.attr('placeholder') && (_isIE10 || _isIE11)) {
				var preventInputEvent = true;
				this.node.on("focusin focusout", function() {
					preventInputEvent = !! (!this.value && this.placeholder);
				});
				this.node.on("input", function(e) {
					if (preventInputEvent) {
						e.stopImmediatePropagation();
						preventInputEvent = false;
					}
				});
			}
			this.node.off(this.namespace).on(events.join(' '), function(e, originalEvent) {
				switch (e.type) {
				case "generate":
					scope.generateSource(Object.keys(scope.options.source));
					break;
				case "focus":
					if (scope.focusOnly) {
						scope.focusOnly = false;
						break;
					}
					if (scope.options.backdropOnFocus) {
						scope.buildBackdropLayout();
						scope.showLayout();
					}
					if (scope.options.searchOnFocus) {
						scope.deferred = $.Deferred();
						scope.generateSource();
					}
					break;
				case "keydown":
					if (e.keyCode && ~ [9, 13, 27, 38, 39, 40].indexOf(e.keyCode)) {
						preventNextEvent = true;
						scope.navigate(e);
					}
					break;
				case "keyup":
					if (_isIE9 && scope.node[0].value.replace(/^\s+/, '').toString().length < scope.query.length) {
						scope.node.trigger('input' + scope.namespace);
					}
					break;
				case "propertychange":
					if (preventNextEvent) {
						preventNextEvent = false;
						break;
					}
				case "input":
					scope.deferred = $.Deferred();
					scope.rawQuery = scope.node[0].value.toString();
					scope.query = scope.rawQuery.replace(/^\s+/, '');
					if (scope.rawQuery === "" && scope.query === "") {
						e.originalEvent = originalEvent || {};
						scope.helper.executeCallback.call(scope, scope.options.callback.onCancel, [scope.node, e]);
					}
					scope.options.cancelButton && scope.toggleCancelButtonVisibility();
					if (scope.options.hint && scope.hint.container && scope.hint.container.val() !== '') {
						if (scope.hint.container.val().indexOf(scope.rawQuery) !== 0) {
							scope.hint.container.val('');
						}
					}
					if (scope.hasDynamicGroups) {
						scope.helper.typeWatch(function() {
							scope.generateSource();
						}, scope.options.delay);
					} else {
						scope.generateSource();
					}
					break;
				case "search":
					scope.searchResult();
					scope.buildLayout();
					if (scope.result.length || (scope.searchGroups.length && scope.options.emptyTemplate && scope.query.length)) {
						scope.showLayout();
					} else {
						scope.hideLayout();
					}
					scope.deferred && scope.deferred.resolve();
					break;
				}
				return scope.deferred && scope.deferred.promise();
			});
			if (this.options.generateOnLoad) {
				this.node.trigger('generate' + this.namespace);
			}
		},
		filterGenerateSource: function() {
			this.searchGroups = [];
			this.generateGroups = [];
			for (var group in this.options.source) {
				if (!this.options.source.hasOwnProperty(group)) continue;
				if (this.query.length >= this.options.source[group].minLength && this.query.length <= this.options.source[group].maxLength) {
					this.searchGroups.push(group);
					if (!this.options.source[group].dynamic && this.source[group]) {
						continue;
					}
					this.generateGroups.push(group);
				}
			}
		},
		generateSource: function(generateGroups) {
			this.filterGenerateSource();
			if (Array.isArray(generateGroups) && generateGroups.length) {
				this.generateGroups = generateGroups;
			} else if (!this.generateGroups.length) {
				this.node.trigger('search' + this.namespace);
				return;
			}
			this.requestGroups = [];
			this.generatedGroupCount = 0;
			this.options.loadingAnimation && this.container.addClass('loading');
			if (!this.helper.isEmpty(this.xhr)) {
				for (var i in this.xhr) {
					if (!this.xhr.hasOwnProperty(i)) continue;
					this.xhr[i].abort();
				}
				this.xhr = {};
			}
			var scope = this,
				group, groupData, groupSource, cache, compression, dataInStorage, isValidStorage;
			for (var i = 0, ii = this.generateGroups.length; i < ii; ++i) {
				group = this.generateGroups[i];
				groupSource = this.options.source[group];
				cache = groupSource.cache;
				compression = groupSource.compression;
				if (cache) {
					dataInStorage = window[cache].getItem('TYPEAHEAD_' + this.selector + ":" + group);
					if (dataInStorage) {
						if (compression) {
							dataInStorage = LZString.decompressFromUTF16(dataInStorage);
						}
						isValidStorage = false;
						try {
							dataInStorage = JSON.parse(dataInStorage + "");
							if (dataInStorage.data && dataInStorage.ttl > new Date().getTime()) {
								this.populateSource(dataInStorage.data, group);
								isValidStorage = true;
								if (this.options.debug) {
									_debug.log({
										'node': this.selector,
										'function': 'generateSource()',
										'message': 'Source for group "' + group + '" found in ' + cache
									});
									_debug.print();
								}
							} else {
								window[cache].removeItem('TYPEAHEAD_' + this.selector + ":" + group);
							}
						} catch (error) {}
						if (isValidStorage) continue;
					}
				}
				if (groupSource.data && !groupSource.ajax) {
					if (typeof groupSource.data === "function") {
						groupData = groupSource.data.call(this);
						if (Array.isArray(groupData)) {
							scope.populateSource(groupData, group);
						} else if (typeof groupData.promise === "function") {
							(function(group) {
								$.when(groupData).then(function(deferredData) {
									if (deferredData && Array.isArray(deferredData)) {
										scope.populateSource(deferredData, group);
									}
								});
							})(group);
						}
					} else {
						this.populateSource($.extend(true, [], groupSource.data), group);
					}
					continue;
				}
				if (groupSource.ajax) {
					if (!this.requests[group]) {
						this.requests[group] = this.generateRequestObject(group);
					}
					this.requestGroups.push(group);
				}
			}
			if (this.requestGroups.length) {
				this.handleRequests();
			}
			return !!this.generateGroups.length;
		},
		generateRequestObject: function(group) {
			var scope = this,
				groupSource = this.options.source[group];
			var xhrObject = {
				request: {
					url: groupSource.ajax.url || null,
					dataType: 'json',
					beforeSend: function(jqXHR, options) {
						scope.xhr[group] = jqXHR;
						var beforeSend = scope.requests[group].callback.beforeSend || groupSource.ajax.beforeSend;
						typeof beforeSend === "function" && beforeSend.apply(null, arguments);
					}
				},
				callback: {
					beforeSend: null,
					done: null,
					fail: null,
					then: null,
					always: null
				},
				extra: {
					path: groupSource.ajax.path || null,
					group: group
				},
				validForGroup: [group]
			};
			if (typeof groupSource.ajax !== "function") {
				if (groupSource.ajax instanceof Object) {
					xhrObject = this.extendXhrObject(xhrObject, groupSource.ajax);
				}
				if (Object.keys(this.options.source).length > 1) {
					for (var _group in this.requests) {
						if (!this.requests.hasOwnProperty(_group)) continue;
						if (this.requests[_group].isDuplicated) continue;
						if (xhrObject.request.url && xhrObject.request.url === this.requests[_group].request.url) {
							this.requests[_group].validForGroup.push(group);
							xhrObject.isDuplicated = true;
							delete xhrObject.validForGroup;
						}
					}
				}
			}
			return xhrObject;
		},
		extendXhrObject: function(xhrObject, groupRequest) {
			if (typeof groupRequest.callback === "object") {
				xhrObject.callback = groupRequest.callback;
				delete groupRequest.callback;
			}
			if (typeof groupRequest.beforeSend === "function") {
				xhrObject.callback.beforeSend = groupRequest.beforeSend;
				delete groupRequest.beforeSend;
			}
			xhrObject.request = $.extend(true, xhrObject.request, groupRequest);
			if (xhrObject.request.dataType.toLowerCase() === 'jsonp' && !xhrObject.request.jsonpCallback) {
				xhrObject.request.jsonpCallback = 'callback_' + xhrObject.extra.group;
			}
			return xhrObject;
		},
		handleRequests: function() {
			var scope = this,
				group, requestsCount = this.requestGroups.length;
			if (this.helper.executeCallback.call(this, this.options.callback.onSendRequest, [this.node, this.query]) === false) {
				return;
			}
			for (var i = 0, ii = this.requestGroups.length; i < ii; ++i) {
				group = this.requestGroups[i];
				if (this.requests[group].isDuplicated) continue;
				(function(group, xhrObject) {
					if (typeof scope.options.source[group].ajax === "function") {
						var _groupRequest = scope.options.source[group].ajax.call(scope, scope.query);
						xhrObject = scope.extendXhrObject(scope.generateRequestObject(group), (typeof _groupRequest === "object") ? _groupRequest : {});
						if (typeof xhrObject.request !== "object" || !xhrObject.request.url) {
							if (scope.options.debug) {
								_debug.log({
									'node': scope.selector,
									'function': 'handleRequests',
									'message': 'Source function must return an object containing ".url" key for group "' + group + '"'
								});
								_debug.print();
							}
							scope.populateSource([], group);
							return;
						}
						scope.requests[group] = xhrObject;
					}
					var _request, _isExtended = false,
						_data;
					if (~xhrObject.request.url.indexOf('{{query}}')) {
						if (!_isExtended) {
							xhrObject = $.extend(true, {}, xhrObject);
							_isExtended = true;
						}
						xhrObject.request.url = xhrObject.request.url.replace('{{query}}', encodeURIComponent(scope.query));
					}
					if (xhrObject.request.data) {
						for (var i in xhrObject.request.data) {
							if (!xhrObject.request.data.hasOwnProperty(i)) continue;
							if (~String(xhrObject.request.data[i]).indexOf('{{query}}')) {
								if (!_isExtended) {
									xhrObject = $.extend(true, {}, xhrObject);
									_isExtended = true;
								}
								xhrObject.request.data[i] = xhrObject.request.data[i].replace('{{query}}', scope.query);
								break;
							}
						}
					}
					$.ajax(xhrObject.request).done(function(data, textStatus, jqXHR) {
						_data = null;
						for (var i = 0, ii = xhrObject.validForGroup.length; i < ii; i++) {
							_request = scope.requests[xhrObject.validForGroup[i]];
							if (_request.callback.done instanceof Function) {
								_data = _request.callback.done.call(scope, data, textStatus, jqXHR);
								if (!Array.isArray(_data) || typeof _data !== "object") {
									if (scope.options.debug) {
										_debug.log({
											'node': scope.selector,
											'function': 'Ajax.callback.done()',
											'message': 'Invalid returned data has to be an Array'
										});
										_debug.print();
									}
								}
							}
						}
					}).fail(function(jqXHR, textStatus, errorThrown) {
						for (var i = 0, ii = xhrObject.validForGroup.length; i < ii; i++) {
							_request = scope.requests[xhrObject.validForGroup[i]];
							_request.callback.fail instanceof Function && _request.callback.fail.call(scope, jqXHR, textStatus, errorThrown);
						}
						if (scope.options.debug) {
							_debug.log({
								'node': scope.selector,
								'function': 'Ajax.callback.fail()',
								'arguments': JSON.stringify(xhrObject.request),
								'message': textStatus
							});
							console.log(errorThrown);
							_debug.print();
						}
					}).always(function(data, textStatus, jqXHR) {
						for (var i = 0, ii = xhrObject.validForGroup.length; i < ii; i++) {
							_request = scope.requests[xhrObject.validForGroup[i]];
							_request.callback.always instanceof Function && _request.callback.always.call(scope, data, textStatus, jqXHR);
							if (typeof jqXHR !== "object") return;
							scope.populateSource(typeof data.promise === "function" && [] || _data || data, _request.extra.group, _request.extra.path || _request.request.path);
							requestsCount -= 1;
							if (requestsCount === 0) {
								scope.helper.executeCallback.call(scope, scope.options.callback.onReceiveRequest, [scope.node, scope.query]);
							}
						}
					}).then(function(jqXHR, textStatus) {
						for (var i = 0, ii = xhrObject.validForGroup.length; i < ii; i++) {
							_request = scope.requests[xhrObject.validForGroup[i]];
							_request.callback.then instanceof Function && _request.callback.then.call(scope, jqXHR, textStatus);
						}
					});
				}(group, this.requests[group]));
			}
		},
		populateSource: function(data, group, path) {
			var scope = this,
				groupSource = this.options.source[group],
				extraData = groupSource.ajax && groupSource.data;
			if (path && typeof path === "string") {
				data = this.helper.namespace.call(this, path, data);
			}
			if (typeof data === 'undefined') {
				if (this.options.debug) {
					_debug.log({
						'node': this.selector,
						'function': 'populateSource()',
						'arguments': path,
						'message': 'Invalid data path.'
					});
					_debug.print();
				}
			}
			if (!Array.isArray(data)) {
				if (this.options.debug) {
					_debug.log({
						'node': this.selector,
						'function': 'populateSource()',
						'arguments': JSON.stringify({
							group: group
						}),
						'message': 'Invalid data type, must be Array type.'
					});
					_debug.print();
				}
				data = [];
			}
			if (extraData) {
				if (typeof extraData === "function") {
					extraData = extraData();
				}
				if (Array.isArray(extraData)) {
					data = data.concat(extraData);
				} else {
					if (this.options.debug) {
						_debug.log({
							'node': this.selector,
							'function': 'populateSource()',
							'arguments': JSON.stringify(extraData),
							'message': 'WARNING - this.options.source.' + group + '.data Must be an Array or a function that returns an Array.'
						});
						_debug.print();
					}
				}
			}
			var tmpObj, display = groupSource.display ? (groupSource.display[0] === 'compiled' ? groupSource.display[1] : groupSource.display[0]) : (this.options.display[0] === 'compiled' ? this.options.display[1] : this.options.display[0]);
			for (var i = 0, ii = data.length; i < ii; i++) {
				if (data[i] === null || typeof data[i] === "boolean") {
					if (this.options.debug) {
						_debug.log({
							'node': this.selector,
							'function': 'populateSource()',
							'message': 'WARNING - NULL/BOOLEAN value inside ' + group + '! The data was skipped.'
						});
						_debug.print();
					}
					continue;
				}
				if (typeof data[i] === "string") {
					tmpObj = {};
					tmpObj[display] = data[i];
					data[i] = tmpObj;
				}
				data[i].group = group;
			}
			if (!this.hasDynamicGroups && this.dropdownFilter.dynamic.length) {
				var key, value, tmpValues = {};
				for (var i = 0, ii = data.length; i < ii; i++) {
					for (var k = 0, kk = this.dropdownFilter.dynamic.length; k < kk; k++) {
						key = this.dropdownFilter.dynamic[k].key;
						value = data[i][key];
						if (!value) continue;
						if (!this.dropdownFilter.dynamic[k].value) {
							this.dropdownFilter.dynamic[k].value = [];
						}
						if (!tmpValues[key]) {
							tmpValues[key] = [];
						}
						if (!~tmpValues[key].indexOf(value.toLowerCase())) {
							tmpValues[key].push(value.toLowerCase());
							this.dropdownFilter.dynamic[k].value.push(value);
						}
					}
				}
			}
			if (this.options.correlativeTemplate) {
				var template = groupSource.template || this.options.template,
					compiledTemplate = "";
				if (typeof template === "function") {
					template = template.call(this, '', {});
				}
				if (!template) {
					if (this.options.debug) {
						_debug.log({
							'node': this.selector,
							'function': 'populateSource()',
							'arguments': String(group),
							'message': 'WARNING - this.options.correlativeTemplate is enabled but no template was found.'
						});
						_debug.print();
					}
				} else {
					if (Array.isArray(this.options.correlativeTemplate)) {
						for (var i = 0, ii = this.options.correlativeTemplate.length; i < ii; i++) {
							compiledTemplate += "{{" + this.options.correlativeTemplate[i] + "}} ";
						}
					} else {
						compiledTemplate = template.replace(/<.+?>/g, '');
					}
					for (var i = 0, ii = data.length; i < ii; i++) {
						data[i].compiled = compiledTemplate.replace(/\{\{([\w\-\.]+)(?:\|(\w+))?}}/g, function(match, index) {
							return scope.helper.namespace.call(scope, index, data[i], 'get', '');
						}).trim();
					}
					if (groupSource.display) {
						if (!~groupSource.display.indexOf('compiled')) {
							groupSource.display.unshift('compiled');
						}
					} else if (!~this.options.display.indexOf('compiled')) {
						this.options.display.unshift('compiled');
					}
				}
			}
			if (this.options.callback.onPopulateSource) {
				data = this.helper.executeCallback.call(this, this.options.callback.onPopulateSource, [this.node, data, group, path]);
				if (this.options.debug) {
					if (!data || !Array.isArray(data)) {
						_debug.log({
							'node': this.selector,
							'function': 'callback.populateSource()',
							'message': 'callback.onPopulateSource must return the "data" parameter'
						});
						_debug.print();
					}
				}
			}
			this.tmpSource[group] = Array.isArray(data) && data || [];
			var cache = this.options.source[group].cache,
				compression = this.options.source[group].compression,
				ttl = this.options.source[group].ttl || this.options.ttl;
			if (cache && !window[cache].getItem('TYPEAHEAD_' + this.selector + ":" + group)) {
				if (this.options.callback.onCacheSave) {
					data = this.helper.executeCallback.call(this, this.options.callback.onCacheSave, [this.node, data, group, path]);
					if (this.options.debug) {
						if (!data || !Array.isArray(data)) {
							_debug.log({
								'node': this.selector,
								'function': 'callback.populateSource()',
								'message': 'callback.onCacheSave must return the "data" parameter'
							});
							_debug.print();
						}
					}
				}
				var storage = JSON.stringify({
					data: data,
					ttl: new Date().getTime() + ttl
				});
				if (compression) {
					storage = LZString.compressToUTF16(storage);
				}
				window[cache].setItem('TYPEAHEAD_' + this.selector + ":" + group, storage);
			}
			this.incrementGeneratedGroup();
		},
		incrementGeneratedGroup: function() {
			this.generatedGroupCount++;
			if (this.generatedGroupCount !== this.generateGroups.length) {
				return;
			}
			this.xhr = {};
			for (var i = 0, ii = this.generateGroups.length; i < ii; i++) {
				this.source[this.generateGroups[i]] = this.tmpSource[this.generateGroups[i]];
			}
			if (!this.hasDynamicGroups) {
				this.buildDropdownItemLayout('dynamic');
			}
			this.options.loadingAnimation && this.container.removeClass('loading');
			this.node.trigger('search' + this.namespace);
		},
		navigate: function(e) {
			this.helper.executeCallback.call(this, this.options.callback.onNavigateBefore, [this.node, this.query, e]);
			if (e.keyCode === 27) {
				e.preventDefault();
				if (this.query.length) {
					this.resetInput();
					this.node.trigger('input' + this.namespace, [e]);
				} else {
					this.node.blur();
					this.hideLayout();
				}
				return;
			}
			if (this.options.blurOnTab && e.keyCode === 9) {
				this.node.blur();
				this.hideLayout();
				return;
			}
			if (!this.result.length) return;
			var itemList = this.resultContainer.find('.' + this.options.selector.item),
				activeItem = itemList.filter('.active'),
				activeItemIndex = activeItem[0] && itemList.index(activeItem) || null,
				newActiveItemIndex = null;
			if (e.keyCode === 13) {
				if (activeItem.length > 0) {
					e.preventDefault();
					activeItem.find('a:first').trigger('click', e);
				}
				return;
			}
			if (e.keyCode === 39) {
				if (activeItemIndex) {
					itemList.eq(activeItemIndex).find('a:first')[0].click();
				} else if (this.options.hint && this.hint.container.val() !== "" && this.helper.getCaret(this.node[0]) >= this.query.length) {
					itemList.find('a[data-index="' + this.hintIndex + '"]')[0].click();
				}
				return;
			}
			if (itemList.length > 0) {
				activeItem.removeClass('active');
			}
			if (e.keyCode === 38) {
				e.preventDefault();
				if (activeItem.length > 0) {
					if (activeItemIndex - 1 >= 0) {
						newActiveItemIndex = activeItemIndex - 1;
						itemList.eq(newActiveItemIndex).addClass('active');
					}
				} else {
					newActiveItemIndex = itemList.length - 1;
					itemList.last().addClass('active');
				}
			} else if (e.keyCode === 40) {
				e.preventDefault();
				if (activeItem.length > 0) {
					if (activeItemIndex + 1 < itemList.length) {
						newActiveItemIndex = activeItemIndex + 1;
						itemList.eq(newActiveItemIndex).addClass('active');
					}
				} else {
					newActiveItemIndex = 0;
					itemList.first().addClass('active');
				}
			}
			if (e.preventInputChange && ~ [38, 40].indexOf(e.keyCode)) {
				this.buildHintLayout(newActiveItemIndex !== null && newActiveItemIndex < this.result.length ? [this.result[newActiveItemIndex]] : null);
			}
			if (this.options.hint && this.hint.container) {
				this.hint.container.css('color', e.preventInputChange ? this.hint.css.color : newActiveItemIndex === null && this.hint.css.color || this.hint.container.css('background-color') || 'fff');
			}
			this.node.val(newActiveItemIndex !== null && !e.preventInputChange ? this.result[newActiveItemIndex][this.result[newActiveItemIndex].matchedKey] : this.rawQuery);
			this.helper.executeCallback.call(this, this.options.callback.onNavigateAfter, [this.node, itemList, newActiveItemIndex !== null && itemList.eq(newActiveItemIndex).find('a:first') || undefined, newActiveItemIndex !== null && this.result[newActiveItemIndex] || undefined, this.query, e]);
		},
		searchResult: function(preserveItem) {
			if (!preserveItem) {
				this.item = {};
			}
			this.resetLayout();
			if (this.helper.executeCallback.call(this, this.options.callback.onSearch, [this.node, this.query]) === false) return;
			if (this.searchGroups.length) {
				this.searchResultData();
			}
			this.helper.executeCallback.call(this, this.options.callback.onResult, [this.node, this.query, this.result, this.resultCount, this.resultCountPerGroup]);
			if (this.isDropdownEvent) {
				this.helper.executeCallback.call(this, this.options.callback.onDropdownFilter, [this.node, this.query, this.filters.dropdown, this.result]);
				this.isDropdownEvent = false;
			}
		},
		searchResultData: function() {
			var scope = this,
				group, groupBy = this.groupBy,
				groupReference = null,
				item, match, comparedDisplay, comparedQuery = this.query.toLowerCase(),
				maxItem = this.options.maxItem,
				maxItemPerGroup = this.options.maxItemPerGroup,
				hasDynamicFilters = this.filters.dynamic && !this.helper.isEmpty(this.filters.dynamic),
				displayKeys, displayValue, missingDisplayKey = {},
				groupFilter, groupFilterResult, groupMatcher, groupMatcherResult, matcher = typeof this.options.matcher === "function" && this.options.matcher,
				correlativeMatch, correlativeQuery, correlativeDisplay;
			if (this.options.accent) {
				comparedQuery = this.helper.removeAccent.call(this, comparedQuery);
			}
			for (var i = 0, ii = this.searchGroups.length; i < ii; ++i) {
				group = this.searchGroups[i];
				if (this.filters.dropdown && this.filters.dropdown.key === "group" && this.filters.dropdown.value !== group) continue;
				groupFilter = typeof this.options.source[group].filter !== "undefined" ? this.options.source[group].filter : this.options.filter;
				groupMatcher = typeof this.options.source[group].matcher === "function" && this.options.source[group].matcher || matcher;
				for (var k = 0, kk = this.source[group].length; k < kk; k++) {
					if (this.resultItemCount >= maxItem && !this.options.callback.onResult) break;
					if (hasDynamicFilters && !this.dynamicFilter.validate.apply(this, [this.source[group][k]])) continue;
					item = this.source[group][k];
					if (item === null || typeof item === "boolean") continue;
					if (this.filters.dropdown && (item[this.filters.dropdown.key] || "").toLowerCase() !== (this.filters.dropdown.value || "").toLowerCase()) continue;
					groupReference = groupBy === "group" ? group : item[groupBy] ? item[groupBy] : item.group;
					if (groupReference && !this.result[groupReference]) {
						this.result[groupReference] = [];
						this.resultCountPerGroup[groupReference] = 0;
					}
					if (maxItemPerGroup) {
						if (groupBy === "group" && this.result[groupReference].length >= maxItemPerGroup && !this.options.callback.onResult) {
							break;
						}
					}
					displayKeys = this.options.source[group].display || this.options.display;
					for (var v = 0, vv = displayKeys.length; v < vv; ++v) {
						if (groupFilter !== false) {
							displayValue = /\./.test(displayKeys[v]) ? this.helper.namespace.call(this, displayKeys[v], item) : item[displayKeys[v]];
							if (typeof displayValue === 'undefined' || displayValue === '') {
								if (this.options.debug) {
									missingDisplayKey[v] = {
										display: displayKeys[v],
										data: item
									};
								}
								continue;
							}
							displayValue = this.helper.cleanStringFromScript(displayValue);
						}
						if (typeof groupFilter === "function") {
							groupFilterResult = groupFilter.call(this, item, displayValue);
							if (groupFilterResult === undefined) break;
							if (!groupFilterResult) continue;
							if (typeof groupFilterResult === "object") {
								item = groupFilterResult;
							}
						}
						if (~ [undefined, true].indexOf(groupFilter)) {
							comparedDisplay = displayValue;
							comparedDisplay = comparedDisplay.toString().toLowerCase();
							if (this.options.accent) {
								comparedDisplay = this.helper.removeAccent.call(this, comparedDisplay);
							}
							match = comparedDisplay.indexOf(comparedQuery);
							if (this.options.correlativeTemplate && displayKeys[v] === 'compiled' && match < 0 && /\s/.test(comparedQuery)) {
								correlativeMatch = true;
								correlativeQuery = comparedQuery.split(' ');
								correlativeDisplay = comparedDisplay;
								for (var x = 0, xx = correlativeQuery.length; x < xx; x++) {
									if (correlativeQuery[x] === "") continue;
									if (!~correlativeDisplay.indexOf(correlativeQuery[x])) {
										correlativeMatch = false;
										break;
									}
									correlativeDisplay = correlativeDisplay.replace(correlativeQuery[x], '');
								}
							}
							if (match < 0 && !correlativeMatch) continue;
							if (this.options.offset && match !== 0) continue;
							if (groupMatcher) {
								groupMatcherResult = groupMatcher.call(this, item, displayValue);
								if (groupMatcherResult === undefined) break;
								if (!groupMatcherResult) continue;
								if (typeof groupMatcherResult === "object") {
									item = groupMatcherResult;
								}
							}
						}
						this.resultCount++;
						this.resultCountPerGroup[groupReference]++;
						if (this.resultItemCount < maxItem) {
							if (maxItemPerGroup && this.result[groupReference].length >= maxItemPerGroup) {
								break;
							}
							this.result[groupReference].push($.extend(true, {
								matchedKey: displayKeys[v]
							}, item));
							this.resultItemCount++;
						}
						break;
					}
					if (!this.options.callback.onResult) {
						if (this.resultItemCount >= maxItem) {
							break;
						}
						if (maxItemPerGroup && this.result[groupReference].length >= maxItemPerGroup) {
							if (groupBy === "group") {
								break;
							}
						}
					}
				}
			}
			if (this.options.debug) {
				if (!this.helper.isEmpty(missingDisplayKey)) {
					_debug.log({
						'node': this.selector,
						'function': 'searchResult()',
						'arguments': JSON.stringify(missingDisplayKey),
						'message': 'Missing keys for display, make sure options.display is set properly.'
					});
					_debug.print();
				}
			}
			if (this.options.order) {
				var displayKeys = [],
					displayKey;
				for (var group in this.result) {
					if (!this.result.hasOwnProperty(group)) continue;
					for (var i = 0, ii = this.result[group].length; i < ii; i++) {
						displayKey = this.options.source[this.result[group][i].group].display || this.options.display;
						if (!~displayKeys.indexOf(displayKey[0])) {
							displayKeys.push(displayKey[0]);
						}
					}
					this.result[group].sort(scope.helper.sort(displayKeys, scope.options.order === "asc", function(a) {
						return a.toString().toUpperCase();
					}));
				}
			}
			var concatResults = [],
				groupOrder = [];
			if (typeof this.options.groupOrder === "function") {
				groupOrder = this.options.groupOrder.apply(this, [this.node, this.query, this.result, this.resultCount, this.resultCountPerGroup]);
			} else if (Array.isArray(this.options.groupOrder)) {
				groupOrder = this.options.groupOrder;
			} else if (typeof this.options.groupOrder === "string" && ~ ["asc", "desc"].indexOf(this.options.groupOrder)) {
				groupOrder = Object.keys(this.result).sort(scope.helper.sort([], scope.options.groupOrder === "asc", function(a) {
					return a.toString().toUpperCase();
				}));
			} else {
				groupOrder = Object.keys(this.result);
			}
			for (var i = 0, ii = groupOrder.length; i < ii; i++) {
				concatResults = concatResults.concat(this.result[groupOrder[i]] || []);
			}
			this.groups = JSON.parse(JSON.stringify(groupOrder));
			this.result = concatResults;
		},
		buildLayout: function() {
			this.buildHtmlLayout();
			this.buildBackdropLayout();
			this.buildHintLayout();
			if (this.options.callback.onLayoutBuiltBefore) {
				var tmpResultHtml = this.helper.executeCallback.call(this, this.options.callback.onLayoutBuiltBefore, [this.node, this.query, this.result, this.resultHtml]);
				if (tmpResultHtml instanceof $) {
					this.resultHtml = tmpResultHtml;
				} else {
					if (this.options.debug) {
						_debug.log({
							'node': this.selector,
							'function': 'callback.onLayoutBuiltBefore()',
							'message': 'Invalid returned value - You must return resultHtmlList jQuery Object'
						});
						_debug.print();
					}
				}
			}
			this.resultHtml && this.resultContainer.html(this.resultHtml);
			if (this.options.callback.onLayoutBuiltAfter) {
				this.helper.executeCallback.call(this, this.options.callback.onLayoutBuiltAfter, [this.node, this.query, this.result]);
			}
		},
		buildHtmlLayout: function() {
			if (this.options.resultContainer === false) return;
			if (!this.resultContainer) {
				this.resultContainer = $("<div/>", {
					"class": this.options.selector.result
				});
				this.container.append(this.resultContainer);
			}
			var emptyTemplate;
			if (!this.result.length) {
				if (this.options.emptyTemplate && this.query !== "") {
					emptyTemplate = typeof this.options.emptyTemplate === "function" ? this.options.emptyTemplate.call(this, this.query) : this.options.emptyTemplate.replace(/\{\{query}}/gi, this.helper.cleanStringFromScript(this.query));
				} else {
					return;
				}
			}
			var _query = this.query.toLowerCase();
			if (this.options.accent) {
				_query = this.helper.removeAccent.call(this, _query);
			}
			var scope = this,
				groupTemplate = this.groupTemplate || '<ul></ul>',
				hasEmptyTemplate = false;
			if (this.groupTemplate) {
				groupTemplate = $(groupTemplate.replace(/<([^>]+)>\{\{(.+?)}}<\/[^>]+>/g, function(match, tag, group, offset, string) {
					var template = '',
						groups = group === "group" ? scope.groups : [group];
					if (!scope.result.length) {
						if (hasEmptyTemplate === true) return '';
						hasEmptyTemplate = true;
						return '<' + tag + ' class="' + scope.options.selector.empty + '"><a href="javascript:;">' + emptyTemplate + '</a></' + tag + '>';
					}
					for (var i = 0, ii = groups.length; i < ii; ++i) {
						template += '<' + tag + ' data-group-template="' + groups[i] + '"><ul></ul></' + tag + '>';
					}
					return template;
				}));
			} else {
				groupTemplate = $(groupTemplate);
				if (!this.result.length) {
					groupTemplate.append(emptyTemplate instanceof $ ? emptyTemplate : '<li class="' + scope.options.selector.empty + '"><a href="javascript:;">' + emptyTemplate + '</a></li>');
				}
			}
			groupTemplate.addClass(this.options.selector.list + (this.helper.isEmpty(this.result) ? ' empty' : ''));
			var _group, _groupTemplate, _item, _href, _liHtml, _template, _templateValue, _aHtml, _display, _displayKeys, _displayValue, _unusedGroups = this.groupTemplate && this.result.length && scope.groups || [],
				_tmpIndexOf;
			for (var i = 0, ii = this.result.length; i < ii; ++i) {
				_item = this.result[i];
				_group = _item.group;
				_href = this.options.source[_item.group].href || this.options.href;
				_display = [];
				_displayKeys = this.options.source[_item.group].display || this.options.display;
				if (this.options.group) {
					_group = _item[this.options.group.key];
					if (this.options.group.template) {
						if (typeof this.options.group.template === "function") {
							_groupTemplate = this.options.group.template(_item);
						} else if (typeof this.options.template === "string") {
							_groupTemplate = this.options.group.template.replace(/\{\{([\w\-\.]+)}}/gi, function(match, index) {
								return scope.helper.namespace.call(scope, index, _item, 'get', '');
							});
						}
					}
					if (!groupTemplate.find('[data-search-group="' + _group + '"]')[0]) {
						(this.groupTemplate ? groupTemplate.find('[data-group-template="' + _group + '"] ul') : groupTemplate).append($("<li/>", {
							"class": scope.options.selector.group,
							"html": $("<a/>", {
								"href": "javascript:;",
								"html": _groupTemplate || _group,
								"tabindex": -1
							}),
							"data-search-group": _group
						}));
					}
				}
				if (this.groupTemplate && _unusedGroups.length) {
					_tmpIndexOf = _unusedGroups.indexOf(_group || _item.group);
					if (~_tmpIndexOf) {
						_unusedGroups.splice(_tmpIndexOf, 1);
					}
				}
				_liHtml = $("<li/>", {
					"class": scope.options.selector.item + " " + scope.options.selector.group + '-' + this.helper.slugify.call(this, _group),
					"html": $("<a/>", {
						"href": (function() {
							if (_href) {
								if (typeof _href === "string") {
									_href = _href.replace(/\{\{([^\|}]+)(?:\|([^}]+))*}}/gi, function(match, index, options) {
										var value = scope.helper.namespace.call(scope, index, _item, 'get', '');
										options = options && options.split("|") || [];
										if (~options.indexOf('slugify')) {
											value = scope.helper.slugify.call(scope, value);
										}
										return value;
									});
								} else if (typeof _href === "function") {
									_href = _href(_item);
								}
								_item.href = _href;
							}
							return _href || "javascript:;";
						}()),
						"data-group": _group,
						"data-index": i,
						"html": function() {
							_template = (_item.group && scope.options.source[_item.group].template) || scope.options.template;
							if (_template) {
								if (typeof _template === "function") {
									_template = _template.call(scope, scope.query, _item);
								}
								_aHtml = _template.replace(/\{\{([^\|}]+)(?:\|([^}]+))*}}/gi, function(match, index, options) {
									var value = scope.helper.cleanStringFromScript(String(scope.helper.namespace.call(scope, index, _item, 'get', '')));
									options = options && options.split("|") || [];
									if (~options.indexOf('slugify')) {
										value = scope.helper.slugify.call(scope, value);
									}
									if (!~options.indexOf('raw')) {
										if (scope.options.highlight === true && _query && ~_displayKeys.indexOf(index)) {
											value = scope.helper.highlight.call(scope, value, _query.split(" "), scope.options.accent);
										}
									}
									return value;
								});
							} else {
								for (var i = 0, ii = _displayKeys.length; i < ii; i++) {
									_displayValue = /\./.test(_displayKeys[i]) ? scope.helper.namespace.call(scope, _displayKeys[i], _item, 'get', '') : _item[_displayKeys[i]];
									if (typeof _displayValue === 'undefined' || _displayValue === '') continue;
									_display.push(_displayValue);
								}
								_aHtml = '<span class="' + scope.options.selector.display + '">' + scope.helper.cleanStringFromScript(String(_display.join(" "))) + '</span>';
							}
							if ((scope.options.highlight === true && _query && !_template) || scope.options.highlight === "any") {
								_aHtml = scope.helper.highlight.call(scope, _aHtml, _query.split(" "), scope.options.accent);
							}
							$(this).append(_aHtml);
						}
					})
				});
				(function(i, item, liHtml) {
					liHtml.on('click', function(e, originalEvent) {
						if (originalEvent && typeof originalEvent === "object") {
							e.originalEvent = originalEvent;
						}
						if (scope.options.mustSelectItem && scope.helper.isEmpty(item)) {
							e.preventDefault();
							return;
						}
						scope.item = item;
						if (scope.helper.executeCallback.call(scope, scope.options.callback.onClickBefore, [scope.node, $(this), item, e]) === false) return;
						if ((e.originalEvent && e.originalEvent.defaultPrevented) || e.isDefaultPrevented()) {
							return;
						}
						_templateValue = (item.group && scope.options.source[item.group].templateValue) || scope.options.templateValue;
						if (typeof _templateValue === "function") {
							_templateValue = _templateValue.call(scope);
						}
						scope.query = scope.rawQuery = _templateValue ? _templateValue.replace(/\{\{([\w\-\.]+)}}/gi, function(match, index) {
							return scope.helper.namespace.call(scope, index, item, 'get', '');
						}) : scope.helper.namespace.call(scope, item.matchedKey, item).toString();
						scope.focusOnly = true;
						scope.node.val(scope.query).focus();
						scope.searchResult(true);
						scope.buildLayout();
						scope.hideLayout();
						scope.helper.executeCallback.call(scope, scope.options.callback.onClickAfter, [scope.node, $(this), item, e]);
					});
					liHtml.on('mouseenter', function(e) {
						scope.helper.executeCallback.call(scope, scope.options.callback.onMouseEnter, [scope.node, $(this), item, e]);
					});
					liHtml.on('mouseleave', function(e) {
						scope.helper.executeCallback.call(scope, scope.options.callback.onMouseLeave, [scope.node, $(this), item, e]);
					});
				}(i, _item, _liHtml));
				(this.groupTemplate ? groupTemplate.find('[data-group-template="' + _group + '"] ul') : groupTemplate).append(_liHtml);
			}
			if (this.result.length && _unusedGroups.length) {
				for (var i = 0, ii = _unusedGroups.length; i < ii; ++i) {
					groupTemplate.find('[data-group-template="' + _unusedGroups[i] + '"]').remove();
				}
			}
			this.resultHtml = groupTemplate;
		},
		buildBackdropLayout: function() {
			if (!this.options.backdrop) return;
			if (!this.backdrop.container) {
				this.backdrop.css = $.extend({
					"opacity": 0.6,
					"filter": 'alpha(opacity=60)',
					"position": 'fixed',
					"top": 0,
					"right": 0,
					"bottom": 0,
					"left": 0,
					"z-index": 1040,
					"background-color": "#000"
				}, this.options.backdrop);
				this.backdrop.container = $("<div/>", {
					"class": this.options.selector.backdrop,
					"css": this.backdrop.css
				}).insertAfter(this.container);
			}
			this.container.addClass('backdrop').css({
				"z-index": this.backdrop.css["z-index"] + 1,
				"position": "relative"
			});
		},
		buildHintLayout: function(result) {
			if (!this.options.hint) return;
			if (this.node[0].scrollWidth > Math.ceil(this.node.innerWidth())) {
				this.hint.container && this.hint.container.val("");
				return;
			}
			var scope = this,
				hint = "",
				result = result || this.result,
				query = this.query.toLowerCase();
			if (this.options.accent) {
				query = this.helper.removeAccent.call(this, query);
			}
			this.hintIndex = null;
			if (this.searchGroups.length) {
				if (!this.hint.container) {
					this.hint.css = $.extend({
						"border-color": "transparent",
						"position": "absolute",
						"top": 0,
						"display": "inline",
						"z-index": -1,
						"float": "none",
						"color": "silver",
						"box-shadow": "none",
						"cursor": "default",
						"-webkit-user-select": "none",
						"-moz-user-select": "none",
						"-ms-user-select": "none",
						"user-select": "none"
					}, this.options.hint);
					this.hint.container = $('<input/>', {
						'type': this.node.attr('type'),
						'class': this.node.attr('class'),
						'readonly': true,
						'unselectable': 'on',
						'aria-hidden': 'true',
						'tabindex': -1,
						'click': function() {
							scope.node.focus();
						}
					}).addClass(this.options.selector.hint).css(this.hint.css).insertAfter(this.node);
					this.node.parent().css({
						"position": "relative"
					});
				}
				this.hint.container.css('color', this.hint.css.color);
				if (query) {
					var _displayKeys, _group, _comparedValue;
					for (var i = 0, ii = result.length; i < ii; i++) {
						_group = result[i].group;
						_displayKeys = this.options.source[_group].display || this.options.display;
						for (var k = 0, kk = _displayKeys.length; k < kk; k++) {
							_comparedValue = String(result[i][_displayKeys[k]]).toLowerCase();
							if (this.options.accent) {
								_comparedValue = this.helper.removeAccent.call(this, _comparedValue);
							}
							if (_comparedValue.indexOf(query) === 0) {
								hint = String(result[i][_displayKeys[k]]);
								this.hintIndex = i;
								break;
							}
						}
						if (this.hintIndex !== null) {
							break;
						}
					}
				}
				this.hint.container.val(hint.length > 0 && this.rawQuery + hint.substring(this.query.length) || "");
			}
		},
		buildDropdownLayout: function() {
			if (!this.options.dropdownFilter) return;
			var scope = this;
			$('<span/>', {
				"class": this.options.selector.filter,
				"html": function() {
					$(this).append($('<button/>', {
						"type": "button",
						"class": scope.options.selector.filterButton,
						"style": "display: none;",
						"click": function(e) {
							e.stopPropagation();
							scope.container.toggleClass('filter');
							var _ns = scope.namespace + '-dropdown-filter';
							$('html').off(_ns);
							if (scope.container.hasClass('filter')) {
								$('html').on("click" + _ns + " touchend" + _ns, function(e) {
									if ($(e.target).closest('.' + scope.options.selector.filter)[0] || scope.hasDragged) return;
									scope.container.removeClass('filter');
								});
							}
						}
					}));
					$(this).append($('<ul/>', {
						"class": scope.options.selector.dropdown
					}));
				}
			}).insertAfter(scope.container.find('.' + scope.options.selector.query));
		},
		buildDropdownItemLayout: function(type) {
			if (!this.options.dropdownFilter) return;
			var scope = this,
				template, all = typeof this.options.dropdownFilter === 'string' && this.options.dropdownFilter || 'All',
				ulScope = this.container.find('.' + this.options.selector.dropdown),
				filter;
			if (type === 'static' && (this.options.dropdownFilter === true || typeof this.options.dropdownFilter === 'string')) {
				this.dropdownFilter.static.push({
					key: 'group',
					template: '{{group}}',
					all: all,
					value: Object.keys(this.options.source)
				});
			}
			for (var i = 0, ii = this.dropdownFilter[type].length; i < ii; i++) {
				filter = this.dropdownFilter[type][i];
				if (!Array.isArray(filter.value)) {
					filter.value = [filter.value];
				}
				if (filter.all) {
					this.dropdownFilterAll = filter.all;
				}
				for (var k = 0, kk = filter.value.length; k <= kk; k++) {
					if (k === kk && (i !== ii - 1)) {
						continue;
					} else if (k === kk && (i === ii - 1)) {
						if (type === 'static' && this.dropdownFilter.dynamic.length) {
							continue;
						}
					}
					template = this.dropdownFilterAll || all;
					if (filter.value[k]) {
						if (filter.template) {
							template = filter.template.replace(new RegExp('\{\{' + filter.key + '}}', 'gi'), filter.value[k]);
						} else {
							template = filter.value[k];
						}
					} else {
						this.container.find('.' + scope.options.selector.filterButton).html(template);
					}(function(k, filter, template) {
						ulScope.append($("<li/>", {
							"class": scope.options.selector.dropdownItem + ' ' + scope.helper.slugify.call(scope, filter.key + '-' + (filter.value[k] || all)),
							"html": $("<a/>", {
								"href": "javascript:;",
								"html": template,
								"click": function(e) {
									e.preventDefault();
									_selectFilter.call(scope, {
										key: filter.key,
										value: filter.value[k] || '*',
										template: template
									});
								}
							})
						}));
					}(k, filter, template));
				}
			}
			if (this.dropdownFilter[type].length) {
				this.container.find('.' + scope.options.selector.filterButton).removeAttr('style');
			}

			function _selectFilter(item) {
				if (item.value === "*") {
					delete this.filters.dropdown;
				} else {
					this.filters.dropdown = item;
				}
				this.container.removeClass('filter').find('.' + this.options.selector.filterButton).html(item.template);
				this.isDropdownEvent = true;
				this.node.trigger('search' + this.namespace);
				this.node.focus();
			}
		},
		dynamicFilter: {
			isEnabled: false,
			init: function() {
				if (!this.options.dynamicFilter) return;
				this.dynamicFilter.bind.call(this);
				this.dynamicFilter.isEnabled = true;
			},
			validate: function(item) {
				var isValid, softValid = null,
					hardValid = null,
					itemValue;
				for (var key in this.filters.dynamic) {
					if (!this.filters.dynamic.hasOwnProperty(key)) continue;
					if ( !! ~key.indexOf('.')) {
						itemValue = this.helper.namespace.call(this, key, item, 'get');
					} else {
						itemValue = item[key];
					}
					if (this.filters.dynamic[key].modifier === '|' && !softValid) {
						softValid = itemValue == this.filters.dynamic[key].value || false;
					}
					if (this.filters.dynamic[key].modifier === '&') {
						if (itemValue == this.filters.dynamic[key].value) {
							hardValid = true;
						} else {
							hardValid = false;
							break;
						}
					}
				}
				isValid = softValid;
				if (hardValid !== null) {
					isValid = hardValid;
					if (hardValid === true && softValid !== null) {
						isValid = softValid;
					}
				}
				return !!isValid;
			},
			set: function(key, value) {
				var matches = key.match(/^([|&])?(.+)/);
				if (!value) {
					delete this.filters.dynamic[matches[2]];
				} else {
					this.filters.dynamic[matches[2]] = {
						modifier: matches[1] || '|',
						value: value
					};
				}
				if (this.dynamicFilter.isEnabled) {
					this.generateSource();
				}
			},
			bind: function() {
				var scope = this,
					filter;
				for (var i = 0, ii = this.options.dynamicFilter.length; i < ii; i++) {
					filter = this.options.dynamicFilter[i];
					if (typeof filter.selector === "string") {
						filter.selector = $(filter.selector);
					}
					if (!(filter.selector instanceof $) || !filter.selector[0] || !filter.key) {
						if (this.options.debug) {
							_debug.log({
								'node': this.selector,
								'function': 'buildDynamicLayout()',
								'message': 'Invalid jQuery selector or jQuery Object for "filter.selector" or missing filter.key'
							});
							_debug.print();
						}
						continue;
					}(function(filter) {
						filter.selector.off(scope.namespace).on('change' + scope.namespace, function() {
							scope.dynamicFilter.set.apply(scope, [filter.key, scope.dynamicFilter.getValue(this)]);
						}).trigger('change' + scope.namespace);
					}(filter));
				}
			},
			getValue: function(tag) {
				var value;
				if (tag.tagName === "SELECT") {
					value = tag.value;
				} else if (tag.tagName === "INPUT") {
					if (tag.type === "checkbox") {
						value = tag.checked && tag.getAttribute('value') || tag.checked || null;
					} else if (tag.type === "radio" && tag.checked) {
						value = tag.value;
					}
				}
				return value;
			}
		},
		showLayout: function() {
			if (this.container.hasClass('result')) return;
			if (!this.result.length && !this.options.emptyTemplate && !this.options.backdropOnFocus) {
				return;
			}
			_addHtmlListeners.call(this);
			this.container.addClass([this.result.length || (this.searchGroups.length && this.options.emptyTemplate && this.query.length) ? 'result ' : '', this.options.hint && this.searchGroups.length ? 'hint' : '', this.options.backdrop || this.options.backdropOnFocus ? 'backdrop' : ''].join(' '));
			this.helper.executeCallback.call(this, this.options.callback.onShowLayout, [this.node, this.query]);

			function _addHtmlListeners() {
				var scope = this;
				$('html').off("keydown" + this.namespace).on("keydown" + this.namespace, function(e) {
					if (!e.keyCode || e.keyCode !== 9) return;
					setTimeout(function() {
						if (!$(':focus').closest(scope.container).find(scope.node)[0]) {
							scope.hideLayout();
						}
					}, 0);
				});
				$('html').off("click" + this.namespace + " touchend" + this.namespace).on("click" + this.namespace + " touchend" + this.namespace, function(e) {
					if ($(e.target).closest(scope.container)[0] || scope.hasDragged) return;
					scope.hideLayout();
				});
			}
		},
		hideLayout: function() {
			if (!this.container.hasClass('result') && !this.container.hasClass('backdrop')) return;
			this.container.removeClass('result hint filter' + (this.options.backdropOnFocus && $(this.node).is(':focus') ? '' : ' backdrop'));
			if (this.options.backdropOnFocus && this.container.hasClass('backdrop')) return;
			$('html').off(this.namespace);
			this.helper.executeCallback.call(this, this.options.callback.onHideLayout, [this.node, this.query]);
		},
		resetLayout: function() {
			this.result = {};
			this.groups = [];
			this.resultCount = 0;
			this.resultCountPerGroup = {};
			this.resultItemCount = 0;
			this.resultHtml = null;
			if (this.options.hint && this.hint.container) {
				this.hint.container.val('');
			}
		},
		resetInput: function() {
			this.node.val('');
			this.item = null;
			this.query = '';
			this.rawQuery = '';
		},
		buildCancelButtonLayout: function() {
			if (!this.options.cancelButton) return;
			var scope = this;
			$('<span/>', {
				"class": this.options.selector.cancelButton,
				"mousedown": function(e) {
					e.stopImmediatePropagation();
					e.preventDefault();
					scope.resetInput();
					scope.node.trigger('input' + scope.namespace, [e]);
				}
			}).insertBefore(this.node);
		},
		toggleCancelButtonVisibility: function() {
			this.container.toggleClass('cancel', !! this.query.length);
		},
		__construct: function() {
			this.extendOptions();
			if (!this.unifySourceFormat()) {
				return;
			}
			this.dynamicFilter.init.apply(this);
			this.init();
			this.buildDropdownLayout();
			this.buildDropdownItemLayout('static');
			this.delegateEvents();
			this.buildCancelButtonLayout();
			this.helper.executeCallback.call(this, this.options.callback.onReady, [this.node]);
		},
		helper: {
			isEmpty: function(obj) {
				for (var prop in obj) {
					if (obj.hasOwnProperty(prop)) return false;
				}
				return true;
			},
			removeAccent: function(string) {
				if (typeof string !== "string") {
					return;
				}
				var accent = _accent;
				if (typeof this.options.accent === "object") {
					accent = this.options.accent;
				}
				string = string.toLowerCase().replace(new RegExp('[' + accent.from + ']', 'g'), function(match) {
					return accent.to[accent.from.indexOf(match)];
				});
				return string;
			},
			slugify: function(string) {
				string = String(string);
				if (string !== "") {
					string = this.helper.removeAccent.call(this, string);
					string = string.replace(/[^-a-z0-9]+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
				}
				return string;
			},
			sort: function(field, reverse, primer) {
				var key = function(x) {
						for (var i = 0, ii = field.length; i < ii; i++) {
							if (typeof x[field[i]] !== 'undefined') {
								return primer(x[field[i]]);
							}
						}
						return x;
					};
				reverse = [-1, 1][+ !! reverse];
				return function(a, b) {
					return a = key(a), b = key(b), reverse * ((a > b) - (b > a));
				};
			},
			replaceAt: function(string, offset, length, replace) {
				return string.substring(0, offset) + replace + string.substring(offset + length);
			},
			highlight: function(string, keys, accents) {
				string = String(string);
				var searchString = accents && this.helper.removeAccent.call(this, string) || string,
					matches = [];
				if (!Array.isArray(keys)) {
					keys = [keys];
				}
				keys.sort(function(a, b) {
					return b.length - a.length;
				});
				for (var i = keys.length - 1; i >= 0; i--) {
					if (keys[i].trim() === "") {
						keys.splice(i, 1);
						continue;
					}
					keys[i] = keys[i].replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&");
				}
				searchString.replace(new RegExp('(?:' + keys.join('|') + ')(?!([^<]+)?>)', 'gi'), function(match, index, offset) {
					matches.push({
						offset: offset,
						length: match.length
					});
				});
				for (var i = matches.length - 1; i >= 0; i--) {
					string = this.helper.replaceAt(string, matches[i].offset, matches[i].length, "<strong>" + string.substr(matches[i].offset, matches[i].length) + "</strong>");
				}
				return string;
			},
			getCaret: function(element) {
				if (element.selectionStart) {
					return element.selectionStart;
				} else if (document.selection) {
					element.focus();
					var r = document.selection.createRange();
					if (r === null) {
						return 0;
					}
					var re = element.createTextRange(),
						rc = re.duplicate();
					re.moveToBookmark(r.getBookmark());
					rc.setEndPoint('EndToStart', re);
					return rc.text.length;
				}
				return 0;
			},
			cleanStringFromScript: function(string) {
				return typeof string === "string" && string.replace(/<\/?(?:script|iframe)\b[^>]*>/gm, '') || string;
			},
			executeCallback: function(callback, extraParams) {
				if (!callback) {
					return;
				}
				var _callback;
				if (typeof callback === "function") {
					_callback = callback;
				} else if (typeof callback === "string" || Array.isArray(callback)) {
					if (typeof callback === "string") {
						callback = [callback, []];
					}
					_callback = this.helper.namespace.call(this, callback[0], window);
					if (typeof _callback !== "function") {
						if (this.options.debug) {
							_debug.log({
								'node': this.selector,
								'function': 'executeCallback()',
								'arguments': JSON.stringify(callback),
								'message': 'WARNING - Invalid callback function"'
							});
							_debug.print();
						}
						return;
					}
				}
				return _callback.apply(this, (callback[1] || []).concat(extraParams ? extraParams : []));
			},
			namespace: function(string, object, method, defaultValue) {
				if (typeof string !== "string" || string === "") {
					if (this.options.debug) {
						_debug.log({
							'node': this.options.input || this.selector,
							'function': 'helper.namespace()',
							'arguments': string,
							'message': 'ERROR - Missing string"'
						});
						_debug.print();
					}
					return false;
				}
				var value = typeof defaultValue !== "undefined" ? defaultValue : undefined;
				if (!~string.indexOf('.')) {
					return object[string] || value;
				}
				var parts = string.split('.'),
					parent = object || window,
					method = method || 'get',
					currentPart = '';
				for (var i = 0, length = parts.length; i < length; i++) {
					currentPart = parts[i];
					if (typeof parent[currentPart] === "undefined") {
						if (~ ['get', 'delete'].indexOf(method)) {
							return typeof defaultValue !== "undefined" ? defaultValue : undefined;
						}
						parent[currentPart] = {};
					}
					if (~ ['set', 'create', 'delete'].indexOf(method)) {
						if (i === length - 1) {
							if (method === 'set' || method === 'create') {
								parent[currentPart] = value;
							} else {
								delete parent[currentPart];
								return true;
							}
						}
					}
					parent = parent[currentPart];
				}
				return parent;
			},
			typeWatch: (function() {
				var timer = 0;
				return function(callback, ms) {
					clearTimeout(timer);
					timer = setTimeout(callback, ms);
				};
			})()
		}
	};
	$.fn.typeahead = $.typeahead = function(options) {
		return _api.typeahead(this, options);
	};
	var _api = {
		typeahead: function(node, options) {
			if (!options || !options.source || typeof options.source !== 'object') {
				_debug.log({
					'node': node.selector || options && options.input,
					'function': '$.typeahead()',
					'arguments': JSON.stringify(options && options.source || ''),
					'message': 'Undefined "options" or "options.source" or invalid source type - Typeahead dropped'
				});
				_debug.print();
				return;
			}
			if (typeof node === "function") {
				if (!options.input) {
					_debug.log({
						'node': node.selector,
						'function': '$.typeahead()',
						'message': 'Undefined "options.input" - Typeahead dropped'
					});
					_debug.print();
					return;
				}
				node = $(options.input);
			}
			if (!node.length || node[0].nodeName !== "INPUT") {
				_debug.log({
					'node': node.selector,
					'function': '$.typeahead()',
					'arguments': JSON.stringify(options.input),
					'message': 'Unable to find jQuery input element - Typeahead dropped'
				});
				_debug.print();
				return;
			}
			if (node.length === 1) {
				node[0].selector = node.selector || options.input || node[0].nodeName.toLowerCase();
				return window.Typeahead[node[0].selector] = new Typeahead(node, options);
			} else {
				var instances = {},
					instanceName;
				for (var i = 0, ii = node.length; i < ii; ++i) {
					instanceName = node[i].nodeName.toLowerCase();
					if (typeof instances[instanceName] !== "undefined") {
						instanceName += i;
					}
					node[i].selector = instanceName;
					window.Typeahead[instanceName] = instances[instanceName] = new Typeahead(node.eq(i), options);
				}
				return instances;
			}
		}
	};
	var _debug = {
		table: {},
		log: function(debugObject) {
			if (!debugObject.message || typeof debugObject.message !== "string") {
				return;
			}
			this.table[debugObject.message] = $.extend({
				'node': '',
				'function': '',
				'arguments': ''
			}, debugObject);
		},
		print: function() {
			if (Typeahead.prototype.helper.isEmpty(this.table) || !console || !console.table) {
				return;
			}
			if (console.group !== undefined || console.table !== undefined) {
				console.groupCollapsed('--- jQuery Typeahead Debug ---');
				console.table(this.table);
				console.groupEnd();
			}
			this.table = {};
		}
	};
	_debug.log({
		'message': 'WARNING - You are using the DEBUG version. Use /dist/jquery.typeahead.min.js in production.'
	});
	_debug.print();
	window.console = window.console || {
		log: function() {}
	};
	if (!Array.isArray) {
		Array.isArray = function(arg) {
			return Object.prototype.toString.call(arg) === '[object Array]';
		};
	}
	if (!('trim' in String.prototype)) {
		String.prototype.trim = function() {
			return this.replace(/^\s+/, '').replace(/\s+$/, '');
		};
	}
	if (!('indexOf' in Array.prototype)) {
		Array.prototype.indexOf = function(find, i) {
			if (i === undefined) i = 0;
			if (i < 0) i += this.length;
			if (i < 0) i = 0;
			for (var n = this.length; i < n; i++)
			if (i in this && this[i] === find) return i;
			return -1;
		};
	}
	if (!Object.keys) {
		Object.keys = function(obj) {
			var keys = [],
				k;
			for (k in obj) {
				if (Object.prototype.hasOwnProperty.call(obj, k)) {
					keys.push(k);
				}
			}
			return keys;
		};
	}
	return Typeahead;
}));