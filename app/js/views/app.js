define(['text!templates/app.html'],function(template){
    var AppView = Backbone.View.extend({
        id:'main',
        tagName:'div',
        className:'container-fluid',
        el:'#score-app',
        template: _.template(template),
        events:{
        },
        initialize: function(){
            console.log('appview initialized');
        },
        render: function(){
          
            console.log('appview rendered');
            this.$el.html(this.template());
            return this;
        }
    });
    return AppView;
});