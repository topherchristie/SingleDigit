define(['xdate'], function(xdate){
   var config = {};
   /* _.templateSettings= {//{interpolate: /\{\{(.+?)\}\}/g};
        evaluate : /\{\[([\s\S]+?)\]\}/g,
        interpolate : /\{\{([\s\S]+?)\}\}/g
    };*/
    _.templateSettings.interpolate= /\{\{(.+?)\}\}/g;
    Handlebars.registerHelper('prettydate', function(date) {
        console.log('pretty date:',date);
        return (new xdate(date,true)).toString('yyyy-MM-dd');
    });
    console.log('template settings set');
   return config;
});