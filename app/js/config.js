define(['xdate'], function(xdate){
   var config = {};
   /* _.templateSettings= {//{interpolate: /\{\{(.+?)\}\}/g};
        evaluate : /\{\[([\s\S]+?)\]\}/g,
        interpolate : /\{\{([\s\S]+?)\}\}/g
    };*/
    _.templateSettings.interpolate= /\{\{(.+?)\}\}/g;
    Handlebars.registerHelper('prettydate', function(indate) {
        if(indate)
            return (new xdate(indate,true)).toString('yyyy-MM-dd');
        else
            return "";
    });
    Handlebars.registerHelper('indexclass', function(index) {
        if(index && index >= 19)
            return "counts";
        else
            return "";
    });
    Handlebars.registerHelper('predictCellClass', function(counts,keepsOrImprovesHandicap,isTop5,isSingleDigit) {
        if(isSingleDigit)
            return "singleDigit";
        if(isTop5)
            return "top5";
        if(keepsOrImprovesHandicap)
            return "improves";
        if(counts)
            return "counts";
        return "doesNotCount";
    });
    
    console.log('template settings set');
   return config;
});