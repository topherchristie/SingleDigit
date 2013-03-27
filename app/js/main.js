requirejs.config({
    baseUrl:'app/js',
    paths:{
        text: 'lib/text',
        xdate: '/public/xdate/xdate',
        scoreCalculator:'lib/scoreCalculator'
    },
    shim:{
        '/public/underscore/underscore-min.js': {
            exports: '_'
        },
        '/public/backbone/backbone-min.js':{
            deps: ['/public/underscore/underscore-min.js'],
            exports: 'Backbone'
        },
        '/public/slickgrid/lib/jquery.event.drag-2.0.min.js': {
            exports: 'SlickGrid_drag'
        },
        '/public/slickgrid/slick.core.js': {
            exports: 'Slick',
            deps: ['/public/slickgrid/lib/jquery.event.drag-2.0.min.js']
        },
        '/public/slickgrid/slick.grid.js': {
            exports: 'SlickGrid',
            deps: ['/public/slickgrid/slick.core.js','/public/slickgrid/lib/jquery.event.drag-2.0.min.js']
        },
        'app':{
            deps:['/public/underscore/underscore-min.js', '/public/backbone/backbone-min.js','/public/slickgrid/lib/jquery.event.drag-2.0.min.js','/public/slickgrid/slick.core.js','/public/slickgrid/slick.grid.js']
        }
    }
});
require(['app'],
    function(App){
          _.templateSettings = {    interpolate: /\{\{(.+?)\}\}/g  };
        window.Golf = new App();
    }
);
