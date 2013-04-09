define(['text!templates/app.html'],function(template){
    var AppView = Backbone.View.extend({
        id:'main',
        tagName:'div',
        className:'container-fluid',
        el:'#score-app',
        template: Handlebars.compile(template),
        events:{
            
        },
        initialize: function(){
            
        },
        render: function(){
            this.$el.html(this.template());
            return this;
        }
    });
    return AppView;
});