define(['text!templates/score.html'],function(template){
    var ScoreView = Backbone.View.extend({
        tagName:'div',
        className:'card row-fluid',
        template: Handlebars.compile(template),
        events:{
            
        },
        initialize:function(){
            this.model.on('change',this.render, this);
            this.model.on('destroy',this.remove, this);
        },
        render: function(){
            var $el = $(this.el);
         //   $el.data('scoreId', this.model.get('_id'));
            var html =this.template(this.model.toJSON());
            $el.html(html);
            return this;
        }
        
    });
    return ScoreView;
});