define(['text!templates/goal.html'],function(template){
    var GoalView = Backbone.View.extend({
        tagName:'tr',
        template: Handlebars.compile(template),
        events:{
            "touchstart span.text":"showTitleSleepy",
            "mouseover span.text":"showTitle",
            "span.text mouseout":"hideTitle"
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
        },
        showTitle:function(e){
            var firstTd = this.$el.find('span.text').first();
            $(firstTd).tooltip('show');
            //setTimeout(function(){ $(firstTd).tooltip('hide');},5000);
        },
        hideTitle:function(e){
          //  var firstTd = this.$el.find('span.text').first();
          //  firstTd.tooltip('hide');
        },
        showTitleSleepy:function(e){
            var firstTd = this.$el.find('span.text').first();
            firstTd.tooltip('show');
            setTimeout(function(){ $(firstTd).tooltip('hide');},5000);
        }
        
    });
    return GoalView;
});