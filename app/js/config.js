define([], function(){
   var config = {};
   /* _.templateSettings= {//{interpolate: /\{\{(.+?)\}\}/g};
        evaluate : /\{\[([\s\S]+?)\]\}/g,
        interpolate : /\{\{([\s\S]+?)\}\}/g
    };*/
    _.templateSettings.interpolate= /\{\{(.+?)\}\}/g;
    console.log('template settings set');
   return config;
});