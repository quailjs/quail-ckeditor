Accessibility feedback for CKEditor
===================================

A plugin for CKEditor 4 that gives users feedback on accessibility problems using **[Quail](http://quailjs.org)**.

Installation
------------

To use the plugin, download and install in the `plugins` directory of your ckeditor installation.

### Developer installation

If you would like to run the examples or do development, you will need to use **[Grunt](http://gruntjs.com)** and run the default grunt command.

Usage
-----

To enable the quail plugin, add it to the list of `extraPlugins` in your CKEditor options. To pass configuration to the quail plugin itself, add them under a `quail` definition within your CKEditor configuration:

```javascript
CKEDITOR.replace( 'editor',
  {
    toolbar: [
      { name: 'basicstyles', items: [ 'Quail', '-','Bold','Italic' ] }
    ],
    extraPlugins: 'quail',
    quail: {
      path: '../lib/quail',
      tests: [
        'imgHasAlt',
        'pNotUsedAsHeader'
      ]
    }
  });
```

### Options

#### quail.path

The relative or absolute path to the (quail library)[http://github.com/quail/quailjs] so test definitions can be run.

#### quail.tests

An array of [quail test names](http://quailjs.org/#/accessibility-tests) that should be run against content.
