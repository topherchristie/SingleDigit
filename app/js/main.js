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
        'app':{
            deps:['/public/underscore/underscore-min.js', '/public/backbone/backbone-min.js']
        }
    }
});
require(['app'],
    function(App){
        console.log('main.js App is created');
          _.templateSettings = {    interpolate: /\{\{(.+?)\}\}/g  };
        window.Golf = new App();
    }
);
