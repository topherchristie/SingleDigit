requirejs.config({
    baseUrl:'app/js',
    paths:{
        text: 'lib/text',
        xdate: '/public/xdate/xdate'
    },
    shim:{
        '/public/underscore/underscore-min.js': {
            exports: '_'
        },
        '/public/backbone/backbone-min.js':{
            deps: ['/public/underscore/underscore-min.js'],
            exports: 'Backbone'
        },
        'app':{
            deps:['/public/underscore/underscore-min.js', '/public/backbone/backbone-min.js']
        }
    }
});
require(['app'],
    function(App){
          _.templateSettings = {    interpolate: /\{\{(.+?)\}\}/g  };
        window.Golf = new App();
    }
);
