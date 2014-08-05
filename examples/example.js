;(function($, CKEDITOR) {
  CKEDITOR.replace( 'editor',
    {
      toolbar: [
        { name: 'basicstyles', items: [ 'Quail', '-','Bold','Italic' ] },
  			{ name: 'paragraph', items : [ 'Format', 'NumberedList','BulletedList' ] },
  			{ name: 'tools', items : [ 'Image','Maximize', 'Link', 'Source' ] },
        '/',
      ],
      extraPlugins: 'quail,dialog',
      quail: {
        path: '../lib/quail',
        tests: [
          'imgHasAlt',
          'pNotUsedAsHeader',
          'headerH1',
          'headerH1Format',
          'headerH2',
          'headerH2Format',
          'headerH3',
          'headerH3Format',
          'headerH4',
          'headerH4Format',
          'headerH5Format',
          'headerH6Format',
          'aAdjacentWithSameResourceShouldBeCombined',
          'aImgAltNotRepetitive',
          'aLinkTextDoesNotBeginWithRedundantWord',
          'aLinksAreSeparatedByPrintableCharacters',
          'aLinksDontOpenNewWindow',
          'aMustContainText'
        ]
      },
      // Set the most common block elements.
      format_tags: 'p;h1;h2;h3;pre',
      removeDialogTabs: ''
    });
})(jQuery, CKEDITOR);
