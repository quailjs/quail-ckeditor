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
    $.getJSON(editor.config.quail.path + '/dist/tests.json', function(tests) {
      that.quailTests = quail.lib.TestCollection(tests);
    });

    CKEDITOR.addCss(quailCss);

    editor.addCommand( 'quailFeedbackDialog', new CKEDITOR.dialogCommand( 'quailFeedbackDialog' ));

    editor.addCommand( 'quailCheckContent', {
      exec : function( editor ) {
        if (that.active) {
          that.removeMarkup(editor);
          this.setState( CKEDITOR.TRISTATE_OFF );
          editor.removeListener('change', that.onChangeEvent);
        }
        else {
          that.checkContent(editor);
          this.setState( CKEDITOR.TRISTATE_ON );
          editor.on('change', that.onChangeEvent);
        }
        that.active = !that.active;
      }
    });

    CKEDITOR.on('instanceDestroyed', function(event) {
      that.removeMarkup(event.editor);
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
                type: 'html',
                id: 'quailAccessibilityFeedback',
                html: ''
              }
            ]
          }
        ],
        buttons: [ CKEDITOR.dialog.okButton ]
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

  onChangeEvent : function(event) {
    var $context = $(event.editor.document.getDocumentElement().$);
    $context.find('._quail-accessibility-icon').each(function() {
      if($(this).next('._quail-accessibility-result').length === 0) {
        $(this).remove();
      }
    });
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
    var testsToEvaluate = quail.lib.TestCollection();
    $.each(editor.config.quail.tests, function(index, testName) {
      var testDefinition = that.quailTests.find(testName);
      testDefinition = quail.lib.Test(testDefinition.get('name'), testDefinition.attributes);
      testDefinition.set('scope', $scope.get());
      testDefinition.set('complete', false);
      testsToEvaluate.add(testDefinition);
    });
    try {
      testsToEvaluate.run({
        preFilter: function (testName, element) {
          if ($(element).is('._quail-accessibility-icon, ._quail-accessibility-result')) {
            return false;
          }
        },
        caseResolve: function(eventName, thisTest, _case) {
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
    if ($element.hasClass('_quail-accessibility-result')) {
      return;
    }
    var severity = this.severity[test.get('testability')];
    var $image = $('<img>')
                   .attr('alt', 'Accessibility error')
                   .attr('src', this.path + 'img/' + severity + '.png');
    var $link = $('<a>')
      .attr('href', '#')
      .attr('role', 'command')
      .addClass('_quail-accessibility-icon')
      .addClass(severity)
      .append($image);
    $element.addClass('_quail-accessibility-result')
            .addClass('_quail-' + severity)
            .before($link);
    $element.add($link)
      .data('editorLanguage', editor.config.language)
      .data('quailTest', test)
      .on('click', function(event) {
        event.preventDefault();
        var test = $(this).data('quailTest');
        var language = (typeof test.get('title')[$(this).data('editorLanguage')] !== 'undefined') ?
          $(this).data('editorLanguage') :
          'en';
        var $content = $('<div class="_quail-accessibility-wysiwyg-popup">');
        $content.append('<h3 class="_quail-title" style="font-weight: bold; font-size: 170%;">' + test.get('title')[language] + '</h3>');
        $content.append(test.get('description')[language]);
        var dialog = new CKEDITOR.dialog(editor, 'quailDialog');
        dialog.show();
        $(dialog.getContentElement('feedback', 'quailAccessibilityFeedback').getElement().$).html($content);
      });
  }
});
