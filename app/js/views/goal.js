define(['text!templates/goal.html'],function(template){
    var GoalView = Backbone.View.extend({
        tagName:'tr',
        template: _.template(template),
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
    return GoalView;
});