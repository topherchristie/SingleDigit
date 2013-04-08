define(['text!templates/courseStats.html'],function(template){
    var CourseStatsView = Backbone.View.extend({
        tagName:'div',
        el:'#courseStats',
        template: _.template(template),
        events:{
            
        },
        initialize:function(){
            this.model.on('change',this.render, this);
            this.model.on('destroy',this.remove, this);
        },
        render: function(){
            console.log("rendering coures stats view",this.model.toJSON());
            var $el = $(this.el);
         //   $el.data('scoreId', this.model.get('_id'));
            var html =this.template(this.model.toJSON());
            $el.html(html);
            return this;
        }
    });
    return CourseStatsView;
});