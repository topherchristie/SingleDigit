define(['text!templates/scoreTable.html','views/recentTable'],function(template,RecentView){
    var ScoreTableView = Backbone.View.extend({
  //      tagName:'div',
    //    className:'scoreTableWrapper',
        template: Handlebars.compile(template),
        events:{
            "click button.y2013":          "y2013"
        },
        initialize:function(){
            console.log("initialize ScoreTable",new RecentView());
            
            this.views={};
           this.render();
        },
        y2013: function(e){
            console.log('y2013',this.collections);
            this.collection.setFilter('year',2013);
            this.views.recent.render();
        },
        hide:function(){
            this.$el.hide();
        },
        show:function(){
            this.$el.show();
        },
        
        render: function(){
            
            var $el = $(this.el);
            var html =this.template({});
            console.log("rendering ScoreTable",$el.html(),":");
            $el.html(html);
            var self = this;
            this.views.recent = new RecentView({el:$(this.el).find("#recentTable"),collection:this.collection});
            this.collection.fetch({data:{},success: function(res){ 
                self.views.recent.render();
            }});
            return this;
        }
        
    });
    return ScoreTableView;
});