requirejs.config({
    baseUrl:'app/js',
    paths:{
        text: 'lib/text',
        xdate: '/public/xdate/xdate',
        scoreCalculator:'lib/scoreCalculator',
        jquery:'/public/jquery/jquery',
        dataTables:'/public/datatables/js/jquery.dataTables',
        fixedColumns : 'lib/fixedColumns'
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
            deps:['/public/underscore/underscore-min.js', '/public/backbone/backbone-min.js','/public/datatables/js/jquery.dataTables.js']
        }
    }
});
require(['app'],
    function(App){
          _.templateSettings = {    interpolate: /\{\{(.+?)\}\}/g  };
        window.Golf = new App();
    }
);
