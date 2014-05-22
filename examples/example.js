;(function($, CKEDITOR) {
  CKEDITOR.replace( 'editor',
    {
      toolbar: [
        { name: 'basicstyles', items: [ 'Quail', '-','Bold','Italic' ] },
  			{ name: 'paragraph', items : [ 'NumberedList','BulletedList' ] },
  			{ name: 'tools', items : [ 'Image','Maximize' ] }
      ],
      extraPlugins: 'quail,dialog',
      quail: {
        path: '../lib/quail',
        tests: [
          'imgHasAlt',
          'pNotUsedAsHeader'
        ]
      }
    });
})(jQuery, CKEDITOR);
