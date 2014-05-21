CKEDITOR.plugins.add( 'quail', {

  icons : 'quail',

  active : false,

  editor : { },

  init: function( editor ) {
    var that = this;
    that.editor = editor;

    CKEDITOR.addCss(quailCss);

    editor.addCommand( 'quailFeedbackDialog', new CKEDITOR.dialogCommand( 'quailFeedbackDialog' ));

    editor.addCommand( 'quailCheckContent', {
      exec : function( editor ) {
        editor;
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

    CKEDITOR.dialog.add( 'quailDialog', function( editor ) {
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
    $(editor.document.getDocumentElement().$).find('strong').each(function() {
      that.highlightElement($(this), {severity: 'severe'}, editor);
    });
  },

  highlightElement : function($element, event, editor) {
    if (!$element.hasClass('_quail-accessibility-result')) {
      $element.addClass('_quail-accessibility-result')
              .addClass('_quail-' + event.severity);
      $element.on('click', function(event) {
        event.preventDefault();
        var $content = $('<div class="_quail-accessibility-wysiwyg-popup">');
        $content.append('<h3 class="title">' + 'Test title' + '</h3>');
        $content.append('test message');

        var dialog = new CKEDITOR.dialog(editor, 'quailDialog');
        dialog.show();
        $('#quailAccessibilityFeedback').html('').append($content);

      });
    }
  }
});
