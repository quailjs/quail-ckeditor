;(function($, CKEDITOR) {
  CKEDITOR.replace( 'editor',
    {
      toolbar: [
        { name: 'basicstyles', items: [ 'Quail', '-','Bold','Italic' ] },
  			{ name: 'paragraph', items : [ 'NumberedList','BulletedList' ] },
  			{ name: 'tools', items : [ 'Maximize' ] }
      ],
      extraPlugins: 'quail'
    });
})(jQuery, CKEDITOR);
