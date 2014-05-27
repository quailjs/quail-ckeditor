CKEDITOR.plugins.add( 'quail', {

  requires: 'dialog',

  icons : 'quail',

  active : false,

  editor : { },

  quailTests : { },

  severity : {
    0 : 'suggestion',
    0.5 : 'moderate',
    1 : 'severe'
  },

  init: function( editor ) {
    if (typeof editor.config.quail === 'undefined' ||
        typeof editor.config.quail.tests === 'undefined') {
      return;
    }
    var that = this;
    that.editor = editor;
    //We have to manually load the dialog skin because
    //the dialog is not in a definition file.
    CKEDITOR.skin.loadPart( 'dialog' );
    $.ajax({
      url: editor.config.quail.path + '/dist/tests.json',
      success: function(tests) {
        that.quailTests = that.TestCollection(tests);
      }
    });

    CKEDITOR.addCss(quailCss);

    editor.addCommand( 'quailFeedbackDialog', new CKEDITOR.dialogCommand( 'quailFeedbackDialog' ));

    editor.addCommand( 'quailCheckContent', {
      exec : function( editor ) {
        if (that.active) {
          that.removeMarkup(editor);
          this.setState( CKEDITOR.TRISTATE_OFF );
        }
        else {
          that.checkContent(editor);
          this.setState( CKEDITOR.TRISTATE_ON );
        }
        that.active = !that.active;
      }
    });

    CKEDITOR.dialog.add( 'quailDialog', function( ) {
      return {
        title: 'Accessibility feedback',
        minWidth: 400,
        minHeight: 200,
        contents: [
          {
            id: 'feedback',
            label: 'Feedback',
            elements: [
              {
                type:           'html',
                id:             'quailAccessibilityFeedback',
                html: '<div id="quailAccessibilityFeedback"></div>'
              }
            ]
          }
        ]
      };
    });

    if ( editor.ui.addButton ) {
      editor.ui.addButton( 'Quail', {
        title: 'Check content for accessibility',
        command: 'quailCheckContent',
        icon: this.path + 'img/quail.png'
      });
		}
  },

  removeMarkup : function(editor) {
    var $context = $(editor.document.getDocumentElement().$);
    $context.find('._quail-accessibility-result, ._quail-accessibility-icon').unbind('click');
    $context.find('._quail-accessibility-result').each(function() {
      $(this).removeClass('_quail-accessibility-result')
             .removeClass('_quail-severe')
             .removeClass('_quail-moderate')
             .removeClass('_quail-suggestion');
    });
    $context.find('._quail-accessibility-icon, ._quail-accessibility-icon-current').remove();
  },

  checkContent : function(editor) {
    var that = this;
    var $scope = $(editor.document.getDocumentElement().$);
    var testsToEvaluate = this.TestCollection();
    $.each(editor.config.quail.tests, function(index, testName) {
      var testDefinition = that.quailTests.find(testName);
      testDefinition.set('scope', $scope.get());
      testDefinition.set('complete', false);
      testsToEvaluate.add(testDefinition);
    });
    try {
      debugger;
      testsToEvaluate.run({
        caseResolve: function(eventName, thisTest, _case) {
          debugger;
          if (_case.get('status') === 'failed') {
            that.highlightElement($(_case.get('element')), thisTest, that.editor);
          }
        }
      });
    }
    catch (e) {

    }
  },

  highlightElement : function($element, test, editor) {
    if (!$element.hasClass('_quail-accessibility-result')) {
      $element.addClass('_quail-accessibility-result')
              .addClass('_quail-' + this.severity[test.get('testability')]);
      $element.on('click', function(event) {
        event.preventDefault();
        var $content = $('<div class="_quail-accessibility-wysiwyg-popup">');
        $content.append('<h3 class="title">' + test.get('title').en + '</h3>');
        $content.append(test.get('description').en);
        var dialog = new CKEDITOR.dialog(editor, 'quailDialog');
        dialog.show();
        $('#quailAccessibilityFeedback').html('').append($content);
      });
    }
  },

  TestCollection: (function () {
    /**
     * A Collection of Tests.
     */
    function TestCollection (tests) {
      return new TestCollection.fn.init(tests);
    }

    // Prototype object of the TestCollection.
    TestCollection.fn = TestCollection.prototype = {
      constructor: TestCollection,
      init: function (tests, options) {
        this.listeners = {};
        options = options || {};
        if (!tests) {
          return this;
        }
        if (typeof tests === 'object') {
          var test;
          for (var name in tests) {
            if (tests.hasOwnProperty(name)) {
              tests[name].scope = tests[name].scope || options.scope;
              test = new CKEDITOR.plugins.registered.quail.Test(name, tests[name]);
              this.listenTo(test, 'results', this.report);
              this.push(test);
            }
          }
          return this;
        }
        return this;
      },
      // Setting a length property makes it behave like an array.
      length: 0,
      // Invoke all the tests in a set.
      run: function (callbacks) {
        var tc = this;
        callbacks = callbacks || {};
        this.each(function (index, test) {
          // Allow a prefilter to remove a case.
          if (callbacks.preFilter) {
            tc.listenTo(test, 'resolve', function (eventName, test, _case) {
              var result = callbacks.preFilter(eventName, test, _case);
              if (result === false) {
                // Manipulate the attributes directly so that change events
                // are not triggered.
                _case.attributes.status = 'notTested';
                _case.attributes.expected = null;
              }
            });
          }
          // Allow the invoker to listen to resolve events on each Case.
          if (callbacks.caseResolve) {
            tc.listenTo(test, 'resolve', callbacks.caseResolve);
          }
          // Allow the invoker to listen to complete events on each Test.
          if (callbacks.testComplete) {
            tc.listenTo(test, 'complete', callbacks.testComplete);
          }
          // Allow the invoker to listen to complete events for the
          // TestCollection.
          if (callbacks.testCollectionComplete) {
            tc.listenTo(tc, 'complete', callbacks.testCollectionComplete);
          }
        });

        // Set the test complete method to the closure function that dispatches
        // the complete event. This method needs to be debounced so it is
        // only called after a pause of invocations.
        this.testsComplete = debounce(testsComplete.bind(this), 500);

        // Invoke each test.
        this.each(function(index, test) {
          test.invoke();
        });

        // Invoke the complete dispatcher to prevent the collection from never
        // completing in the off chance that no Tests are run.
        this.testsComplete();

        return this;
      },
      // Execute a callback for every element in the matched set.
      each: function (iterator) {
        var args = [].slice.call(arguments, 1);
        for (var i = 0, len = this.length; i < len; ++i) {
          args.unshift(this[i]);
          args.unshift(i);
          var cont = iterator.apply(this[i], args);
          // Allow an iterator to break from the loop.
          if (cont === false) {
            break;
          }
        }
        return this;
      },
      /**
       * Add a Test object to the set.
       */
      add: function (test) {
        // Don't add a test that already exists in this set.
        if (!this.find(test.get('name'))) {
          this.push(test);
        }
      },
      find: function (testname) {
        for (var i = 0, il = this.length; i < il; ++i) {
          if (this[i].get('name') === testname) {
            return this[i];
          }
        }
        // Return an empty TestCollection for chaining.
        return null;
      },
      /**
       * @info, this should be a static method.
       */
      findByGuideline: function (guidelineName) {

        var methods = {
          'wcag': function (section, technique) {

            function findAllTestsForTechnique (guidelineName, sectionId, techniqueName) {
              // Return a TestCollection instance.
              var tests = new TestCollection();
              this.each(function (index, test) {
                // Get the configured guidelines for the test.
                var guidelines = test.get('guidelines');
                // If this test is configured for this section and it has
                // associated techniques, then loop thorugh them.
                var testTechniques = guidelines[guidelineName] && guidelines[guidelineName][sectionId] && guidelines[guidelineName][sectionId]['techniques'];
                if (testTechniques) {
                  for (var i = 0, il = testTechniques.length; i < il; ++i) {
                    // If this test is configured for the techniqueName, add it
                    // to the list of tests.
                    if (testTechniques[i] === techniqueName) {
                      tests.listenTo(test, 'results', tests.report);
                      tests.add(test);
                    }
                  }
                }
              });
              return tests;
            }
            var sectionId = section.id;
            var techniqueName = technique.get('name');
            if (sectionId && techniqueName) {
              return findAllTestsForTechnique.call(this, guidelineName, sectionId, techniqueName);
            }
          }
        };
        // Process the request using a specific guideline finding method.
        // @todo, make these pluggable eventually.
        if (methods[guidelineName]) {
          var args = [].slice.call(arguments, 1);
          return methods[guidelineName].apply(this, args);
        }
      },
      /**
       * Finds tests by their status.
       */
      findByStatus: function (statuses) {
        if (!statuses) {
          return;
        }
        var tests = new TestCollection();
        // A single status or an array of statuses is allowed. Always act on an
        // array.
        if (typeof statuses === 'string') {
          statuses = [statuses];
        }
        // Loop the through the statuses and find tests with them.
        for (var i = 0, il = statuses.length; i < il; ++i) {
          var status = statuses[i];
          // Loop through the tests.
          this.each(function (index, test) {
            var testStatus = test.get('status');
            if (testStatus === status) {
              tests.add(test);
            }
          });
        }
        return tests;
      },
      /**
       * Create a new test from a name and details.
       */
      set: function (testname, details) {
        for (var i = 0, il = this.length; i < il; ++i) {
          if (this[i].get('name') === testname) {
            this[i].set(details);
            return this[i];
          }
        }
        var test = CKEDITOR.plugins.registered.quail.Test(testname, details);
        this.push(test);
        return test;
      },
      /**
       * A stub method implementation.
       *
       * It is assigned a function value when the collection is run. See the
       * testsComplete function in outer scope.
       */
      testsComplete: null,
      report: function () {
        this.dispatch.apply(this, arguments);
      },
      // @todo, make this a set of methods that all classes extend.
      listenTo: function (dispatcher, eventName, handler) {
        // @todo polyfill Function.prototype.bind.
        handler = handler.bind(this);
        dispatcher.registerListener.call(dispatcher, eventName, handler);
      },
      registerListener: function (eventName, handler) {
        // nb: 'this' is the dispatcher object, not the one that invoked listenTo.
        if (!this.listeners[eventName]) {
          this.listeners[eventName] = [];
        }

        this.listeners[eventName].push(handler);
      },
      dispatch: function (eventName) {
        if (this.listeners[eventName] && this.listeners[eventName].length) {
          var eventArgs = [].slice.call(arguments);
          this.listeners[eventName].forEach(function (handler) {
            // Pass any additional arguments from the event dispatcher to the
            // handler function.
            handler.apply(null, eventArgs);
          });
        }
      },
      push: [].push,
      sort: [].sort,
      splice: [].splice
    };

      /**
     * Dispatches the complete event.
     *
     * This function is meant to be bound to a Test as a method through
     * a debounced proxy function.
     */
    function testsComplete () {
      var complete = true;
      // @todo, this iteration would be faster with _.findWhere, that breaks on
      // the first match.
      this.each(function (index, test) {
        if (!test.get('complete')) {
          complete = false;
        }
      });
      // If all the Tests have completed, dispatch the event.
      if (complete) {
        this.testsComplete = null;
        this.dispatch('complete', this);
      }
      // Otherwise attempt to the complete the Tests again after the debounce
      // period has expired.
      else {
        this.testsComplete();
      }
    }

    /**
     * Limits the invocations of a function in a given time frame.
     *
     * Adapted from underscore.js. Replace with debounce from underscore once class
     * loading with modules is in place.
     *
     * @param {Function} callback
     *   The function to be invoked.
     *
     * @param {Number} wait
     *   The time period within which the callback function should only be
     *   invoked once. For example if the wait period is 250ms, then the callback
     *   will only be called at most 4 times per second.
     */
    function debounce (func, wait, immediate) {

      "use strict";

      var timeout, result;
      return function () {
        var context = this;
        var args = arguments;
        var later = function () {
          timeout = null;
          if (!immediate) {
            result = func.apply(context, args);
          }
        };
        var callNow = immediate && !timeout;
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
        if (callNow) {
          result = func.apply(context, args);
        }
        return result;
      };
    }

    // Give the init function the TestCollection prototype.
    TestCollection.fn.init.prototype = TestCollection.fn;

    return TestCollection;
  }()),

  Test: (function () {

    /**
     * A collection of Cases.
     */
    function Test (name, attributes) {
      return new Test.fn.init(name, attributes);
    }

    // Prototype object of the Test.
    Test.fn = Test.prototype = {
      constructor: Test,
      init: function (name, attributes) {
        this.listeners = {};
        this.length = 0;
        if (!name) {
          return this;
        }
        this.attributes = attributes || {};
        this.attributes.name = name;
        this.attributes.status = 'untested';
        this.attributes.complete = false;

        return this;
      },
      // Setting a length property makes it behave like an array.
      length: 0,
      // Details of the test.
      attributes: {},
      // Execute a callback for every element in the matched set.
      each: function (iterator) {
        var args = [].slice.call(arguments, 1);
        for (var i = 0, len = this.length; i < len; ++i) {
          args.unshift(this[i]);
          args.unshift(i);
          iterator.apply(this[i], args);
        }
        return this;
      },
      get: function (attr) {
        // Return the document wrapped in jQuery if scope is not defined.
        if (attr === '$scope') {
          var scope = this.attributes['scope'];
          var $scope = $(this.attributes['scope']);
          // @todo, pass in a ref to jQuery to this module.
          return (this.attributes[attr]) ? this.attributes[attr] : ((scope) ? $scope : $(document));
        }
        return this.attributes[attr];
      },
      set: function (attr, value) {
        var isStatusChanged = false;
        // Allow an object of attributes to be passed in.
        if (typeof attr === 'object') {
          for (var prop in attr) {
            if (attr.hasOwnProperty(prop)) {
              if (prop === 'status') {
                isStatusChanged = true;
              }
              this.attributes[prop] = attr[prop];
            }
          }
        }
        // Assign a single attribute value.
        else {
          if (attr === 'status') {
            isStatusChanged = true;
          }
          this.attributes[attr] = value;
        }

        if (isStatusChanged) {
          this.resolve();
        }
        return this;
      },
      add: function (_case) {
        this.listenTo(_case, 'resolve', this.caseResponded);
        this.listenTo(_case, 'timeout', this.caseResponded);
        // If the case is already resolved because it has a status, then trigger
        // its resolve event.
        if (_case.status) {
          _case.dispatch('resolve', _case);
        }
        this.push(_case);
        return _case;
      },
      invoke: function () {
        // This test is already running.
        if (this.testComplete) {
          throw new Error('The test ' + this.get('name') + ' is already running.');
        }
        // This test has already been run.
        if (this.attributes.complete) {
          throw new Error('The test ' + this.get('name') + ' has already been run.');
        }
        var type = this.get('type');
        var options = this.get('options') || {};
        var callback = this.get('callback');
        var test = this;

        // Set the test complete method to the closure function that dispatches
        // the complete event. This method needs to be debounced so it is only
        // called after a pause of invocations.
        this.testComplete = debounce(testComplete.bind(this), 400);

        // Invoke the complete dispatcher to prevent the test from never
        // completing in the off chance that no Cases are created.
        this.testComplete(false);

        if (type === 'custom') {
          if (typeof callback === 'function') {
            try {
              callback.call(this, quail, test, CKEDITOR.plugins.registered.quail.Case, options);
            }
            catch (e) {
              // @todo, trigger an event for when the test fails outright.
            }
          }
          else if (type === 'custom' && typeof quail[callback] === 'function') {
            try {
              quail[callback].call(this, quail, test, CKEDITOR.plugins.registered.quail.Case, options);
            }
            catch (e) {
              // @todo, trigger an event for when the test fails outright.
            }
          }
          else {
            throw new Error('The callback ' + callback + ' cannot be invoked.');
          }
        }
        else if (typeof quail.components[type] === 'function') {
          try {
            quail.components[type].call(this, quail, test, CKEDITOR.plugins.registered.quail.Case, options);
          }
          catch (e) {
            // @todo, trigger an event for when the test fails outright.
          }
        }
        else {
          throw new Error('The component type ' + type + ' is not defined.');
        }

        return this;
      },
      /**
       * Finds cases by their status.
       */
      findByStatus: function (statuses) {
        if (!statuses) {
          return;
        }
        var test = new Test();
        // A single status or an array of statuses is allowed. Always act on an
        // array.
        if (typeof statuses === 'string') {
          statuses = [statuses];
        }
        // Loop the through the statuses and find tests with them.
        for (var i = 0, il = statuses.length; i < il; ++i) {
          var status = statuses[i];
          // Loop through the cases.
          this.each(function (index, _case) {
            var caseStatus = _case.get('status');
            if (caseStatus === status) {
              test.add(_case);
            }
          });
        }
        return test;
      },
      /**
       * Groups the cases by element selector.
       *
       * @return object
       *  A hash of cases, keyed by the element selector.
       */
      getCasesBySelector: function () {
        var casesBySelector = {};
        // Loop through the cases.
        this.each(function (index, _case) {
          var selector = _case.get('selector');
          if (!casesBySelector[selector]) {
            casesBySelector[selector] = new Test();
          }
          casesBySelector[selector].add(_case);
        });
        return casesBySelector;
      },
      /**
       * Adds the test that owns the Case to the set of arguments passed up to
       * listeners of this test's cases.
       */
      caseResponded: function (eventName, _case) {
        this.dispatch(eventName, this, _case);
        // Attempt to declare the Test complete.
        if (typeof this.testComplete === 'function') {
          this.testComplete();
        }
      },
      /**
       * Evaluates the test's cases and sets the test's status.
       */
      determineStatus: function () {
        // Invoke post filtering. This is a very special case for color.js.
        var type = this.get('type');
        var passed;
        if (quail.components[type] && typeof quail.components[type].postInvoke === 'function') {
          passed = quail.components[type].postInvoke.call(this, this);
        }
        // The post invocation function for the component declares that this test
        // passed.
        if (passed === true) {
          this.set({
            'status': 'passed'
          });
        }
        // CantTell.
        else if (this.findByStatus(['cantTell']).length === this.length) {
          this.set({
            'status': 'cantTell'
          });
        }
        // Inapplicable.
        else if (this.findByStatus(['inapplicable']).length === this.length) {
          this.set({
            'status': 'inapplicable'
          });
        }
        // Failed.
        else if (this.findByStatus(['failed', 'untested']).length) {
          this.set({
            'status': 'failed'
          });
        }
        else {
          this.set({
            'status': 'passed'
          });
        }
      },
      resolve: function () {
        this.dispatch('complete', this);
      },
      /**
       * A stub method implementation.
       *
       * It is assigned a function value when the Test is invoked. See the
       * testComplete function in outer scope.
       */
      testComplete: null,
      // @todo, make this a set of methods that all classes extend.
      listenTo: function (dispatcher, eventName, handler) {
        // @todo polyfill Function.prototype.bind.
        handler = handler.bind(this);
        dispatcher.registerListener.call(dispatcher, eventName, handler);
      },
      registerListener: function (eventName, handler) {
        // nb: 'this' is the dispatcher object, not the one that invoked listenTo.
        if (!this.listeners[eventName]) {
          this.listeners[eventName] = [];
        }

        this.listeners[eventName].push(handler);
      },
      dispatch: function (eventName) {
        if (this.listeners[eventName] && this.listeners[eventName].length) {
          var eventArgs = [].slice.call(arguments);
          this.listeners[eventName].forEach(function (handler) {
            // Pass any additional arguments from the event dispatcher to the
            // handler function.
            handler.apply(null, eventArgs);
          });
        }
      },
      push: [].push,
      sort: [].sort,
      splice: [].splice
    };

    /**
     * Dispatches the complete event.
     *
     * This function is meant to be bound to a Test as a method through
     * a debounced proxy function.
     */
    function testComplete (complete) {
      complete = (typeof complete === 'undefined') ? true : complete;
      // @todo, this iteration would be faster with _.findWhere, that breaks on
      // the first match.
      this.each(function (index, _case) {
        if (!_case.get('status')) {
          complete = false;
        }
      });
      // If all the Cases have been evaluated, dispatch the event.
      if (complete) {
        this.testComplete = null;
        // @todo, this should be set with the set method and a silent flag.
        this.attributes.complete = true;
        this.determineStatus();
      }
      // Otherwise attempt to the complete the Test again after the debounce
      // period has expired.
      else {
        this.testComplete();
      }
    }

    /**
     * Limits the invocations of a function in a given time frame.
     *
     * Adapted from underscore.js. Replace with debounce from underscore once class
     * loading with modules is in place.
     *
     * @param {Function} callback
     *   The function to be invoked.
     *
     * @param {Number} wait
     *   The time period within which the callback function should only be
     *   invoked once. For example if the wait period is 250ms, then the callback
     *   will only be called at most 4 times per second.
     */
    function debounce (func, wait, immediate) {

      "use strict";

      var timeout, result;
      return function () {
        var context = this;
        var args = arguments;
        var later = function () {
          timeout = null;
          if (!immediate) {
            result = func.apply(context, args);
          }
        };
        var callNow = immediate && !timeout;
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
        if (callNow) {
          result = func.apply(context, args);
        }
        return result;
      };
    }

    // Give the init function the Test prototype.
    Test.fn.init.prototype = Test.fn;

    return Test;
  }()),

  Case: (function () {

    /**
     * A Case is a test against an element.
     */
    function Case (attributes) {
      return new Case.fn.init(attributes);
    }

    // Prototype object of the Case.
    Case.fn = Case.prototype = {
      constructor: Case,
      init: function (attributes) {
        this.listeners = {};
        this.timeout = null;
        this.attributes = attributes || {};

        // Get a selector if an element is provided.
        if (this.attributes.element && this.attributes.element.nodeType && this.attributes.element.nodeType === 1) {
          this.attributes.selector = this.defineUniqueSelector(this.attributes.element);
        }

        var that = this;
        // Dispatch a resolve event if the case is initiated with a status.
        if (this.attributes.status && this.attributes.status !== 'untested') {
          // Delay the status dispatch to the next execution cycle so that the
          // Case will register listeners in this execution cycle first.
          setTimeout(function() {
            that.resolve();
          }, 0);
        }
        // Set up a time out for this case to resolve within.
        else {
          this.attributes.status = 'untested';
          this.timeout = setTimeout(function () {
            that.giveup();
          }, 350);
        }

        return this;
      },
      // Details of the Case.
      attributes: {},
      get: function (attr) {
        return this.attributes[attr];
      },
      set: function (attr, value) {
        var isStatusChanged = false;
        // Allow an object of attributes to be passed in.
        if (typeof attr === 'object') {
          for (var prop in attr) {
            if (attr.hasOwnProperty(prop)) {
              if (prop === 'status') {
                isStatusChanged = true;
              }
              this.attributes[prop] = attr[prop];
            }
          }
        }
        // Assign a single attribute value.
        else {
          if (attr === 'status') {
            isStatusChanged = true;
          }
          this.attributes[attr] = value;
        }

        // Get a selector if an element is provided.
        if (this.attributes.element && this.attributes.element.nodeType && this.attributes.element.nodeType === 1) {
          this.attributes.selector = this.defineUniqueSelector(this.attributes.element);
        }

        if (isStatusChanged) {
          this.resolve();
        }
        return this;
      },
      /**
       * Dispatches the resolve event; clears the timeout fallback event.
       */
      resolve: function () {
        clearTimeout(this.timeout);
        this.dispatch('resolve', this);
      },
      /**
       * Abandons the Case if it not resolved within the timeout period.
       */
      giveup: function () {
        clearTimeout(this.timeout);
        // @todo, the set method should really have a 'silent' option.
        this.attributes.status = 'notTested';
        this.dispatch('timeout', this);
      },
      // @todo, make this a set of methods that all classes extend.
      listenTo: function (dispatcher, eventName, handler) {
        // @todo polyfill Function.prototype.bind.
        handler = handler.bind(this);
        dispatcher.registerListener.call(dispatcher, eventName, handler);
      },
      registerListener: function (eventName, handler) {
        if (!this.listeners[eventName]) {
          this.listeners[eventName] = [];
        }
        this.listeners[eventName].push(handler);
      },
      dispatch: function (eventName) {
        if (this.listeners[eventName] && this.listeners[eventName].length) {
          var eventArgs = [].slice.call(arguments);
          this.listeners[eventName].forEach(function (handler) {
            // Pass any additional arguments from the event dispatcher to the
            // handler function.
            handler.apply(null, eventArgs);
          });
        }
      },

      /**
       * Creates a page-unique selector for the selected DOM element.
       *
       * @param {jQuery} element
       *   An element in a jQuery wrapper.
       *
       * @return {string}
       *   A unique selector for this element.
       */
      defineUniqueSelector: function (element) {
        /**
         * Indicates whether the selector string represents a unique DOM element.
         *
         * @param {string} selector
         *   A string selector that can be used to query a DOM element.
         *
         * @return Boolean
         *   Whether or not the selector string represents a unique DOM element.
         */
        function isUniquePath (selector) {
          return $(selector).length === 1;
        }

        /**
         * Creates a selector from the element's id attribute.
         *
         * Temporary IDs created by the module that contain "visitorActions" are excluded.
         *
         * @param {HTMLElement} element
         *
         * @return {string}
         *   An id selector or an empty string.
         */
        function applyID (element) {
          var selector = '';
          var id = element.id || '';
          if (id.length > 0) {
            selector = '#' + id;
          }
          return selector;
        }

        /**
         * Creates a selector from classes on the element.
         *
         * Classes with known functional components like the word 'active' are
         * excluded because these often denote state, not identity.
         *
         * @param {HTMLElement} element
         *
         * @return {string}
         *   A selector of classes or an empty string.
         */
        function applyClasses (element) {
          var selector = '';
          // Try to make a selector from the element's classes.
          var classes = element.className || '';
          if (classes.length > 0) {
            classes = classes.split(/\s+/);
            // Filter out classes that might represent state.
            classes = reject(classes, function (cl) {
              return (/active|enabled|disabled|first|last|only|collapsed|open|clearfix|processed/).test(cl);
            });
            if (classes.length > 0) {
              return '.' + classes.join('.');
            }
          }
          return selector;
        }

        /**
         * Finds attributes on the element and creates a selector from them.
         *
         * @param {HTMLElement} element
         *
         * @return {string}
         *   A selector of attributes or an empty string.
         */
        function applyAttributes (element) {
          var selector = '';
          var attributes = ['href', 'type'];
          var value;
          if (typeof element === 'undefined' ||
            typeof element.attributes === 'undefined' ||
            element.attributes === null) {
            return selector;
          }
          // Try to make a selector from the element's classes.
          for (var i = 0, len = attributes.length; i < len; i++) {
            value = element.attributes[attributes[i]] && element.attributes[attributes[i]].value;
            if (value) {
              selector += '[' + attributes[i] + '="' + value + '"]';
            }
          }
          return selector;
        }

        /**
         * Creates a unique selector using id, classes and attributes.
         *
         * It is possible that the selector will not be unique if there is no
         * unique description using only ids, classes and attributes of an
         * element that exist on the page already. If uniqueness cannot be
         * determined and is required, you will need to add a unique identifier
         * to the element through theming development.
         *
         * @param {HTMLElement} element
         *
         * @return {string}
         *   A unique selector for the element.
         */
        function generateSelector (element) {
          var selector = '';
          var scopeSelector = '';
          var pseudoUnique = false;
          var firstPass = true;

          do {
            scopeSelector = '';
            // Try to apply an ID.
            if ((scopeSelector = applyID(element)).length > 0) {
              selector = scopeSelector + ' ' + selector;
              // Assume that a selector with an ID in the string is unique.
              break;
            }

            // Try to apply classes.
            if (!pseudoUnique && (scopeSelector = applyClasses(element)).length > 0) {
              // If the classes don't create a unique path, tack them on and
              // continue.
              selector = scopeSelector + ' ' + selector;
              // If the classes do create a unique path, mark this selector as
              // pseudo unique. We will keep attempting to find an ID to really
              // guarantee uniqueness.
              if (isUniquePath(selector)) {
                pseudoUnique = true;
              }
            }

            // Process the original element.
            if (firstPass) {
              // Try to add attributes.
              if ((scopeSelector = applyAttributes(element)).length > 0) {
                // Do not include a space because the attributes qualify the
                // element. Append classes if they exist.
                selector = scopeSelector + selector;
              }

              // Add the element nodeName.
              selector = element.nodeName.toLowerCase() + selector;

              // The original element has been processed.
              firstPass = false;
            }

            // Try the parent element to apply some scope.
            element = element.parentNode;
          } while (element && element.nodeType === 1 && element.nodeName !== 'BODY' && element.nodeName !== 'HTML');

          return selector.trim();
        }

        /**
         * Helper function to filter items from a list that pass the comparator
         * test.
         *
         * @param {Array} list
         * @param {function} comparator
         *   A function that return a boolean. True means the list item will be
         *   discarded from the list.
         * @return array
         *   A list of items the excludes items that passed the comparator test.
         */
        function reject (list, comparator) {
          var keepers = [];
          for (var i = 0, il = list.length; i < il; i++) {
            if (!comparator.call(null, list[i])) {
              keepers.push(list[i]);
            }
          }
          return keepers;
        }

        return element && generateSelector(element);
      }
    };

    // Give the init function the Case prototype.
    Case.fn.init.prototype = Case.fn;

    return Case;
  }())

});
