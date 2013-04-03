define(['text!templates/table.html','views/scorecard','models/scorecard'],function(template,ScorecardView,ScoreCard){
    var ScoreView = Backbone.View.extend({
        tagName:'tr',
        className:'',
        template: _.template(template),
        events:{
            "click a":          "scorecard"
        },
        initialize:function(){
            this.model.on('change',this.render, this);
            this.model.on('destroy',this.remove, this);
          
        },
        scorecard: function(e){
            e.preventDefault();
            new ScorecardView({model:new ScoreCard(this.model.toJSON())});
        },
        render: function(){
            var $el = $(this.el);
            var html =this.template(this.model.toJSON());
            $el.html(html);
            $el.addClass(this.model.get("className"));
            return this;
        }
        
    });
    return ScoreView;
});