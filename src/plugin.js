CKEDITOR.plugins.add( 'quail', {

  icons : 'quail',

  active : false,

  editor : { },

  quailTests : { },

  init: function( editor ) {
    if (typeof editor.config.quail === 'undefined' ||
        typeof editor.config.quail.tests === 'undefined') {
      return;
    }
    var that = this;
    that.editor = editor;
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
          that.active = false;
        }
        else {
          that.checkContent(editor);
          this.setState( CKEDITOR.TRISTATE_ON );
          that.active = true;
        }
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

		// Register the button, if the button plugin is loaded.
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
    var testsToEvaluate = quail.lib.TestCollection();
    $.each(editor.config.quail.tests, function(index, testName) {
      var testDefinition = that.quailTests.find(testName);
      testDefinition.set('scope', $scope.get());
      testsToEvaluate.add(testDefinition);
    });
    testsToEvaluate.run({
      caseResolve: function(eventName, thisTest, _case) {
        if (_case.get('status') === 'failed') {
          that.highlightElement($(_case.get('element')), thisTest, that.editor);
        }
      }
    });
  },

  highlightElement : function($element, test, editor) {
    if (!$element.hasClass('_quail-accessibility-result')) {
      $element.addClass('_quail-accessibility-result')
              .addClass('_quail-' + test.get('severity'));
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
  }
});
